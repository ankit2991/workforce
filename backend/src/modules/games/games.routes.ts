import { Router } from 'express';
import { getGames, getGameBySlug, getGameCategories, createGame, deleteGame } from './games.controller';

const router = Router();

router.get('/categories', getGameCategories);
router.get('/', getGames);
router.post('/', createGame);
router.get('/:slug', getGameBySlug);
router.delete('/:id', deleteGame);

export default router;
