import assert from 'node:assert/strict';

import type {
  CaseSimilarityEvidenceReference,
  CaseSimilarityFactorCode,
} from '@kavach/shared-types';

import {
  createCaseSimilarityAssessment,
  getActiveSimilarityFactorLabels,
  SIMILARITY_RULE_VERSION,
} from './similarity-engine';

import type {
  CaseSimilaritySignals,
} from './similarity-engine';

const EXPECTED_FACTOR_CODES:
readonly CaseSimilarityFactorCode[] = [
  'SAME_MINOR_CRIME_HEAD',
  'SAME_MAJOR_CRIME_HEAD',
  'SHARED_MODUS_OPERANDI',
  'SHARED_LEGAL_SECTIONS',
  'SHARED_CANONICAL_ENTITIES',
  'SHARED_IDENTIFIERS',
  'SAME_LOCATION',
  'SIMILAR_INCIDENT_TIME',
];

function evidence(
  sourceTable: string,

  sourceRecordId: string,

  sourceCaseId: number,

  candidateCaseId: number,
): CaseSimilarityEvidenceReference {
  return {
    sourceTable,

    sourceRecordId,

    field: null,

    sourceCaseId,

    candidateCaseId,

    description:
      `Validation evidence from ${sourceTable}.`,
  };
}

function emptySignals(): CaseSimilaritySignals {
  return {
    sameMinorCrimeHead: {
      value: false,
      evidence: [],
    },

    sameMajorCrimeHead: {
      value: false,
      evidence: [],
    },

    sharedModusOperandi: {
      count: 0,
      evidence: [],
    },

    sharedLegalSections: {
      count: 0,
      evidence: [],
    },

    sharedCanonicalEntities: {
      count: 0,
      evidence: [],
    },

    sharedIdentifiers: {
      count: 0,
      evidence: [],
    },

    sameLocation: {
      value: false,
      evidence: [],
    },

    similarIncidentTime: {
      hourDifference: null,
      evidence: [],
    },
  };
}

function validateFactorStructure(
  assessment:
    ReturnType<
      typeof createCaseSimilarityAssessment
    >,
): void {
  assert.equal(
    assessment.factors.length,
    EXPECTED_FACTOR_CODES.length,
  );

  assert.deepEqual(
    assessment.factors.map(
      (factor) =>
        factor.code,
    ),

    EXPECTED_FACTOR_CODES,
  );

  assessment.factors.forEach(
    (factor) => {
      assert.ok(
        factor.points >= 0,
      );

      assert.ok(
        factor.points <=
          factor.maximumPoints,
      );
    },
  );

  assert.equal(
    assessment.ruleVersion,
    SIMILARITY_RULE_VERSION,
  );

  assert.equal(
    assessment.humanReviewRequired,
    true,
  );

  assert.ok(
    assessment.excludedInputs.length >
      0,
  );
}

function validateNoMatch(): void {
  const assessment =
    createCaseSimilarityAssessment(
      1,
      2,
      emptySignals(),
    );

  assert.equal(
    assessment.similarityScore,
    0,
  );

  assert.deepEqual(
    getActiveSimilarityFactorLabels(
      assessment,
    ),

    [],
  );

  validateFactorStructure(
    assessment,
  );
}

function validatePatternMatch(): void {
  const signals =
    emptySignals();

  signals.sameMinorCrimeHead = {
    value: true,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:minor-head',
        1,
        2,
      ),
    ],
  };

  signals.sharedModusOperandi = {
    count: 1,

    evidence: [
      evidence(
        'CaseMOAssociation',
        '1:2:mo',
        1,
        2,
      ),
    ],
  };

  signals.sharedLegalSections = {
    count: 2,

    evidence: [
      evidence(
        'ActSectionAssociation',
        '1:2:section-a',
        1,
        2,
      ),

      evidence(
        'ActSectionAssociation',
        '1:2:section-b',
        1,
        2,
      ),
    ],
  };

  const assessment =
    createCaseSimilarityAssessment(
      1,
      2,
      signals,
    );

  assert.equal(
    assessment.similarityScore,
    55,
  );

  assert.deepEqual(
    getActiveSimilarityFactorLabels(
      assessment,
    ),

    [
      'Same specific crime classification',
      'Shared modus operandi',
      'Shared legal sections',
    ],
  );

  validateFactorStructure(
    assessment,
  );
}

function validateLinkedCaseMatch(): void {
  const signals =
    emptySignals();

  signals.sharedCanonicalEntities = {
    count: 2,

    evidence: [
      evidence(
        'AccusedEntityLink',
        '1:2:entity-a',
        1,
        2,
      ),

      evidence(
        'AccusedEntityLink',
        '1:2:entity-b',
        1,
        2,
      ),
    ],
  };

  signals.sharedIdentifiers = {
    count: 4,

    evidence: [
      evidence(
        'CaseIdentifierLink',
        '1:2:identifier',
        1,
        2,
      ),
    ],
  };

  assert.equal(
    createCaseSimilarityAssessment(
      1,
      2,
      signals,
    ).similarityScore,

    35,
  );
}

function validateTimeScoring(): void {
  const closeTimeSignals =
    emptySignals();

  closeTimeSignals
    .similarIncidentTime = {
    hourDifference: 1.5,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:time',
        1,
        2,
      ),
    ],
  };

  assert.equal(
    createCaseSimilarityAssessment(
      1,
      2,
      closeTimeSignals,
    ).similarityScore,

    5,
  );

  const moderateTimeSignals =
    emptySignals();

  moderateTimeSignals
    .similarIncidentTime = {
    hourDifference: 3,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:time',
        1,
        2,
      ),
    ],
  };

  assert.equal(
    createCaseSimilarityAssessment(
      1,
      2,
      moderateTimeSignals,
    ).similarityScore,

    3,
  );

  const distantTimeSignals =
    emptySignals();

  distantTimeSignals
    .similarIncidentTime = {
    hourDifference: 8,

    evidence: [],
  };

  assert.equal(
    createCaseSimilarityAssessment(
      1,
      2,
      distantTimeSignals,
    ).similarityScore,

    0,
  );
}

function validateMaximumScore(): void {
  const signals =
    emptySignals();

  signals.sameMinorCrimeHead = {
    value: true,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:minor',
        1,
        2,
      ),
    ],
  };

  signals.sharedModusOperandi = {
    count: 3,

    evidence: [
      evidence(
        'CaseMOAssociation',
        '1:2:mo',
        1,
        2,
      ),
    ],
  };

  signals.sharedLegalSections = {
    count: 10,

    evidence: [
      evidence(
        'ActSectionAssociation',
        '1:2:legal',
        1,
        2,
      ),
    ],
  };

  signals.sharedCanonicalEntities = {
    count: 5,

    evidence: [
      evidence(
        'AccusedEntityLink',
        '1:2:entity',
        1,
        2,
      ),
    ],
  };

  signals.sharedIdentifiers = {
    count: 10,

    evidence: [
      evidence(
        'CaseIdentifierLink',
        '1:2:identifier',
        1,
        2,
      ),
    ],
  };

  signals.sameLocation = {
    value: true,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:location',
        1,
        2,
      ),
    ],
  };

  signals.similarIncidentTime = {
    hourDifference: 1,

    evidence: [
      evidence(
        'CaseMaster',
        '1:2:time',
        1,
        2,
      ),
    ],
  };

  const assessment =
    createCaseSimilarityAssessment(
      1,
      2,
      signals,
    );

  assert.equal(
    assessment.similarityScore,
    100,
  );

  validateFactorStructure(
    assessment,
  );
}

function validateInvalidComparison(): void {
  assert.throws(
    () =>
      createCaseSimilarityAssessment(
        1,
        1,
        emptySignals(),
      ),

    /cannot be compared with itself/i,
  );
}

function main(): void {
  validateNoMatch();

  validatePatternMatch();

  validateLinkedCaseMatch();

  validateTimeScoring();

  validateMaximumScore();

  validateInvalidComparison();

  console.log('');

  console.log(
    'KAVACH SIMILARITY ENGINE · VALID',
  );

  console.log(
    `Rule version: ${SIMILARITY_RULE_VERSION}`,
  );

  console.log(
    `Factors validated: ${EXPECTED_FACTOR_CODES.length}`,
  );

  console.log(
    'Minimum possible score: 0',
  );

  console.log(
    'Maximum possible score: 100',
  );

  console.log(
    'Human review requirement: active',
  );
}

try {
  main();
} catch (error: unknown) {
  console.error('');

  console.error(
    'KAVACH SIMILARITY ENGINE · INVALID',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}
