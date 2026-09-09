import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'mongodb://localhost:27017/workforce_wallet',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'supersecret_access_jwt_key_2026_workpay_prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'supersecret_refresh_jwt_key_2026_workpay_prod',
    accessExpiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
