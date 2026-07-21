export const DATASET_LAYOUT = {
  directoryName: 'KAVACH_Synthetic_Crime_Dataset_v1',
  manifestFile: 'dataset_manifest.json',
  csvDirectory: 'csv',
  graphDirectory: 'graph',
  machineLearningDirectory: 'ml',
  retrievalDirectory: 'rag',
  documentationDirectory: 'docs',
  sqlDirectory: 'sql',
} as const;

export interface DatasetDateRange {
  start: string;
  end: string;
}

export interface DatasetManifest {
  dataset_name: string;
  version: string;
  generated_at: string;
  seed: number;
  synthetic: boolean;
  case_count: number;
  date_range: DatasetDateRange;
  row_counts: Record<string, number>;
  recommended_use: string[];
  not_recommended_use: string[];
}

export const EXPECTED_DATASET_VERSION = '1.0';
export const EXPECTED_CASE_COUNT = 10_000;
export const EXPECTED_RELATIONAL_TABLE_COUNT = 52;