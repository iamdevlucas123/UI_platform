import { slugify, type CreateCategoryInput, type UpdateCategoryInput } from '@uilib/shared';

import { ConflictError, NotFoundError } from '../../lib/errors.js';
import { revalidate } from '../../lib/revalidate.js';
import {
  countComponentsByCategoryId,
  createCategoryRecord,
  deleteCategoryRecord,
  findAllOrderedByPosition,
  findById,
  findIdByName,
  findIdBySlug,
  updateCategoryRecord,
} from './categories.repository.js';
import { toCategoryDto, type CategoryDto } from './categories.mapper.js';

/**
 * Lista todas as categorias (sem paginação — seção 7 do MVP1, apenas 14 no
 * total), ordenadas por `position`, com a contagem de componentes
 * publicados de cada uma.
 */
export async function listCategories(): Promise<CategoryDto[]> {
  const categories = await findAllOrderedByPosition();
  return categories.map(toCategoryDto);
}

/** Lança `ConflictError` se `name` já pertencer a outra categoria (seção 7 do MVP1). */
async function assertNameIsFree(name: string): Promise<void> {
  const duplicate = await findIdByName(name);
  if (duplicate) {
    throw new ConflictError(`Name "${name}" is already in use`, 'CONFLICT', [
      { path: 'name', message: 'Name already in use' },
    ]);
  }
}

/** Lança `ConflictError` se `slug` já pertencer a outra categoria (seção 7 do MVP1). */
async function assertSlugIsFree(slug: string): Promise<void> {
  const duplicate = await findIdBySlug(slug);
  if (duplicate) {
    throw new ConflictError(`Slug "${slug}" is already in use`, 'CONFLICT', [
      { path: 'slug', message: 'Slug already in use' },
    ]);
  }
}

/**
 * `POST /api/admin/categories` (seção 7 do MVP1). `slug` é derivado do
 * `name` quando ausente e sempre normalizado (minúsculas, sem acentos)
 * antes de checar unicidade — de `name` e de `slug`, cada um com seu 409.
 */
export async function createCategory(input: CreateCategoryInput): Promise<CategoryDto> {
  const slug = slugify(input.slug ?? input.name);

  await assertNameIsFree(input.name);
  await assertSlugIsFree(slug);

  const row = await createCategoryRecord({
    name: input.name,
    slug,
    description: input.description ?? null,
    position: input.position,
  });

  await revalidate();

  return toCategoryDto(row);
}

/**
 * `PUT /api/admin/categories/:id` (seção 7 do MVP1): corpo parcial — só
 * revalida unicidade de `name`/`slug` quando o campo é enviado **e**
 * realmente muda de valor, evitando um 409 contra a própria categoria.
 */
export async function updateCategory(
  id: string,
  input: UpdateCategoryInput,
): Promise<CategoryDto> {
  const current = await findById(id);
  if (!current) {
    throw new NotFoundError(`Category "${id}" not found`);
  }

  if (input.name !== undefined && input.name !== current.name) {
    await assertNameIsFree(input.name);
  }

  let slug = current.slug;
  if (input.slug !== undefined) {
    slug = slugify(input.slug);
    if (slug !== current.slug) {
      await assertSlugIsFree(slug);
    }
  }

  const row = await updateCategoryRecord(id, { ...input, slug });

  await revalidate();

  return toCategoryDto(row);
}

/**
 * `DELETE /api/admin/categories/:id` (seção 7 do MVP1): hard delete, sem
 * cascade e sem mover componentes automaticamente. Se a categoria tiver ao
 * menos um componente associado (qualquer status), a exclusão é bloqueada
 * com `409 CATEGORY_IN_USE` e `details.componentCount`.
 */
export async function deleteCategory(id: string): Promise<void> {
  const current = await findById(id);
  if (!current) {
    throw new NotFoundError(`Category "${id}" not found`);
  }

  const componentCount = await countComponentsByCategoryId(id);
  if (componentCount > 0) {
    throw new ConflictError('Category has associated components', 'CATEGORY_IN_USE', {
      componentCount,
    });
  }

  await deleteCategoryRecord(id);

  await revalidate();
}
