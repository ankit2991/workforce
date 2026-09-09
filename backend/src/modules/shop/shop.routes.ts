import { Router } from 'express';
import { getProducts, getProductBySlug, getProductCategories } from './shop.controller';

const router = Router();

router.get('/categories', getProductCategories);
router.get('/', getProducts);
router.get('/:slug', getProductBySlug);

export default router;
