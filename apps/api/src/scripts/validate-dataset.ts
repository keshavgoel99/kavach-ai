import {
  loadCoreDataset,
} from '../data/dataset-loader';

async function main(): Promise<void> {
  const startedAt = performance.now();

  const dataset = await loadCoreDataset();

  const elapsedMilliseconds = Math.round(
    performance.now() - startedAt,
  );

  console.log('');
  console.log('KAVACH DATA LAYER · VALID');
  console.log(
    `Dataset: ${dataset.manifest.dataset_name}`,
  );
  console.log(
    `Version: ${dataset.manifest.version}`,
  );
  console.log(
    `Synthetic: ${dataset.manifest.synthetic}`,
  );
  console.log(
    `Core tables loaded: ${
      Object.keys(dataset.rawTables).length
    }`,
  );
  console.log(
    `Cases parsed: ${dataset.cases.length}`,
  );
  console.log(
    `Load time: ${elapsedMilliseconds} ms`,
  );
  console.log(
    `Root: ${dataset.datasetRoot}`,
  );
  console.log('');
}

void main().catch((error: unknown) => {
  console.error('');
  console.error(
    'KAVACH DATA LAYER · INVALID',
  );

  if (error instanceof Error) {
    console.error(error.message);

    const contextualError = error as Error & {
      context?: Record<string, unknown>;
    };

    if (contextualError.context) {
      console.error(
        JSON.stringify(
          contextualError.context,
          null,
          2,
        ),
      );
    }
  } else {
    console.error(error);
  }

  console.error('');
  process.exitCode = 1;
});