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
  {
    test: /\.(png|jpe?g|gif|svg)$/i,
    type: 'asset/resource',
  },
];

export const rendererConfig: Configuration = {
  devtool: 'source-map',

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