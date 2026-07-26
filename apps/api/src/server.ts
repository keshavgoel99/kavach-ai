import {
  createServer,
} from 'node:http';

import {
  app,
} from './app';

const API_HOST =
  '127.0.0.1';

const API_PORT =
  Number(
    process.env
      .KAVACH_API_PORT ??
    4000,
  );

if (
  !Number.isSafeInteger(
    API_PORT,
  ) ||
  API_PORT < 1 ||
  API_PORT > 65_535
) {
  throw new Error(
    'KAVACH_API_PORT must contain a valid TCP port.',
  );
}

const server =
  createServer(app);

server.requestTimeout =
  30_000;

server.headersTimeout =
  35_000;

server.keepAliveTimeout =
  5_000;

server.maxHeadersCount =
  100;

server.listen(
  API_PORT,
  API_HOST,
  () => {
    console.log('');

    console.log(
      'KAVACH API · READY',
    );

    console.log(
      `http://${API_HOST}:${API_PORT}`,
    );
  },
);

let shuttingDown =
  false;

async function shutdown(
  signal: string,
): Promise<void> {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log('');

  console.log(
    `KAVACH API · SHUTDOWN (${signal})`,
  );

  const forcedExit =
    setTimeout(
      () => {
        console.error(
          'KAVACH API · FORCED SHUTDOWN',
        );

        process.exit(1);
      },
      10_000,
    );

  forcedExit.unref();

  server.close(
    (error) => {
      clearTimeout(
        forcedExit,
      );

      if (error) {
        console.error(
          error,
        );

        process.exit(1);

        return;
      }

      process.exit(0);
    },
  );
}

process.once(
  'SIGINT',
  () => {
    void shutdown(
      'SIGINT',
    );
  },
);

process.once(
  'SIGTERM',
  () => {
    void shutdown(
      'SIGTERM',
    );
  },
);

server.on(
  'error',
  (error) => {
    console.error(
      'KAVACH API · SERVER ERROR',
    );

    console.error(error);

    process.exitCode = 1;
  },
);