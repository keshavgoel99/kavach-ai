import assert from 'node:assert/strict';

import {
  getAnalyticsService,
} from './analytics-service';

async function main(): Promise<void> {
  const service =
    await getAnalyticsService();

  const statistics =
    service.getStatistics();

  assert.equal(
    statistics.cases,
    10_000,
  );

  assert.equal(
    statistics.arrestEvents,
    7_174,
  );

  assert.equal(
    statistics.casesWithArrest,
    5_713,
  );

  assert.equal(
    statistics.chargesheetRecords,
    5_418,
  );

  assert.equal(
    statistics.casesWithChargesheet,
    5_418,
  );

  assert.equal(
    statistics.accusedPersons,
    13_088,
  );

  assert.equal(
    statistics.victims,
    10_946,
  );

  const response =
    service.getOverview();

  assert.equal(
    response.overview.totalCases,
    10_000,
  );

  assert.equal(
    response.overview.accusedPersons,
    13_088,
  );

  assert.equal(
    response.overview.victims,
    10_946,
  );

  assert.equal(
    response.overview.arrestEvents,
    7_174,
  );

  assert.equal(
    response.overview.casesWithArrest,
    5_713,
  );

  assert.equal(
    response.overview.chargesheetRecords,
    5_418,
  );

  assert.equal(
    response.overview.casesWithChargesheet,
    5_418,
  );

  assert.equal(
    response
      .overview
      .arrestCoverageRate,
    57.13,
  );

  assert.equal(
    response
      .overview
      .chargesheetCoverageRate,
    54.18,
  );

  assert.equal(
    response
      .overview
      .averageDaysToFirstArrest,
    53.37,
  );

  assert.equal(
    response
      .overview
      .averageDaysToFirstChargesheet,
    174.87,
  );

  assert.equal(
    response.monthlyTrend.reduce(
      (
        total,
        point,
      ) =>
        total +
        point.registeredCases,

      0,
    ),
    10_000,
  );

  assert.equal(
    response.districtComparison.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.totalCases,

      0,
    ),
    10_000,
  );

  assert.equal(
    response.crimeComposition.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,

      0,
    ),
    10_000,
  );

  assert.equal(
    response.statusDistribution.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,

      0,
    ),
    10_000,
  );

  assert.equal(
    response.gravityDistribution.reduce(
      (
        total,
        item,
      ) =>
        total +
        item.count,

      0,
    ),
    10_000,
  );

  for (
    let index = 1;
    index <
      response
        .districtComparison
        .length;
    index += 1
  ) {
    const previous =
      response
        .districtComparison[
          index - 1
        ];

    const current =
      response
        .districtComparison[
          index
        ];

    assert.ok(previous);
    assert.ok(current);

    assert.ok(
      previous.totalCases >=
        current.totalCases,
    );
  }

  const firstDistrict =
    response
      .districtComparison[0];

  assert.ok(firstDistrict);

  const filtered =
    service.getOverview({
      districtIds: [
        firstDistrict
          .districtId,
      ],
    });

  assert.ok(
    filtered.overview.totalCases >
      0,
  );

  assert.ok(
    filtered.overview.totalCases <
      response.overview.totalCases,
  );

  assert.equal(
    filtered
      .districtComparison
      .every(
        (item) =>
          item.districtId ===
          firstDistrict
            .districtId,
      ),
    true,
  );

  assert.equal(
    response.excludedInputs.includes(
      'Caste',
    ),
    true,
  );

  assert.equal(
    response.excludedInputs.includes(
      'Religion',
    ),
    true,
  );

  console.log('');

  console.log(
    'KAVACH ANALYTICS · VALID',
  );

  console.log(
    `Cases: ${statistics.cases}`,
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
      'Monthly periods:',
      statistics.monthlyPeriods,
    ].join(' '),
  );

  console.log(
    [
      'Arrest events:',
      response
        .overview
        .arrestEvents,
    ].join(' '),
  );

  console.log(
    [
      'Cases with arrest:',
      response
        .overview
        .casesWithArrest,
      `(${response.overview.arrestCoverageRate}%)`,
    ].join(' '),
  );

  console.log(
    [
      'Cases with chargesheet:',
      response
        .overview
        .casesWithChargesheet,
      `(${response.overview.chargesheetCoverageRate}%)`,
    ].join(' '),
  );

  console.log('');

  console.log(
    'Top crime classifications:',
  );

  response
    .crimeComposition
    .slice(0, 5)
    .forEach(
      (item) => {
        console.log(
          [
            `  ${item.name}:`,
            item.count,
            `(${item.percentage}%)`,
          ].join(' '),
        );
      },
    );

  console.log('');

  console.log(
    'Top modus operandi:',
  );

  response
    .modusOperandiRecurrence
    .slice(0, 5)
    .forEach(
      (item) => {
        console.log(
          [
            `  ${item.name}:`,
            item.caseCount,
            `cases · confidence ${item.averageConfidence}`,
          ].join(' '),
        );
      },
    );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH ANALYTICS · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
