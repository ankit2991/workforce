import { Router } from 'express';
import {
  getAdminStats,
  getAdminEmployees,
  creditEmployeeWallet,
  getAdminAdvances,
  updateAdvanceStatus,
  getAdminWithdrawals,
  updateWithdrawalStatus,
  broadcastNotification,
} from './admin.controller';
import { authenticate, requireRole } from '../../middleware/auth.middleware';

const router = Router();

// Protect all admin routes with ADMIN or SUPER_ADMIN role
router.use(authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/stats', getAdminStats);
router.get('/employees', getAdminEmployees);
router.post('/employees/:id/credit-wallet', creditEmployeeWallet);
router.get('/advances', getAdminAdvances);
router.patch('/advances/:id/status', updateAdvanceStatus);
router.get('/withdrawals', getAdminWithdrawals);
router.patch('/withdrawals/:id/status', updateWithdrawalStatus);
router.post('/notifications/broadcast', broadcastNotification);

export default router;
