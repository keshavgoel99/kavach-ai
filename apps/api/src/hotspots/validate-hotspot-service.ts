import assert from 'node:assert/strict';

import {
  getHotspotService,
} from './hotspot-service';

async function main(): Promise<void> {
  const service =
    await getHotspotService();

  const statistics =
    service.getStatistics();

  assert.equal(
    statistics.featureRows,
    7_380,
  );

  assert.equal(
    statistics.locations,
    180,
  );

  assert.equal(
    statistics.periods,
    41,
  );

  const options =
    service.getFilterOptions();

  assert.equal(
    options.periods.length,
    41,
  );

  assert.equal(
    options.defaultPeriod.key,
    statistics.latestPeriod.key,
  );

  assert.ok(
    options.districts.length >
      0,
  );

  assert.ok(
    options.policeStations.length >
      0,
  );

  const summary =
    service.getSummary({
      limit: 180,
    });

  assert.ok(summary);

  assert.equal(
    summary.items.length,
    180,
  );

  assert.equal(
    summary.matchingLocations,
    180,
  );

  assert.equal(
    summary.returnedLocations,
    180,
  );

  assert.equal(
    summary.excludedInputs.includes(
      'TargetNextMonthCrimeCount',
    ),
    true,
  );

  for (
    let index = 1;
    index <
      summary.items.length;
    index += 1
  ) {
    const previous =
      summary.items[
        index - 1
      ];

    const current =
      summary.items[index];

    assert.ok(previous);
    assert.ok(current);

    assert.ok(
      previous.pressureScore >=
        current.pressureScore,
    );
  }

  summary.items.forEach(
    (item) => {
      assert.ok(
        item.pressureScore >=
          0,
      );

      assert.ok(
        item.pressureScore <=
          100,
      );

      assert.ok(
        item.location.latitude >=
          -90,
      );

      assert.ok(
        item.location.latitude <=
          90,
      );

      assert.ok(
        item.location.longitude >=
          -180,
      );

      assert.ok(
        item.location.longitude <=
          180,
      );
    },
  );

  const firstLocation =
    summary.items[0];

  assert.ok(firstLocation);

  const trend =
    service.getLocationTrend(
      firstLocation.location.id,
      {
        months: 12,
      },
    );

  assert.ok(trend);

  assert.equal(
    trend.location.id,
    firstLocation.location.id,
  );

  assert.equal(
    trend.points.length,
    12,
  );

  for (
    let index = 1;
    index <
      trend.points.length;
    index += 1
  ) {
    const previous =
      trend.points[
        index - 1
      ];

    const current =
      trend.points[index];

    assert.ok(previous);
    assert.ok(current);

    const previousValue =
      previous.period.year *
        100 +
      previous.period.month;

    const currentValue =
      current.period.year *
        100 +
      current.period.month;

    assert.ok(
      previousValue <
        currentValue,
    );
  }

  console.log('');

  console.log(
    'KAVACH HOTSPOT INTELLIGENCE · VALID',
  );

  console.log(
    `Feature rows: ${statistics.featureRows}`,
  );

  console.log(
    `Locations: ${statistics.locations}`,
  );

  console.log(
    `Periods: ${statistics.periods}`,
  );

  console.log(
    [
      'Coverage:',
      statistics
        .firstPeriod
        .label,
      'to',
      statistics
        .latestPeriod
        .label,
    ].join(' '),
  );

  console.log('');

  console.log(
    [
      'Latest-period crime count:',
      summary.totalCrimeCount,
    ].join(' '),
  );

  console.log(
    [
      'Average pressure score:',
      summary
        .averagePressureScore,
    ].join(' '),
  );

  console.log(
    [
      'Critical locations:',
      summary
        .criticalLocationCount,
    ].join(' '),
  );

  console.log(
    [
      'High locations:',
      summary
        .highLocationCount,
    ].join(' '),
  );

  console.log('');

  console.log(
    'Highest-pressure locations:',
  );

  summary.items
    .slice(0, 5)
    .forEach(
      (item) => {
        console.log(
          [
            `  ${item.location.name}:`,
            `${item.pressureScore}/100`,
            `· ${item.riskBand}`,
            `· ${item.crimeCount} cases`,
          ].join(' '),
        );
      },
    );
}

main().catch(
  (error: unknown) => {
    console.error('');

    console.error(
      'KAVACH HOTSPOT INTELLIGENCE · INVALID',
    );

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    process.exitCode = 1;
  },
);
