import { Router, type Router as ExpressRouter } from 'express';

import { getCategories } from './categories.controller.js';

const router: ExpressRouter = Router();

router.get('/categories', getCategories);

export { router as categoriesRouter };
