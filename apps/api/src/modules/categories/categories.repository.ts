import { prisma } from '../../lib/prisma.js';

/**
 * Categorias ordenadas por `position` (ordem do menu, seção 5 do MVP1), com
 * a contagem de componentes já filtrada para `PUBLISHED` pelo próprio
 * Prisma via `_count` com `where` — evita carregar os componentes e contar
 * em memória (seção 7 do MVP1).
 */
export function findAllOrderedByPosition() {
  return prisma.category.findMany({
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      position: true,
      _count: {
        select: { components: { where: { status: 'PUBLISHED' } } },
      },
    },
  });
}

/** Shape devolvido por `findAllOrderedByPosition` — usado pelo mapper. */
export type CategoryWithPublishedCount = Awaited<
  ReturnType<typeof findAllOrderedByPosition>
>[number];

/**
 * Só checa a existência da categoria pelo `id` — usado pelo service
 * administrativo de componentes ao validar `categoryId` no create/update
 * (seção 7 do MVP1: 422 se a categoria não existir).
 */
export async function existsById(id: string): Promise<boolean> {
  const category = await prisma.category.findUnique({ where: { id }, select: { id: true } });
  return category !== null;
}
