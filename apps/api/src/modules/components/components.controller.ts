import type {
  ApiItemResponse,
  ApiListResponse,
  ComponentPromptQuery,
  CreateComponentInput,
  ListComponentsQuery,
  UpdateComponentInput,
} from '@uilib/shared';
import type { Request, RequestHandler, Response } from 'express';

import { getAdminAuthContext, getRequiredAuth } from '../../middlewares/require-admin.js';
import type { AdminComponentDto, ComponentDetailDto, ComponentListItemDto } from './components.mapper.js';
import {
  createComponent,
  deleteComponent,
  getComponentForAdmin,
  getPublishedComponent,
  listAllComponentsForAdmin,
  listPublishedComponents,
  renderComponentPrompt,
  updateComponent,
} from './components.service.js';

/**
 * `GET /api/components` (seção 7 do MVP1). Controller fino: a query já
 * chega parseada/coagida pelo middleware `validate` (montado na rota), só
 * repassa ao service e monta o envelope. Sem try/catch de propósito: o
 * Express 5 encaminha rejeições de handlers async ao error-handler.
 */
export const getComponents: RequestHandler = async (req: Request, res: Response): Promise<void> => {
  // `validate('query', listComponentsQuerySchema)` já substituiu req.query
  // pelo resultado parseado (coerções/defaults aplicados) — cast seguro.
  const query = req.query as unknown as ListComponentsQuery;

  const { items, meta } = await listPublishedComponents(query);

  const body: ApiListResponse<ComponentListItemDto> = { data: items, meta };
  res.json(body);
};

/**
 * `GET /api/components/:slug` (seção 7 do MVP1). `preview=1` só tem efeito
 * quando acompanhado de um token de admin válido (seção 9) — a checagem
 * em si é feita pelo service, aqui só extraímos os dois sinais da request.
 */
export const getComponentBySlug: RequestHandler<{ slug: string }> = async (
  req,
  res,
): Promise<void> => {
  const preview = req.query.preview === '1';
  const isAdmin = Boolean(await getAdminAuthContext(req));

  const component = await getPublishedComponent(req.params.slug, { preview, isAdmin });

  const body: ApiItemResponse<ComponentDetailDto> = { data: component };
  res.json(body);
};

/**
 * `GET /api/components/:slug/prompt` (seção 7 do MVP1). `framework`/`styling`
 * já chegam validados e com defaults aplicados (`react`/`tailwind`) pelo
 * middleware `validate` com `componentPromptQuerySchema`.
 */
export const getComponentPrompt: RequestHandler<{ slug: string }> = async (
  req,
  res,
): Promise<void> => {
  const { framework, styling } = req.query as unknown as ComponentPromptQuery;

  const prompt = await renderComponentPrompt(req.params.slug, { framework, styling });

  const body: ApiItemResponse<{ prompt: string }> = { data: { prompt } };
  res.json(body);
};

/** `GET /api/admin/components` (seção 7 do MVP1): todos os componentes, inclusive `DRAFT`. */
export const getAdminComponents: RequestHandler = async (_req, res): Promise<void> => {
  const items = await listAllComponentsForAdmin();

  const body: ApiItemResponse<AdminComponentDto[]> = { data: items };
  res.json(body);
};

/** `GET /api/admin/components/:id` (seção 7 do MVP1): carrega um componente para edição. */
export const getAdminComponentById: RequestHandler<{ id: string }> = async (
  req,
  res,
): Promise<void> => {
  const component = await getComponentForAdmin(req.params.id);

  const body: ApiItemResponse<AdminComponentDto> = { data: component };
  res.json(body);
};

/**
 * `POST /api/admin/components` (seção 7 do MVP1). `validate('body',
 * createComponentSchema)` (montado na rota) já aplicou defaults e removeu
 * duplicatas de `technologies` antes deste handler rodar.
 */
export const createAdminComponent: RequestHandler = async (req, res): Promise<void> => {
  const input = req.body as unknown as CreateComponentInput;
  const auth = getRequiredAuth(req);

  const component = await createComponent(input, auth);

  const body: ApiItemResponse<AdminComponentDto> = { data: component };
  res.status(201).json(body);
};

/** `PUT /api/admin/components/:id` (seção 7 do MVP1): corpo parcial, ao menos um campo. */
export const updateAdminComponent: RequestHandler<{ id: string }> = async (
  req,
  res,
): Promise<void> => {
  const input = req.body as unknown as UpdateComponentInput;
  const auth = getRequiredAuth(req);

  const component = await updateComponent(req.params.id, input, auth);

  const body: ApiItemResponse<AdminComponentDto> = { data: component };
  res.json(body);
};

/** `DELETE /api/admin/components/:id` (seção 7 do MVP1): hard delete, sem corpo de resposta. */
export const deleteAdminComponent: RequestHandler<{ id: string }> = async (
  req,
  res,
): Promise<void> => {
  await deleteComponent(req.params.id);
  res.status(204).end();
};
