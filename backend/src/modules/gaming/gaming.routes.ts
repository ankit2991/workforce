import { Router } from 'express';
import {
  getGamingWallet,
  topUpGamingWallet,
  cashOutGamingWallet,
  getGamingTransactions,
} from './gaming.controller';
import { authenticate } from '../../middleware/auth.middleware';

const router = Router();

router.get('/', authenticate, getGamingWallet);
router.post('/top-up', authenticate, topUpGamingWallet);
router.post('/cash-out', authenticate, cashOutGamingWallet);
router.get('/transactions', authenticate, getGamingTransactions);

export default router;
