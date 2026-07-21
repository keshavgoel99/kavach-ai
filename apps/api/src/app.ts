import express from 'express';

import type {
  ApiErrorResponse,
  ApiHealth,
} from '@kavach/shared-types';

import {
  createCaseRouter,
} from './cases/case-routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(
    express.json({
      limit: '1mb',
    }),
  );

  app.get(
    '/api/v1/health',
    (_request, response) => {
      const health: ApiHealth = {
        status: 'ok',
        service: 'kavach-api',
        version: '0.1.0',
        timestamp:
          new Date().toISOString(),
        uptimeSeconds:
          Math.floor(process.uptime()),
      };

      response.status(200).json(health);
    },
  );

  app.use(
    '/api/v1/cases',
    createCaseRouter(),
  );

  app.use((request, response) => {
    const errorResponse:
      ApiErrorResponse = {
        error: {
          code: 'ROUTE_NOT_FOUND',
          message:
            'The requested API route does not exist.',
          method: request.method,
          path: request.originalUrl,
        },
      };

    response
      .status(404)
      .json(errorResponse);
  });

  app.use(
    (
      error: unknown,
      _request: express.Request,
      response: express.Response,
      _next: express.NextFunction,
    ) => {
      console.error(
        'Unhandled API error:',
        error,
      );

      const errorResponse:
        ApiErrorResponse = {
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message:
              'The API could not complete the request.',
          },
        };

      response
        .status(500)
        .json(errorResponse);
    },
  );

  return app;
}