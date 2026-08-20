// @vitest-environment jsdom
import type { CategoryDto } from '@uilib/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
const getCategories = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();
const deleteCategory = vi.fn();

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    browserApi: { getCategories },
    adminApi: { createCategory, updateCategory, deleteCategory },
  };
});

// Importado depois dos mocks acima.
const { CategoriesListView } = await import('../CategoriesListView');
const { ApiError } = await import('@/lib/api-client');

function makeCategory(overrides: Partial<CategoryDto> = {}): CategoryDto {
  return {
    id: 'cat-1',
    name: 'Buttons',
    slug: 'buttons',
    description: 'Clickable button variants.',
    position: 0,
    componentCount: 3,
    ...overrides,
  };
}

const TWO_CATEGORIES: CategoryDto[] = [
  makeCategory({ id: '1', name: 'Buttons', position: 0, componentCount: 3 }),
  makeCategory({ id: '2', name: 'Loaders', slug: 'loaders', position: 1, componentCount: 0 }),
];

function renderView() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CategoriesListView />
    </QueryClientProvider>,
  );
}

async function renderWithData(): Promise<void> {
  getToken.mockResolvedValue('token-123');
  getCategories.mockResolvedValue({ data: TWO_CATEGORIES });
  renderView();
  await waitFor(() => {
    expect(screen.getByText('Buttons')).not.toBeNull();
  });
}

afterEach(() => {
  cleanup();
  getToken.mockReset();
  getCategories.mockReset();
  createCategory.mockReset();
  updateCategory.mockReset();
  deleteCategory.mockReset();
});

describe('CategoriesListView — estados (seção 5.4 do MVP2)', () => {
  it('mostra o estado de carregamento antes da resposta chegar', () => {
    getCategories.mockReturnValue(new Promise(() => {}));

    renderView();

    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
  });

  it('mostra erro recuperável quando a API falha', async () => {
    getCategories.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'));

    renderView();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/couldn.t load categories/i);
    });
  });

  it('mostra estado vazio quando não há nenhuma categoria cadastrada', async () => {
    getCategories.mockResolvedValue({ data: [] });

    renderView();

    await waitFor(() => {
      expect(screen.getByText(/no categories yet/i)).not.toBeNull();
    });
  });

  it('lista nome, slug e contagem de componentes de cada categoria', async () => {
    await renderWithData();

    expect(screen.getByText('Loaders')).not.toBeNull();
    expect(screen.getByText('loaders')).not.toBeNull();
    expect(screen.getByText('3')).not.toBeNull();
  });
});

describe('CategoriesListView — criar/editar via diálogo (seção 5.4/7 do MVP2)', () => {
  it('abre o diálogo de criação, envia o formulário e fecha ao terminar', async () => {
    await renderWithData();
    createCategory.mockResolvedValue({
      data: makeCategory({ id: 'new-id', name: 'Cards', slug: 'cards', position: 2, componentCount: 0 }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'New category' }));
    expect(screen.getByRole('dialog').textContent).toContain('New category');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Cards' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create category' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(createCategory).toHaveBeenCalledWith(expect.objectContaining({ name: 'Cards' }), 'token-123');
  });

  it('abre o diálogo de edição pré-preenchido com os dados da linha', async () => {
    await renderWithData();

    const editButtons = screen.getAllByRole('button', { name: 'Edit' });
    fireEvent.click(editButtons[0]!);

    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Buttons');
    expect((screen.getByLabelText('Slug') as HTMLInputElement).value).toBe('buttons');
  });
});

describe('CategoriesListView — exclusão (seção 5.4 do MVP2)', () => {
  it('exclui a categoria com sucesso após confirmação', async () => {
    await renderWithData();
    deleteCategory.mockResolvedValue(undefined);

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(deleteCategory).toHaveBeenCalledWith('1', 'token-123');
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('em 409 CATEGORY_IN_USE, mantém a categoria, mostra a mensagem exata da API e não fecha o diálogo', async () => {
    await renderWithData();
    deleteCategory.mockRejectedValue(
      new ApiError(409, 'CATEGORY_IN_USE', 'Category has associated components', { componentCount: 3 }),
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
    fireEvent.click(deleteButtons[0]!);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toContain('Category has associated components');
    });
    // Diálogo continua aberto — a categoria segue na lista, nada de cascade/força.
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText('Buttons')).not.toBeNull();
  });
});
