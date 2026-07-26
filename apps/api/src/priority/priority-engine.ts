import type {
  CasePriorityAssessment,
  CasePriorityBand,
  CasePriorityEvidenceReference,
  CasePriorityFactor,
  CasePriorityFactorCode,
} from '@kavach/shared-types';

export const PRIORITY_RULE_VERSION =
  'KAVACH_PRIORITY_V1';

export const PRIORITY_PERMITTED_USE = [
  'This assessment may only be used to order cases for investigator review.',
  'It must not determine guilt, arrest, detention, bail, surveillance, or punishment.',
  'Every factor requires human verification against the cited source records.',
].join(' ');

export const PRIORITY_EXCLUDED_INPUTS = [
  'Caste',
  'Religion',
  'Gender',
  'Poverty or socio-economic status',
  'Complainant demographics',
  'Victim demographics',
  'Neighbourhood reputation',
  'Unverified name-only matches',
] as const;

export interface PriorityCountSignal {
  count: number;

  evidence:
    CasePriorityEvidenceReference[];
}

export interface PriorityGravitySignal {
  gravity:
    | 'MINOR'
    | 'SERIOUS'
    | 'HEINOUS'
    | 'UNKNOWN';

  recent: boolean;

  evidence:
    CasePriorityEvidenceReference[];
}

export interface CasePrioritySignals {
  verifiedRecentCases:
    PriorityCountSignal;

  verifiedSharedIdentifiers:
    PriorityCountSignal;

  highGravityRecentCase:
    PriorityGravitySignal;

  repeatedModusOperandi:
    PriorityCountSignal;

  highConfidenceNetworkBridges:
    PriorityCountSignal;

  unresolvedRecentCaseCluster:
    PriorityCountSignal;

  strongIdentityConflicts:
    PriorityCountSignal;
}

interface CountFactorDefinition {
  code: CasePriorityFactorCode;

  label: string;
  explanation: string;

  pointsPerUnit: number;

  maximumAbsolutePoints: number;

  direction:
    | 'INCREASE'
    | 'DECREASE';
}

const COUNT_FACTOR_DEFINITIONS:
Readonly<
  Record<
    Exclude<
      CasePriorityFactorCode,
      'HIGH_GRAVITY_RECENT_CASE'
    >,
    CountFactorDefinition
  >
> = {
  VERIFIED_RECENT_CASES: {
    code:
      'VERIFIED_RECENT_CASES',

    label:
      'Verified recent linked cases',

    explanation:
      'Recent cases connected through a confidence-qualified canonical entity resolution.',

    pointsPerUnit: 5,

    maximumAbsolutePoints: 25,

    direction: 'INCREASE',
  },

  VERIFIED_SHARED_IDENTIFIERS: {
    code:
      'VERIFIED_SHARED_IDENTIFIERS',

    label:
      'Verified shared identifiers',

    explanation:
      'Identifiers connected to this case or its resolved entities that recur in another case with sufficient link confidence.',

    pointsPerUnit: 5,

    maximumAbsolutePoints: 15,

    direction: 'INCREASE',
  },

  REPEATED_MODUS_OPERANDI: {
    code:
      'REPEATED_MODUS_OPERANDI',

    label:
      'Repeated modus operandi',

    explanation:
      'Recent entity-linked cases sharing a confidence-qualified modus-operandi association with the current case.',

    pointsPerUnit: 5,

    maximumAbsolutePoints: 15,

    direction: 'INCREASE',
  },

  HIGH_CONFIDENCE_NETWORK_BRIDGES: {
    code:
      'HIGH_CONFIDENCE_NETWORK_BRIDGES',

    label:
      'High-confidence network bridges',

    explanation:
      'High-confidence known associations connecting a resolved entity in this case to another entity with verified case history.',

    pointsPerUnit: 5,

    maximumAbsolutePoints: 15,

    direction: 'INCREASE',
  },

  UNRESOLVED_RECENT_CASE_CLUSTER: {
    code:
      'UNRESOLVED_RECENT_CASE_CLUSTER',

    label:
      'Unresolved recent case cluster',

    explanation:
      'Recent entity-linked cases whose recorded status has not reached a closed state.',

    pointsPerUnit: 5,

    maximumAbsolutePoints: 10,

    direction: 'INCREASE',
  },

  STRONG_IDENTITY_CONFLICTS: {
    code:
      'STRONG_IDENTITY_CONFLICTS',

    label:
      'Identity-resolution conflicts',

    explanation:
      'Conflicting, unresolved, or insufficient-confidence canonical identity links reduce the review-priority score.',

    pointsPerUnit: -5,

    maximumAbsolutePoints: 20,

    direction: 'DECREASE',
  },
};

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

function createCountFactor(
  definition:
    CountFactorDefinition,

  signal:
    PriorityCountSignal,
): CasePriorityFactor {
  const count =
    sanitizeCount(signal.count);

  const uncappedPoints =
    count *
    definition.pointsPerUnit;

  const sign =
    definition.direction ===
    'DECREASE'
      ? -1
      : 1;

  const points =
    sign *
    Math.min(
      Math.abs(uncappedPoints),
      definition
        .maximumAbsolutePoints,
    );

  return {
    code:
      definition.code,

    label:
      definition.label,

    explanation:
      definition.explanation,

    direction:
      definition.direction,

    rawValue:
      count,

    points,

    maximumAbsolutePoints:
      definition
        .maximumAbsolutePoints,

    capped:
      Math.abs(uncappedPoints) >=
        definition
          .maximumAbsolutePoints &&
      count > 0,

    evidence:
      signal.evidence,
  };
}

function createGravityFactor(
  signal:
    PriorityGravitySignal,
): CasePriorityFactor {
  let points = 0;

  if (signal.recent) {
    if (
      signal.gravity ===
      'HEINOUS'
    ) {
      points = 10;
    } else if (
      signal.gravity ===
      'SERIOUS'
    ) {
      points = 6;
    }
  }

  return {
    code:
      'HIGH_GRAVITY_RECENT_CASE',

    label:
      'Recent high-gravity case',

    explanation:
      'The current case receives a bounded increase when it is recent and its registered gravity is Serious or Heinous.',

    direction:
      'INCREASE',

    rawValue:
      signal.recent &&
      (
        signal.gravity ===
          'SERIOUS' ||
        signal.gravity ===
          'HEINOUS'
      ),

    points,

    maximumAbsolutePoints: 10,

    capped:
      points === 10,

    evidence:
      signal.evidence,
  };
}

export function getPriorityBand(
  score: number,
): CasePriorityBand {
  if (score >= 75) {
    return 'CRITICAL';
  }

  if (score >= 50) {
    return 'HIGH';
  }

  if (score >= 25) {
    return 'ELEVATED';
  }

  return 'ROUTINE';
}

export function createCasePriorityAssessment(
  caseId: number,
  assessedAt: string,

  signals:
    CasePrioritySignals,
): CasePriorityAssessment {
  const factors:
    CasePriorityFactor[] = [
      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .VERIFIED_RECENT_CASES,

        signals
          .verifiedRecentCases,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .VERIFIED_SHARED_IDENTIFIERS,

        signals
          .verifiedSharedIdentifiers,
      ),

      createGravityFactor(
        signals
          .highGravityRecentCase,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .REPEATED_MODUS_OPERANDI,

        signals
          .repeatedModusOperandi,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .HIGH_CONFIDENCE_NETWORK_BRIDGES,

        signals
          .highConfidenceNetworkBridges,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .UNRESOLVED_RECENT_CASE_CLUSTER,

        signals
          .unresolvedRecentCaseCluster,
      ),

      createCountFactor(
        COUNT_FACTOR_DEFINITIONS
          .STRONG_IDENTITY_CONFLICTS,

        signals
          .strongIdentityConflicts,
      ),
    ];

  const score = clamp(
    factors.reduce(
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
    caseId,

    score,

    band:
      getPriorityBand(score),

    factors,

    ruleVersion:
      PRIORITY_RULE_VERSION,

    assessedAt,

    humanReviewRequired:
      true,

    permittedUse:
      PRIORITY_PERMITTED_USE,

    excludedInputs: [
      ...PRIORITY_EXCLUDED_INPUTS,
    ],
  };
}
