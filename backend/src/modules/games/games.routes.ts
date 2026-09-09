import { Router } from 'express';
import { getGames, getGameBySlug, getGameCategories } from './games.controller';

const router = Router();

router.get('/categories', getGameCategories);
router.get('/', getGames);
router.get('/:slug', getGameBySlug);

export default router;
