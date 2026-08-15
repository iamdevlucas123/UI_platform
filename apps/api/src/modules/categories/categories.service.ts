import { findAllOrderedByPosition } from './categories.repository.js';
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
