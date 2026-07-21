import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { parse } from 'csv-parse/sync';

import {
  CORE_TABLE_COLUMNS,
  CORE_TABLE_PRIMARY_KEYS,
} from '@kavach/schema-catalog';

import type {
  CoreCsvRow,
  CoreTableName,
} from '@kavach/schema-catalog';

import { DatasetValidationError } from './value-parsers';

function validateHeaders(
  table: CoreTableName,
  actualHeaders: readonly string[],
): void {
  const expectedHeaders =
    CORE_TABLE_COLUMNS[table] as readonly string[];

  const missingHeaders = expectedHeaders.filter(
    (header) => !actualHeaders.includes(header),
  );

  const unexpectedHeaders = actualHeaders.filter(
    (header) => !expectedHeaders.includes(header),
  );

  const hasCorrectOrder =
    expectedHeaders.length === actualHeaders.length &&
    expectedHeaders.every(
      (header, index) =>
        actualHeaders[index] === header,
    );

  if (
    missingHeaders.length > 0 ||
    unexpectedHeaders.length > 0 ||
    !hasCorrectOrder
  ) {
    throw new DatasetValidationError(
      `${table}.csv does not match the frozen schema catalog.`,
      {
        table,
        expectedHeaders,
        actualHeaders,
        missingHeaders,
        unexpectedHeaders,
        correctOrder: hasCorrectOrder,
      },
    );
  }
}

function validatePrimaryKeys<
  Table extends CoreTableName,
>(
  table: Table,
  rows: readonly CoreCsvRow<Table>[],
): void {
  const keyColumns =
    CORE_TABLE_PRIMARY_KEYS[table] as readonly string[];

  const seenKeys = new Set<string>();

  rows.forEach((typedRow, index) => {
    const row = typedRow as Record<string, string>;

    const keyParts = keyColumns.map(
      (column) => row[column]?.trim() ?? '',
    );

    const rowNumber = index + 2;

    if (keyParts.some((part) => !part)) {
      throw new DatasetValidationError(
        `${table}.csv contains an empty primary-key value.`,
        {
          table,
          rowNumber,
          keyColumns,
          keyParts,
        },
      );
    }

    const keySignature = keyParts.join('\u001f');

    if (seenKeys.has(keySignature)) {
      throw new DatasetValidationError(
        `${table}.csv contains a duplicate primary key.`,
        {
          table,
          rowNumber,
          keyColumns,
          keyParts,
        },
      );
    }

    seenKeys.add(keySignature);
  });
}

export async function loadCoreCsvTable<
  Table extends CoreTableName,
>(
  datasetRoot: string,
  table: Table,
): Promise<readonly CoreCsvRow<Table>[]> {
  const csvPath = path.join(
    datasetRoot,
    'csv',
    `${table}.csv`,
  );

  let csvText: string;

  try {
    csvText = await readFile(csvPath, 'utf8');
  } catch (error: unknown) {
    throw new DatasetValidationError(
      `Required dataset file could not be read: ${table}.csv`,
      {
        table,
        csvPath,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );
  }

  let rows: CoreCsvRow<Table>[];

  try {
    rows = parse(csvText, {
      bom: true,

      columns: (headers: string[]) => {
        validateHeaders(table, headers);
        return headers;
      },

      skip_empty_lines: true,
      relax_column_count: false,
      cast: false,
    }) as CoreCsvRow<Table>[];
  } catch (error: unknown) {
    if (error instanceof DatasetValidationError) {
      throw error;
    }

    throw new DatasetValidationError(
      `CSV parsing failed for ${table}.csv.`,
      {
        table,
        csvPath,
        reason:
          error instanceof Error
            ? error.message
            : String(error),
      },
    );
  }

  validatePrimaryKeys(table, rows);

  return rows;
}