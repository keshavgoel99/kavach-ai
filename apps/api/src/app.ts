import express from 'express';
import type {
  ApiErrorResponse,
  ApiHealth,
} from '@kavach/shared-types';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.get('/api/v1/health', (_request, response) => {
    const health: ApiHealth = {
      status: 'ok',
      service: 'kavach-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    };

    response.status(200).json(health);
  });

  app.use((request, response) => {
    const errorResponse: ApiErrorResponse = {
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested API route does not exist.',
        method: request.method,
        path: request.originalUrl,
      },
    };

    response.status(404).json(errorResponse);
  });

  return app;
}