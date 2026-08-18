import { describe, expect, it } from 'vitest';

import { buildCatalogHref, parseCatalogQuery, toURLSearchParams } from '../catalog-url';

describe('toURLSearchParams', () => {
  it('converte um record simples em URLSearchParams', () => {
    const params = toURLSearchParams({ q: 'toggle', page: '2' });
    expect(params.get('q')).toBe('toggle');
    expect(params.get('page')).toBe('2');
  });

  it('ignora undefined e usa o primeiro valor de um array (param duplicado na URL)', () => {
    const params = toURLSearchParams({ q: undefined, category: ['buttons', 'cards'] });
    expect(params.has('q')).toBe(false);
    expect(params.get('category')).toBe('buttons');
  });
});

describe('parseCatalogQuery', () => {
  it('aplica os defaults do schema compartilhado quando a URL não tem filtros', () => {
    const query = parseCatalogQuery(new URLSearchParams());
    expect(query).toEqual({ page: 1, limit: 24, sort: 'recent' });
  });

  it('coage "page" de string para número', () => {
    const query = parseCatalogQuery(new URLSearchParams('page=3'));
    expect(query.page).toBe(3);
  });

  it('cai nos defaults em vez de quebrar quando um parâmetro é inválido', () => {
    const query = parseCatalogQuery(new URLSearchParams('page=not-a-number'));
    expect(query).toEqual({ page: 1, limit: 24, sort: 'recent' });
  });

  it('preserva q/category/sort válidos', () => {
    const query = parseCatalogQuery(new URLSearchParams('q=neon&category=buttons&sort=name'));
    expect(query).toMatchObject({ q: 'neon', category: 'buttons', sort: 'name' });
  });
});

describe('buildCatalogHref', () => {
  it('retorna só o pathname quando não há nenhum parâmetro', () => {
    expect(buildCatalogHref('/', new URLSearchParams(), {})).toBe('/');
  });

  it('preserva os demais parâmetros ao atualizar apenas um filtro', () => {
    const current = new URLSearchParams('category=buttons&sort=name');
    const href = buildCatalogHref('/', current, { q: 'neon' });
    expect(href).toBe('/?category=buttons&sort=name&q=neon');
  });

  it('nunca inclui sort=recent (default) na URL', () => {
    expect(buildCatalogHref('/', new URLSearchParams(), { sort: 'recent' })).toBe('/');
  });

  it('nunca inclui page=1 (default) na URL', () => {
    expect(buildCatalogHref('/', new URLSearchParams(), { page: 1 })).toBe('/');
  });

  it('inclui page quando maior que 1', () => {
    expect(buildCatalogHref('/', new URLSearchParams(), { page: 3 })).toBe('/?page=3');
  });

  it('remove page da URL ao trocar q/category/sort (novo conjunto de resultados)', () => {
    const current = new URLSearchParams('page=5&category=buttons');
    const href = buildCatalogHref('/', current, { q: 'neon' });
    expect(href).toBe('/?category=buttons&q=neon');
  });

  it('não mexe em page quando a própria mudança é de página', () => {
    const current = new URLSearchParams('q=neon&page=2');
    const href = buildCatalogHref('/', current, { page: 3 });
    expect(href).toBe('/?q=neon&page=3');
  });

  it('remove um filtro quando o novo valor é undefined ou string vazia', () => {
    const current = new URLSearchParams('q=neon&category=buttons');
    expect(buildCatalogHref('/', current, { q: undefined })).toBe('/?category=buttons');
    expect(buildCatalogHref('/', current, { category: '' })).toBe('/?q=neon');
  });

  // `/category/[slug]` (seção 7 do MVP2) reaproveita esta mesma função com
  // `pathname` diferente de '/' — Pagination/SortToggle/CategoryNav passam
  // a rota da categoria em vez da home.
  describe('reaproveitada por /category/[slug] com um pathname diferente de "/"', () => {
    it('monta o href sob a rota da categoria em vez de "/"', () => {
      expect(buildCatalogHref('/category/buttons', new URLSearchParams(), { page: 2 })).toBe(
        '/category/buttons?page=2',
      );
    });

    it('preserva q/sort ao trocar de página dentro da categoria', () => {
      const current = new URLSearchParams('q=neon&sort=name&page=2');
      expect(buildCatalogHref('/category/buttons', current, { page: 3 })).toBe(
        '/category/buttons?q=neon&sort=name&page=3',
      );
    });

    it('remove "category" da querystring — a categoria já está no path, não deve duplicar como filtro', () => {
      const current = new URLSearchParams('category=buttons&sort=name');
      expect(buildCatalogHref('/category/buttons', current, { category: undefined })).toBe(
        '/category/buttons?sort=name',
      );
    });
  });
});
