// @vitest-environment jsdom
import type { CategoryDto, CreateComponentInput } from '@uilib/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
const push = vi.fn();
const getCategories = vi.fn();
const createComponent = vi.fn();
const updateComponent = vi.fn();
const deleteComponent = vi.fn();

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    browserApi: { getCategories },
    adminApi: { createComponent, updateComponent, deleteComponent },
  };
});

// Importados depois dos mocks acima.
const { ComponentForm } = await import('../ComponentForm');
const { Toaster } = await import('@/components/ui/toast');
const { ApiError } = await import('@/lib/api-client');

const CATEGORY: CategoryDto = {
  id: 'clxxxxxxxxxxxxxxxxxxxxxxx',
  name: 'Buttons',
  slug: 'buttons',
  description: null,
  position: 0,
  componentCount: 0,
};

const VALID_DEFAULTS: CreateComponentInput = {
  name: 'Neon Toggle',
  slug: 'neon-toggle',
  description: 'A toggle switch with a neon glow effect.',
  categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx',
  html: '<div></div>',
  css: '',
  js: null,
  technologies: ['HTML', 'CSS'],
  promptTemplate: null,
  status: 'DRAFT',
};

function Wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster />
    </QueryClientProvider>
  );
}

async function renderForm(props: Parameters<typeof ComponentForm>[0]) {
  getToken.mockResolvedValue('token-123');
  getCategories.mockResolvedValue({ data: [CATEGORY] });
  const result = render(
    <Wrapper>
      <ComponentForm {...props} />
    </Wrapper>,
  );
  // Espera as categorias reais carregarem antes de qualquer interação.
  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'Buttons' })).not.toBeNull();
  });
  return result;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  getToken.mockReset();
  push.mockReset();
  getCategories.mockReset();
  createComponent.mockReset();
  updateComponent.mockReset();
  deleteComponent.mockReset();
});

describe('ComponentForm — slug automático/manual (seção 5.4 do MVP2)', () => {
  it('gera o slug automaticamente a partir do nome enquanto o usuário não edita o slug', async () => {
    await renderForm({ mode: 'create', defaultValues: { ...VALID_DEFAULTS, name: '', slug: '' } });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Café com Leite' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('cafe-com-leite');
  });

  it('para de regenerar o slug depois que o usuário o edita manualmente', async () => {
    await renderForm({ mode: 'create', defaultValues: { ...VALID_DEFAULTS, name: '', slug: '' } });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neon Toggle' } });
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('neon-toggle');

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'custom-slug' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Neon Toggle Switch' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('custom-slug');
  });

  it('em modo de edição, o slug nunca é reescrito automaticamente pelo nome (já existe)', async () => {
    await renderForm({ mode: 'edit', componentId: 'comp-1', defaultValues: VALID_DEFAULTS });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed Toggle' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('neon-toggle');
  });
});

describe('ComponentForm — preview vivo com debounce (seção 5.4/8 do MVP2)', () => {
  it('só atualiza o iframe depois do debounce de inatividade na digitação', async () => {
    await renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS });

    const iframe = screen.getByTitle('Live component preview') as HTMLIFrameElement;
    expect(iframe.srcdoc).toContain('<div></div>');

    vi.useFakeTimers();
    fireEvent.change(screen.getByLabelText('HTML'), { target: { value: '<button>Updated</button>' } });

    // Ainda não passou o debounce — o preview não deve ter mudado.
    expect(iframe.srcdoc).not.toContain('Updated');

    act(() => {
      vi.advanceTimersByTime(399);
    });
    expect(iframe.srcdoc).not.toContain('Updated');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(iframe.srcdoc).toContain('Updated');
  });

  it('nunca inclui allow-same-origin — o preview não roda no contexto do admin', async () => {
    await renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS });

    const iframe = screen.getByTitle('Live component preview');
    expect(iframe.getAttribute('sandbox')).toBe('allow-scripts');
    expect(iframe.getAttribute('sandbox')).not.toContain('allow-same-origin');
  });
});

describe('ComponentForm — mutações bem-sucedidas e com falha (seção 5.4 do MVP2)', () => {
  it('cria o componente, mostra toast e navega para a página de edição', async () => {
    createComponent.mockResolvedValue({
      data: { ...VALID_DEFAULTS, id: 'new-id', categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx', promptTemplate: null, publishedAt: null, authorId: 'u1', createdAt: 'x', updatedAt: 'x', category: { name: 'Buttons', slug: 'buttons' } },
    });
    await renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS });

    fireEvent.click(screen.getByRole('button', { name: 'Create component' }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/admin/components/new-id/edit');
    });
    expect(createComponent).toHaveBeenCalledWith(expect.objectContaining({ name: 'Neon Toggle' }), 'token-123');
    expect(screen.getByText('Component created')).not.toBeNull();
  });

  it('atualiza o componente, mostra toast e o link de revisão do DRAFT, sem navegar', async () => {
    updateComponent.mockResolvedValue({
      data: { ...VALID_DEFAULTS, id: 'comp-1', status: 'DRAFT', categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx', promptTemplate: null, publishedAt: null, authorId: 'u1', createdAt: 'x', updatedAt: 'x', category: { name: 'Buttons', slug: 'buttons' } },
    });
    await renderForm({ mode: 'edit', componentId: 'comp-1', defaultValues: VALID_DEFAULTS });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('Component updated')).not.toBeNull();
    });
    expect(push).not.toHaveBeenCalled();
    const reviewLink = screen.getByRole('link', { name: 'Review it' });
    expect(reviewLink.getAttribute('href')).toBe('/component/neon-toggle?preview=1');
  });

  it('mostra o link de "view live" quando o componente salvo está PUBLISHED', async () => {
    updateComponent.mockResolvedValue({
      data: { ...VALID_DEFAULTS, id: 'comp-1', status: 'PUBLISHED', categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxx', promptTemplate: null, publishedAt: 'x', authorId: 'u1', createdAt: 'x', updatedAt: 'x', category: { name: 'Buttons', slug: 'buttons' } },
    });
    await renderForm({ mode: 'edit', componentId: 'comp-1', defaultValues: { ...VALID_DEFAULTS, status: 'PUBLISHED' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'View it live' });
      expect(link.getAttribute('href')).toBe('/component/neon-toggle');
    });
  });

  it('em falha genérica (500), mostra um banner de erro e preserva os valores digitados', async () => {
    updateComponent.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong'));
    await renderForm({ mode: 'edit', componentId: 'comp-1', defaultValues: VALID_DEFAULTS });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i);
    });
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Neon Toggle');
  });
});

describe('ComponentForm — mapeamento de erros de API para campos (seção 4/7 do MVP1)', () => {
  it('409 de slug duplicado vira erro no campo Slug, sem apagar o formulário', async () => {
    createComponent.mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'Slug "neon-toggle" is already in use', [
        { path: 'slug', message: 'Slug already in use' },
      ]),
    );
    await renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS });

    fireEvent.click(screen.getByRole('button', { name: 'Create component' }));

    await waitFor(() => {
      expect(screen.getAllByText('Slug already in use').length).toBeGreaterThan(0);
    });
    expect(push).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Neon Toggle');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('neon-toggle');
  });

  it('422 de categoria inexistente vira erro acionável no campo Category', async () => {
    createComponent.mockRejectedValue(
      new ApiError(422, 'UNPROCESSABLE_ENTITY', 'Category "clxxxxxxxxxxxxxxxxxxxxxxx" not found', [
        { path: 'categoryId', message: 'Category not found' },
      ]),
    );
    await renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS });

    fireEvent.click(screen.getByRole('button', { name: 'Create component' }));

    await waitFor(() => {
      expect(screen.getAllByText('Category not found').length).toBeGreaterThan(0);
    });
    const alerts = screen.getAllByRole('alert').map((element) => element.textContent);
    expect(alerts.some((text) => /category "clxxxxxxxxxxxxxxxxxxxxxxx" not found/i.test(text ?? ''))).toBe(
      true,
    );
  });
});
