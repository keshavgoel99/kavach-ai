import {
  Router,
} from 'express';

import {
  requirePermission,
} from '../security/security-middleware';

import type {
  ApiErrorResponse,
  SimilarCasesResponse,
} from '@kavach/shared-types';

import {
  parseCaseId,
  RequestValidationError,
} from '../cases/case-query';

import {
  parseSimilarCasesQuery,
} from './similarity-query';

import {
  getCaseSimilarityService,
} from './similarity-service';

function createValidationErrorResponse(
  error: RequestValidationError,
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

export function createSimilarityRouter(): Router {
  const router = Router();

  router.get(
    '/cases/:caseId/similar',

    requirePermission(
      'VIEW_SIMILARITY',
    ),

    async (
      request,
      response,
      next,
    ) => {
      try {
        const caseId =
          parseCaseId(
            String(
              request.params.caseId ??
              '',
            ),
          );

        const query =
          parseSimilarCasesQuery(
            request.query,
          );

        const service =
          await getCaseSimilarityService();

        const result =
          service.findSimilarCases(
            caseId,
            query,
          );

        if (!result) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code:
                  'CASE_NOT_FOUND',

                message:
                  `No case exists with ID ${caseId}.`,
              },
            };

          response
            .status(404)
            .json(errorResponse);

          return;
        }

        const responseBody:
          SimilarCasesResponse =
          result;

        response
          .status(200)
          .json(responseBody);
      } catch (error: unknown) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              createValidationErrorResponse(
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
