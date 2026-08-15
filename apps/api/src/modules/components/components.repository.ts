import { Prisma } from '@prisma/client';

import { prisma } from '../../lib/prisma.js';

/** Campos devolvidos para a listagem pública — inclui o preview completo (seção 7 do MVP1). */
const LIST_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  technologies: true,
  html: true,
  css: true,
  js: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ComponentSelect;

/**
 * Campos devolvidos para o detalhe. Inclui `promptTemplate` porque o
 * service precisa dele para renderizar o prompt — o mapper é quem garante
 * que esse campo (e `authorId`) nunca chega na resposta pública.
 */
const DETAIL_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  technologies: true,
  html: true,
  css: true,
  js: true,
  promptTemplate: true,
  createdAt: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ComponentSelect;

export type ComponentListRow = Prisma.ComponentGetPayload<{ select: typeof LIST_SELECT }>;
export type ComponentDetailRow = Prisma.ComponentGetPayload<{ select: typeof DETAIL_SELECT }>;

export interface FindPublishedParams {
  q?: string;
  categoryId?: string;
  page: number;
  limit: number;
  sort: 'recent' | 'name';
}

/** Busca uma categoria pelo slug — só o `id`, para filtrar a listagem e checar 404 (seção 7). */
export function findCategoryIdBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug }, select: { id: true } });
}

/**
 * Lista componentes publicados com busca/paginação/ordenação (seção 7 do
 * MVP1). `q` usa `ILIKE` (`mode: 'insensitive'`) em `name` OU `description`,
 * acelerado pelos índices GIN trigram já criados (seção 5) — dispensa
 * tsvector ou serviço de busca externo.
 */
export async function findManyPublished(
  params: FindPublishedParams,
): Promise<{ items: ComponentListRow[]; total: number }> {
  const where: Prisma.ComponentWhereInput = {
    status: 'PUBLISHED',
    ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    ...(params.q
      ? {
          OR: [
            { name: { contains: params.q, mode: 'insensitive' } },
            { description: { contains: params.q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ComponentOrderByWithRelationInput =
    params.sort === 'name' ? { name: 'asc' } : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.component.findMany({
      where,
      orderBy,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      select: LIST_SELECT,
    }),
    prisma.component.count({ where }),
  ]);

  return { items, total };
}

/** Componente publicado pelo slug — `null` se não existir ou não estiver `PUBLISHED`. */
export function findPublishedBySlug(slug: string): Promise<ComponentDetailRow | null> {
  return prisma.component.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: DETAIL_SELECT,
  });
}

/**
 * Componente pelo slug, de qualquer status (`DRAFT` incluso). Só deve ser
 * chamada quando `preview=1` já foi confirmado com autenticação admin
 * válida — a checagem de quem pode ver DRAFT é responsabilidade do service,
 * não deste repository.
 */
export function findAnyBySlug(slug: string): Promise<ComponentDetailRow | null> {
  return prisma.component.findUnique({
    where: { slug },
    select: DETAIL_SELECT,
  });
}

/**
 * Campos devolvidos pelos endpoints administrativos (`/api/admin/components`,
 * seção 7 do MVP1). Ao contrário de `DETAIL_SELECT`, inclui `categoryId`,
 * `status`, `publishedAt` e `authorId` — dados internos necessários para
 * editar o componente, mas que nunca aparecem nos DTOs públicos.
 */
const ADMIN_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  categoryId: true,
  category: { select: { name: true, slug: true } },
  html: true,
  css: true,
  js: true,
  technologies: true,
  promptTemplate: true,
  status: true,
  publishedAt: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ComponentSelect;

export type AdminComponentRow = Prisma.ComponentGetPayload<{ select: typeof ADMIN_SELECT }>;

/** Todos os componentes, qualquer status (seção 7: "Listar todos, inclusive DRAFT"). */
export function findAllForAdmin(): Promise<AdminComponentRow[]> {
  return prisma.component.findMany({ orderBy: { createdAt: 'desc' }, select: ADMIN_SELECT });
}

/** Componente por `id`, qualquer status — usado para carregar/editar/apagar. */
export function findByIdForAdmin(id: string): Promise<AdminComponentRow | null> {
  return prisma.component.findUnique({ where: { id }, select: ADMIN_SELECT });
}

/** Só o `id` pelo slug — usado para checar unicidade sem carregar o componente inteiro. */
export function findIdBySlug(slug: string): Promise<{ id: string } | null> {
  return prisma.component.findUnique({ where: { slug }, select: { id: true } });
}

export function createComponentRecord(
  data: Prisma.ComponentUncheckedCreateInput,
): Promise<AdminComponentRow> {
  return prisma.component.create({ data, select: ADMIN_SELECT });
}

export function updateComponentRecord(
  id: string,
  data: Prisma.ComponentUncheckedUpdateInput,
): Promise<AdminComponentRow> {
  return prisma.component.update({ where: { id }, data, select: ADMIN_SELECT });
}

/**
 * Hard delete (seção 7 do MVP1 — sem soft delete). Devolve `false` em vez de
 * lançar quando o `id` não existe (Prisma `P2025`), para o service decidir
 * o 404 sem precisar de uma consulta extra antes de apagar.
 */
export async function deleteComponentRecord(id: string): Promise<boolean> {
  try {
    await prisma.component.delete({ where: { id } });
    return true;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return false;
    }
    throw error;
  }
}

/**
 * Upsert preguiçoso do usuário admin autenticado (seção 7 e 9 do MVP1): a
 * primeira escrita cria o `User`; escritas seguintes só atualizam o e-mail.
 * `clerkId` recebe `auth.userId` — no MVP1 é sempre "dev-admin", mas o campo
 * já fica pronto para o `userId` real do Clerk no MVP2, sem mudar o service.
 */
export async function upsertAuthor(auth: { userId: string; email: string }): Promise<string> {
  const user = await prisma.user.upsert({
    where: { clerkId: auth.userId },
    update: { email: auth.email },
    create: { clerkId: auth.userId, email: auth.email },
    select: { id: true },
  });
  return user.id;
}
