import { Router } from 'express';
import { requestWithdrawal, getWithdrawals } from './withdrawals.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.post('/', authenticate, requestWithdrawal);
router.get('/', authenticate, getWithdrawals);

export default router;
