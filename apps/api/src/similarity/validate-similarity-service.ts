import assert from 'node:assert/strict';

import {
  getActiveSimilarityFactorLabels,
  SIMILARITY_RULE_VERSION,
} from './similarity-engine';

import {
  getCaseSimilarityService,
} from './similarity-service';

function validateDescendingOrder(
  results:
    NonNullable<
      ReturnType<
        Awaited<
          ReturnType<
            typeof getCaseSimilarityService
          >
        >[
          'findSimilarCases'
        ]
      >
    >['results'],
): void {
  for (
    let index = 1;
    index < results.length;
    index += 1
  ) {
    const previous =
      results[index - 1];

    const current =
      results[index];

    assert.ok(previous);
    assert.ok(current);

    assert.ok(
      previous.similarityScore >=
        current.similarityScore,

      [
        'Similarity results are not',
        'ordered by descending score.',
      ].join(' '),
    );
  }
}

async function main(): Promise<void> {
  const service =
    await getCaseSimilarityService();

  const statistics =
    service.getStatistics();

  assert.equal(
    statistics.indexedCases,
    10_000,
  );

  assert.ok(
    statistics
      .majorCrimeHeadBuckets >
      0,
  );

  assert.ok(
    statistics
      .minorCrimeHeadBuckets >
      0,
  );

  assert.ok(
    statistics
      .modusOperandiBuckets >
      0,
  );

  assert.ok(
    statistics
      .legalSectionBuckets >
      0,
  );

  assert.ok(
    statistics.entityBuckets >
      0,
  );

  assert.ok(
    statistics
      .identifierBuckets >
      0,
  );

  assert.ok(
    statistics.locationBuckets >
      0,
  );

  const sourceCaseIds = [
    1,
    2,
    3,
    100,
    9538,
  ];

  for (
    const sourceCaseId
    of sourceCaseIds
  ) {
    const response =
      service.findSimilarCases(
        sourceCaseId,
        {
          limit: 25,
          minimumScore: 0,
        },
      );

    assert.ok(
      response,
      `Missing response for case ${sourceCaseId}.`,
    );

    assert.equal(
      response.sourceCaseId,
      sourceCaseId,
    );

    assert.equal(
      response.sourceCase.caseId,
      sourceCaseId,
    );

    assert.equal(
      response.ruleVersion,
      SIMILARITY_RULE_VERSION,
    );

    assert.equal(
      response.humanReviewRequired,
      true,
    );

    assert.ok(
      response.candidateCount >
        0,
    );

    assert.ok(
      response.results.length <=
        25,
    );

    validateDescendingOrder(
      response.results,
    );

    response.results.forEach(
      (result) => {
        assert.notEqual(
          result.caseId,
          sourceCaseId,
        );

        assert.equal(
          result.caseId,
          result.caseSummary.caseId,
        );

        assert.ok(
          result.similarityScore >=
            0,

        );

        assert.ok(
          result.similarityScore <=
            100,
        );

        assert.equal(
          result.factors.length,
          8,
        );

        const activeLabels =
          getActiveSimilarityFactorLabels(
            {
              sourceCaseId,

              candidateCaseId:
                result.caseId,

              similarityScore:
                result
                  .similarityScore,

              factors:
                result.factors,

              ruleVersion:
                response.ruleVersion,

              humanReviewRequired:
                true,

              permittedUse:
                response
                  .permittedUse,

              excludedInputs: [],
            },
          );

        assert.deepEqual(
          result.matchingFactors,
          activeLabels,
        );
      },
    );

    const repeatedResponse =
      service.findSimilarCases(
        sourceCaseId,
        {
          limit: 25,
          minimumScore: 0,
        },
      );

    assert.deepEqual(
      repeatedResponse,
      response,

      [
        'Repeated similarity search',
        'must be deterministic.',
      ].join(' '),
    );
  }

  const unknownCase =
    service.findSimilarCases(
      999_999,
    );

  assert.equal(
    unknownCase,
    null,
  );

  assert.throws(
    () =>
      service.findSimilarCases(
        1,
        {
          limit: 51,
        },
      ),

    /limit/i,
  );

  assert.throws(
    () =>
      service.findSimilarCases(
        1,
        {
          minimumScore: 101,
        },
      ),

    /minimumScore/i,
  );

  assert.throws(
    () =>
      service.assessCasePair(
        1,
        1,
      ),

    /cannot be compared with itself/i,
  );

  const sampleResponse =
    service.findSimilarCases(
      1,
      {
        limit: 5,
        minimumScore: 0,
      },
    );

  assert.ok(sampleResponse);

  console.log('');

  console.log(
    'KAVACH SIMILARITY INDEX · VALID',
  );

  console.log(
    `Rule version: ${SIMILARITY_RULE_VERSION}`,
  );

  console.log(
    `Cases indexed: ${statistics.indexedCases}`,
  );

  console.log(
    [
      'Major crime-head buckets:',
      statistics
        .majorCrimeHeadBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Minor crime-head buckets:',
      statistics
        .minorCrimeHeadBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Modus-operandi buckets:',
      statistics
        .modusOperandiBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Legal-section buckets:',
      statistics
        .legalSectionBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Canonical-entity buckets:',
      statistics.entityBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Identifier buckets:',
      statistics
        .identifierBuckets,
    ].join(' '),
  );

  console.log(
    [
      'Location buckets:',
      statistics.locationBuckets,
    ].join(' '),
  );

  console.log('');

  console.log(
    `Sample source case: ${sampleResponse.sourceCaseId}`,
  );

  console.log(
    [
      'Candidates considered:',
      sampleResponse
        .candidateCount,
    ].join(' '),
  );

  console.log(
    [
      'Results returned:',
      sampleResponse
        .results
        .length,
    ].join(' '),
  );

  sampleResponse.results.forEach(
    (result) => {
      console.log(
        [
          `  Case ${result.caseId}:`,
          `${result.similarityScore}/100`,
          `· ${result.matchingFactors.join(
            ', ',
          )}`,
        ].join(' '),
      );
    },
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH SIMILARITY INDEX · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
