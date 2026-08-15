import {
  componentPromptQuerySchema,
  createComponentSchema,
  listComponentsQuerySchema,
  updateComponentSchema,
} from '@uilib/shared';
import { Router, type Router as ExpressRouter } from 'express';

import { validate } from '../../middlewares/validate.js';
import {
  createAdminComponent,
  deleteAdminComponent,
  getAdminComponentById,
  getAdminComponents,
  getComponentBySlug,
  getComponentPrompt,
  getComponents,
  updateAdminComponent,
} from './components.controller.js';

const router: ExpressRouter = Router();

router.get('/components', validate('query', listComponentsQuerySchema), getComponents);
router.get(
  '/components/:slug/prompt',
  validate('query', componentPromptQuerySchema),
  getComponentPrompt,
);
router.get('/components/:slug', getComponentBySlug);

export { router as componentsRouter };

/**
 * Rotas administrativas de componentes (seção 7 do MVP1). Montadas por
 * `routes.ts` sob `/admin`, que já aplica `requireAdmin` e o rate limit de
 * 30 req/min a todo o `adminRouter` — não repetidos aqui.
 */
const adminRouter: ExpressRouter = Router();

adminRouter.get('/components', getAdminComponents);
adminRouter.get('/components/:id', getAdminComponentById);
adminRouter.post('/components', validate('body', createComponentSchema), createAdminComponent);
adminRouter.put('/components/:id', validate('body', updateComponentSchema), updateAdminComponent);
adminRouter.delete('/components/:id', deleteAdminComponent);

export { adminRouter as adminComponentsRouter };
