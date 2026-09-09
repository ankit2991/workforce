import { Router } from 'express';
import { getWallet, getTransactions, getTransactionById } from './wallet.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getWallet);
router.get('/transactions', authenticate, getTransactions);
router.get('/transactions/:id', authenticate, getTransactionById);

export default router;
