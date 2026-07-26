import type {
  Request,
} from 'express';

import type {
  AnalyticsQuery,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

type ExpressQuery =
  Request['query'];

function readSingleValue(
  query: ExpressQuery,
  key: string,
): string | undefined {
  const value =
    query[key];

  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value !== 'string'
  ) {
    throw new RequestValidationError(
      `${key} must be provided only once.`,
    );
  }

  const cleaned =
    value.trim();

  return cleaned ||
    undefined;
}

function readDate(
  query: ExpressQuery,
  key: string,
): string | undefined {
  const supplied =
    readSingleValue(
      query,
      key,
    );

  if (
    supplied === undefined
  ) {
    return undefined;
  }

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      supplied,
    )
  ) {
    throw new RequestValidationError(
      `${key} must use YYYY-MM-DD format.`,
    );
  }

  const date =
    new Date(
      `${supplied}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
      supplied
  ) {
    throw new RequestValidationError(
      `${key} must contain a valid date.`,
    );
  }

  return supplied;
}

function readListValues(
  query: ExpressQuery,
  key: string,
): string[] {
  const supplied =
    query[key];

  if (
    supplied === undefined
  ) {
    return [];
  }

  const values =
    Array.isArray(supplied)
      ? supplied
      : [supplied];

  const result:
    string[] = [];

  values.forEach(
    (value) => {
      if (
        typeof value !== 'string'
      ) {
        throw new RequestValidationError(
          `${key} must contain text values.`,
        );
      }

      value
        .split(',')
        .map(
          (item) =>
            item.trim(),
        )
        .filter(Boolean)
        .forEach(
          (item) =>
            result.push(item),
        );
    },
  );

  return result;
}

function readPositiveIntegerList(
  query: ExpressQuery,
  key: string,
): number[] {
  const result =
    new Set<number>();

  readListValues(
    query,
    key,
  ).forEach(
    (value) => {
      if (
        !/^\d+$/.test(
          value,
        )
      ) {
        throw new RequestValidationError(
          `${key} must contain positive integers.`,
        );
      }

      const parsed =
        Number(value);

      if (
        !Number.isSafeInteger(
          parsed,
        ) ||
        parsed < 1
      ) {
        throw new RequestValidationError(
          `${key} must contain positive integers.`,
        );
      }

      result.add(parsed);
    },
  );

  return [
    ...result,
  ];
}

export function parseAnalyticsQuery(
  query: ExpressQuery,
): AnalyticsQuery {
  const registeredFrom =
    readDate(
      query,
      'registeredFrom',
    );

  const registeredTo =
    readDate(
      query,
      'registeredTo',
    );

  if (
    registeredFrom &&
    registeredTo &&
    registeredFrom >
      registeredTo
  ) {
    throw new RequestValidationError(
      'registeredFrom cannot be after registeredTo.',
    );
  }

  return {
    registeredFrom,
    registeredTo,

    districtIds:
      readPositiveIntegerList(
        query,
        'districtIds',
      ),

    policeStationIds:
      readPositiveIntegerList(
        query,
        'policeStationIds',
      ),

    majorCrimeHeadIds:
      readPositiveIntegerList(
        query,
        'majorCrimeHeadIds',
      ),
  };
}
