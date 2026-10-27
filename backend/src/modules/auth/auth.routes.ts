import { Router } from 'express';
import { sendOtp, verifyOtp, refreshToken, logout, getMe } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { authLimiter } from '../../middleware/rateLimiter';
import { asyncHandler } from '../../middleware/asyncHandler';
import { loginAdmin } from './admin-auth.controller';

const router = Router();

router.post('/admin/login', authLimiter, asyncHandler(loginAdmin));
router.post('/send-otp', authLimiter, sendOtp);
router.post('/verify-otp', authLimiter, verifyOtp);
router.post('/refresh', refreshToken);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);

export default router;
