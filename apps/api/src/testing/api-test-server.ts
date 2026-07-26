import {
  createServer,
} from 'node:http';

import type {
  AddressInfo,
} from 'node:net';

import {
  app,
} from '../app';

export interface ApiTestServer {
  baseUrl: string;

  close():
    Promise<void>;
}

export async function startApiTestServer(): Promise<ApiTestServer> {
  const server =
    createServer(app);

  await new Promise<void>(
    (
      resolve,
      reject,
    ) => {
      server.once(
        'error',
        reject,
      );

      server.listen(
        0,
        '127.0.0.1',
        () => {
          server.off(
            'error',
            reject,
          );

          resolve();
        },
      );
    },
  );

  const address =
    server.address();

  if (
    !address ||
    typeof address ===
      'string'
  ) {
    server.close();

    throw new Error(
      'The API test server did not receive a TCP address.',
    );
  }

  const {
    port,
  } =
    address as AddressInfo;

  return {
    baseUrl:
      `http://127.0.0.1:${port}/api/v1`,

    close: () =>
      new Promise<void>(
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
        },
      ),
  };
}
