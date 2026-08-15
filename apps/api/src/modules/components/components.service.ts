import {
  componentPromptQuerySchema,
  type CreateComponentInput,
  type ListComponentsQuery,
  type PaginationMeta,
  type UpdateComponentInput,
} from '@uilib/shared';

import { env } from '../../config/env.js';
import { ConflictError, NotFoundError, UnprocessableEntityError } from '../../lib/errors.js';
import { slugify } from '../../lib/slug.js';
import { existsById as categoryExistsById } from '../categories/categories.repository.js';
import type { AuthContext } from '../../types/express.js';
import { renderPrompt, type RenderPromptInput } from '../prompts/prompt.service.js';
import {
  createComponentRecord,
  deleteComponentRecord,
  findAllForAdmin,
  findAnyBySlug,
  findByIdForAdmin,
  findCategoryIdBySlug,
  findIdBySlug,
  findManyPublished,
  findPublishedBySlug,
  updateComponentRecord,
  upsertAuthor,
  type AdminComponentRow,
  type ComponentDetailRow,
} from './components.repository.js';
import {
  toAdminComponentDto,
  toComponentDetailDto,
  toComponentListItemDto,
  type AdminComponentDto,
  type ComponentDetailDto,
  type ComponentListItemDto,
} from './components.mapper.js';

export interface ListComponentsResult {
  items: ComponentListItemDto[];
  meta: PaginationMeta;
}

/**
 * Lista componentes `PUBLISHED` (seção 7 do MVP1). Se `category` vier na
 * query, resolve o slug para `id` antes de filtrar — categoria inexistente
 * vira 404 aqui, não silenciosamente uma lista vazia.
 */
export async function listPublishedComponents(
  query: ListComponentsQuery,
): Promise<ListComponentsResult> {
  let categoryId: string | undefined;

  if (query.category) {
    const category = await findCategoryIdBySlug(query.category);
    if (!category) {
      throw new NotFoundError(`Category "${query.category}" not found`);
    }
    categoryId = category.id;
  }

  const { items, total } = await findManyPublished({
    q: query.q,
    categoryId,
    page: query.page,
    limit: query.limit,
    sort: query.sort,
  });

  const meta: PaginationMeta = {
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };

  return { items: items.map(toComponentListItemDto), meta };
}

/**
 * Monta a entrada do `renderPrompt` a partir da linha do repository — usado
 * tanto pelo detalhe (defaults React + Tailwind) quanto pelo endpoint
 * dedicado de prompt (framework/styling escolhidos pelo cliente).
 */
function toRenderPromptInput(
  component: ComponentDetailRow,
  targetFramework: string,
  targetStyling: string,
): RenderPromptInput {
  return {
    name: component.name,
    category: component.category.name,
    description: component.description,
    technologies: component.technologies,
    html: component.html,
    css: component.css,
    js: component.js,
    promptTemplate: component.promptTemplate,
    targetFramework,
    targetStyling,
    sourceUrl: `${env.WEB_ORIGIN}/components/${component.slug}`,
  };
}

export interface GetComponentOptions {
  /** `true` quando `?preview=1` está presente na query. */
  preview: boolean;
  /** `true` quando o request carrega um token de admin válido (seção 9). */
  isAdmin: boolean;
}

/**
 * Busca o componente pelo slug para a página de detalhe (seção 7 do MVP1).
 * Só considera um componente `DRAFT` visível quando `preview` **e**
 * `isAdmin` são verdadeiros ao mesmo tempo — pedir `preview=1` sem um
 * token de admin válido tem exatamente o mesmo efeito de não pedir: nunca
 * revela DRAFT.
 */
export async function getPublishedComponent(
  slug: string,
  options: GetComponentOptions,
): Promise<ComponentDetailDto> {
  const canPreviewDraft = options.preview && options.isAdmin;
  const component = canPreviewDraft
    ? await findAnyBySlug(slug)
    : await findPublishedBySlug(slug);

  if (!component) {
    throw new NotFoundError(`Component "${slug}" not found`);
  }

  // Defaults documentados do endpoint de prompt (seção 7): React + Tailwind CSS.
  const { framework, styling } = componentPromptQuerySchema.parse({});
  const prompt = renderPrompt(toRenderPromptInput(component, framework, styling));

  return toComponentDetailDto(component, prompt);
}

export interface RenderComponentPromptOptions {
  framework: string;
  styling: string;
}

/**
 * `GET /api/components/:slug/prompt` (seção 7 do MVP1): renderiza o prompt
 * de um componente para a stack escolhida pelo cliente. Sem parâmetro de
 * preview — só considera `PUBLISHED`, igual à listagem e ao detalhe sem
 * preview.
 */
export async function renderComponentPrompt(
  slug: string,
  options: RenderComponentPromptOptions,
): Promise<string> {
  const component = await findPublishedBySlug(slug);

  if (!component) {
    throw new NotFoundError(`Component "${slug}" not found`);
  }

  return renderPrompt(toRenderPromptInput(component, options.framework, options.styling));
}

/**
 * Resolve `publishedAt` conforme a regra de transição de status (seção 7 do
 * MVP1): `DRAFT → PUBLISHED` define a data **só se ainda nula** — preserva a
 * primeira publicação em ciclos `PUBLISHED → DRAFT → PUBLISHED`.
 * `PUBLISHED → DRAFT` nunca passa por aqui com `current` nulo, então a data
 * original é sempre mantida.
 */
function resolvePublishedAt(
  current: Date | null,
  nextStatus: AdminComponentRow['status'],
): Date | null {
  if (nextStatus === 'PUBLISHED' && current === null) {
    return new Date();
  }
  return current;
}

/** `GET /api/admin/components` (seção 7 do MVP1): todos os componentes, inclusive `DRAFT`. */
export async function listAllComponentsForAdmin(): Promise<AdminComponentDto[]> {
  const rows = await findAllForAdmin();
  return rows.map(toAdminComponentDto);
}

/** `GET /api/admin/components/:id` (seção 7 do MVP1): carrega um componente para edição. */
export async function getComponentForAdmin(id: string): Promise<AdminComponentDto> {
  const row = await findByIdForAdmin(id);
  if (!row) {
    throw new NotFoundError(`Component "${id}" not found`);
  }
  return toAdminComponentDto(row);
}

/**
 * `POST /api/admin/components` (seção 7 do MVP1). `slug` é normalizado
 * (minúsculas, sem acentos) antes de checar unicidade; `categoryId` precisa
 * apontar para uma categoria existente (422); `authorId` nunca vem do body —
 * é resolvido do token via upsert preguiçoso do `User`.
 */
export async function createComponent(
  input: CreateComponentInput,
  auth: AuthContext,
): Promise<AdminComponentDto> {
  const slug = slugify(input.slug);

  const [duplicateSlug, categoryExists] = await Promise.all([
    findIdBySlug(slug),
    categoryExistsById(input.categoryId),
  ]);

  if (duplicateSlug) {
    throw new ConflictError(`Slug "${slug}" is already in use`, 'CONFLICT', [
      { path: 'slug', message: 'Slug already in use' },
    ]);
  }
  if (!categoryExists) {
    throw new UnprocessableEntityError(`Category "${input.categoryId}" not found`, [
      { path: 'categoryId', message: 'Category not found' },
    ]);
  }

  const authorId = await upsertAuthor(auth);
  const publishedAt = resolvePublishedAt(null, input.status);

  const row = await createComponentRecord({
    ...input,
    slug,
    authorId,
    publishedAt,
  });

  return toAdminComponentDto(row);
}

/**
 * `PUT /api/admin/components/:id` (seção 7 do MVP1). Mesmas regras do
 * create para slug/categoria, aplicadas só quando o respectivo campo é
 * enviado; `publishedAt` segue `resolvePublishedAt` a partir do estado atual.
 */
export async function updateComponent(
  id: string,
  input: UpdateComponentInput,
  auth: AuthContext,
): Promise<AdminComponentDto> {
  const current = await findByIdForAdmin(id);
  if (!current) {
    throw new NotFoundError(`Component "${id}" not found`);
  }

  let slug = current.slug;
  if (input.slug !== undefined) {
    slug = slugify(input.slug);
    if (slug !== current.slug) {
      const duplicateSlug = await findIdBySlug(slug);
      if (duplicateSlug) {
        throw new ConflictError(`Slug "${slug}" is already in use`, 'CONFLICT', [
          { path: 'slug', message: 'Slug already in use' },
        ]);
      }
    }
  }

  if (input.categoryId !== undefined) {
    const categoryExists = await categoryExistsById(input.categoryId);
    if (!categoryExists) {
      throw new UnprocessableEntityError(`Category "${input.categoryId}" not found`, [
        { path: 'categoryId', message: 'Category not found' },
      ]);
    }
  }

  const authorId = await upsertAuthor(auth);
  const nextStatus = input.status ?? current.status;
  const publishedAt = resolvePublishedAt(current.publishedAt, nextStatus);

  const row = await updateComponentRecord(id, {
    ...input,
    slug,
    authorId,
    publishedAt,
  });

  return toAdminComponentDto(row);
}

/** `DELETE /api/admin/components/:id` (seção 7 do MVP1): hard delete, sem soft delete. */
export async function deleteComponent(id: string): Promise<void> {
  const deleted = await deleteComponentRecord(id);
  if (!deleted) {
    throw new NotFoundError(`Component "${id}" not found`);
  }
}
