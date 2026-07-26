import type {
  Request,
} from 'express';

import type {
  CasePriorityBand,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

type ExpressQuery =
  Request['query'];

export interface ParsedPriorityQueueQuery {
  page: number;
  pageSize: number;

  bands: CasePriorityBand[];

  districtIds: number[];

  policeStationIds: number[];
}

const ALLOWED_PRIORITY_BANDS =
  new Set<CasePriorityBand>([
    'ROUTINE',
    'ELEVATED',
    'HIGH',
    'CRITICAL',
  ]);

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
    defaultValue: number;
    maximum?: number;
  },
): number {
  const supplied =
    readSingleValue(query, key);

  if (supplied === undefined) {
    return options.defaultValue;
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

function readListValues(
  query: ExpressQuery,
  key: string,
): string[] {
  const supplied = query[key];

  if (supplied === undefined) {
    return [];
  }

  const values =
    Array.isArray(supplied)
      ? supplied
      : [supplied];

  const cleanedValues:
    string[] = [];

  values.forEach((value) => {
    if (typeof value !== 'string') {
      throw new RequestValidationError(
        `${key} must contain text values.`,
      );
    }

    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        cleanedValues.push(item);
      });
  });

  return cleanedValues;
}

function readPositiveIntegerList(
  query: ExpressQuery,
  key: string,
): number[] {
  const supplied =
    readListValues(query, key);

  const result =
    new Set<number>();

  supplied.forEach((value) => {
    if (!/^\d+$/.test(value)) {
      throw new RequestValidationError(
        `${key} must contain positive integers.`,
      );
    }

    const parsed = Number(value);

    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 1
    ) {
      throw new RequestValidationError(
        `${key} must contain positive integers.`,
      );
    }

    result.add(parsed);
  });

  return [...result];
}

function readPriorityBands(
  query: ExpressQuery,
): CasePriorityBand[] {
  const supplied =
    readListValues(
      query,
      'bands',
    );

  const bands =
    new Set<CasePriorityBand>();

  supplied.forEach((value) => {
    const normalized =
      value.toUpperCase();

    if (
      !ALLOWED_PRIORITY_BANDS.has(
        normalized as
          CasePriorityBand,
      )
    ) {
      throw new RequestValidationError(
        `Unsupported priority band: ${value}.`,
      );
    }

    bands.add(
      normalized as
        CasePriorityBand,
    );
  });

  return [...bands];
}

export function parsePriorityQueueQuery(
  query: ExpressQuery,
): ParsedPriorityQueueQuery {
  return {
    page: readPositiveInteger(
      query,
      'page',
      {
        defaultValue: 1,
      },
    ),

    pageSize: readPositiveInteger(
      query,
      'pageSize',
      {
        defaultValue: 25,
        maximum: 100,
      },
    ),

    bands:
      readPriorityBands(query),

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
  };
}
