import type { Request } from 'express';

import type {
  CaseListFilters,
  PaginationInput,
} from '@kavach/shared-types';

export class RequestValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequestValidationError';
  }
}

export interface ParsedCaseListQuery {
  filters: CaseListFilters;
  pagination: PaginationInput;
}

type ExpressQuery = Request['query'];

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
  options: {
    defaultValue?: number;
    maximum?: number;
  } = {},
): number | undefined {
  const value = readSingleValue(query, key);

  if (value === undefined) {
    return options.defaultValue;
  }

  if (!/^\d+$/.test(value)) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  if (
    options.maximum !== undefined &&
    parsed > options.maximum
  ) {
    throw new RequestValidationError(
      `${key} cannot be greater than ${options.maximum}.`,
    );
  }

  return parsed;
}

function readDate(
  query: ExpressQuery,
  key: string,
): string | undefined {
  const value = readSingleValue(query, key);

  if (value === undefined) {
    return undefined;
  }

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new RequestValidationError(
      `${key} must use YYYY-MM-DD format.`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  if (!isValid) {
    throw new RequestValidationError(
      `${key} must be a valid calendar date.`,
    );
  }

  return value;
}

export function parseCaseListQuery(
  query: ExpressQuery,
): ParsedCaseListQuery {
  const page =
    readPositiveInteger(query, 'page', {
      defaultValue: 1,
    }) ?? 1;

  const pageSize =
    readPositiveInteger(query, 'pageSize', {
      defaultValue: 25,
      maximum: 100,
    }) ?? 25;

  const registeredFrom = readDate(
    query,
    'registeredFrom',
  );

  const registeredTo = readDate(
    query,
    'registeredTo',
  );

  if (
    registeredFrom &&
    registeredTo &&
    registeredFrom > registeredTo
  ) {
    throw new RequestValidationError(
      'registeredFrom cannot be later than registeredTo.',
    );
  }

  return {
    filters: {
      search: readSingleValue(query, 'search'),

      districtId: readPositiveInteger(
        query,
        'districtId',
      ),

      policeStationId: readPositiveInteger(
        query,
        'policeStationId',
      ),

      categoryId: readPositiveInteger(
        query,
        'categoryId',
      ),

      gravityId: readPositiveInteger(
        query,
        'gravityId',
      ),

      statusId: readPositiveInteger(
        query,
        'statusId',
      ),

      majorCrimeHeadId: readPositiveInteger(
        query,
        'majorCrimeHeadId',
      ),

      minorCrimeHeadId: readPositiveInteger(
        query,
        'minorCrimeHeadId',
      ),

      registeredFrom,
      registeredTo,
    },

    pagination: {
      page,
      pageSize,
    },
  };
}

export function parseCaseId(
  value: string,
): number {
  if (!/^\d+$/.test(value)) {
    throw new RequestValidationError(
      'caseId must be a positive integer.',
    );
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new RequestValidationError(
      'caseId must be a positive integer.',
    );
  }

  return parsed;
}