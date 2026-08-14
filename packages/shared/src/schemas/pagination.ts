import { z } from 'zod';

import { slugSchema } from './component.js';

/** Critério de ordenação da listagem pública de componentes (seção 7). */
export const componentSortSchema = z.enum(['recent', 'name']);

/**
 * `GET /api/components` — query pública de listagem/pesquisa (seção 7).
 * `limit` tem teto 48: a listagem inclui o preview (`html`/`css`/`js`) de
 * cada item para renderização ao vivo nos cards, então o payload precisa de
 * um limite superior explícito. A existência da categoria (404) depende do
 * banco e é responsabilidade do service, não do schema.
 */
export const listComponentsQuerySchema = z.object({
  q: z.string().min(1).max(100).optional(),
  category: slugSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(24),
  sort: componentSortSchema.default('recent'),
});

export type ListComponentsQuery = z.infer<typeof listComponentsQuerySchema>;
