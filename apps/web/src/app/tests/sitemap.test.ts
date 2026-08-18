import type { CategoryDto, ComponentListItemDto } from '@uilib/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getCategories = vi.fn();
const getComponents = vi.fn();

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return {
    ...actual,
    serverApi: { getCategories, getComponents },
  };
});

// Importado depois do mock acima, para pegar `@/lib/api-client` já mockado.
const { default: sitemap } = await import('../sitemap');

function makeCategory(overrides: Partial<CategoryDto> = {}): CategoryDto {
  return {
    id: 'cat-1',
    name: 'Buttons',
    slug: 'buttons',
    description: null,
    position: 0,
    componentCount: 1,
    ...overrides,
  };
}

function makeComponent(overrides: Partial<ComponentListItemDto> = {}): ComponentListItemDto {
  return {
    id: 'c1',
    name: 'Neon Toggle',
    slug: 'neon-toggle',
    description: 'A toggle with neon glow',
    technologies: [],
    category: { name: 'Buttons', slug: 'buttons' },
    preview: { html: '<button>Toggle</button>', css: '', js: null },
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  getCategories.mockReset();
  getComponents.mockReset();
});

describe('sitemap (seção 7 do MVP2: URLs públicas reais — home, categorias e componentes publicados)', () => {
  it('inclui a home, cada categoria e cada componente publicado', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory({ slug: 'buttons' })] });
    getComponents.mockResolvedValue({
      data: [makeComponent({ slug: 'neon-toggle' })],
      meta: { page: 1, limit: 48, total: 1, totalPages: 1 },
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('http://localhost:3000');
    expect(urls).toContain('http://localhost:3000/category/buttons');
    expect(urls).toContain('http://localhost:3000/component/neon-toggle');
  });

  it('usa createdAt do componente como lastModified', async () => {
    getCategories.mockResolvedValue({ data: [] });
    getComponents.mockResolvedValue({
      data: [makeComponent({ slug: 'neon-toggle', createdAt: '2026-01-15T00:00:00.000Z' })],
      meta: { page: 1, limit: 48, total: 1, totalPages: 1 },
    });

    const entries = await sitemap();
    const componentEntry = entries.find((entry) => entry.url.endsWith('/component/neon-toggle'));

    expect(componentEntry?.lastModified).toBe('2026-01-15T00:00:00.000Z');
  });

  it('pagina até esgotar meta.totalPages e nunca inclui um DRAFT (o endpoint público só devolve PUBLISHED)', async () => {
    getCategories.mockResolvedValue({ data: [] });
    getComponents
      .mockResolvedValueOnce({
        data: [makeComponent({ slug: 'page-1-item' })],
        meta: { page: 1, limit: 48, total: 2, totalPages: 2 },
      })
      .mockResolvedValueOnce({
        data: [makeComponent({ slug: 'page-2-item' })],
        meta: { page: 2, limit: 48, total: 2, totalPages: 2 },
      });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain('http://localhost:3000/component/page-1-item');
    expect(urls).toContain('http://localhost:3000/component/page-2-item');
    expect(getComponents).toHaveBeenCalledTimes(2);
  });

  it('não inclui nenhuma URL de /admin, /sign-in ou com ?preview=', async () => {
    getCategories.mockResolvedValue({ data: [makeCategory()] });
    getComponents.mockResolvedValue({
      data: [makeComponent()],
      meta: { page: 1, limit: 48, total: 1, totalPages: 1 },
    });

    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.includes('/admin'))).toBe(false);
    expect(urls.some((url) => url.includes('/sign-in'))).toBe(false);
    expect(urls.some((url) => url.includes('preview'))).toBe(false);
  });
});
