import assert from 'node:assert/strict';

import {
  getIntelligenceAssistantService,
} from './intelligence-assistant-service';

async function main(): Promise<void> {
  const service =
    await getIntelligenceAssistantService();

  const statistics =
    service.getStatistics();

  assert.equal(
    statistics.indexedCases,
    10_000,
  );

  assert.ok(
    statistics.indexedTerms >
      100,
  );

  const exactCrimeNumber =
    service.query({
      query:
        statistics
          .sampleCrimeNumber,

      limit: 5,
      minimumScore: 0,
    });

  assert.ok(
    exactCrimeNumber
      .sources
      .length > 0,
  );

  assert.equal(
    exactCrimeNumber
      .sources[0]
      ?.caseId,

    statistics.sampleCaseId,
  );

  assert.equal(
    exactCrimeNumber.grounded,
    true,
  );

  assert.equal(
    exactCrimeNumber
      .generationMode,

    'DETERMINISTIC_EXTRACTIVE',
  );

  const crimeHeadQuery =
    service.query({
      query: [
        statistics
          .sampleMajorCrimeHead,

        'cases',
      ].join(' '),

      limit: 10,
      minimumScore: 0,
    });

  assert.ok(
    crimeHeadQuery
      .sources
      .length > 0,
  );

  crimeHeadQuery.sources.forEach(
    (source) => {
      assert.ok(
        source.retrievalScore >=
          0 &&
        source.retrievalScore <=
          100,
      );
    },
  );

  for (
    let index = 1;
    index <
      crimeHeadQuery
        .sources
        .length;
    index += 1
  ) {
    const previous =
      crimeHeadQuery.sources[
        index - 1
      ];

    const current =
      crimeHeadQuery.sources[
        index
      ];

    assert.ok(previous);
    assert.ok(current);

    assert.ok(
      previous.retrievalScore >=
        current.retrievalScore,
    );
  }

  console.log('');

  console.log(
    'KAVACH INTELLIGENCE ASSISTANT · VALID',
  );

  console.log(
    `Indexed cases: ${statistics.indexedCases}`,
  );

  console.log(
    `Indexed terms: ${statistics.indexedTerms}`,
  );

  console.log(
    [
      'Coverage:',
      statistics.firstRegisteredDate,
      'to',
      statistics.latestRegisteredDate,
    ].join(' '),
  );

  console.log(
    [
      'Exact retrieval:',
      statistics.sampleCrimeNumber,
      '→ Case',
      statistics.sampleCaseId,
    ].join(' '),
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH INTELLIGENCE ASSISTANT · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
