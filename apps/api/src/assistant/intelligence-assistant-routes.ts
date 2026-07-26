import {
  Router,
} from 'express';

import type {
  IntelligenceAssistantQuery,
} from '@kavach/shared-types';

import {
  requirePermission,
} from '../security/security-middleware';

import {
  getGeminiGroundedAssistantService,
} from './gemini-grounded-assistant-service';

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseQuery(
  body: unknown,
): IntelligenceAssistantQuery {
  if (
    !isRecord(body) ||
    typeof body.query !==
      'string'
  ) {
    throw new Error(
      'A natural-language query is required.',
    );
  }

  const limit =
    body.limit;

  const minimumScore =
    body.minimumScore;

  if (
    limit !== undefined &&
    (
      typeof limit !==
        'number' ||
      !Number.isSafeInteger(
        limit,
      ) ||
      limit < 1 ||
      limit > 25
    )
  ) {
    throw new Error(
      'limit must be between 1 and 25.',
    );
  }

  if (
    minimumScore !==
      undefined &&
    (
      typeof minimumScore !==
        'number' ||
      !Number.isFinite(
        minimumScore,
      ) ||
      minimumScore < 0 ||
      minimumScore > 100
    )
  ) {
    throw new Error(
      'minimumScore must be between 0 and 100.',
    );
  }

  return {
    query:
      body.query,

    limit:
      limit as
        number | undefined,

    minimumScore:
      minimumScore as
        number | undefined,
  };
}

export function createIntelligenceAssistantRouter(): Router {
  const router =
    Router();

  router.get(
    '/status',

    requirePermission(
      'VIEW_CASES',
    ),

    (
      _request,
      response,
    ) => {
      response
        .status(200)
        .json(
          getGeminiGroundedAssistantService()
            .getStatus(),
        );
    },
  );

  router.post(
    '/query',

    requirePermission(
      'VIEW_CASES',
    ),

    async (
      request,
      response,
      next,
    ) => {
      try {
        const query =
          parseQuery(
            request.body,
          );

        const service =
          getGeminiGroundedAssistantService();

        response
          .status(200)
          .json(
            await service.query(
              query,
            ),
          );
      } catch (
        error: unknown
      ) {
        if (
          error instanceof Error
        ) {
          response
            .status(400)
            .json({
              error: {
                code:
                  'INVALID_REQUEST',

                message:
                  error.message,
              },
            });

          return;
        }

        next(error);
      }
    },
  );

  return router;
}
