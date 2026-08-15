import { Router, type Router as ExpressRouter, type RequestHandler } from 'express';

import { NotFoundError } from './lib/errors.js';
import { adminRateLimit, publicRateLimit } from './middlewares/rate-limit.js';
import { requireAdmin } from './middlewares/require-admin.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { adminComponentsRouter, componentsRouter } from './modules/components/components.routes.js';
import { healthRouter } from './modules/health/health.routes.js';

/** Encaminha ao error-handler um 404 no formato do envelope padrão (seção 7). */
const routeNotFound: RequestHandler = (req, _res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Agregador de rotas da API, montado em `/api` por `app.ts`. Endpoints
 * administrativos de categoria (`/api/admin/categories` — seção 7 do MVP1)
 * ainda não implementados serão registrados em `adminRouter.use(...)`
 * conforme forem implementados.
 *
 * `requireAdmin` (seção 9) é aplicado uma única vez aqui, para todo o
 * `adminRouter` — nenhum sub-router administrativo precisa repeti-lo.
 *
 * A separação entre `adminRouter` e `publicRouter` já existe porque o rate
 * limit difere por prefixo (seção 10 do MVP1: 120 req/min público, 30
 * req/min em `/api/admin/*`). Cada sub-router termina com seu próprio
 * `routeNotFound`: sem isso, uma rota `/admin/*` sem match "escaparia" do
 * `adminRouter` via `next()` e cairia também no `publicRouter` — que não
 * tem prefixo e casaria com tudo — aplicando (e sobrescrevendo os headers
 * com) o limite público errado.
 */
const router: ExpressRouter = Router();

const adminRouter: ExpressRouter = Router();
adminRouter.use(adminRateLimit);
adminRouter.use(requireAdmin);
adminRouter.use(adminComponentsRouter);
adminRouter.use(routeNotFound);

const publicRouter: ExpressRouter = Router();
publicRouter.use(publicRateLimit);
publicRouter.use(healthRouter);
publicRouter.use(categoriesRouter);
publicRouter.use(componentsRouter);
publicRouter.use(routeNotFound);

router.use('/admin', adminRouter);
router.use(publicRouter);

export { router as apiRouter };
