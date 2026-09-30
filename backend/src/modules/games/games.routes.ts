import { Router } from 'express';
import { getGames, getGameBySlug, getGameCategories, createGame, updateGame, deleteGame } from './games.controller';

const router = Router();

router.get('/categories', getGameCategories);
router.get('/', getGames);
router.post('/', createGame);
router.get('/:slug', getGameBySlug);
router.put('/:id', updateGame);
router.patch('/:id', updateGame);
router.delete('/:id', deleteGame);

export default router;
