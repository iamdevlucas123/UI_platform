// @vitest-environment jsdom
import type { ComponentListItemDto, PaginationMeta } from '@uilib/shared';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

const { CatalogGrid } = await import('../CatalogGrid');

function makeItem(overrides: Partial<ComponentListItemDto> = {}): ComponentListItemDto {
  return {
    id: 'c1',
    name: 'Neon Toggle',
    slug: 'neon-toggle',
    description: 'A toggle with neon glow',
    technologies: [],
    category: { name: 'Toggles', slug: 'toggles' },
    preview: { html: '<button>Toggle</button>', css: '', js: null },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const META: PaginationMeta = { page: 1, limit: 24, total: 1, totalPages: 1 };

afterEach(() => {
  cleanup();
  refresh.mockClear();
});

describe('CatalogGrid — estados principais (seção 5.1 do MVP2)', () => {
  it('renderiza o grid quando há itens', () => {
    render(
      <CatalogGrid
        data={[makeItem()]}
        meta={META}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole('link', { name: /Neon Toggle/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renderiza o estado de vazio quando data é um array vazio', () => {
    render(
      <CatalogGrid
        data={[]}
        meta={{ ...META, total: 0 }}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByText('No components published yet.')).toBeTruthy();
  });

  it('estado de vazio com filtros ativos oferece limpar filtros', () => {
    render(
      <CatalogGrid
        data={[]}
        meta={{ ...META, total: 0 }}
        error={false}
        currentSearchParams={new URLSearchParams('q=zzz')}
        hasActiveFilters
      />,
    );

    expect(screen.getByText('No components match your search or filters.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Clear search and filters/ })).toBeTruthy();
  });

  it('erro recuperável: sem dado anterior, mostra estado de erro com retry', () => {
    render(
      <CatalogGrid
        data={null}
        meta={null}
        error
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText("Couldn't load components right now.")).toBeTruthy();

    screen.getByRole('button', { name: 'Try again' }).click();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('banner discreto: mantém os últimos dados bons quando um refetch falha', () => {
    const goodItem = makeItem({ id: 'good', name: 'Good Result' });
    const { rerender } = render(
      <CatalogGrid
        data={[goodItem]}
        meta={META}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole('link', { name: /Good Result/ })).toBeTruthy();

    // Simula uma navegação (ex.: mudar de página) cujo refetch falhou.
    rerender(
      <CatalogGrid
        data={null}
        meta={null}
        error
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    // O conteúdo anterior continua na tela — não vira o estado de erro cheio.
    expect(screen.getByRole('link', { name: /Good Result/ })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(
      screen.getByText("Showing previously loaded results — couldn't refresh just now."),
    ).toBeTruthy();
  });

  it('volta ao normal (sem banner) assim que um novo refetch tem sucesso', () => {
    const { rerender } = render(
      <CatalogGrid
        data={[makeItem({ id: 'a', name: 'Item A' })]}
        meta={META}
        error
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    rerender(
      <CatalogGrid
        data={[makeItem({ id: 'b', name: 'Item B' })]}
        meta={META}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole('link', { name: /Item B/ })).toBeTruthy();
    expect(screen.queryByText(/Showing previously loaded results/)).toBeNull();
  });

  it('não renderiza paginação quando há só uma página', () => {
    render(
      <CatalogGrid
        data={[makeItem()]}
        meta={{ page: 1, limit: 24, total: 1, totalPages: 1 }}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.queryByRole('navigation', { name: 'Pagination' })).toBeNull();
  });

  it('renderiza paginação quando há mais de uma página', () => {
    render(
      <CatalogGrid
        data={[makeItem()]}
        meta={{ page: 1, limit: 24, total: 50, totalPages: 3 }}
        error={false}
        currentSearchParams={new URLSearchParams()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeTruthy();
    expect(screen.getByText('Page 1 of 3')).toBeTruthy();
  });
});
