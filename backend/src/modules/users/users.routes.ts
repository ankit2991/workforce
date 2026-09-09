import { Router } from 'express';
import { getProfile, updateProfile } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, updateProfile);

export default router;
