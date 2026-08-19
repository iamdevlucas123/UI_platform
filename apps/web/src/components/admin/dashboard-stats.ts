import { componentStatusSchema, type AdminComponentDto, type ComponentStatus } from '@uilib/shared';

export interface CategoryCount {
  name: string;
  slug: string;
  count: number;
}

export interface DashboardStats {
  total: number;
  byStatus: Record<ComponentStatus, number>;
  byCategory: CategoryCount[];
}

/**
 * Contagem por status e por categoria (seção 5.4 do MVP2). A API não expõe
 * um agregado — `GET /api/admin/components` só devolve a listagem completa
 * (seção 4) — então esta função calcula os dois totais explicitamente a
 * partir dela, em vez de inventar um endpoint de estatísticas.
 * `componentStatusSchema.options` (`@uilib/shared`) é reaproveitado para os
 * status possíveis, em vez de duplicar `['DRAFT', 'PUBLISHED']` aqui.
 */
export function computeDashboardStats(components: AdminComponentDto[]): DashboardStats {
  const byStatus = Object.fromEntries(
    componentStatusSchema.options.map((status) => [status, 0]),
  ) as Record<ComponentStatus, number>;

  const byCategory = new Map<string, CategoryCount>();

  for (const component of components) {
    byStatus[component.status] += 1;

    const existing = byCategory.get(component.category.slug);
    if (existing) {
      existing.count += 1;
    } else {
      byCategory.set(component.category.slug, {
        name: component.category.name,
        slug: component.category.slug,
        count: 1,
      });
    }
  }

  return {
    total: components.length,
    byStatus,
    byCategory: [...byCategory.values()].sort((a, b) => b.count - a.count),
  };
}
