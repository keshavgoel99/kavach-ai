import type {
  Configuration,
  ModuleOptions,
} from 'webpack';

import { typescriptRules } from './webpack.rules';
import { plugins } from './webpack.plugins';

const rendererRules: Required<ModuleOptions>['rules'] = [
  ...typescriptRules,
  {
    test: /\.css$/,
    use: [
      {
        loader: 'style-loader',
      },
      {
        loader: 'css-loader',
      },
    ],
  },
];

export const rendererConfig: Configuration = {
  module: {
    rules: rendererRules,
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