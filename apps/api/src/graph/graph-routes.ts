import {
  Router,
} from 'express';

import {
  GRAPH_RELATIONSHIP_TYPES,
} from '@kavach/schema-catalog';

import type {
  ApiErrorResponse,
  InvestigationGraphQuery,
  InvestigationGraphRelationshipType,
} from '@kavach/shared-types';

import {
  getGraphRepository,
} from './graph-repository';

const DEFAULT_NODE_LIMIT = 80;
const MAXIMUM_NODE_LIMIT = 200;

function readSingleQueryValue(
  value: unknown,
): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (
    Array.isArray(value) &&
    typeof value[0] === 'string'
  ) {
    return value[0].trim() || null;
  }

  return null;
}

function parseDepth(
  value: unknown,
): 1 | 2 {
  const cleaned =
    readSingleQueryValue(value);

  if (!cleaned) {
    return 1;
  }

  if (
    cleaned !== '1' &&
    cleaned !== '2'
  ) {
    throw new Error(
      'depth must be either 1 or 2.',
    );
  }

  return Number(cleaned) as 1 | 2;
}

function parseNodeLimit(
  value: unknown,
): number {
  const cleaned =
    readSingleQueryValue(value);

  if (!cleaned) {
    return DEFAULT_NODE_LIMIT;
  }

  if (!/^\d+$/.test(cleaned)) {
    throw new Error(
      'nodeLimit must be an integer.',
    );
  }

  const parsed = Number(cleaned);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 2 ||
    parsed > MAXIMUM_NODE_LIMIT
  ) {
    throw new Error(
      [
        'nodeLimit must be between',
        `2 and ${MAXIMUM_NODE_LIMIT}.`,
      ].join(' '),
    );
  }

  return parsed;
}

function parseRelationshipTypes(
  value: unknown,
): InvestigationGraphRelationshipType[] | undefined {
  const suppliedValues =
    Array.isArray(value)
      ? value
      : value === undefined
        ? []
        : [value];

  const requested =
    suppliedValues
      .flatMap((item) =>
        typeof item === 'string'
          ? item.split(',')
          : [],
      )
      .map((item) =>
        item.trim(),
      )
      .filter(Boolean);

  if (requested.length === 0) {
    return undefined;
  }

  const allowed =
    new Set<string>(
      GRAPH_RELATIONSHIP_TYPES,
    );

  const unique =
    [...new Set(requested)];

  unique.forEach(
    (relationshipType) => {
      if (
        !allowed.has(
          relationshipType,
        )
      ) {
        throw new Error(
          [
            'Unsupported relationship type:',
            relationshipType,
          ].join(' '),
        );
      }
    },
  );

  return unique as
    InvestigationGraphRelationshipType[];
}

function createInvalidRequest(
  message: string,
): ApiErrorResponse {
  return {
    error: {
      code: 'INVALID_REQUEST',
      message,
    },
  };
}

export function createGraphRouter(): Router {
  const router = Router();

  router.get(
    '/neighborhood',
    async (
      request,
      response,
      next,
    ) => {
      let query:
        InvestigationGraphQuery;

      try {
        const rootNodeId =
          readSingleQueryValue(
            request.query.rootNodeId,
          );

        if (!rootNodeId) {
          throw new Error(
            'rootNodeId is required.',
          );
        }

        query = {
          rootNodeId,

          depth: parseDepth(
            request.query.depth,
          ),

          nodeLimit: parseNodeLimit(
            request.query.nodeLimit,
          ),

          relationshipTypes:
            parseRelationshipTypes(
              request.query
                .relationshipTypes,
            ),
        };
      } catch (error: unknown) {
        response
          .status(400)
          .json(
            createInvalidRequest(
              error instanceof Error
                ? error.message
                : 'The graph query is invalid.',
            ),
          );

        return;
      }

      try {
        const repository =
          await getGraphRepository();

        if (
          !repository.hasNode(
            query.rootNodeId,
          )
        ) {
          const errorResponse:
            ApiErrorResponse = {
              error: {
                code:
                  'GRAPH_ROOT_NOT_FOUND',

                message:
                  `Graph node ${query.rootNodeId} does not exist.`,
              },
            };

          response
            .status(404)
            .json(errorResponse);

          return;
        }

        const graph =
          repository.getNeighborhood(
            query,
          );

        response
          .status(200)
          .json(graph);
      } catch (error: unknown) {
        next(error);
      }
    },
  );

  return router;
}
