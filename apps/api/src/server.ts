import { createApp } from './app';

const DEFAULT_PORT = 4000;
const HOST = '127.0.0.1';

function resolvePort(): number {
  const configuredPort = process.env.API_PORT;

  if (!configuredPort) {
    return DEFAULT_PORT;
  }

  const parsedPort = Number(configuredPort);

  if (
    !Number.isInteger(parsedPort) ||
    parsedPort < 1 ||
    parsedPort > 65_535
  ) {
    throw new Error(
      `API_PORT must be an integer between 1 and 65535. Received: ${configuredPort}`,
    );
  }

  return parsedPort;
}

const port = resolvePort();
const app = createApp();

const server = app.listen(port, HOST, () => {
  console.log('');
  console.log('KAVACH API · OPERATIONAL');
  console.log(`Local address: http://${HOST}:${port}`);
  console.log(`Health check:  http://${HOST}:${port}/api/v1/health`);
  console.log('');
});

function shutDown(signal: NodeJS.Signals): void {
  console.log(`\n${signal} received. Shutting down Kavach API...`);

  server.close((error) => {
    if (error) {
      console.error('The API could not shut down cleanly:', error);
      process.exit(1);
    }

    console.log('Kavach API stopped.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10_000).unref();
}

process.once('SIGINT', shutDown);
process.once('SIGTERM', shutDown);