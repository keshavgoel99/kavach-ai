import {
  Router,
} from 'express';

import type {
  ApiErrorResponse,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

import {
  parseHotspotSummaryQuery,
  parseHotspotTrendQuery,
  parseLocationId,
} from './hotspot-query';

import {
  getHotspotService,
} from './hotspot-service';

function invalidRequest(
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

export function createHotspotRouter(): Router {
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
          await getHotspotService();

        response
          .status(200)
          .json(
            service
              .getFilterOptions(),
          );
      } catch (
        error: unknown
      ) {
        next(error);
      }
    },
  );

  router.get(
    '/summary',

    async (
      request,
      response,
      next,
    ) => {
      try {
        const query =
          parseHotspotSummaryQuery(
            request.query,
          );

        const service =
          await getHotspotService();

        const result =
          service.getSummary(
            query,
          );

        if (!result) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code:
                  'HOTSPOT_PERIOD_NOT_FOUND',

                message:
                  'No hotspot data exists for the requested period.',
              },
            };

          response
            .status(404)
            .json(
              errorResponse,
            );

          return;
        }

        response
          .status(200)
          .json(result);
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
              invalidRequest(
                error,
              ),
            );

          return;
        }

        next(error);
      }
    },
  );

  router.get(
    '/locations/:locationId/trend',

    async (
      request,
      response,
      next,
    ) => {
      try {
        const locationId =
          parseLocationId(
            request.params
              .locationId,
          );

        const query =
          parseHotspotTrendQuery(
            request.query,
          );

        const service =
          await getHotspotService();

        const result =
          service
            .getLocationTrend(
              locationId,
              query,
            );

        if (!result) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code:
                  'LOCATION_NOT_FOUND',

                message:
                  `No hotspot location exists with ID ${locationId}.`,
              },
            };

          response
            .status(404)
            .json(
              errorResponse,
            );

          return;
        }

        response
          .status(200)
          .json(result);
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
              invalidRequest(
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
