import assert from 'node:assert/strict';

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

import {
  requestJson,
} from './http-test-client';

let testServer:
  ApiTestServer;

let temporarySecurityDirectory:
  string;

describe(
  'KAVACH authentication integration',
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
              'kavach-auth-test-',
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
          'security-test',
          'Security Test Operator',
          'INVESTIGATOR',
          'SecurityTest!2026',
        );

        const {
          startApiTestServer,
        } =
          await import(
            './api-test-server.js'
          );

        testServer =
          await startApiTestServer();
      },
    );

    after(
      async () => {
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
      'reports configured security status',
      async () => {
        const response =
          await requestJson<{
            configured: boolean;
            operatorCount: number;
          }>(
            testServer.baseUrl,
            '/auth/status',
          );

        assert.equal(
          response.body
            .configured,
          true,
        );

        assert.equal(
          response.body
            .operatorCount,
          1,
        );
      },
    );

    it(
      'rejects incorrect credentials',
      async () => {
        const response =
          await requestJson<{
            error: {
              code: string;
            };
          }>(
            testServer.baseUrl,
            '/auth/login',
            401,
            {
              method: 'POST',

              headers: {
                'content-type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  username:
                    'security-test',

                  password:
                    'IncorrectPassword',
                }),
            },
          );

        assert.equal(
          response.body
            .error
            .code,
          'LOGIN_FAILED',
        );
      },
    );

    it(
      'creates and invalidates a session',
      async () => {
        const login =
          await requestJson<{
            accessToken: string;
          }>(
            testServer.baseUrl,
            '/auth/login',
            200,
            {
              method: 'POST',

              headers: {
                'content-type':
                  'application/json',
              },

              body:
                JSON.stringify({
                  username:
                    'security-test',

                  password:
                    'SecurityTest!2026',
                }),
            },
          );

        const authorization = {
          authorization:
            `Bearer ${login.body.accessToken}`,
        };

        const session =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/auth/session',
            200,
            {
              headers:
                authorization,
            },
          );

        assert.ok(
          session.body,
        );

        await requestJson<unknown>(
          testServer.baseUrl,
          '/auth/logout',
          204,
          {
            method: 'POST',

            headers:
              authorization,
          },
        );

        const expiredSession =
          await requestJson<unknown>(
            testServer.baseUrl,
            '/auth/session',
            401,
            {
              headers:
                authorization,
            },
          );

        assert.ok(
          expiredSession.body,
        );
      },
    );
  },
);
