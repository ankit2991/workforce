import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/asyncHandler';
import {
  getGames, getGameBySlug, getGameCategories, getManagedGames, getGamesStatus, getGamesDiagnostics,
  createGame, updateGame, deleteGame,
} from './games.controller';

const router = Router();
const adminOnly = [authenticate, requireRole(['ADMIN', 'SUPER_ADMIN'])];

router.get('/categories', asyncHandler(getGameCategories));
router.get('/', asyncHandler(getGames));
router.get('/status', asyncHandler(getGamesStatus));
router.get('/admin/catalog', ...adminOnly, asyncHandler(getManagedGames));
router.get('/admin/diagnostics', ...adminOnly, asyncHandler(getGamesDiagnostics));
router.post('/', ...adminOnly, asyncHandler(createGame));
router.put('/:id', ...adminOnly, asyncHandler(updateGame));
router.patch('/:id', ...adminOnly, asyncHandler(updateGame));
router.delete('/:id', ...adminOnly, asyncHandler(deleteGame));
router.get('/:slug', asyncHandler(getGameBySlug));

export default router;
