// @vitest-environment jsdom
import type { AdminComponentDto } from '@uilib/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const getToken = vi.fn();
const listComponents = vi.fn();

vi.mock('@clerk/nextjs', () => ({ useAuth: () => ({ getToken }) }));

vi.mock('@/lib/api-client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api-client')>('@/lib/api-client');
  return { ...actual, adminApi: { listComponents } };
});

// Importado depois dos mocks acima, para pegar `@clerk/nextjs`/`@/lib/api-client` já mockados.
const { AdminDashboard } = await import('../AdminDashboard');
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

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminDashboard />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  getToken.mockReset();
  listComponents.mockReset();
});

describe('AdminDashboard — dados e estados (seção 5.4 do MVP2)', () => {
  it('mostra o estado de carregamento antes da resposta chegar', () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockReturnValue(new Promise(() => {})); // nunca resolve neste teste

    renderDashboard();

    expect(screen.getByRole('status').textContent).toMatch(/loading/i);
  });

  it('mostra erro recuperável quando a API falha, sem travar em carregamento', async () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'boom'));

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('alert').textContent).toMatch(/couldn.t load the dashboard/i);
    });
  });

  it('mostra estado vazio quando não há nenhum componente', async () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockResolvedValue({ data: [] });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/no components yet/i)).not.toBeNull();
    });
  });

  it('calcula e mostra a contagem por status e por categoria a partir da listagem real', async () => {
    getToken.mockResolvedValue('token-123');
    listComponents.mockResolvedValue({
      data: [
        makeComponent({ id: '1', status: 'PUBLISHED', category: { name: 'Buttons', slug: 'buttons' } }),
        makeComponent({ id: '2', status: 'PUBLISHED', category: { name: 'Buttons', slug: 'buttons' } }),
        makeComponent({ id: '3', status: 'DRAFT', category: { name: 'Cards', slug: 'cards' } }),
      ],
    });

    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('3')).not.toBeNull(); // total
    });
    expect(screen.getByText('Buttons')).not.toBeNull();
    expect(screen.getByText('Cards')).not.toBeNull();
    // Duas contagens "2" na tela: status Published e categoria Buttons.
    expect(screen.getAllByText('2')).toHaveLength(2);
    // Duas contagens "1": status Draft e categoria Cards.
    expect(screen.getAllByText('1')).toHaveLength(2);
  });

  it('busca um token do Clerk no momento da chamada, não um valor fixo/cacheado à parte', async () => {
    getToken.mockResolvedValue('fresh-token');
    listComponents.mockResolvedValue({ data: [] });

    renderDashboard();

    await waitFor(() => {
      expect(listComponents).toHaveBeenCalledWith('fresh-token');
    });
    expect(getToken).toHaveBeenCalledTimes(1);
  });
});
