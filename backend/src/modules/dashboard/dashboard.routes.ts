import { Router } from 'express';
import { getDashboardData } from './dashboard.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getDashboardData);

export default router;
