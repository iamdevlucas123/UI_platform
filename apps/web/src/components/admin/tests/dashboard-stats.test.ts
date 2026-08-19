import type { AdminComponentDto } from '@uilib/shared';
import { describe, expect, it } from 'vitest';

import { computeDashboardStats } from '../dashboard-stats';

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

describe('computeDashboardStats (seção 5.4 do MVP2: agregado calculado no cliente, sem endpoint dedicado)', () => {
  it('devolve zeros para todos os status quando a listagem está vazia', () => {
    const stats = computeDashboardStats([]);

    expect(stats).toEqual({ total: 0, byStatus: { DRAFT: 0, PUBLISHED: 0 }, byCategory: [] });
  });

  it('conta corretamente por status, incluindo status sem nenhum componente', () => {
    const stats = computeDashboardStats([
      makeComponent({ id: '1', status: 'PUBLISHED' }),
      makeComponent({ id: '2', status: 'PUBLISHED' }),
      makeComponent({ id: '3', status: 'DRAFT' }),
    ]);

    expect(stats.total).toBe(3);
    expect(stats.byStatus).toEqual({ DRAFT: 1, PUBLISHED: 2 });
  });

  it('agrupa por categoria (slug) e ordena da maior para a menor contagem', () => {
    const stats = computeDashboardStats([
      makeComponent({ id: '1', category: { name: 'Buttons', slug: 'buttons' } }),
      makeComponent({ id: '2', category: { name: 'Buttons', slug: 'buttons' } }),
      makeComponent({ id: '3', category: { name: 'Cards', slug: 'cards' } }),
    ]);

    expect(stats.byCategory).toEqual([
      { name: 'Buttons', slug: 'buttons', count: 2 },
      { name: 'Cards', slug: 'cards', count: 1 },
    ]);
  });
});
