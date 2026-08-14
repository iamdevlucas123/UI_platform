import { z } from 'zod';

import { slugSchema } from './component.js';

/**
 * Campos de `Category` compartilhados entre criação e atualização. Sem
 * `.default()` pelo mesmo motivo do componente (ver `component.ts`): a
 * atualização parcial precisa distinguir "campo ausente" de "aplicar valor
 * padrão".
 */
const categoryShape = {
  name: z.string().min(2).max(50),
  // Opcional: quando ausente, o service deriva o slug a partir do name (seção 7).
  slug: slugSchema.optional(),
  description: z.string().max(300).optional(),
  position: z.number().int(),
};

/** `POST /api/admin/categories` — corpo de criação (seção 7). */
export const createCategorySchema = z.object({
  ...categoryShape,
  position: categoryShape.position.default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * `PUT /api/admin/categories/:id` — campos parciais (seção 7). Body vazio é
 * rejeitado pelo mesmo motivo da atualização de componente.
 */
export const updateCategorySchema = z
  .object(categoryShape)
  .partial()
  .refine((data) => Object.keys(data).length > 0, 'Provide at least one field to update');

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
