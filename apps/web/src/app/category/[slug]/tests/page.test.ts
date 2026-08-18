import type { CategoryDto } from '@uilib/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategories = vi.fn();
const getComponents = vi.fn();
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    serverApi: { getCategories, getComponents },
  };
});

vi.mock('next/navigation', () => ({ notFound }));

// Importado depois dos mocks acima, para pegar `@/lib/api-client`/`next/navigation` já mockados.
const { default: CategoryPage, generateMetadata, generateStaticParams } = await import('../page');

function makeCategory(overrides: Partial<CategoryDto> = {}): CategoryDto {
  return {
    id: 'cat-1',
    name: 'Buttons',
    slug: 'buttons',
    description: 'Clickable buttons of every shape.',
    position: 0,
    componentCount: 3,
    ...overrides,
  };
}

const EMPTY_META = { page: 1, limit: 24, total: 0, totalPages: 0 };

beforeEach(() => {
  getCategories.mockReset();
  getComponents.mockReset();
  notFound.mockClear();
});

describe('generateStaticParams (seção 7 do MVP2: pré-renderiza os slugs conhecidos)', () => {
  it('mapeia cada categoria existente para { slug }', async () => {
    getCategories.mockResolvedValue({
      data: [makeCategory({ slug: 'buttons' }), makeCategory({ id: 'cat-2', slug: 'cards' })],
    });

    await expect(generateStaticParams()).resolves.toEqual([{ slug: 'buttons' }, { slug: 'cards' }]);
  });

  it('não gera nenhum param quando não há categorias', async () => {
    getCategories.mockResolvedValue({ data: [] });

    await expect(generateStaticParams()).resolves.toEqual([]);
  });
});

describe('generateMetadata (SEO específico por categoria)', () => {
  it('usa nome e descrição da categoria no título/description', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory()] });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'buttons' }) });

    expect(metadata.title).toBe('Buttons — UI Library');
    expect(metadata.description).toBe('Clickable buttons of every shape.');
  });

  it('devolve metadata vazia quando a categoria não existe (a página resolve o 404)', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory()] });

    const metadata = await generateMetadata({ params: Promise.resolve({ slug: 'unknown' }) });

    expect(metadata).toEqual({});
  });
});

describe('CategoryPage — caso 404 (seção 7 do MVP2)', () => {
  it('chama notFound() quando o slug não corresponde a nenhuma categoria, sem buscar componentes', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory({ slug: 'buttons' })] });

    await expect(
      CategoryPage({
        params: Promise.resolve({ slug: 'does-not-exist' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalledTimes(1);
    expect(getComponents).not.toHaveBeenCalled();
  });

  it('não chama notFound() quando a categoria existe e busca os componentes filtrados por ela', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory({ slug: 'buttons' })] });
    getComponents.mockResolvedValue({ data: [], meta: EMPTY_META });

    await CategoryPage({
      params: Promise.resolve({ slug: 'buttons' }),
      searchParams: Promise.resolve({}),
    });

    expect(notFound).not.toHaveBeenCalled();
    expect(getComponents).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'buttons', page: 1, sort: 'recent' }),
      expect.anything(),
    );
  });

  it('trata 404 da API de componentes (categoria removida entre as duas chamadas) como não encontrado', async () => {
    const { ApiError } = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
    getCategories.mockResolvedValue({ data: [makeCategory({ slug: 'buttons' })] });
    getComponents.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Category "buttons" not found'));

    await expect(
      CategoryPage({
        params: Promise.resolve({ slug: 'buttons' }),
        searchParams: Promise.resolve({}),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
