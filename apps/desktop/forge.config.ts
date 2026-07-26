import {
  existsSync,
} from 'node:fs';

import path from 'node:path';

import type {
  ForgeConfig,
} from '@electron-forge/shared-types';

import {
  MakerSquirrel,
} from '@electron-forge/maker-squirrel';

import {
  MakerZIP,
} from '@electron-forge/maker-zip';

import {
  AutoUnpackNativesPlugin,
} from '@electron-forge/plugin-auto-unpack-natives';

import {
  WebpackPlugin,
} from '@electron-forge/plugin-webpack';

import {
  FusesPlugin,
} from '@electron-forge/plugin-fuses';

import {
  FuseV1Options,
  FuseVersion,
} from '@electron/fuses';

import {
  mainConfig,
} from './webpack.main.config';

import {
  rendererConfig,
} from './webpack.renderer.config';

const DATASET_ROOT =
  path.resolve(
    __dirname,
    '../../data/raw/KAVACH_Synthetic_Crime_Dataset_v1',
  );

const RELEASE_RESOURCE_ROOT =
  path.resolve(
    __dirname,
    'resources/release',
  );

const DATASET_MANIFEST =
  path.join(
    DATASET_ROOT,
    'dataset_manifest.json',
  );

if (
  !existsSync(
    DATASET_MANIFEST,
  )
) {
  throw new Error(
    [
      'The KAVACH synthetic dataset',
      'must be present before packaging:',
      DATASET_MANIFEST,
    ].join(' '),
  );
}

const certificateFile =
  process.env
    .WINDOWS_CERTIFICATE_FILE
    ?.trim();

const certificatePassword =
  process.env
    .WINDOWS_CERTIFICATE_PASSWORD;

if (
  Boolean(certificateFile) !==
  Boolean(certificatePassword)
) {
  throw new Error(
    [
      'WINDOWS_CERTIFICATE_FILE and',
      'WINDOWS_CERTIFICATE_PASSWORD',
      'must either both be supplied',
      'or both be omitted.',
    ].join(' '),
  );
}

const squirrelConfig = {
  name:
    'kavach_ai',

  title:
    'Kavach AI',

  setupExe:
    'Kavach-AI-Setup.exe',

  noMsi:
    true,

  ...(
    certificateFile &&
    certificatePassword
      ? {
          certificateFile,
          certificatePassword,
        }
      : {}
  ),
};

const config:
  ForgeConfig = {
  packagerConfig: {
    asar: true,

    executableName:
      'KavachAI',

    appBundleId:
      'in.kavach.ai',

    appCopyright:
      'Copyright © 2026 KAVACH AI Project Team',

    extraResource: [
      DATASET_ROOT,
      RELEASE_RESOURCE_ROOT,
    ],
  },

  rebuildConfig: {},

  makers: [
    new MakerSquirrel(
      squirrelConfig,
    ),

    new MakerZIP(
      {},
      [
        'win32',
      ],
    ),
  ],

  plugins: [
    new AutoUnpackNativesPlugin(
      {},
    ),

    new WebpackPlugin({
      mainConfig,

      renderer: {
        config:
          rendererConfig,

        entryPoints: [
          {
            html:
              './src/index.html',

            js:
              './src/renderer.ts',

            name:
              'main_window',

            preload: {
              js:
                './src/preload.ts',
            },
          },
        ],
      },
    }),

    new FusesPlugin({
      version:
        FuseVersion.V1,

      [FuseV1Options.RunAsNode]:
        false,

      [FuseV1Options.EnableCookieEncryption]:
        true,

      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]:
        false,

      [FuseV1Options.EnableNodeCliInspectArguments]:
        false,

      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]:
        true,

      [FuseV1Options.OnlyLoadAppFromAsar]:
        true,
    }),
  ],
};

export default config;
