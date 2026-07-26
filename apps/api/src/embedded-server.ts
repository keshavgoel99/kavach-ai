import {
  createServer,
} from 'node:http';

import type {
  Server,
} from 'node:http';

import type {
  AddressInfo,
} from 'node:net';

import path from 'node:path';

import {
  app as apiApplication,
} from './app';

import {
  getCoreDataset,
} from './data/dataset-service';

export interface EmbeddedKavachApiOptions {
  host?: string;

  port?: number;

  datasetRoot?: string;

  securityDirectory?: string;
}

export interface EmbeddedKavachApi {
  host: string;
  port: number;

  origin: string;
  baseUrl: string;

  close():
    Promise<void>;
}

let activeApi:
  EmbeddedKavachApi | null =
  null;

function configureRuntimePath(
  environmentName: string,
  suppliedPath:
    string | undefined,
): void {
  if (!suppliedPath) {
    return;
  }

  process.env[
    environmentName
  ] =
    path.resolve(
      suppliedPath,
    );
}

async function listen(
  server: Server,
  host: string,
  port: number,
): Promise<AddressInfo> {
  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      const handleError = (
        error: Error,
      ): void => {
        server.off(
          'listening',
          handleListening,
        );

        reject(error);
      };

      const handleListening =
        (): void => {
          server.off(
            'error',
            handleError,
          );

          resolve();
        };

      server.once(
        'error',
        handleError,
      );

      server.once(
        'listening',
        handleListening,
      );

      server.listen(
        port,
        host,
      );
    },
  );

  const address =
    server.address();

  if (
    !address ||
    typeof address === 'string'
  ) {
    throw new Error(
      [
        'The embedded KAVACH API',
        'did not receive a TCP address.',
      ].join(' '),
    );
  }

  return address;
}

export async function startEmbeddedKavachApi(
  options:
    EmbeddedKavachApiOptions = {},
): Promise<EmbeddedKavachApi> {
  if (activeApi) {
    return activeApi;
  }

  const host =
    options.host ??
    '127.0.0.1';

  const port =
    options.port ??
    0;

  if (
    host !== '127.0.0.1'
  ) {
    throw new Error(
      [
        'The embedded API may only',
        'bind to 127.0.0.1.',
      ].join(' '),
    );
  }

  if (
    !Number.isSafeInteger(
      port,
    ) ||
    port < 0 ||
    port > 65_535
  ) {
    throw new Error(
      'The embedded API port is invalid.',
    );
  }

  configureRuntimePath(
    'KAVACH_DATASET_ROOT',
    options.datasetRoot,
  );

  configureRuntimePath(
    'KAVACH_SECURITY_DIRECTORY',
    options.securityDirectory,
  );

  console.log('');

  console.log(
    'KAVACH EMBEDDED API - INITIALIZING',
  );

  const dataset =
    await getCoreDataset();

  const server =
    createServer(
      apiApplication,
    );

  server.requestTimeout =
    30_000;

  server.headersTimeout =
    35_000;

  server.keepAliveTimeout =
    5_000;

  server.maxHeadersCount =
    100;

  const address =
    await listen(
      server,
      host,
      port,
    );

  const origin =
    `http://${host}:${address.port}`;

  let closed =
    false;

  const embeddedApi:
    EmbeddedKavachApi = {
    host,

    port:
      address.port,

    origin,

    baseUrl:
      `${origin}/api/v1`,

    close: async () => {
      if (closed) {
        return;
      }

      closed = true;

      await new Promise<void>(
        (
          resolve,
          reject,
        ) => {
          server.close(
            (error) => {
              if (error) {
                reject(error);

                return;
              }

              resolve();
            },
          );

          server.closeIdleConnections();
        },
      );

      activeApi = null;

      console.log(
        'KAVACH EMBEDDED API - STOPPED',
      );
    },
  };

  activeApi =
    embeddedApi;

  console.log(
    'KAVACH EMBEDDED API - OPERATIONAL',
  );

  console.log(
    `Dataset: ${dataset.manifest.dataset_name}`,
  );

  console.log(
    `Cases: ${dataset.cases.length}`,
  );

  console.log(
    `Address: ${embeddedApi.baseUrl}`,
  );

  return embeddedApi;
}
