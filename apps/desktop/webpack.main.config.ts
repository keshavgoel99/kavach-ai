import type { Configuration } from 'webpack';

import {
  nativeModuleRules,
  typescriptRules,
} from './webpack.rules';
import { plugins } from './webpack.plugins';

export const mainConfig: Configuration = {
  entry: './src/index.ts',

  module: {
    rules: [
      ...nativeModuleRules,
      ...typescriptRules,
    ],
  },

  plugins,

  resolve: {
    extensions: [
      '.js',
      '.ts',
      '.jsx',
      '.tsx',
      '.css',
      '.json',
    ],
  },
};