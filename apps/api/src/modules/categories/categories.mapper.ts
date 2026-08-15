import type { CategoryWithPublishedCount } from './categories.repository.js';

/**
 * DTO público de categoria (seção 7 do MVP1): apenas os campos que a API
 * expõe. Nunca inclui `createdAt`/`updatedAt` nem o shape interno do
 * Prisma (`_count`) — isso é responsabilidade exclusiva deste mapper.
 */
export interface CategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  componentCount: number;
}

/** Converte o resultado do repository (entidade Prisma + `_count`) no DTO público. */
export function toCategoryDto(category: CategoryWithPublishedCount): CategoryDto {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    position: category.position,
    componentCount: category._count.components,
  };
}
