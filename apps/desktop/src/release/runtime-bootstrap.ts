import {
  access,
} from 'node:fs/promises';

import path from 'node:path';

import {
  app,
} from 'electron';

import type {
  EmbeddedKavachApi,
} from '@kavach/api/embedded-server';

import {
  startEmbeddedKavachApi,
} from '@kavach/api/embedded-server';

import {
  configureApiBaseUrl,
} from '../case-api-client';

const DATASET_DIRECTORY_NAME =
  'KAVACH_Synthetic_Crime_Dataset_v1';

let embeddedApi:
  EmbeddedKavachApi | null =
  null;

function getPackagedDatasetRoot(): string {
  return path.join(
    process.resourcesPath,
    DATASET_DIRECTORY_NAME,
  );
}

function getSecurityDirectory(): string {
  return path.join(
    app.getPath(
      'userData',
    ),
    'security',
  );
}

async function validatePackagedDataset(
  datasetRoot: string,
): Promise<void> {
  const manifestPath =
    path.join(
      datasetRoot,
      'dataset_manifest.json',
    );

  try {
    await access(
      manifestPath,
    );
  } catch (
    error: unknown
  ) {
    throw new Error(
      [
        'The packaged KAVACH dataset',
        'is missing or unreadable.',
        manifestPath,
        error instanceof Error
          ? error.message
          : String(error),
      ].join(' '),
    );
  }
}

export async function initializeKavachRuntime(): Promise<void> {
  if (!app.isPackaged) {
    configureApiBaseUrl(
      process.env
        .KAVACH_API_BASE_URL ??
      'http://127.0.0.1:4000/api/v1',
    );

    return;
  }

  const datasetRoot =
    getPackagedDatasetRoot();

  await validatePackagedDataset(
    datasetRoot,
  );

  embeddedApi =
    await startEmbeddedKavachApi({
      host:
        '127.0.0.1',

      port:
        0,

      datasetRoot,

      securityDirectory:
        getSecurityDirectory(),
    });

  configureApiBaseUrl(
    embeddedApi.baseUrl,
  );
}

export async function stopKavachRuntime(): Promise<void> {
  const currentApi =
    embeddedApi;

  embeddedApi = null;

  await currentApi?.close();
}
