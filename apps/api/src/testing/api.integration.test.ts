import assert from 'node:assert/strict';

import {
  randomUUID,
} from 'node:crypto';

import {
  mkdtemp,
  rm,
} from 'node:fs/promises';

import os from 'node:os';
import path from 'node:path';

import {
  after,
  before,
  describe,
  it,
} from 'node:test';

import type {
  ApiTestServer,
} from './api-test-server';

import type {
  TestHttpResponse,
} from './http-test-client';

import {
  requestJson,
  setDefaultTestAccessToken,
} from './http-test-client';

import {
  createOperatorAccount,
} from '../security/security-service';

type UnknownRecord =
  Record<
    string,
    unknown
  >;

let testServer:
  ApiTestServer;

let temporarySecurityDirectory:
  string;

let analystAccessToken:
  string;

function isRecord(
  value: unknown,
): value is UnknownRecord {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function assertRecord(
  value: unknown,
  label: string,
): asserts value is
UnknownRecord {
  assert.ok(
    isRecord(value),

    `${label} must be an object.`,
  );
}

function readRecord(
  parent:
    UnknownRecord,

  key: string,
): UnknownRecord {
  const value =
    parent[key];

  assertRecord(
    value,
    key,
  );

  return value;
}

function readArray(
  parent:
    UnknownRecord,

  ...keys:
    string[]
): unknown[] {
  for (
    const key of keys
  ) {
    const value =
      parent[key];

    if (
      Array.isArray(value)
    ) {
      return value;
    }
  }

  assert.fail(
    [
      'Expected one of these',
      'properties to contain an array:',
      keys.join(', '),
    ].join(' '),
  );
}

function readNumber(
  parent:
    UnknownRecord,

  key: string,
): number {
  const value =
    parent[key];

  assert.ok(
    typeof value === 'number' &&
    Number.isFinite(value),
    `${key} must be a finite number.`,
  );

  return value;
}

function readString(
  parent:
    UnknownRecord,

  key: string,
): string {
  const value =
    parent[key];

  assert.ok(
    typeof value === 'string',

    `${key} must be text.`,
  );

  return value;
}

function readErrorCode(
  body: unknown,
): string {
  assertRecord(
    body,
    'Error response',
  );

  const error =
    readRecord(
      body,
      'error',
    );

  return readString(
    error,
    'code',
  );
}

function assertDescendingScores(
  values:
    readonly unknown[],

  scoreKey: string,
): void {
  for (
    let index = 1;
    index < values.length;
    index += 1
  ) {
    const previous =
      values[index - 1];

    const current =
      values[index];

    assertRecord(
      previous,
      'Previous ranked item',
    );

    assertRecord(
      current,
      'Current ranked item',
    );

    assert.ok(
      readNumber(
        previous,
        scoreKey,
      ) >=
        readNumber(
          current,
          scoreKey,
        ),

      `${scoreKey} must be sorted in descending order.`,
    );
  }
}

describe(
  'KAVACH API dataset integration',
  {
    concurrency: 1,
  },

  () => {
    before(
      async () => {
        temporarySecurityDirectory =
          await mkdtemp(
            path.join(
              os.tmpdir(),
              'kavach-security-test-',
            ),
          );

        process.env
          .KAVACH_SECURITY_DIRECTORY =
          temporarySecurityDirectory;

        const {
          createOperatorAccount,
        } =
          await import(
            '../security/security-service.js'
          );

        await createOperatorAccount(
          'integration-admin',
          'Integration Administrator',
          'ADMIN',
          'IntegrationAdmin!2026',
        );

        await createOperatorAccount(
          'integration-analyst',
          'Integration Analyst',
          'ANALYST',
          'IntegrationAnalyst!2026',
        );

        const {
          startApiTestServer,
        } =
          await import(
            './api-test-server.js'
          );

        testServer =
          await startApiTestServer();

        const adminLogin =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/auth/login',
            200,
            {
              method: 'POST',

              omitDefaultAuthorization:
                true,

              headers: {
                'content-type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  username:
                    'integration-admin',

                  password:
                    'IntegrationAdmin!2026',
                }),
            },
          );

        assertRecord(
          adminLogin.body,
          'Administrator login',
        );

        const adminToken =
          readString(
            adminLogin.body,
            'accessToken',
          );

        setDefaultTestAccessToken(
          adminToken,
        );

        const analystLogin =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/auth/login',
            200,
            {
              method: 'POST',

              omitDefaultAuthorization:
                true,

              headers: {
                'content-type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  username:
                    'integration-analyst',

                  password:
                    'IntegrationAnalyst!2026',
                }),
            },
          );

        assertRecord(
          analystLogin.body,
          'Analyst login',
        );

        analystAccessToken =
          readString(
            analystLogin.body,
            'accessToken',
          );
      },
    );

    after(
      async () => {
        setDefaultTestAccessToken(
          null,
        );

        await testServer.close();

        delete process.env
          .KAVACH_SECURITY_DIRECTORY;

        await rm(
          temporarySecurityDirectory,
          {
            recursive: true,
            force: true,
          },
        );
      },
    );

    it(
      'rejects unauthenticated protected requests',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/analytics/overview',
            401,
            {
              omitDefaultAuthorization:
                true,
            },
          );

        assert.equal(
          readErrorCode(
            response.body,
          ),
          'AUTHENTICATION_REQUIRED',
        );
      },
    );

    it(
      'enforces analyst permissions',
      async () => {
        const analystHeaders = {
          authorization:
            `Bearer ${analystAccessToken}`,
        };

        const analytics =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/analytics/overview',
            200,
            {
              omitDefaultAuthorization:
                true,

              headers:
                analystHeaders,
            },
          );

        assertRecord(
          analytics.body,
          'Analyst analytics response',
        );

        const cases =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases?page=1&pageSize=5',
            403,
            {
              omitDefaultAuthorization:
                true,

              headers:
                analystHeaders,
            },
          );

        assert.equal(
          readErrorCode(
            cases.body,
          ),
          'PERMISSION_DENIED',
        );
      },
    );

    it(
      'returns hardened security headers',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/analytics/overview',
          );

        assert.equal(
          response.headers.get(
            'x-content-type-options',
          ),
          'nosniff',
        );

        assert.equal(
          response.headers.get(
            'x-frame-options',
          ),
          'DENY',
        );

        assert.equal(
          response.headers.get(
            'referrer-policy',
          ),
          'no-referrer',
        );

        assert.ok(
          response.headers.get(
            'x-request-id',
          ),
        );

        assert.match(
          response.headers.get(
            'cache-control',
          ) ??
            '',

          /no-store/,
        );
      },
    );

    it(
      'reports API health',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/health',
          );

        assert.equal(
          response.status,
          200,
        );

        assertRecord(
          response.body,
          'Health response',
        );
      },
    );

    it(
      'reports public auth status',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/auth/status',
          );

        assert.equal(
          response.status,
          200,
        );

        assertRecord(
          response.body,
          'Auth status response',
        );

        assert.equal(
          typeof response.body
            .configured,
          'boolean',
        );
      },
    );

    it(
      'loads a page of FIR records',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases?page=1&pageSize=5',
          );

        assertRecord(
          response.body,
          'Case-list response',
        );

        const cases =
          readArray(
            response.body,
            'items',
            'cases',
            'results',
          );

        assert.ok(
          cases.length > 0,
        );

        assert.ok(
          cases.length <= 5,
        );

        const firstCase =
          cases[0];

        assertRecord(
          firstCase,
          'First case',
        );

        assert.ok(
          readNumber(
            firstCase,
            'caseId',
          ) > 0,
        );
      },
    );

    it(
      'loads complete FIR details',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/1',
          );

        assertRecord(
          response.body,
          'Case detail',
        );

        assert.equal(
          readNumber(
            response.body,
            'caseId',
          ),
          1,
        );

        assert.ok(
          readArray(
            response.body,
            'timeline',
            'caseTimeline',
          ).length > 0,
        );

        assert.ok(
          readArray(
            response.body,
            'evidence',
            'evidenceItems',
          ).length > 0,
        );
      },
    );

    it(
      'returns a bounded explainable priority assessment',
      async () => {
        const first =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/1/priority',
          );

        const second =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/1/priority',
          );

        assert.deepEqual(
          second.body,
          first.body,

          'Priority assessment must be deterministic.',
        );

        assertRecord(
          first.body,
          'Priority assessment',
        );

        const score =
          readNumber(
            first.body,
            'score',
          );

        assert.ok(
          score >= 0 &&
          score <= 100,
        );

        assert.ok(
          readString(
            first.body,
            'band',
          ).length > 0,
        );

        const factors =
          readArray(
            first.body,
            'factors',
          );

        assert.ok(
          factors.length > 0,
        );

        factors.forEach(
          (factor) => {
            assertRecord(
              factor,
              'Priority factor',
            );

            assert.ok(
              readString(
                factor,
                'code',
              ).length > 0,
            );

            const evidence =
              readArray(
                factor,
                'evidence',
              );

            assert.ok(
              Array.isArray(
                evidence,
              ),
            );
          },
        );
      },
    );

    it(
      'returns a sorted priority queue',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/priority-queue?page=1&pageSize=25',
          );

        assertRecord(
          response.body,
          'Priority queue',
        );

        const items =
          readArray(
            response.body,
            'items',
            'results',
          );

        assert.ok(
          items.length > 0,
        );

        for (
          let index = 1;
          index < items.length;
          index += 1
        ) {
          const previous =
            items[index - 1];

          const current =
            items[index];

          assertRecord(
            previous,
            'Previous priority queue item',
          );

          assertRecord(
            current,
            'Current priority queue item',
          );

          const previousAssessment =
            readRecord(
              previous,
              'assessment',
            );

          const currentAssessment =
            readRecord(
              current,
              'assessment',
            );

          assert.ok(
            readNumber(
              previousAssessment,
              'score',
            ) >=
              readNumber(
                currentAssessment,
                'score',
              ),
          );
        }
      },
    );

    it(
      'returns deterministic ranked similar cases',
      async () => {
        const route =
          [
            '/cases/1/similar',
            '?limit=20',
            '&minimumScore=0',
          ].join('');

        const first =
          await requestJson<unknown>(
            testServer.baseUrl,
            route,
          );

        const second =
          await requestJson<unknown>(
            testServer.baseUrl,
            route,
          );

        assert.deepEqual(
          second.body,
          first.body,

          'Similarity results must be deterministic.',
        );

        assertRecord(
          first.body,
          'Similarity response',
        );

        assert.equal(
          readNumber(
            first.body,
            'sourceCaseId',
          ),
          1,
        );

        const results =
          readArray(
            first.body,
            'results',
          );

        assert.ok(
          results.length <= 20,
        );

        assertDescendingScores(
          results,
          'similarityScore',
        );

        results.forEach(
          (candidate) => {
            assertRecord(
              candidate,
              'Similar case',
            );

            assert.notEqual(
              readNumber(
                candidate,
                'caseId',
              ),
              1,
            );

            const score =
              readNumber(
                candidate,
                'similarityScore',
              );

            assert.ok(
              score >= 0 &&
              score <= 100,
            );

            const factors =
              readArray(
                candidate,
                'factors',
              );

            assert.equal(
              factors.length,
              8,
            );
          },
        );
      },
    );

    it(
      'returns all hotspot periods and locations',
      async () => {
        const optionsResponse =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/hotspots/filter-options',
          );

        assertRecord(
          optionsResponse.body,
          'Hotspot options',
        );

        assert.equal(
          readArray(
            optionsResponse.body,
            'periods',
          ).length,
          41,
        );

        const summaryResponse =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/hotspots/summary?limit=180',
          );

        assertRecord(
          summaryResponse.body,
          'Hotspot summary',
        );

        assert.equal(
          readNumber(
            summaryResponse.body,
            'matchingLocations',
          ),
          180,
        );

        const items =
          readArray(
            summaryResponse.body,
            'items',
          );

        assert.equal(
          items.length,
          180,
        );

        assertDescendingScores(
          items,
          'pressureScore',
        );

        const exclusions =
          readArray(
            summaryResponse.body,
            'excludedInputs',
          );

        assert.ok(
          exclusions.includes(
            'TargetNextMonthCrimeCount',
          ),
        );

        assert.ok(
          exclusions.includes(
            'UnemploymentRate',
          ),
        );
      },
    );

    it(
      'returns a twelve-month hotspot trend',
      async () => {
        const summaryResponse =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/hotspots/summary?limit=1',
          );

        assertRecord(
          summaryResponse.body,
          'Hotspot summary',
        );

        const items =
          readArray(
            summaryResponse.body,
            'items',
          );

        const firstItem =
          items[0];

        assertRecord(
          firstItem,
          'Hotspot item',
        );

        const location =
          readRecord(
            firstItem,
            'location',
          );

        const locationId =
          readNumber(
            location,
            'id',
          );

        const trendResponse =
          await requestJson<unknown>(
            testServer.baseUrl,
            [
              '/hotspots/locations/',
              locationId,
              '/trend?months=12',
            ].join(''),
          );

        assertRecord(
          trendResponse.body,
          'Hotspot trend',
        );

        assert.equal(
          readArray(
            trendResponse.body,
            'points',
          ).length,
          12,
        );
      },
    );

    it(
      'returns dataset-wide analytics totals',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/analytics/overview',
          );

        assertRecord(
          response.body,
          'Analytics response',
        );

        const overview =
          readRecord(
            response.body,
            'overview',
          );

        assert.equal(
          readNumber(
            overview,
            'totalCases',
          ),
          10_000,
        );

        assert.equal(
          readNumber(
            overview,
            'accusedPersons',
          ),
          13_088,
        );

        assert.equal(
          readNumber(
            overview,
            'victims',
          ),
          10_946,
        );

        assert.equal(
          readNumber(
            overview,
            'arrestEvents',
          ),
          7_174,
        );

        assert.equal(
          readNumber(
            overview,
            'chargesheetRecords',
          ),
          5_418,
        );

        const monthlyTrend =
          readArray(
            response.body,
            'monthlyTrend',
          );

        const monthlyCaseTotal =
          monthlyTrend.reduce<number>(
            (
              total: number,
              point,
            ) => {
              assertRecord(
                point,
                'Monthly analytics point',
              );

              return (
                total +
                readNumber(
                  point,
                  'registeredCases',
                )
              );
            },
            0,
          );

        assert.equal(
          monthlyCaseTotal,
          10_000,
        );

        const exclusions =
          readArray(
            response.body,
            'excludedInputs',
          );

        assert.ok(
          exclusions.includes(
            'Caste',
          ),
        );

        assert.ok(
          exclusions.includes(
            'Religion',
          ),
        );
      },
    );

    it(
      'returns an investigation graph neighborhood',
      async () => {
        const response =
          await requestJson<unknown>(
            testServer.baseUrl,
            [
              '/graph/neighborhood',
              '?rootNodeId=CASE%3A1',
              '&depth=1',
              '&nodeLimit=40',
            ].join(''),
          );

        assertRecord(
          response.body,
          'Graph response',
        );

        const nodes =
          readArray(
            response.body,
            'nodes',
          );

        const edges =
          readArray(
            response.body,
            'edges',
          );

        assert.ok(
          nodes.length > 0,
        );

        assert.ok(
          edges.length > 0,
        );

        const containsRoot =
          nodes.some(
            (node) => {
              if (!isRecord(node)) {
                return false;
              }

              return (
                node.nodeId ===
                  'CASE:1' ||
                node.id ===
                  'CASE:1'
              );
            },
          );

        assert.equal(
          containsRoot,
          true,
        );
      },
    );

    it(
      'rejects invalid request parameters',
      async () => {
        const invalidSimilar =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/1/similar?limit=51',

            400,
          );

        assert.equal(
          readErrorCode(
            invalidSimilar.body,
          ),
          'INVALID_REQUEST',
        );

        const invalidHotspot =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/hotspots/summary?month=13',

            400,
          );

        assert.equal(
          readErrorCode(
            invalidHotspot.body,
          ),
          'INVALID_REQUEST',
        );

        const invalidAnalytics =
          await requestJson<unknown>(
            testServer.baseUrl,
            [
              '/analytics/overview',
              '?registeredFrom=2026-01-01',
              '&registeredTo=2025-01-01',
            ].join(''),

            400,
          );

        assert.equal(
          readErrorCode(
            invalidAnalytics.body,
          ),
          'INVALID_REQUEST',
        );
      },
    );

    it(
      'returns not-found errors for missing resources',
      async () => {
        const missingCase =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/999999',

            404,
          );

        assert.ok(
          [
            'CASE_NOT_FOUND',
            'NOT_FOUND',
          ].includes(
            readErrorCode(
              missingCase.body,
            ),
          ),
        );

        const missingSimilarity =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/cases/999999/similar',

            404,
          );

        assert.equal(
          readErrorCode(
            missingSimilarity.body,
          ),
          'CASE_NOT_FOUND',
        );
      },
    );
  },
);
