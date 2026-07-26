import assert from 'node:assert/strict';

import {
  readFile,
  readdir,
  stat,
} from 'node:fs/promises';

import path from 'node:path';

const DATASET_DIRECTORY =
  'KAVACH_Synthetic_Crime_Dataset_v1';

const OUTPUT_ROOT =
  path.resolve(
    process.cwd(),
    'out',
  );

async function collectFiles(
  directory: string,
): Promise<string[]> {
  const entries =
    await readdir(
      directory,
      {
        withFileTypes: true,
      },
    );

  const files:
    string[] = [];

  for (
    const entry of entries
  ) {
    const entryPath =
      path.join(
        directory,
        entry.name,
      );

    if (
      entry.isDirectory()
    ) {
      files.push(
        ...await collectFiles(
          entryPath,
        ),
      );

      continue;
    }

    if (
      entry.isFile()
    ) {
      files.push(
        entryPath,
      );
    }
  }

  return files;
}

async function main(): Promise<void> {
  const outputStats =
    await stat(
      OUTPUT_ROOT,
    );

  assert.equal(
    outputStats.isDirectory(),
    true,

    'Electron Forge output directory is missing.',
  );

  const files =
    await collectFiles(
      OUTPUT_ROOT,
    );

  const setupExecutable =
    files.find(
      (filePath) =>
        path.basename(
          filePath,
        ) ===
        'Kavach-AI-Setup.exe',
    );

  assert.ok(
    setupExecutable,

    'Kavach-AI-Setup.exe was not generated.',
  );

  const portableZip =
    files.find(
      (filePath) =>
        filePath
          .toLowerCase()
          .endsWith(
            '.zip',
          ),
    );

  assert.ok(
    portableZip,

    'The portable Windows ZIP was not generated.',
  );

  const packagedManifest =
    files.find(
      (filePath) => {
        const normalized =
          filePath.replaceAll(
            '\\',
            '/',
          );

        return normalized.endsWith(
          [
            '/resources/',
            DATASET_DIRECTORY,
            '/dataset_manifest.json',
          ].join(''),
        );
      },
    );

  assert.ok(
    packagedManifest,

    'The packaged dataset manifest is missing.',
  );

  const manifest =
    JSON.parse(
      await readFile(
        packagedManifest,
        'utf8',
      ),
    ) as {
      synthetic?: unknown;
      case_count?: unknown;
      version?: unknown;
    };

  assert.equal(
    manifest.synthetic,
    true,

    'The packaged dataset must be synthetic.',
  );

  assert.equal(
    manifest.case_count,
    10_000,

    'The packaged dataset must contain 10,000 cases.',
  );

  const releaseNotice =
    files.find(
      (filePath) => {
        const normalized =
          filePath.replaceAll(
            '\\',
            '/',
          );

        return normalized.endsWith(
          '/resources/release/README.txt',
        );
      },
    );

  assert.ok(
    releaseNotice,

    'The packaged release notice is missing.',
  );

  console.log('');

  console.log(
    'KAVACH WINDOWS RELEASE · VALID',
  );

  console.log(
    `Installer: ${setupExecutable}`,
  );

  console.log(
    `Portable ZIP: ${portableZip}`,
  );

  console.log(
    `Dataset version: ${String(
      manifest.version,
    )}`,
  );

  console.log(
    'Synthetic cases: 10000',
  );

  console.log(
    'Embedded release notice: present',
  );
}

main().catch(
  (
    error: unknown,
  ) => {
    console.error('');

    console.error(
      'KAVACH WINDOWS RELEASE · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
