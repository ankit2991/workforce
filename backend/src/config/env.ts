import dotenv from 'dotenv';
dotenv.config();

// Reject public fallback secrets on live deployments, not just in documentation.
const unsafeDefaults = new Set([
  'supersecret_access_jwt_key_2026_workpay_prod',
  'supersecret_refresh_jwt_key_2026_workpay_prod',
]);
if (process.env.NODE_ENV === 'production' &&
  ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'].some(key =>
    !process.env[key] || process.env[key]!.length < 32 || unsafeDefaults.has(process.env[key]!)
  )) {
  throw new Error('Production requires two unique strong JWT secrets (JWT_ACCESS_SECRET and JWT_REFRESH_SECRET).');
}

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/workforce_wallet',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-only-access-secret-not-for-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-only-refresh-secret-not-for-production',
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
