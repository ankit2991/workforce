import app from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`🚀 WorkPay Backend Server running on port ${config.port}`);
  console.log(`📡 API Base URL: http://localhost:${config.port}/api/v1`);
  console.log(`📚 Swagger Docs: http://localhost:${config.port}/api-docs`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server process terminated.');
  });
});
