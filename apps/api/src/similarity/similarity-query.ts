import type {
  Request,
} from 'express';

import type {
  SimilarCasesQuery,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

type ExpressQuery =
  Request['query'];

const DEFAULT_LIMIT = 10;
const MAXIMUM_LIMIT = 50;
const DEFAULT_MINIMUM_SCORE = 20;

function readSingleValue(
  query: ExpressQuery,
  key: string,
): string | undefined {
  const value = query[key];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new RequestValidationError(
      `${key} must be provided only once.`,
    );
  }

  const cleaned = value.trim();

  return cleaned || undefined;
}

function readPositiveInteger(
  query: ExpressQuery,
  key: string,
  defaultValue: number,
  maximum: number,
): number {
  const supplied =
    readSingleValue(
      query,
      key,
    );

  if (supplied === undefined) {
    return defaultValue;
  }

  if (!/^\d+$/.test(supplied)) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  const parsed = Number(supplied);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  if (parsed > maximum) {
    throw new RequestValidationError(
      `${key} cannot be greater than ${maximum}.`,
    );
  }

  return parsed;
}

function readScore(
  query: ExpressQuery,
  key: string,
  defaultValue: number,
): number {
  const supplied =
    readSingleValue(
      query,
      key,
    );

  if (supplied === undefined) {
    return defaultValue;
  }

  const parsed = Number(supplied);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 100
  ) {
    throw new RequestValidationError(
      `${key} must be between 0 and 100.`,
    );
  }

  return parsed;
}

export function parseSimilarCasesQuery(
  query: ExpressQuery,
): Required<SimilarCasesQuery> {
  return {
    limit:
      readPositiveInteger(
        query,
        'limit',
        DEFAULT_LIMIT,
        MAXIMUM_LIMIT,
      ),

    minimumScore:
      readScore(
        query,
        'minimumScore',
        DEFAULT_MINIMUM_SCORE,
      ),
  };
}
