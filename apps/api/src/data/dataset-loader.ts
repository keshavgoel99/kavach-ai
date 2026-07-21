import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  CORE_TABLE_COLUMNS,
  DATASET_LAYOUT,
  EXPECTED_CASE_COUNT,
  EXPECTED_DATASET_VERSION,
} from '@kavach/schema-catalog';

import type {
  CoreCsvRow,
  CoreTableName,
  DatasetManifest,
} from '@kavach/schema-catalog';

import {
  parseCaseMasterRow,
} from './case-master-record';

import type {
  CaseMasterRecord,
} from './case-master-record';

import { loadCoreCsvTable } from './csv-loader';

import {
  DatasetValidationError,
} from './value-parsers';

const PROJECT_ROOT = path.resolve(
  __dirname,
  '../../../..',
);

const CORE_TABLE_NAMES = Object.keys(
  CORE_TABLE_COLUMNS,
) as CoreTableName[];

export type RawCoreTables = {
  readonly [Table in CoreTableName]:
    readonly CoreCsvRow<Table>[];
};

export interface LoadedCoreDataset {
  datasetRoot: string;
  loadedAt: string;

  manifest: DatasetManifest;

  rawTables: RawCoreTables;
  tableRowCounts: Readonly<Record<string, number>>;

  cases: readonly CaseMasterRecord[];
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateManifest(
  value: unknown,
): DatasetManifest {
  if (!isRecord(value)) {
    throw new DatasetValidationError(
      'dataset_manifest.json must contain a JSON object.',
    );
  }

  if (
    typeof value.dataset_name !== 'string' ||
    typeof value.version !== 'string' ||
    typeof value.generated_at !== 'string' ||
    typeof value.seed !== 'number' ||
    typeof value.synthetic !== 'boolean' ||
    typeof value.case_count !== 'number' ||
    !isRecord(value.date_range) ||
    !isRecord(value.row_counts) ||
    !Array.isArray(value.recommended_use) ||
    !Array.isArray(value.not_recommended_use)
  ) {
    throw new DatasetValidationError(
      'dataset_manifest.json has an invalid structure.',
    );
  }

  if (value.version !== EXPECTED_DATASET_VERSION) {
    throw new DatasetValidationError(
      'Dataset version does not match the schema catalog.',
      {
        expectedVersion:
          EXPECTED_DATASET_VERSION,
        actualVersion: value.version,
      },
    );
  }

  if (value.synthetic !== true) {
    throw new DatasetValidationError(
      'The local development dataset must be synthetic.',
    );
  }

  if (value.case_count !== EXPECTED_CASE_COUNT) {
    throw new DatasetValidationError(
      'Dataset case count is not the expected version-1 count.',
      {
        expectedCaseCount: EXPECTED_CASE_COUNT,
        actualCaseCount: value.case_count,
      },
    );
  }

  return value as unknown as DatasetManifest;
}

async function loadManifest(
  datasetRoot: string,
): Promise<DatasetManifest> {
  const manifestPath = path.join(
    datasetRoot,
    DATASET_LAYOUT.manifestFile,
  );

  let manifestText: string;

  try {
    manifestText = await readFile(
      manifestPath,
      'utf8',
    );
  } catch (error: unknown) {
    throw new DatasetValidationError(
      'Dataset manifest could not be read.',
      {
        manifestPath,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );
  }

  let parsedManifest: unknown;

  try {
    parsedManifest = JSON.parse(manifestText);
  } catch (error: unknown) {
    throw new DatasetValidationError(
      'Dataset manifest contains invalid JSON.',
      {
        manifestPath,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );
  }

  return validateManifest(parsedManifest);
}

export function resolveDatasetRoot(): string {
  const configuredPath =
    process.env.KAVACH_DATASET_ROOT?.trim();

  if (configuredPath) {
    return path.resolve(configuredPath);
  }

  return path.join(
    PROJECT_ROOT,
    'data',
    'raw',
    DATASET_LAYOUT.directoryName,
  );
}

export async function loadCoreDataset(): Promise<LoadedCoreDataset> {
  const datasetRoot = resolveDatasetRoot();
  const manifest = await loadManifest(datasetRoot);

  const tableEntries = await Promise.all(
    CORE_TABLE_NAMES.map(
      async (table) => {
        const rows = await loadCoreCsvTable(
          datasetRoot,
          table,
        );

        const expectedRowCount =
          manifest.row_counts[table];

        if (
          typeof expectedRowCount === 'number' &&
          rows.length !== expectedRowCount
        ) {
          throw new DatasetValidationError(
            `${table}.csv row count does not match the dataset manifest.`,
            {
              table,
              expectedRowCount,
              actualRowCount: rows.length,
            },
          );
        }

        return [table, rows] as const;
      },
    ),
  );

  const rawTables = Object.fromEntries(
    tableEntries,
  ) as RawCoreTables;

  const cases = rawTables.CaseMaster.map(
    parseCaseMasterRow,
  );

  if (cases.length !== manifest.case_count) {
    throw new DatasetValidationError(
      'Parsed CaseMaster count does not match the manifest.',
      {
        manifestCaseCount: manifest.case_count,
        parsedCaseCount: cases.length,
      },
    );
  }

  const tableRowCounts = Object.fromEntries(
    tableEntries.map(
      ([table, rows]) => [
        table,
        rows.length,
      ],
    ),
  );

  return {
    datasetRoot,
    loadedAt: new Date().toISOString(),
    manifest,
    rawTables,
    tableRowCounts,
    cases,
  };
}