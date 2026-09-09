import { Router } from 'express';
import { getNotifications, markAsRead, markAllAsRead } from './notifications.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getNotifications);
router.patch('/read-all', authenticate, markAllAsRead);
router.patch('/:id/read', authenticate, markAsRead);

export default router;
