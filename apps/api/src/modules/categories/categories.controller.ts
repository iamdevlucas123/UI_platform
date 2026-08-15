import type { ApiItemResponse } from '@uilib/shared';
import type { Request, Response } from 'express';

import { listCategories } from './categories.service.js';
import type { CategoryDto } from './categories.mapper.js';

/**
 * `GET /api/categories` (seção 7 do MVP1). Controller fino: só chama o
 * service e monta o envelope — sem regra de negócio aqui. Sem try/catch de
 * propósito: o Express 5 encaminha rejeições de handlers async ao
 * error-handler automaticamente.
 */
export async function getCategories(_req: Request, res: Response): Promise<void> {
  const categories = await listCategories();
  const body: ApiItemResponse<CategoryDto[]> = { data: categories };
  res.json(body);
}
