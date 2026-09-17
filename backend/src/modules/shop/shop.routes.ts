import { Router } from 'express';
import { getProducts, getProductBySlug, getProductCategories, createProduct, deleteProduct } from './shop.controller';

const router = Router();

router.get('/categories', getProductCategories);
router.get('/', getProducts);
router.post('/', createProduct);
router.get('/:slug', getProductBySlug);
router.delete('/:id', deleteProduct);

export default router;
