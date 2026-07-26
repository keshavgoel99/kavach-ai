import assert from 'node:assert/strict';

import {
  readdir,
  readFile,
} from 'node:fs/promises';

import path from 'node:path';

interface SourceFile {
  absolutePath: string;

  relativePath: string;

  content: string;
}

const DESKTOP_ROOT =
  process.cwd();

const SOURCE_ROOT =
  path.join(
    DESKTOP_ROOT,
    'src',
  );

const RENDERER_LOCATIONS = [
  path.join(
    SOURCE_ROOT,
    'components',
  ),

  path.join(
    SOURCE_ROOT,
    'app.tsx',
  ),

  path.join(
    SOURCE_ROOT,
    'renderer.ts',
  ),

  path.join(
    SOURCE_ROOT,
    'renderer.tsx',
  ),
];

const FORBIDDEN_RENDERER_PATTERNS = [
  {
    pattern:
      /from\s+['"]electron['"]/,

    description:
      'Renderer imports Electron directly',
  },

  {
    pattern:
      /from\s+['"](?:node:)?fs(?:\/promises)?['"]/,

    description:
      'Renderer imports filesystem access',
  },

  {
    pattern:
      /from\s+['"](?:node:)?child_process['"]/,

    description:
      'Renderer imports child-process access',
  },

  {
    pattern:
      /from\s+['"](?:node:)?net['"]/,

    description:
      'Renderer imports raw networking',
  },

  {
    pattern:
      /\bipcRenderer\b/,

    description:
      'Renderer accesses ipcRenderer directly',
  },

  {
    pattern:
      /\bwindow\.require\b/,

    description:
      'Renderer accesses window.require',
  },

  {
    pattern:
      /\bXMLHttpRequest\b/,

    description:
      'Renderer creates direct XMLHttpRequest calls',
  },

  {
    pattern:
      /\bfetch\s*\(/,

    description:
      'Renderer performs direct network fetches',
  },
] as const;

async function pathExists(
  candidatePath: string,
): Promise<boolean> {
  try {
    await readFile(
      candidatePath,
    );

    return true;
  } catch {
    try {
      await readdir(
        candidatePath,
      );

      return true;
    } catch {
      return false;
    }
  }
}

async function collectFiles(
  candidatePath: string,
): Promise<SourceFile[]> {
  if (
    !(await pathExists(
      candidatePath,
    ))
  ) {
    return [];
  }

  const extension =
    path.extname(
      candidatePath,
    );

  if (extension) {
    return [
      {
        absolutePath:
          candidatePath,

        relativePath:
          path.relative(
            DESKTOP_ROOT,
            candidatePath,
          ),

        content:
          await readFile(
            candidatePath,
            'utf8',
          ),
      },
    ];
  }

  const entries =
    await readdir(
      candidatePath,
      {
        withFileTypes: true,
      },
    );

  const files:
    SourceFile[] = [];

  for (
    const entry of entries
  ) {
    const entryPath =
      path.join(
        candidatePath,
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
      !/\.(?:ts|tsx|js|jsx)$/.test(
        entry.name,
      )
    ) {
      continue;
    }

    files.push({
      absolutePath:
        entryPath,

      relativePath:
        path.relative(
          DESKTOP_ROOT,
          entryPath,
        ),

      content:
        await readFile(
          entryPath,
          'utf8',
        ),
    });
  }

  return files;
}

async function main(): Promise<void> {
  const mainProcessPath =
    path.join(
      SOURCE_ROOT,
      'index.ts',
    );

  const preloadPath =
    path.join(
      SOURCE_ROOT,
      'preload.ts',
    );

  const mainProcessSource =
    await readFile(
      mainProcessPath,
      'utf8',
    );

  const preloadSource =
    await readFile(
      preloadPath,
      'utf8',
    );

  assert.match(
    mainProcessSource,

    /contextIsolation\s*:\s*true/,

    'Electron must enable contextIsolation.',
  );

  assert.match(
    mainProcessSource,

    /nodeIntegration\s*:\s*false/,

    'Electron must disable renderer Node integration.',
  );

  assert.match(
    mainProcessSource,

    /sandbox\s*:\s*true/,

    'Electron renderer sandboxing must remain enabled.',
  );

  assert.match(
    preloadSource,

    /contextBridge\s*\.\s*exposeInMainWorld/,

    'Preload must expose APIs through contextBridge.',
  );

  assert.doesNotMatch(
    preloadSource,

    /\bremote\b/,

    'The deprecated Electron remote API must not be used.',
  );

  const rendererFiles:
    SourceFile[] = [];

  for (
    const location
    of RENDERER_LOCATIONS
  ) {
    rendererFiles.push(
      ...await collectFiles(
        location,
      ),
    );
  }

  assert.ok(
    rendererFiles.length > 0,

    'No renderer source files were inspected.',
  );

  const violations:
    string[] = [];

  rendererFiles.forEach(
    (file) => {
      FORBIDDEN_RENDERER_PATTERNS
        .forEach(
          ({
            pattern,
            description,
          }) => {
            if (
              pattern.test(
                file.content,
              )
            ) {
              violations.push(
                [
                  file.relativePath,
                  description,
                ].join(
                  ': ',
                ),
              );
            }
          },
        );
    },
  );

  assert.deepEqual(
    violations,
    [],

    [
      'Renderer security-boundary',
      'violations were found:',
      ...violations,
    ].join('\n'),
  );

  console.log('');

  console.log(
    'KAVACH DESKTOP SECURITY · VALID',
  );

  console.log(
    [
      'Renderer files inspected:',
      rendererFiles.length,
    ].join(' '),
  );

  console.log(
    'contextIsolation: enabled',
  );

  console.log(
    'nodeIntegration: disabled',
  );

  console.log(
    'sandbox: enabled',
  );

  console.log(
    'Direct renderer filesystem access: blocked',
  );

  console.log(
    'Direct renderer network access: blocked',
  );

  console.log(
    'Direct renderer IPC access: blocked',
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH DESKTOP SECURITY · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
