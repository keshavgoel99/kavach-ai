import {
  Router,
} from 'express';

import type {
  ApiErrorResponse,
  AnalyticsFilterOptions,
  AnalyticsOverviewResponse,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

import {
  parseAnalyticsQuery,
} from './analytics-query';

import {
  getAnalyticsService,
} from './analytics-service';

function createInvalidRequest(
  error:
    RequestValidationError,
): ApiErrorResponse {
  return {
    error: {
      code:
        'INVALID_REQUEST',

      message:
        error.message,
    },
  };
}

export function createAnalyticsRouter(): Router {
  const router =
    Router();

  router.get(
    '/filter-options',

    async (
      _request,
      response,
      next,
    ) => {
      try {
        const service =
          await getAnalyticsService();

        const body:
          AnalyticsFilterOptions =
          service
            .getFilterOptions();

        response
          .status(200)
          .json(body);
      } catch (
        error: unknown
      ) {
        next(error);
      }
    },
  );

  router.get(
    '/overview',

    async (
      request,
      response,
      next,
    ) => {
      try {
        const query =
          parseAnalyticsQuery(
            request.query,
          );

        const service =
          await getAnalyticsService();

        const body:
          AnalyticsOverviewResponse =
          service.getOverview(
            query,
          );

        response
          .status(200)
          .json(body);
      } catch (
        error: unknown
      ) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              createInvalidRequest(
                error,
              ),
            );

          return;
        }

        next(error);
      }
    },
  );

  return router;
}
