import type { ApiItemResponse, CreateCategoryInput, UpdateCategoryInput } from '@uilib/shared';
import type { Request, RequestHandler, Response } from 'express';

import { createCategory, deleteCategory, listCategories, updateCategory } from './categories.service.js';
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

/** `POST /api/admin/categories` (seção 7 do MVP1). */
export const createAdminCategory: RequestHandler = async (req, res): Promise<void> => {
  const input = req.body as unknown as CreateCategoryInput;

  const category = await createCategory(input);

  const body: ApiItemResponse<CategoryDto> = { data: category };
  res.status(201).json(body);
};

/** `PUT /api/admin/categories/:id` (seção 7 do MVP1): corpo parcial, ao menos um campo. */
export const updateAdminCategory: RequestHandler<{ id: string }> = async (
  req,
  res,
): Promise<void> => {
  const input = req.body as unknown as UpdateCategoryInput;

  const category = await updateCategory(req.params.id, input);

  const body: ApiItemResponse<CategoryDto> = { data: category };
  res.json(body);
};

/** `DELETE /api/admin/categories/:id` (seção 7 do MVP1): hard delete, sem corpo de resposta. */
export const deleteAdminCategory: RequestHandler<{ id: string }> = async (
  req,
  res,
): Promise<void> => {
  await deleteCategory(req.params.id);
  res.status(204).end();
};
