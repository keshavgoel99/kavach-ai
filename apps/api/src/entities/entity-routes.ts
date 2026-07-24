import {
  Router,
} from 'express';

import type {
  ApiErrorResponse,
} from '@kavach/shared-types';

import {
  getCaseRepository,
} from '../cases/case-repository';

function parseEntityId(
  value: string,
): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(
      'entityId must be a positive integer.',
    );
  }

  const entityId = Number(value);

  if (
    !Number.isSafeInteger(entityId) ||
    entityId < 1
  ) {
    throw new Error(
      'entityId must be a positive integer.',
    );
  }

  return entityId;
}

export function createEntityRouter(): Router {
  const router = Router();

  router.get(
    '/:entityId',
    async (
      request,
      response,
      next,
    ) => {
      let entityId: number;

      try {
        entityId = parseEntityId(
          request.params.entityId,
        );
      } catch (error: unknown) {
        const errorResponse:
          ApiErrorResponse = {
            error: {
              code: 'INVALID_REQUEST',

              message:
                error instanceof Error
                  ? error.message
                  : 'entityId is invalid.',
            },
          };

        response
          .status(400)
          .json(errorResponse);

        return;
      }

      try {
        const repository =
          await getCaseRepository();

        const entity =
          repository.findEntityById(
            entityId,
          );

        if (!entity) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code:
                  'ENTITY_NOT_FOUND',

                message:
                  `No canonical entity exists with ID ${entityId}.`,
              },
            };

          response
            .status(404)
            .json(errorResponse);

          return;
        }

        response
          .status(200)
          .json(entity);
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  return router;
}
