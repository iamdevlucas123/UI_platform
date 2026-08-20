// @vitest-environment jsdom
import type { CategoryDto, CreateCategoryInput } from '@uilib/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, adminApi: { createCategory, updateCategory } };
});

// Importados depois dos mocks acima.
const { CategoryForm } = await import('../CategoryForm');
const { Toaster } = await import('@/components/ui/toast');
const { ApiError } = await import('@/lib/api-client');

const VALID_DEFAULTS: CreateCategoryInput = {
  name: 'Buttons',
  slug: 'buttons',
  description: 'Clickable button variants.',
  position: 0,
};

const SAVED_CATEGORY: CategoryDto = {
  id: 'cat-1',
  name: 'Buttons',
  slug: 'buttons',
  description: 'Clickable button variants.',
  position: 0,
  componentCount: 0,
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

function renderForm(props: Parameters<typeof CategoryForm>[0]) {
  getToken.mockResolvedValue('token-123');
  return render(
    <Wrapper>
      <CategoryForm {...props} />
    </Wrapper>,
  );
}

const onSuccess = vi.fn();
const onCancel = vi.fn();

afterEach(() => {
  cleanup();
  getToken.mockReset();
  createCategory.mockReset();
  updateCategory.mockReset();
  onSuccess.mockReset();
  onCancel.mockReset();
});

describe('CategoryForm — slug automático/manual (seção 5.4 do MVP2, mesmo comportamento do ComponentForm)', () => {
  it('gera o slug automaticamente a partir do nome enquanto o usuário não edita o slug', () => {
    renderForm({
      mode: 'create',
      defaultValues: { ...VALID_DEFAULTS, name: '', slug: '' },
      onSuccess,
      onCancel,
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Café com Leite' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('cafe-com-leite');
  });

  it('para de regenerar o slug depois que o usuário o edita manualmente', () => {
    renderForm({
      mode: 'create',
      defaultValues: { ...VALID_DEFAULTS, name: '', slug: '' },
      onSuccess,
      onCancel,
    });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Buttons' } });
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('buttons');

    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'custom-slug' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Buttons Extra' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('custom-slug');
  });

  it('em modo de edição, o slug nunca é reescrito automaticamente pelo nome (já existe)', () => {
    renderForm({ mode: 'edit', categoryId: 'cat-1', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Renamed' } });

    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('buttons');
  });
});

describe('CategoryForm — mutações bem-sucedidas e com falha (seção 5.4 do MVP2)', () => {
  it('cria a categoria, mostra toast e chama onSuccess com a categoria salva', async () => {
    createCategory.mockResolvedValue({ data: SAVED_CATEGORY });
    renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(SAVED_CATEGORY);
    });
    expect(createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: 'Buttons' }), 'token-123');
    expect(screen.getByText('Category created')).not.toBeNull();
  });

  it('atualiza a categoria, mostra toast e chama onSuccess', async () => {
    updateCategory.mockResolvedValue({ data: SAVED_CATEGORY });
    renderForm({ mode: 'edit', categoryId: 'cat-1', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByText('Category updated')).not.toBeNull();
    });
    expect(onSuccess).toHaveBeenCalledWith(SAVED_CATEGORY);
  });

  it('em falha genérica (500), mostra um banner de erro, preserva os valores digitados e não chama onSuccess', async () => {
    updateCategory.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Something went wrong'));
    renderForm({ mode: 'edit', categoryId: 'cat-1', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/something went wrong/i);
    });
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Buttons');
    expect(onSuccess).not.toHaveBeenCalled();
  });
});

describe('CategoryForm — mapeamento de erros de API para campos (seção 4/7 do MVP1)', () => {
  it('409 de nome duplicado vira erro no campo Name, sem apagar o formulário', async () => {
    createCategory.mockRejectedValue(
      new ApiError(409, 'CONFLICT', 'Name "Buttons" is already in use', [
        { path: 'name', message: 'Name already in use' },
      ]),
    );
    renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(screen.getAllByText('Name already in use').length).toBeGreaterThan(0);
    });
    expect(onSuccess).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Buttons');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('buttons');
  });
});

describe('CategoryForm — cancelar', () => {
  it('chama onCancel ao clicar em Cancel, sem submeter', () => {
    renderForm({ mode: 'create', defaultValues: VALID_DEFAULTS, onSuccess, onCancel });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(createCategory).not.toHaveBeenCalled();
  });
});
