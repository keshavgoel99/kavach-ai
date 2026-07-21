import {
  Router,
} from 'express';

import type {
  ApiErrorResponse,
} from '@kavach/shared-types';

import {
  getCaseRepository,
} from './case-repository';

import {
  parseCaseId,
  parseCaseListQuery,
  RequestValidationError,
} from './case-query';

function validationErrorResponse(
  error: RequestValidationError,
): ApiErrorResponse {
  return {
    error: {
      code: 'INVALID_REQUEST',
      message: error.message,
    },
  };
}

export function createCaseRouter(): Router {
  const router = Router();

  router.get(
    '/',
    async (
      request,
      response,
      next,
    ) => {
      try {
        const {
          filters,
          pagination,
        } = parseCaseListQuery(
          request.query,
        );

        const repository =
          await getCaseRepository();

        const result =
          repository.findCases(
            filters,
            pagination,
          );

        response.status(200).json(result);
      } catch (error: unknown) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              validationErrorResponse(error),
            );

          return;
        }

        next(error);
      }
    },
  );

  router.get(
    '/:caseId',
    async (
      request,
      response,
      next,
    ) => {
      try {
        const caseId = parseCaseId(
          request.params.caseId,
        );

        const repository =
          await getCaseRepository();

        const result =
          repository.findCaseById(caseId);

        if (!result) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code: 'CASE_NOT_FOUND',
                message:
                  `No case exists with ID ${caseId}.`,
              },
            };

          response
            .status(404)
            .json(errorResponse);

          return;
        }

        response.status(200).json(result);
      } catch (error: unknown) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              validationErrorResponse(error),
            );

          return;
        }

        next(error);
      }
    },
  );

  return router;
}