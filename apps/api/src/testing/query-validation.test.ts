import assert from 'node:assert/strict';

import {
  describe,
  it,
} from 'node:test';

import type {
  Request,
} from 'express';

import {
  parseCaseId,
  RequestValidationError,
} from '../cases/case-query';

import {
  parseSimilarCasesQuery,
} from '../similarity/similarity-query';

import {
  parseHotspotSummaryQuery,
  parseHotspotTrendQuery,
  parseLocationId,
} from '../hotspots/hotspot-query';

import {
  parseAnalyticsQuery,
} from '../analytics/analytics-query';

type ExpressQuery =
  Request['query'];

function query(
  value:
    Record<
      string,
      string
    >,
): ExpressQuery {
  return value as
    ExpressQuery;
}

describe(
  'API query validation',
  () => {
    it(
      'parses valid case IDs',
      () => {
        assert.equal(
          parseCaseId('42'),
          42,
        );

        assert.throws(
          () =>
            parseCaseId(
              'abc',
            ),

          RequestValidationError,
        );
      },
    );

    it(
      'parses similar-case parameters',
      () => {
        assert.deepEqual(
          parseSimilarCasesQuery(
            query({
              limit: '20',

              minimumScore:
                '35.5',
            }),
          ),

          {
            limit: 20,

            minimumScore:
              35.5,
          },
        );

        assert.throws(
          () =>
            parseSimilarCasesQuery(
              query({
                limit: '51',
              }),
            ),

          RequestValidationError,
        );

        assert.throws(
          () =>
            parseSimilarCasesQuery(
              query({
                minimumScore:
                  '101',
              }),
            ),

          RequestValidationError,
        );
      },
    );

    it(
      'parses hotspot filters',
      () => {
        assert.deepEqual(
          parseHotspotSummaryQuery(
            query({
              year: '2026',
              month: '5',

              districtIds:
                '1,2',

              policeStationIds:
                '10,11',

              riskBands:
                'HIGH,CRITICAL',

              limit: '100',
            }),
          ),

          {
            year: 2026,
            month: 5,

            districtIds: [
              1,
              2,
            ],

            policeStationIds: [
              10,
              11,
            ],

            riskBands: [
              'HIGH',
              'CRITICAL',
            ],

            limit: 100,
          },
        );

        assert.deepEqual(
          parseHotspotTrendQuery(
            query({
              months: '24',
            }),
          ),

          {
            months: 24,
          },
        );

        assert.equal(
          parseLocationId(
            '180',
          ),
          180,
        );

        assert.throws(
          () =>
            parseHotspotSummaryQuery(
              query({
                month: '13',
              }),
            ),

          RequestValidationError,
        );

        assert.throws(
          () =>
            parseHotspotTrendQuery(
              query({
                months: '42',
              }),
            ),

          RequestValidationError,
        );
      },
    );

    it(
      'parses analytics filters',
      () => {
        assert.deepEqual(
          parseAnalyticsQuery(
            query({
              registeredFrom:
                '2025-01-01',

              registeredTo:
                '2025-12-31',

              districtIds:
                '1,2',

              policeStationIds:
                '10',

              majorCrimeHeadIds:
                '3,4',
            }),
          ),

          {
            registeredFrom:
              '2025-01-01',

            registeredTo:
              '2025-12-31',

            districtIds: [
              1,
              2,
            ],

            policeStationIds: [
              10,
            ],

            majorCrimeHeadIds: [
              3,
              4,
            ],
          },
        );

        assert.throws(
          () =>
            parseAnalyticsQuery(
              query({
                registeredFrom:
                  '2026-01-01',

                registeredTo:
                  '2025-01-01',
              }),
            ),

          RequestValidationError,
        );

        assert.throws(
          () =>
            parseAnalyticsQuery(
              query({
                registeredFrom:
                  '2025-02-31',
              }),
            ),

          RequestValidationError,
        );
      },
    );
  },
);
