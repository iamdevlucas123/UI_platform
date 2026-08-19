// @vitest-environment jsdom
import type { AdminComponentDto } from '@uilib/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
const listComponents = vi.fn();

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, adminApi: { listComponents } };
});

// Importado depois dos mocks acima, para pegar `@clerk/nextjs`/`@/lib/api-client` já mockados.
const { ComponentsListView } = await import('../ComponentsListView');
const { ApiError } = await import('@/lib/api-client');

function makeComponent(overrides: Partial<AdminComponentDto> = {}): AdminComponentDto {
  return {
    id: 'comp-1',
    name: 'Neon Toggle',
    slug: 'neon-toggle',
    description: 'A toggle switch with a neon glow.',
    categoryId: 'cat-1',
    category: { name: 'Toggle Switches', slug: 'toggle-switches' },
    html: '<div></div>',
    css: '',
    js: null,
    technologies: ['HTML', 'CSS'],
    promptTemplate: null,
    status: 'PUBLISHED',
    publishedAt: '2026-01-01T00:00:00.000Z',
    authorId: 'user-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

const THREE_COMPONENTS: AdminComponentDto[] = [
  makeComponent({ id: '1', name: 'Neon Toggle', status: 'PUBLISHED' }),
  makeComponent({ id: '2', name: 'Simple Button', status: 'DRAFT' }),
  makeComponent({ id: '3', name: 'Neon Button', status: 'DRAFT' }),
];

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComponentsListView />
    </QueryClientProvider>,
  );
}

async function renderWithData(): Promise<void> {
  getToken.mockResolvedValue('token-123');
  listComponents.mockResolvedValue({ data: THREE_COMPONENTS });
  renderView();
  await waitFor(() => {
    expect(screen.getByText('Neon Toggle')).not.toBeNull();
  });
}

afterEach(() => {
  cleanup();
  getToken.mockReset();
  listComponents.mockReset();
});

describe('ComponentsListView — estados (seção 5.4 do MVP2)', () => {
  it('mostra o estado de carregamento antes da resposta chegar', () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockReturnValue(new Promise(() => {}));

    renderView();

    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
  });

  it('mostra erro recuperável quando a API falha', async () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'));

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/couldn.t load components/i);
    });
  });

  it('mostra estado vazio quando não há nenhum componente cadastrado', async () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockResolvedValue({ data: [] });

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/no components yet/i)).not.toBeNull();
    });
  });

  it('inclui DRAFTs na listagem (dado administrativo, não o catálogo público)', async () => {
    await renderWithData();

    expect(screen.getByText('Simple Button')).not.toBeNull();
    // `selector: 'span'` exclui as `<option>` do filtro de status, que também têm esse texto.
    expect(screen.getAllByText('DRAFT', { selector: 'span' })).toHaveLength(2);
    expect(screen.getAllByText('PUBLISHED', { selector: 'span' })).toHaveLength(1);
  });

  it('inclui link "New component" e um "Edit" por linha', async () => {
    await renderWithData();

    expect(screen.getByRole('link', { name: 'New component' }).getAttribute('href')).toBe(
      '/admin/components/new',
    );
    const editLinks = screen.getAllByRole('link', { name: 'Edit' });
    expect(editLinks).toHaveLength(3);
    expect(editLinks[0]?.getAttribute('href')).toBe('/admin/components/1/edit');
  });
});

describe('ComponentsListView — filtros da tabela (seção 5.4 do MVP2)', () => {
  it('filtra por nome (busca), sem diferenciar maiúsculas/minúsculas', async () => {
    await renderWithData();

    fireEvent.change(screen.getByLabelText('Search components by name'), {
      target: { value: 'neon' },
    });

    expect(screen.getByText('Neon Toggle')).not.toBeNull();
    expect(screen.getByText('Neon Button')).not.toBeNull();
    expect(screen.queryByText('Simple Button')).toBeNull();
  });

  it('filtra por status', async () => {
    await renderWithData();

    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'DRAFT' } });

    expect(screen.queryByText('Neon Toggle')).toBeNull(); // PUBLISHED, fica de fora
    expect(screen.getByText('Simple Button')).not.toBeNull();
    expect(screen.getByText('Neon Button')).not.toBeNull();
  });

  it('combina busca e filtro de status', async () => {
    await renderWithData();

    fireEvent.change(screen.getByLabelText('Search components by name'), {
      target: { value: 'neon' },
    });
    fireEvent.change(screen.getByLabelText('Filter by status'), { target: { value: 'DRAFT' } });

    expect(screen.getByText('Neon Button')).not.toBeNull(); // neon + DRAFT
    expect(screen.queryByText('Neon Toggle')).toBeNull(); // neon, mas PUBLISHED
    expect(screen.queryByText('Simple Button')).toBeNull(); // DRAFT, mas não bate a busca
  });

  it('mostra o estado vazio (com mensagem de filtro) quando busca/filtro não bate com nada', async () => {
    await renderWithData();

    fireEvent.change(screen.getByLabelText('Search components by name'), {
      target: { value: 'não existe' },
    });

    expect(screen.getByText(/no components match your search\/filter/i)).not.toBeNull();
  });
});
