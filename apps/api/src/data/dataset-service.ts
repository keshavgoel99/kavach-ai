import {
  loadCoreDataset,
} from './dataset-loader';

import type {
  LoadedCoreDataset,
} from './dataset-loader';

let datasetPromise:
  Promise<LoadedCoreDataset> | undefined;

export function getCoreDataset(): Promise<LoadedCoreDataset> {
  datasetPromise ??= loadCoreDataset();

  return datasetPromise;
}

export function clearDatasetCache(): void {
  datasetPromise = undefined;
}