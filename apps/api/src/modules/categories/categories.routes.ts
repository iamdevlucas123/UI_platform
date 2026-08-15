import { createCategorySchema, updateCategorySchema } from '@uilib/shared';
import { Router, type Router as ExpressRouter } from 'express';

import { validate } from '../../middlewares/validate.js';
import {
  createAdminCategory,
  deleteAdminCategory,
  getCategories,
  updateAdminCategory,
} from './categories.controller.js';

const router: ExpressRouter = Router();

router.get('/categories', getCategories);

export { router as categoriesRouter };

/**
 * Rotas administrativas de categoria (seção 7 do MVP1). Montadas por
 * `routes.ts` sob `/admin`, que já aplica `requireAdmin` e o rate limit de
 * 30 req/min a todo o `adminRouter` — não repetidos aqui.
 */
const adminRouter: ExpressRouter = Router();

adminRouter.post('/categories', validate('body', createCategorySchema), createAdminCategory);
adminRouter.put('/categories/:id', validate('body', updateCategorySchema), updateAdminCategory);
adminRouter.delete('/categories/:id', deleteAdminCategory);

export { adminRouter as adminCategoriesRouter };
