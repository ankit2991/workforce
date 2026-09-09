import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit auth attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});
