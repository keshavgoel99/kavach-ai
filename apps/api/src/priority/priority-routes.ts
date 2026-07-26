import {
  Router,
} from 'express';

import {
  requirePermission,
} from '../security/security-middleware';

import type {
  ApiErrorResponse,
  CasePriorityQueueItem,
  CasePriorityQueueResponse,
} from '@kavach/shared-types';

import {
  getCaseRepository,
} from '../cases/case-repository';

import {
  parseCaseId,
  RequestValidationError,
} from '../cases/case-query';

import {
  PRIORITY_RULE_VERSION,
} from './priority-engine';

import {
  parsePriorityQueueQuery,
} from './priority-query';

import {
  getCasePriorityService,
} from './priority-service';

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

export function createPriorityRouter(): Router {
  const router = Router();

  router.get(
    '/cases/:caseId/priority',

    requirePermission(
      'VIEW_PRIORITY',
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

        const service =
          await getCasePriorityService();

        const assessment =
          service.assessCase(caseId);

        if (!assessment) {
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

        response
          .status(200)
          .json(assessment);
      } catch (error: unknown) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              validationErrorResponse(
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
    '/priority-queue',

    requirePermission(
      'VIEW_PRIORITY',
    ),

    async (
      request,
      response,
      next,
    ) => {
      try {
        const query =
          parsePriorityQueueQuery(
            request.query,
          );

        const [
          service,
          caseRepository,
        ] = await Promise.all([
          getCasePriorityService(),
          getCaseRepository(),
        ]);

        const assessmentByCase =
          new Map(
            service
              .assessAll()
              .map(
                (assessment) => [
                  assessment.caseId,
                  assessment,
                ],
              ),
          );

        const bandFilter =
          query.bands.length > 0
            ? new Set(query.bands)
            : null;

        const districtFilter =
          query.districtIds.length > 0
            ? new Set(
                query.districtIds,
              )
            : null;

        const policeStationFilter =
          query
            .policeStationIds
            .length > 0
            ? new Set(
                query
                  .policeStationIds,
              )
            : null;

        const filteredItems:
          CasePriorityQueueItem[] =
          caseRepository
            .getAllCaseSummaries()
            .flatMap(
              (caseSummary) => {
                const assessment =
                  assessmentByCase.get(
                    caseSummary.caseId,
                  );

                if (!assessment) {
                  return [];
                }

                if (
                  bandFilter &&
                  !bandFilter.has(
                    assessment.band,
                  )
                ) {
                  return [];
                }

                if (
                  districtFilter &&
                  !districtFilter.has(
                    caseSummary
                      .district.id,
                  )
                ) {
                  return [];
                }

                if (
                  policeStationFilter &&
                  !policeStationFilter.has(
                    caseSummary
                      .policeStation.id,
                  )
                ) {
                  return [];
                }

                return [
                  {
                    case:
                      caseSummary,

                    assessment,
                  },
                ];
              },
            )
            .sort(
              (
                left,
                right,
              ) =>
                right
                  .assessment
                  .score -
                  left
                    .assessment
                    .score ||

                right
                  .case
                  .registeredDate
                  .localeCompare(
                    left
                      .case
                      .registeredDate,
                  ) ||

                right.case.caseId -
                  left.case.caseId,
            );

        const total =
          filteredItems.length;

        const startIndex =
          (
            query.page - 1
          ) *
          query.pageSize;

        const result:
          CasePriorityQueueResponse = {
          items:
            filteredItems.slice(
              startIndex,
              startIndex +
                query.pageSize,
            ),

          total,

          page:
            query.page,

          pageSize:
            query.pageSize,

          generatedAt:
            service.assessedAt,

          ruleVersion:
            PRIORITY_RULE_VERSION,
        };

        response
          .status(200)
          .json(result);
      } catch (error: unknown) {
        if (
          error instanceof
            RequestValidationError
        ) {
          response
            .status(400)
            .json(
              validationErrorResponse(
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
