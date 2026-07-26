import type {
  CaseSimilarityAssessment,
  CaseSimilarityEvidenceReference,
  CaseSimilarityFactor,
  CaseSimilarityFactorCode,
} from '@kavach/shared-types';

export const SIMILARITY_RULE_VERSION =
  'KAVACH_SIMILARITY_V1';

export const SIMILARITY_PERMITTED_USE = [
  'Similarity results are investigative leads for human review.',
  'A similarity score does not establish that cases share an offender, motive, conspiracy, or criminal responsibility.',
  'Investigators must verify every matching factor against the cited source records.',
].join(' ');

export const SIMILARITY_EXCLUDED_INPUTS = [
  'Caste',
  'Religion',
  'Gender',
  'Poverty or socio-economic status',
  'Complainant demographics',
  'Victim demographics',
  'Neighbourhood reputation',
  'Unverified name-only matches',
] as const;

export interface SimilarityBooleanSignal {
  value: boolean;

  evidence:
    CaseSimilarityEvidenceReference[];
}

export interface SimilarityCountSignal {
  count: number;

  evidence:
    CaseSimilarityEvidenceReference[];
}

export interface SimilarityTimeSignal {
  hourDifference: number | null;

  evidence:
    CaseSimilarityEvidenceReference[];
}

export interface CaseSimilaritySignals {
  sameMinorCrimeHead:
    SimilarityBooleanSignal;

  /**
   * Set this to true only when the major
   * crime head matches but the minor crime
   * head does not.
   *
   * This avoids awarding both the minor-head
   * and major-head score for the same match.
   */
  sameMajorCrimeHead:
    SimilarityBooleanSignal;

  sharedModusOperandi:
    SimilarityCountSignal;

  sharedLegalSections:
    SimilarityCountSignal;

  sharedCanonicalEntities:
    SimilarityCountSignal;

  sharedIdentifiers:
    SimilarityCountSignal;

  sameLocation:
    SimilarityBooleanSignal;

  similarIncidentTime:
    SimilarityTimeSignal;
}

interface BooleanFactorDefinition {
  code: CaseSimilarityFactorCode;

  label: string;

  explanation: string;

  points: number;
}

interface CountFactorDefinition {
  code: CaseSimilarityFactorCode;

  label: string;

  explanation: string;

  pointsPerUnit: number;

  maximumPoints: number;
}

const BOOLEAN_FACTOR_DEFINITIONS:
Readonly<
  Record<
    | 'SAME_MINOR_CRIME_HEAD'
    | 'SAME_MAJOR_CRIME_HEAD'
    | 'SAME_LOCATION',
    BooleanFactorDefinition
  >
> = {
  SAME_MINOR_CRIME_HEAD: {
    code:
      'SAME_MINOR_CRIME_HEAD',

    label:
      'Same specific crime classification',

    explanation:
      'Both cases use the same registered minor crime head.',

    points: 25,
  },

  SAME_MAJOR_CRIME_HEAD: {
    code:
      'SAME_MAJOR_CRIME_HEAD',

    label:
      'Same broad crime classification',

    explanation:
      'Both cases use the same major crime head while their specific minor crime heads differ.',

    points: 10,
  },

  SAME_LOCATION: {
    code:
      'SAME_LOCATION',

    label:
      'Same registered location',

    explanation:
      'Both cases reference the same normalized incident location record.',

    points: 5,
  },
};

const COUNT_FACTOR_DEFINITIONS:
Readonly<
  Record<
    | 'SHARED_MODUS_OPERANDI'
    | 'SHARED_LEGAL_SECTIONS'
    | 'SHARED_CANONICAL_ENTITIES'
    | 'SHARED_IDENTIFIERS',
    CountFactorDefinition
  >
> = {
  SHARED_MODUS_OPERANDI: {
    code:
      'SHARED_MODUS_OPERANDI',

    label:
      'Shared modus operandi',

    explanation:
      'Both cases contain a confidence-qualified association to the same modus-operandi record.',

    pointsPerUnit: 20,

    maximumPoints: 20,
  },

  SHARED_LEGAL_SECTIONS: {
    code:
      'SHARED_LEGAL_SECTIONS',

    label:
      'Shared legal sections',

    explanation:
      'Both cases contain one or more identical registered Act and Section combinations.',

    pointsPerUnit: 5,

    maximumPoints: 15,
  },

  SHARED_CANONICAL_ENTITIES: {
    code:
      'SHARED_CANONICAL_ENTITIES',

    label:
      'Shared verified entities',

    explanation:
      'Both cases connect to the same confidence-qualified canonical person entity.',

    pointsPerUnit: 10,

    maximumPoints: 20,
  },

  SHARED_IDENTIFIERS: {
    code:
      'SHARED_IDENTIFIERS',

    label:
      'Shared verified identifiers',

    explanation:
      'Both cases or their resolved entities connect to the same confidence-qualified digital identifier.',

    pointsPerUnit: 5,

    maximumPoints: 15,
  },
};

const FACTOR_ORDER:
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

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(value, minimum),
    maximum,
  );
}

function sanitizeCount(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(value),
  );
}

function sanitizeHourDifference(
  value: number | null,
): number | null {
  if (
    value === null ||
    !Number.isFinite(value)
  ) {
    return null;
  }

  return clamp(
    Math.abs(value),
    0,
    12,
  );
}

function deduplicateEvidence(
  references:
    readonly CaseSimilarityEvidenceReference[],
): CaseSimilarityEvidenceReference[] {
  const seen =
    new Set<string>();

  return references.filter(
    (reference) => {
      const key = [
        reference.sourceTable,
        reference.sourceRecordId,
        reference.field ?? '',
        reference.sourceCaseId,
        reference.candidateCaseId,
        reference.description,
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

function createBooleanFactor(
  definition:
    BooleanFactorDefinition,

  signal:
    SimilarityBooleanSignal,
): CaseSimilarityFactor {
  const points =
    signal.value
      ? definition.points
      : 0;

  return {
    code:
      definition.code,

    label:
      definition.label,

    explanation:
      definition.explanation,

    rawValue:
      signal.value,

    points,

    maximumPoints:
      definition.points,

    capped:
      signal.value,

    evidence:
      signal.value
        ? deduplicateEvidence(
            signal.evidence,
          )
        : [],
  };
}

function createCountFactor(
  definition:
    CountFactorDefinition,

  signal:
    SimilarityCountSignal,
): CaseSimilarityFactor {
  const count =
    sanitizeCount(
      signal.count,
    );

  const uncappedPoints =
    count *
    definition.pointsPerUnit;

  const points =
    Math.min(
      uncappedPoints,
      definition.maximumPoints,
    );

  return {
    code:
      definition.code,

    label:
      definition.label,

    explanation:
      definition.explanation,

    rawValue:
      count,

    points,

    maximumPoints:
      definition.maximumPoints,

    capped:
      count > 0 &&
      uncappedPoints >=
        definition.maximumPoints,

    evidence:
      count > 0
        ? deduplicateEvidence(
            signal.evidence,
          )
        : [],
  };
}

function createIncidentTimeFactor(
  signal:
    SimilarityTimeSignal,
): CaseSimilarityFactor {
  const hourDifference =
    sanitizeHourDifference(
      signal.hourDifference,
    );

  let points = 0;

  if (
    hourDifference !== null &&
    hourDifference <= 2
  ) {
    points = 5;
  } else if (
    hourDifference !== null &&
    hourDifference <= 4
  ) {
    points = 3;
  }

  return {
    code:
      'SIMILAR_INCIDENT_TIME',

    label:
      'Similar incident time pattern',

    explanation:
      'The registered incident start times occur within a comparable time-of-day window.',

    rawValue:
      hourDifference === null
        ? false
        : hourDifference,

    points,

    maximumPoints: 5,

    capped:
      points === 5,

    evidence:
      points > 0
        ? deduplicateEvidence(
            signal.evidence,
          )
        : [],
  };
}

export function createCaseSimilarityAssessment(
  sourceCaseId: number,

  candidateCaseId: number,

  signals:
    CaseSimilaritySignals,
): CaseSimilarityAssessment {
  if (
    !Number.isSafeInteger(
      sourceCaseId,
    ) ||
    sourceCaseId < 1
  ) {
    throw new Error(
      'sourceCaseId must be a positive integer.',
    );
  }

  if (
    !Number.isSafeInteger(
      candidateCaseId,
    ) ||
    candidateCaseId < 1
  ) {
    throw new Error(
      'candidateCaseId must be a positive integer.',
    );
  }

  if (
    sourceCaseId ===
    candidateCaseId
  ) {
    throw new Error(
      'A case cannot be compared with itself.',
    );
  }

  const factors:
    CaseSimilarityFactor[] = [
      createBooleanFactor(
        BOOLEAN_FACTOR_DEFINITIONS
          .SAME_MINOR_CRIME_HEAD,

        signals
          .sameMinorCrimeHead,
      ),

      createBooleanFactor(
        BOOLEAN_FACTOR_DEFINITIONS
          .SAME_MAJOR_CRIME_HEAD,

        signals
          .sameMajorCrimeHead,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .SHARED_MODUS_OPERANDI,

        signals
          .sharedModusOperandi,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .SHARED_LEGAL_SECTIONS,

        signals
          .sharedLegalSections,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .SHARED_CANONICAL_ENTITIES,

        signals
          .sharedCanonicalEntities,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .SHARED_IDENTIFIERS,

        signals
          .sharedIdentifiers,
      ),

      createBooleanFactor(
        BOOLEAN_FACTOR_DEFINITIONS
          .SAME_LOCATION,

        signals
          .sameLocation,
      ),

      createIncidentTimeFactor(
        signals
          .similarIncidentTime,
      ),
    ];

  const orderedFactors =
    [...factors].sort(
      (
        left,
        right,
      ) =>
        FACTOR_ORDER.indexOf(
          left.code,
        ) -
        FACTOR_ORDER.indexOf(
          right.code,
        ),
    );

  const similarityScore =
    clamp(
      orderedFactors.reduce(
        (
          total,
          factor,
        ) =>
          total +
          factor.points,

        0,
      ),

      0,
      100,
    );

  return {
    sourceCaseId,

    candidateCaseId,

    similarityScore,

    factors:
      orderedFactors,

    ruleVersion:
      SIMILARITY_RULE_VERSION,

    humanReviewRequired:
      true,

    permittedUse:
      SIMILARITY_PERMITTED_USE,

    excludedInputs: [
      ...SIMILARITY_EXCLUDED_INPUTS,
    ],
  };
}

export function getActiveSimilarityFactorLabels(
  assessment:
    CaseSimilarityAssessment,
): string[] {
  return assessment.factors
    .filter(
      (factor) =>
        factor.points > 0,
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.points -
          left.points ||

        left.label.localeCompare(
          right.label,
        ),
    )
    .map(
      (factor) =>
        factor.label,
    );
}
