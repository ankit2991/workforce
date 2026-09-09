import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './docs/swagger';
import { errorHandler } from './middleware/error.middleware';
import { apiLimiter } from './middleware/rateLimiter';

// Import route modules
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import walletRoutes from './modules/wallet/wallet.routes';
import salaryRoutes from './modules/salary/salary.routes';
import withdrawalsRoutes from './modules/withdrawals/withdrawals.routes';
import gamingRoutes from './modules/gaming/gaming.routes';
import gamesRoutes from './modules/games/games.routes';
import shopRoutes from './modules/shop/shop.routes';
import ordersRoutes from './modules/orders/orders.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import adminRoutes from './modules/admin/admin.routes';

import { getGameCategories } from './modules/games/games.controller';
import { getProductCategories, getProducts, getProductBySlug } from './modules/shop/shop.controller';

const app = express();

// Global Security & Utility Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: '*',
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to /api
app.use('/api', apiLimiter);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Version 1 API Routes
const v1Router = express.Router();

v1Router.use('/auth', authRoutes);
v1Router.use('/users', usersRoutes);
v1Router.use('/dashboard', dashboardRoutes);
v1Router.use('/wallet', walletRoutes);
v1Router.use('/salary', salaryRoutes);
v1Router.use('/salary-advances', salaryRoutes);
v1Router.use('/withdrawals', withdrawalsRoutes);
v1Router.use('/gaming-wallet', gamingRoutes);
v1Router.use('/games', gamesRoutes);
v1Router.get('/game-categories', getGameCategories);
v1Router.use('/shop', shopRoutes);
v1Router.get('/products', getProducts);
v1Router.get('/products/:slug', getProductBySlug);
v1Router.get('/product-categories', getProductCategories);
v1Router.use('/orders', ordersRoutes);
v1Router.use('/notifications', notificationsRoutes);
v1Router.use('/admin', adminRoutes);

app.use('/api/v1', v1Router);

// 404 handler for undefined routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    code: 'ROUTE_NOT_FOUND',
  });
});

// Central Error Handler
app.use(errorHandler);

export default app;
