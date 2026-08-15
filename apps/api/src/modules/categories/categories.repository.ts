import type { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

/**
 * Campos devolvidos tanto pela listagem pública quanto pelas respostas
 * administrativas (seção 7 do MVP1) — a categoria não tem campos internos a
 * esconder (ao contrário de `Component`), então um único select serve para
 * os dois casos. `_count` já filtra `PUBLISHED`, igual à listagem pública.
 */
const CATEGORY_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  position: true,
  _count: {
    select: { components: { where: { status: 'PUBLISHED' } } },
  },
} satisfies Prisma.CategorySelect;

export type CategoryWithPublishedCount = Prisma.CategoryGetPayload<{
  select: typeof CATEGORY_SELECT;
}>;

/**
 * Categorias ordenadas por `position` (ordem do menu, seção 5 do MVP1), com
 * a contagem de componentes já filtrada para `PUBLISHED` pelo próprio
 * Prisma via `_count` com `where` — evita carregar os componentes e contar
 * em memória (seção 7 do MVP1).
 */
export function findAllOrderedByPosition(): Promise<CategoryWithPublishedCount[]> {
  return prisma.category.findMany({ orderBy: { position: 'asc' }, select: CATEGORY_SELECT });
}

/**
 * Só checa a existência da categoria pelo `id` — usado pelo service
 * administrativo de componentes ao validar `categoryId` no create/update
 * (seção 7 do MVP1: 422 se a categoria não existir).
 */
export async function existsById(id: string): Promise<boolean> {
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  return category !== null;
}

/** Categoria por `id`, com a mesma contagem da listagem — usada pela edição administrativa. */
export function findById(id: string): Promise<CategoryWithPublishedCount | null> {
  return prisma.category.findUnique({ where: { id }, select: CATEGORY_SELECT });
}

/** Só o `id` pelo `name` — usado para checar unicidade sem carregar a categoria inteira. */
export function findIdByName(name: string): Promise<{ id: string } | null> {
  return prisma.category.findUnique({ where: { name }, select: { id: true } });
}

/** Só o `id` pelo `slug` — mesmo propósito de `findIdByName`, para o outro campo único. */
export function findIdBySlug(slug: string): Promise<{ id: string } | null> {
  return prisma.category.findUnique({ where: { slug }, select: { id: true } });
}

export function createCategoryRecord(
  data: Prisma.CategoryUncheckedCreateInput,
): Promise<CategoryWithPublishedCount> {
  return prisma.category.create({ data, select: CATEGORY_SELECT });
}

export function updateCategoryRecord(
  id: string,
  data: Prisma.CategoryUncheckedUpdateInput,
): Promise<CategoryWithPublishedCount> {
  return prisma.category.update({ where: { id }, data, select: CATEGORY_SELECT });
}

/**
 * Total de componentes associados, **qualquer status** — ao contrário do
 * `componentCount` público (só `PUBLISHED`), a checagem de "categoria em
 * uso" antes do delete (seção 7 do MVP1) precisa refletir a restrição real
 * de integridade (`onDelete: Restrict` no schema): mesmo um `DRAFT` sozinho
 * já impede a exclusão.
 */
export function countComponentsByCategoryId(categoryId: string): Promise<number> {
  return prisma.component.count({ where: { categoryId } });
}

/** Hard delete (seção 7 do MVP1 — sem soft delete, sem cascade). */
export async function deleteCategoryRecord(id: string): Promise<void> {
  await prisma.category.delete({ where: { id } });
}
