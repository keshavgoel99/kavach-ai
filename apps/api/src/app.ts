import express from 'express';

import type {
  ApiErrorResponse,
  ApiHealth,
} from '@kavach/shared-types';

import {
  authenticateRequest,
  auditAuthenticatedRequest,
  maskSensitiveResponse,
  requirePermission,
} from './security/security-middleware';

import {
  applyApiSecurityHeaders,
} from './security/api-security-middleware';

import {
  createAuthRouter,
  createProtectedAuthRouter,
  createSecurityRouter,
} from './security/security-routes';

import {
  createCaseRouter,
} from './cases/case-routes';

import {
  createEntityRouter,
} from './entities/entity-routes';

import {
  createGraphRouter,
} from './graph/graph-routes';

import {
  createPriorityRouter,
} from './priority/priority-routes';

import {
  createSimilarityRouter,
} from './similarity/similarity-routes';

import {
  createHotspotRouter,
} from './hotspots/hotspot-routes';

import {
  createAnalyticsRouter,
} from './analytics/analytics-routes';

const app = express();

app.disable(
  'x-powered-by',
);

app.set(
  'trust proxy',
  false,
);

app.use(
  applyApiSecurityHeaders,
);

app.use(
  express.json({
    limit: '128kb',
    strict: true,
    type:
      'application/json',
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
  '/api/v1/auth',
  createAuthRouter(),
);

app.use(
  '/api/v1',
  authenticateRequest,
);

app.use(
  '/api/v1',
  auditAuthenticatedRequest,
);

app.use(
  '/api/v1',
  maskSensitiveResponse,
);

app.use(
  '/api/v1/auth',
  createProtectedAuthRouter(),
);

app.use(
  '/api/v1/security',
  createSecurityRouter(),
);

app.use(
  '/api/v1/cases',
  requirePermission(
    'VIEW_CASES',
  ),
);

app.use(
  '/api/v1/entities',
  requirePermission(
    'VIEW_ENTITIES',
  ),
);

app.use(
  '/api/v1/graph',
  requirePermission(
    'VIEW_GRAPH',
  ),
);

app.use(
  '/api/v1/priority-queue',
  requirePermission(
    'VIEW_PRIORITY',
  ),
);

app.use(
  '/api/v1/hotspots',
  requirePermission(
    'VIEW_HOTSPOTS',
  ),
);

app.use(
  '/api/v1/analytics',
  requirePermission(
    'VIEW_ANALYTICS',
  ),
);

app.use(
  '/api/v1/cases',
  createCaseRouter(),
);

app.use(
  '/api/v1/entities',
  createEntityRouter(),
);

app.use(
  '/api/v1/graph',
  createGraphRouter(),
);

app.use(
  '/api/v1',
  createPriorityRouter(),
);

app.use(
  '/api/v1',
  createSimilarityRouter(),
);

app.use(
  '/api/v1/hotspots',
  createHotspotRouter(),
);

app.use(
  '/api/v1/analytics',
  createAnalyticsRouter(),
);

app.use(
  (
    error: unknown,
    _request:
      express.Request,
    response:
      express.Response,
    next:
      express.NextFunction,
  ) => {
    if (
      error instanceof
        SyntaxError &&
      'body' in error
    ) {
      response.status(400).json({
        error: {
          code:
            'INVALID_JSON',

          message:
            'The request body contains invalid JSON.',
        },
      });

      return;
    }

    next(error);
  },
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

export {
  app,
};