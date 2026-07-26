import type {
  Request,
} from 'express';

import type {
  HotspotRiskBand,
  HotspotSummaryQuery,
  HotspotTrendQuery,
} from '@kavach/shared-types';

import {
  RequestValidationError,
} from '../cases/case-query';

type ExpressQuery =
  Request['query'];

const ALLOWED_RISK_BANDS =
  new Set<HotspotRiskBand>([
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL',
  ]);

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

function readInteger(
  query: ExpressQuery,
  key: string,
): number | undefined {
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
    !/^\d+$/.test(
      supplied,
    )
  ) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  const parsed =
    Number(supplied);

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < 1
  ) {
    throw new RequestValidationError(
      `${key} must be a positive integer.`,
    );
  }

  return parsed;
}

function readIntegerWithMaximum(
  query: ExpressQuery,
  key: string,
  maximum: number,
): number | undefined {
  const parsed =
    readInteger(
      query,
      key,
    );

  if (
    parsed !== undefined &&
    parsed > maximum
  ) {
    throw new RequestValidationError(
      `${key} cannot be greater than ${maximum}.`,
    );
  }

  return parsed;
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
          (item) => {
            result.push(item);
          },
        );
    },
  );

  return result;
}

function readIntegerList(
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

      result.add(
        parsed,
      );
    },
  );

  return [
    ...result,
  ];
}

function readRiskBands(
  query: ExpressQuery,
): HotspotRiskBand[] {
  const result =
    new Set<HotspotRiskBand>();

  readListValues(
    query,
    'riskBands',
  ).forEach(
    (value) => {
      const normalized =
        value.toUpperCase() as
          HotspotRiskBand;

      if (
        !ALLOWED_RISK_BANDS.has(
          normalized,
        )
      ) {
        throw new RequestValidationError(
          `Unsupported hotspot risk band: ${value}.`,
        );
      }

      result.add(
        normalized,
      );
    },
  );

  return [
    ...result,
  ];
}

export function parseHotspotSummaryQuery(
  query: ExpressQuery,
): HotspotSummaryQuery {
  const year =
    readInteger(
      query,
      'year',
    );

  const month =
    readIntegerWithMaximum(
      query,
      'month',
      12,
    );

  if (
    (
      year === undefined
    ) !==
    (
      month === undefined
    )
  ) {
    throw new RequestValidationError(
      'year and month must be provided together.',
    );
  }

  return {
    year,
    month,

    districtIds:
      readIntegerList(
        query,
        'districtIds',
      ),

    policeStationIds:
      readIntegerList(
        query,
        'policeStationIds',
      ),

    riskBands:
      readRiskBands(
        query,
      ),

    limit:
      readIntegerWithMaximum(
        query,
        'limit',
        180,
      ),
  };
}

export function parseHotspotTrendQuery(
  query: ExpressQuery,
): HotspotTrendQuery {
  return {
    months:
      readIntegerWithMaximum(
        query,
        'months',
        41,
      ),
  };
}

export function parseLocationId(
  supplied:
    string | undefined,
): number {
  const cleaned =
    supplied?.trim() ?? '';

  if (
    !/^\d+$/.test(
      cleaned,
    )
  ) {
    throw new RequestValidationError(
      'locationId must be a positive integer.',
    );
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < 1
  ) {
    throw new RequestValidationError(
      'locationId must be a positive integer.',
    );
  }

  return parsed;
}
