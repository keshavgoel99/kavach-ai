import type {
  CasePriorityBand,
  CasePriorityFactorCode,
} from '@kavach/shared-types';

import {
  PRIORITY_RULE_VERSION,
} from './priority-engine';

import {
  getCasePriorityService,
} from './priority-service';

const EXPECTED_FACTOR_CODES:
readonly CasePriorityFactorCode[] = [
  'VERIFIED_RECENT_CASES',
  'VERIFIED_SHARED_IDENTIFIERS',
  'HIGH_GRAVITY_RECENT_CASE',
  'REPEATED_MODUS_OPERANDI',
  'HIGH_CONFIDENCE_NETWORK_BRIDGES',
  'UNRESOLVED_RECENT_CASE_CLUSTER',
  'STRONG_IDENTITY_CONFLICTS',
];

function increment(
  map: Map<string, number>,
  key: string,
): void {
  map.set(
    key,
    (map.get(key) ?? 0) + 1,
  );
}

async function main(): Promise<void> {
  const service =
    await getCasePriorityService();

  const assessments =
    service.assessAll();

  if (
    assessments.length !==
    10_000
  ) {
    throw new Error(
      `Expected 10000 assessments, received ${assessments.length}.`,
    );
  }

  const caseIds =
    new Set<number>();

  const bandCounts =
    new Map<
      CasePriorityBand,
      number
    >();

  const factorActivationCounts =
    new Map<string, number>();

  let minimumScore = 100;
  let maximumScore = 0;
  let totalScore = 0;

  assessments.forEach(
    (assessment) => {
      if (
        caseIds.has(
          assessment.caseId,
        )
      ) {
        throw new Error(
          `Duplicate assessment for case ${assessment.caseId}.`,
        );
      }

      caseIds.add(
        assessment.caseId,
      );

      if (
        !Number.isInteger(
          assessment.score,
        ) ||
        assessment.score < 0 ||
        assessment.score > 100
      ) {
        throw new Error(
          `Case ${assessment.caseId} has invalid score ${assessment.score}.`,
        );
      }

      if (
        assessment.ruleVersion !==
        PRIORITY_RULE_VERSION
      ) {
        throw new Error(
          `Case ${assessment.caseId} has unexpected rule version.`,
        );
      }

      if (
        assessment
          .humanReviewRequired !==
        true
      ) {
        throw new Error(
          `Case ${assessment.caseId} does not require human review.`,
        );
      }

      if (
        assessment.factors.length !==
        EXPECTED_FACTOR_CODES.length
      ) {
        throw new Error(
          `Case ${assessment.caseId} does not contain all priority factors.`,
        );
      }

      const factorCodes =
        new Set(
          assessment.factors.map(
            (factor) =>
              factor.code,
          ),
        );

      EXPECTED_FACTOR_CODES.forEach(
        (factorCode) => {
          if (
            !factorCodes.has(
              factorCode,
            )
          ) {
            throw new Error(
              `Case ${assessment.caseId} is missing factor ${factorCode}.`,
            );
          }
        },
      );

      const expectedScore =
        Math.min(
          100,

          Math.max(
            0,

            assessment.factors.reduce(
              (
                sum,
                factor,
              ) =>
                sum +
                factor.points,

              0,
            ),
          ),
        );

      if (
        assessment.score !==
        expectedScore
      ) {
        throw new Error(
          `Case ${assessment.caseId} score does not match its factors.`,
        );
      }

      assessment.factors.forEach(
        (factor) => {
          if (
            Math.abs(
              factor.points,
            ) >
            factor
              .maximumAbsolutePoints
          ) {
            throw new Error(
              `Case ${assessment.caseId} factor ${factor.code} exceeds its cap.`,
            );
          }

          if (
            factor.points !== 0
          ) {
            increment(
              factorActivationCounts,

              factor.code,
            );
          }
        },
      );

      minimumScore =
        Math.min(
          minimumScore,
          assessment.score,
        );

      maximumScore =
        Math.max(
          maximumScore,
          assessment.score,
        );

      totalScore +=
        assessment.score;

      bandCounts.set(
        assessment.band,

        (
          bandCounts.get(
            assessment.band,
          ) ?? 0
        ) + 1,
      );
    },
  );

  console.log('');

  console.log(
    'KAVACH PRIORITY ENGINE · VALID',
  );

  console.log(
    `Rule version: ${PRIORITY_RULE_VERSION}`,
  );

  console.log(
    `Assessed at: ${service.assessedAt}`,
  );

  console.log(
    `Cases assessed: ${assessments.length}`,
  );

  console.log(
    `Minimum score: ${minimumScore}`,
  );

  console.log(
    `Maximum score: ${maximumScore}`,
  );

  console.log(
    `Average score: ${(
      totalScore /
      assessments.length
    ).toFixed(2)}`,
  );

  console.log('');

  console.log(
    'Priority bands:',
  );

  (
    [
      'ROUTINE',
      'ELEVATED',
      'HIGH',
      'CRITICAL',
    ] as const
  ).forEach((band) => {
    console.log(
      `  ${band}: ${bandCounts.get(band) ?? 0}`,
    );
  });

  console.log('');

  console.log(
    'Activated factors:',
  );

  EXPECTED_FACTOR_CODES.forEach(
    (factorCode) => {
      console.log(
        `  ${factorCode}: ${factorActivationCounts.get(factorCode) ?? 0}`,
      );
    },
  );

  const highestPriority =
    [...assessments]
      .sort(
        (
          left,
          right,
        ) =>
          right.score -
            left.score ||

          left.caseId -
            right.caseId,
      )
      .slice(0, 5);

  console.log('');

  console.log(
    'Highest assessments:',
  );

  highestPriority.forEach(
    (assessment) => {
      console.log(
        `  Case ${assessment.caseId}: ${assessment.score} (${assessment.band})`,
      );
    },
  );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH PRIORITY ENGINE · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
