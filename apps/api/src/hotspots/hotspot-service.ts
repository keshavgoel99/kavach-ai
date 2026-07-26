import {
  readFile,
} from 'node:fs/promises';

import path from 'node:path';

import {
  parse,
} from 'csv-parse/sync';

import type {
  HotspotDataSplit,
  HotspotFilterOptions,
  HotspotLocationReference,
  HotspotLocationTrendResponse,
  HotspotMonthlyMetric,
  HotspotPeriod,
  HotspotRiskBand,
  HotspotSummaryItem,
  HotspotSummaryQuery,
  HotspotSummaryResponse,
  HotspotTrendDirection,
  HotspotTrendQuery,
} from '@kavach/shared-types';

import type {
  LoadedCoreDataset,
} from '../data/dataset-loader';

import {
  getCoreDataset,
} from '../data/dataset-service';

const HOTSPOT_FEATURE_PATH = [
  'ml',
  'hotspot_monthly_features.csv',
] as const;

const EXPECTED_HOTSPOT_ROWS =
  7_380;

const EXPECTED_LOCATION_COUNT =
  180;

const MAXIMUM_RESULT_LIMIT =
  180;

const DEFAULT_RESULT_LIMIT =
  50;

const DEFAULT_TREND_MONTHS =
  12;

const MAXIMUM_TREND_MONTHS =
  41;

const HOTSPOT_COLUMNS = [
  'LocationID',
  'Year',
  'Month',
  'CrimeCount',
  'Lag1CrimeCount',
  'Lag3CrimeCount',
  'Lag12CrimeCount',
  'AverageSeverity',
  'DominantCrimeType',
  'UrbanizationIndex',
  'UnemploymentRate',
  'EconomicStressIndex',
  'PopulationDensity',
  'TargetNextMonthCrimeCount',
  'DataSplit',
  'ResponsibleUseNote',
] as const;

const HOTSPOT_RISK_BANDS:
readonly HotspotRiskBand[] = [
  'CRITICAL',
  'HIGH',
  'MODERATE',
  'LOW',
];

export const HOTSPOT_METHODOLOGY = [
  'Historical hotspot pressure is calculated from current monthly crime count,',
  'one-month lag, three-month rolling average, twelve-month lag and average offence severity.',
  'It is not a prediction of individual behaviour or criminality.',
].join(' ');

export const HOTSPOT_RESPONSIBLE_USE = [
  'Use hotspot pressure only for aggregate planning, patrol allocation review and analyst investigation.',
  'It must not be used to label residents, communities or individuals as criminal or suspicious.',
  'All operational decisions require human review and local context.',
].join(' ');

export const HOTSPOT_EXCLUDED_INPUTS = [
  'TargetNextMonthCrimeCount',
  'UrbanizationIndex',
  'UnemploymentRate',
  'EconomicStressIndex',
  'PopulationDensity',
  'Protected or demographic attributes',
] as const;

interface ParsedHotspotFeature {
  locationId: number;

  year: number;
  month: number;

  crimeCount: number;

  lag1CrimeCount: number;

  lag3CrimeCount: number;

  lag12CrimeCount: number;

  averageSeverity: number;

  dominantCrimeType: string;

  dataSplit:
    HotspotDataSplit;
}

export interface HotspotServiceStatistics {
  featureRows: number;

  locations: number;

  periods: number;

  firstPeriod:
    HotspotPeriod;

  latestPeriod:
    HotspotPeriod;
}

function toInteger(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  if (!/^-?\d+$/.test(cleaned)) {
    throw new Error(
      `${label} must contain an integer.`,
    );
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isSafeInteger(parsed)
  ) {
    throw new Error(
      `${label} exceeds the safe integer range.`,
    );
  }

  return parsed;
}

function toPositiveInteger(
  value: string,
  label: string,
): number {
  const parsed =
    toInteger(
      value,
      label,
    );

  if (parsed < 1) {
    throw new Error(
      `${label} must be positive.`,
    );
  }

  return parsed;
}

function toNonNegativeInteger(
  value: string,
  label: string,
): number {
  const parsed =
    toInteger(
      value,
      label,
    );

  if (parsed < 0) {
    throw new Error(
      `${label} cannot be negative.`,
    );
  }

  return parsed;
}

function toFiniteNumber(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  const parsed =
    Number(cleaned);

  if (
    !cleaned ||
    !Number.isFinite(parsed)
  ) {
    throw new Error(
      `${label} must contain a finite number.`,
    );
  }

  return parsed;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    Math.max(
      value,
      minimum,
    ),
    maximum,
  );
}

function createPeriodKey(
  year: number,
  month: number,
): string {
  return [
    year,
    String(month).padStart(
      2,
      '0',
    ),
  ].join('-');
}

function createPeriod(
  year: number,
  month: number,
): HotspotPeriod {
  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1,
      ),
    );

  const label =
    new Intl.DateTimeFormat(
      'en-IN',
      {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      },
    ).format(date);

  return {
    key:
      createPeriodKey(
        year,
        month,
      ),

    year,
    month,
    label,
  };
}

function getRiskBand(
  score: number,
): HotspotRiskBand {
  if (score >= 70) {
    return 'CRITICAL';
  }

  if (score >= 50) {
    return 'HIGH';
  }

  if (score >= 25) {
    return 'MODERATE';
  }

  return 'LOW';
}

function getTrendDirection(
  crimeCount: number,
  lag1CrimeCount: number,
): HotspotTrendDirection {
  if (
    crimeCount >
    lag1CrimeCount
  ) {
    return 'RISING';
  }

  if (
    crimeCount <
    lag1CrimeCount
  ) {
    return 'FALLING';
  }

  return 'STABLE';
}

/**
 * Historical operational pressure only.
 *
 * TargetNextMonthCrimeCount and all
 * socioeconomic columns are intentionally
 * excluded from this calculation.
 */
function calculatePressureScore(
  feature:
    ParsedHotspotFeature,
): number {
  const currentComponent =
    clamp(
      feature.crimeCount / 7,
      0,
      1,
    ) * 40;

  const lag1Component =
    clamp(
      feature.lag1CrimeCount / 7,
      0,
      1,
    ) * 20;

  const lag3Average =
    feature.lag3CrimeCount / 3;

  const lag3Component =
    clamp(
      lag3Average / 7,
      0,
      1,
    ) * 20;

  const lag12Component =
    clamp(
      feature.lag12CrimeCount / 7,
      0,
      1,
    ) * 10;

  const severityComponent =
    clamp(
      feature.averageSeverity / 4,
      0,
      1,
    ) * 10;

  return Math.round(
    clamp(
      currentComponent +
        lag1Component +
        lag3Component +
        lag12Component +
        severityComponent,

      0,
      100,
    ),
  );
}

function parseDataSplit(
  value: string,
  rowNumber: number,
): HotspotDataSplit {
  const cleaned =
    value
      .trim()
      .toLowerCase();

  if (
    cleaned === 'train' ||
    cleaned === 'validation' ||
    cleaned === 'test'
  ) {
    return cleaned;
  }

  throw new Error(
    [
      'hotspot_monthly_features.csv',
      `row ${rowNumber}`,
      `has unsupported DataSplit ${value}.`,
    ].join(' '),
  );
}

function validateHeader(
  actualHeader:
    readonly string[],
): void {
  if (
    actualHeader.length !==
    HOTSPOT_COLUMNS.length
  ) {
    throw new Error(
      [
        'hotspot_monthly_features.csv',
        'has an unexpected column count.',
      ].join(' '),
    );
  }

  HOTSPOT_COLUMNS.forEach(
    (
      expectedColumn,
      index,
    ) => {
      if (
        actualHeader[index] !==
        expectedColumn
      ) {
        throw new Error(
          [
            'hotspot_monthly_features.csv',
            `column ${index + 1}`,
            `must be ${expectedColumn},`,
            `received ${String(
              actualHeader[index],
            )}.`,
          ].join(' '),
        );
      }
    },
  );
}

function parseFeatureRow(
  row:
    readonly string[],

  rowNumber: number,
): ParsedHotspotFeature {
  if (
    row.length !==
    HOTSPOT_COLUMNS.length
  ) {
    throw new Error(
      [
        'hotspot_monthly_features.csv',
        `row ${rowNumber}`,
        'has an unexpected column count.',
      ].join(' '),
    );
  }

  const locationId =
    toPositiveInteger(
      row[0] ?? '',

      `Row ${rowNumber} LocationID`,
    );

  const year =
    toPositiveInteger(
      row[1] ?? '',

      `Row ${rowNumber} Year`,
    );

  const month =
    toPositiveInteger(
      row[2] ?? '',

      `Row ${rowNumber} Month`,
    );

  if (
    month < 1 ||
    month > 12
  ) {
    throw new Error(
      `Row ${rowNumber} Month must be between 1 and 12.`,
    );
  }

  const crimeCount =
    toNonNegativeInteger(
      row[3] ?? '',

      `Row ${rowNumber} CrimeCount`,
    );

  const lag1CrimeCount =
    toNonNegativeInteger(
      row[4] ?? '',

      `Row ${rowNumber} Lag1CrimeCount`,
    );

  const lag3CrimeCount =
    toNonNegativeInteger(
      row[5] ?? '',

      `Row ${rowNumber} Lag3CrimeCount`,
    );

  const lag12CrimeCount =
    toNonNegativeInteger(
      row[6] ?? '',

      `Row ${rowNumber} Lag12CrimeCount`,
    );

  const averageSeverity =
    toFiniteNumber(
      row[7] ?? '',

      `Row ${rowNumber} AverageSeverity`,
    );

  if (
    averageSeverity < 0 ||
    averageSeverity > 4
  ) {
    throw new Error(
      `Row ${rowNumber} AverageSeverity must be between 0 and 4.`,
    );
  }

  const dominantCrimeType =
    (
      row[8] ?? ''
    ).trim();

  if (!dominantCrimeType) {
    throw new Error(
      `Row ${rowNumber} DominantCrimeType cannot be empty.`,
    );
  }

  // Validate but deliberately do not use
  // socioeconomic or target columns.
  toFiniteNumber(
    row[9] ?? '',

    `Row ${rowNumber} UrbanizationIndex`,
  );

  toFiniteNumber(
    row[10] ?? '',

    `Row ${rowNumber} UnemploymentRate`,
  );

  toFiniteNumber(
    row[11] ?? '',

    `Row ${rowNumber} EconomicStressIndex`,
  );

  toFiniteNumber(
    row[12] ?? '',

    `Row ${rowNumber} PopulationDensity`,
  );

  toNonNegativeInteger(
    row[13] ?? '',

    `Row ${rowNumber} TargetNextMonthCrimeCount`,
  );

  const dataSplit =
    parseDataSplit(
      row[14] ?? '',
      rowNumber,
    );

  const responsibleUseNote =
    (
      row[15] ?? ''
    ).trim();

  if (!responsibleUseNote) {
    throw new Error(
      `Row ${rowNumber} ResponsibleUseNote cannot be empty.`,
    );
  }

  return {
    locationId,

    year,
    month,

    crimeCount,

    lag1CrimeCount,

    lag3CrimeCount,

    lag12CrimeCount,

    averageSeverity,

    dominantCrimeType,

    dataSplit,
  };
}

async function loadFeatureRows(
  datasetRoot: string,
): Promise<
  ParsedHotspotFeature[]
> {
  const featurePath =
    path.join(
      datasetRoot,
      ...HOTSPOT_FEATURE_PATH,
    );

  let content: string;

  try {
    content =
      await readFile(
        featurePath,
        'utf8',
      );
  } catch (error: unknown) {
    throw new Error(
      [
        'Hotspot feature file could not be read.',
        featurePath,
        error instanceof Error
          ? error.message
          : String(error),
      ].join(' '),
    );
  }

  const records =
    parse(
      content,
      {
        bom: true,
        skip_empty_lines: true,
        relax_column_count: false,
      },
    ) as string[][];

  const header =
    records[0];

  if (!header) {
    throw new Error(
      'hotspot_monthly_features.csv is empty.',
    );
  }

  validateHeader(header);

  const rows =
    records
      .slice(1)
      .map(
        (
          row,
          index,
        ) =>
          parseFeatureRow(
            row,
            index + 2,
          ),
      );

  if (
    rows.length !==
    EXPECTED_HOTSPOT_ROWS
  ) {
    throw new Error(
      [
        'Expected',
        EXPECTED_HOTSPOT_ROWS,
        'hotspot rows, received',
        `${rows.length}.`,
      ].join(' '),
    );
  }

  return rows;
}

function comparePeriods(
  left:
    HotspotPeriod,

  right:
    HotspotPeriod,
): number {
  return (
    left.year -
      right.year ||

    left.month -
      right.month
  );
}

function uniquePositiveNumbers(
  values:
    readonly number[] |
    undefined,

  label: string,
): number[] {
  if (!values) {
    return [];
  }

  const unique =
    new Set<number>();

  values.forEach(
    (value) => {
      if (
        !Number.isSafeInteger(
          value,
        ) ||
        value < 1
      ) {
        throw new Error(
          `${label} must contain positive integers.`,
        );
      }

      unique.add(value);
    },
  );

  return [
    ...unique,
  ];
}

function normalizeRiskBands(
  values:
    readonly HotspotRiskBand[] |
    undefined,
): HotspotRiskBand[] {
  if (!values) {
    return [];
  }

  const allowed =
    new Set<HotspotRiskBand>(
      HOTSPOT_RISK_BANDS,
    );

  const result =
    new Set<HotspotRiskBand>();

  values.forEach(
    (value) => {
      if (!allowed.has(value)) {
        throw new Error(
          `Unsupported hotspot risk band: ${String(
            value,
          )}.`,
        );
      }

      result.add(value);
    },
  );

  return [
    ...result,
  ];
}

export class HotspotService {
  private readonly locationById =
    new Map<
      number,
      HotspotLocationReference
    >();

  private readonly rowsByPeriod =
    new Map<
      string,
      ParsedHotspotFeature[]
    >();

  private readonly rowsByLocation =
    new Map<
      number,
      ParsedHotspotFeature[]
    >();

  private readonly periods:
    HotspotPeriod[];

  private readonly features:
    ParsedHotspotFeature[];

  public readonly generatedAt:
    string;

  public constructor(
    private readonly dataset:
      LoadedCoreDataset,

    features:
      ParsedHotspotFeature[],
  ) {
    this.features =
      features;

    this.generatedAt = [
      dataset
        .manifest
        .date_range
        .end,

      'T23:59:59.000Z',
    ].join('');

    this.buildLocationIndex();

    const periodByKey =
      new Map<
        string,
        HotspotPeriod
      >();

    const duplicateKeys =
      new Set<string>();

    features.forEach(
      (feature) => {
        if (
          !this.locationById.has(
            feature.locationId,
          )
        ) {
          throw new Error(
            [
              'Hotspot feature references',
              'missing location',
              `${feature.locationId}.`,
            ].join(' '),
          );
        }

        const period =
          createPeriod(
            feature.year,
            feature.month,
          );

        periodByKey.set(
          period.key,
          period,
        );

        const duplicateKey = [
          feature.locationId,
          period.key,
        ].join(':');

        if (
          duplicateKeys.has(
            duplicateKey,
          )
        ) {
          throw new Error(
            [
              'Duplicate hotspot feature',
              duplicateKey,
              'was detected.',
            ].join(' '),
          );
        }

        duplicateKeys.add(
          duplicateKey,
        );

        const periodRows =
          this.rowsByPeriod.get(
            period.key,
          ) ?? [];

        periodRows.push(
          feature,
        );

        this.rowsByPeriod.set(
          period.key,
          periodRows,
        );

        const locationRows =
          this.rowsByLocation.get(
            feature.locationId,
          ) ?? [];

        locationRows.push(
          feature,
        );

        this.rowsByLocation.set(
          feature.locationId,
          locationRows,
        );
      },
    );

    this.periods = [
      ...periodByKey.values(),
    ].sort(
      comparePeriods,
    );

    this.rowsByLocation.forEach(
      (rows) => {
        rows.sort(
          (
            left,
            right,
          ) =>
            left.year -
              right.year ||

            left.month -
              right.month,
        );
      },
    );

    if (
      this.locationById.size !==
      EXPECTED_LOCATION_COUNT
    ) {
      throw new Error(
        [
          'Expected',
          EXPECTED_LOCATION_COUNT,
          'hotspot locations, received',
          `${this.locationById.size}.`,
        ].join(' '),
      );
    }
  }

  public getFilterOptions(): HotspotFilterOptions {
    const districts =
      new Map<
        number,
        HotspotLocationReference[
          'district'
        ]
      >();

    const policeStations =
      new Map<
        number,
        HotspotLocationReference[
          'policeStation'
        ]
      >();

    this.locationById.forEach(
      (location) => {
        districts.set(
          location.district.id,
          location.district,
        );

        policeStations.set(
          location.policeStation.id,
          location.policeStation,
        );
      },
    );

    const defaultPeriod =
      this.periods[
        this.periods.length - 1
      ];

    if (!defaultPeriod) {
      throw new Error(
        'No hotspot periods are available.',
      );
    }

    return {
      periods: [
        ...this.periods,
      ].sort(
        (
          left,
          right,
        ) =>
          comparePeriods(
            right,
            left,
          ),
      ),

      defaultPeriod,

      districts: [
        ...districts.values(),
      ].sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      ),

      policeStations: [
        ...policeStations.values(),
      ].sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      ),

      riskBands: [
        ...HOTSPOT_RISK_BANDS,
      ],

      maximumResultLimit:
        MAXIMUM_RESULT_LIMIT,
    };
  }

  public getSummary(
    query:
      HotspotSummaryQuery = {},
  ): HotspotSummaryResponse | null {
    if (
      (
        query.year === undefined
      ) !==
      (
        query.month === undefined
      )
    ) {
      throw new Error(
        'year and month must be provided together.',
      );
    }

    const latestPeriod =
      this.periods[
        this.periods.length - 1
      ];

    if (!latestPeriod) {
      throw new Error(
        'No hotspot periods are available.',
      );
    }

    const year =
      query.year ??
      latestPeriod.year;

    const month =
      query.month ??
      latestPeriod.month;

    if (
      !Number.isSafeInteger(year) ||
      year < 1
    ) {
      throw new Error(
        'year must be a positive integer.',
      );
    }

    if (
      !Number.isSafeInteger(month) ||
      month < 1 ||
      month > 12
    ) {
      throw new Error(
        'month must be between 1 and 12.',
      );
    }

    const limit =
      query.limit ??
      DEFAULT_RESULT_LIMIT;

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit >
        MAXIMUM_RESULT_LIMIT
    ) {
      throw new Error(
        [
          'limit must be between 1 and',
          `${MAXIMUM_RESULT_LIMIT}.`,
        ].join(' '),
      );
    }

    const districtIds =
      uniquePositiveNumbers(
        query.districtIds,
        'districtIds',
      );

    const policeStationIds =
      uniquePositiveNumbers(
        query.policeStationIds,
        'policeStationIds',
      );

    const riskBands =
      normalizeRiskBands(
        query.riskBands,
      );

    const period =
      createPeriod(
        year,
        month,
      );

    const periodRows =
      this.rowsByPeriod.get(
        period.key,
      );

    if (!periodRows) {
      return null;
    }

    const districtFilter =
      districtIds.length > 0
        ? new Set(districtIds)
        : null;

    const policeStationFilter =
      policeStationIds.length > 0
        ? new Set(
            policeStationIds,
          )
        : null;

    const riskBandFilter =
      riskBands.length > 0
        ? new Set(riskBands)
        : null;

    const allItems =
      periodRows
        .map(
          (feature) =>
            this.createSummaryItem(
              feature,
            ),
        )
        .filter(
          (item) => {
            if (
              districtFilter &&
              !districtFilter.has(
                item.location
                  .district.id,
              )
            ) {
              return false;
            }

            if (
              policeStationFilter &&
              !policeStationFilter.has(
                item.location
                  .policeStation.id,
              )
            ) {
              return false;
            }

            if (
              riskBandFilter &&
              !riskBandFilter.has(
                item.riskBand,
              )
            ) {
              return false;
            }

            return true;
          },
        )
        .sort(
          (
            left,
            right,
          ) =>
            right.pressureScore -
              left.pressureScore ||

            right.crimeCount -
              left.crimeCount ||

            left.location.id -
              right.location.id,
        );

    const totalCrimeCount =
      allItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.crimeCount,

        0,
      );

    const averagePressureScore =
      allItems.length > 0
        ? Number(
            (
              allItems.reduce(
                (
                  total,
                  item,
                ) =>
                  total +
                  item.pressureScore,

                0,
              ) /
              allItems.length
            ).toFixed(2),
          )
        : 0;

    return {
      period,

      matchingLocations:
        allItems.length,

      returnedLocations:
        Math.min(
          allItems.length,
          limit,
        ),

      totalCrimeCount,

      averagePressureScore,

      criticalLocationCount:
        allItems.filter(
          (item) =>
            item.riskBand ===
            'CRITICAL',
        ).length,

      highLocationCount:
        allItems.filter(
          (item) =>
            item.riskBand ===
            'HIGH',
        ).length,

      items:
        allItems.slice(
          0,
          limit,
        ),

      generatedAt:
        this.generatedAt,

      methodology:
        HOTSPOT_METHODOLOGY,

      responsibleUse:
        HOTSPOT_RESPONSIBLE_USE,

      excludedInputs: [
        ...HOTSPOT_EXCLUDED_INPUTS,
      ],
    };
  }

  public getLocationTrend(
    locationId: number,

    query:
      HotspotTrendQuery = {},
  ): HotspotLocationTrendResponse | null {
    if (
      !Number.isSafeInteger(
        locationId,
      ) ||
      locationId < 1
    ) {
      throw new Error(
        'locationId must be a positive integer.',
      );
    }

    const months =
      query.months ??
      DEFAULT_TREND_MONTHS;

    if (
      !Number.isSafeInteger(months) ||
      months < 1 ||
      months >
        MAXIMUM_TREND_MONTHS
    ) {
      throw new Error(
        [
          'months must be between 1 and',
          `${MAXIMUM_TREND_MONTHS}.`,
        ].join(' '),
      );
    }

    const location =
      this.locationById.get(
        locationId,
      );

    const rows =
      this.rowsByLocation.get(
        locationId,
      );

    if (
      !location ||
      !rows
    ) {
      return null;
    }

    return {
      location,

      points:
        rows
          .slice(
            -months,
          )
          .map(
            (feature) =>
              this.createMetric(
                feature,
              ),
          ),

      generatedAt:
        this.generatedAt,

      methodology:
        HOTSPOT_METHODOLOGY,

      responsibleUse:
        HOTSPOT_RESPONSIBLE_USE,

      excludedInputs: [
        ...HOTSPOT_EXCLUDED_INPUTS,
      ],
    };
  }

  public getStatistics(): HotspotServiceStatistics {
    const firstPeriod =
      this.periods[0];

    const latestPeriod =
      this.periods[
        this.periods.length - 1
      ];

    if (
      !firstPeriod ||
      !latestPeriod
    ) {
      throw new Error(
        'Hotspot period statistics are unavailable.',
      );
    }

    return {
      featureRows:
        this.features.length,

      locations:
        this.locationById.size,

      periods:
        this.periods.length,

      firstPeriod,

      latestPeriod,
    };
  }

  private buildLocationIndex(): void {
    const districtNameById =
      new Map<number, string>();

    this.dataset
      .rawTables
      .District
      .forEach(
        (row) => {
          districtNameById.set(
            toPositiveInteger(
              row.DistrictID,

              'District.DistrictID',
            ),

            row.DistrictName.trim(),
          );
        },
      );

    const unitNameById =
      new Map<number, string>();

    this.dataset
      .rawTables
      .Unit
      .forEach(
        (row) => {
          unitNameById.set(
            toPositiveInteger(
              row.UnitID,

              'Unit.UnitID',
            ),

            row.UnitName.trim(),
          );
        },
      );

    this.dataset
      .rawTables
      .LocationMaster
      .forEach(
        (row) => {
          const locationId =
            toPositiveInteger(
              row.LocationID,

              'LocationMaster.LocationID',
            );

          const districtId =
            toPositiveInteger(
              row.DistrictID,

              'LocationMaster.DistrictID',
            );

          const policeStationId =
            toPositiveInteger(
              row.PoliceStationID,

              'LocationMaster.PoliceStationID',
            );

          const districtName =
            districtNameById.get(
              districtId,
            );

          const policeStationName =
            unitNameById.get(
              policeStationId,
            );

          if (!districtName) {
            throw new Error(
              [
                'Location',
                locationId,
                'references missing district',
                `${districtId}.`,
              ].join(' '),
            );
          }

          if (!policeStationName) {
            throw new Error(
              [
                'Location',
                locationId,
                'references missing police station unit',
                `${policeStationId}.`,
              ].join(' '),
            );
          }

          this.locationById.set(
            locationId,

            {
              id:
                locationId,

              name:
                row.LocationName.trim(),

              zoneType:
                row.ZoneType.trim(),

              latitude:
                toFiniteNumber(
                  row.Latitude,

                  'LocationMaster.Latitude',
                ),

              longitude:
                toFiniteNumber(
                  row.Longitude,

                  'LocationMaster.Longitude',
                ),

              district: {
                id:
                  districtId,

                name:
                  districtName,
              },

              policeStation: {
                id:
                  policeStationId,

                name:
                  policeStationName,

                districtId,
              },
            },
          );
        },
      );
  }

  private createMetric(
    feature:
      ParsedHotspotFeature,
  ): HotspotMonthlyMetric {
    const pressureScore =
      calculatePressureScore(
        feature,
      );

    return {
      period:
        createPeriod(
          feature.year,
          feature.month,
        ),

      crimeCount:
        feature.crimeCount,

      lag1CrimeCount:
        feature.lag1CrimeCount,

      lag3AverageCrimeCount:
        Number(
          (
            feature.lag3CrimeCount /
            3
          ).toFixed(2),
        ),

      lag12CrimeCount:
        feature.lag12CrimeCount,

      averageSeverity:
        feature.averageSeverity,

      dominantCrimeType:
        feature.dominantCrimeType,

      pressureScore,

      riskBand:
        getRiskBand(
          pressureScore,
        ),

      trendDirection:
        getTrendDirection(
          feature.crimeCount,
          feature.lag1CrimeCount,
        ),

      dataSplit:
        feature.dataSplit,
    };
  }

  private createSummaryItem(
    feature:
      ParsedHotspotFeature,
  ): HotspotSummaryItem {
    const location =
      this.locationById.get(
        feature.locationId,
      );

    if (!location) {
      throw new Error(
        [
          'Missing hotspot location',
          `${feature.locationId}.`,
        ].join(' '),
      );
    }

    return {
      ...this.createMetric(
        feature,
      ),

      location,
    };
  }
}

let hotspotServicePromise:
  Promise<HotspotService> |
  null = null;

export function getHotspotService(): Promise<HotspotService> {
  if (!hotspotServicePromise) {
    hotspotServicePromise =
      getCoreDataset().then(
        async (dataset) => {
          const features =
            await loadFeatureRows(
              dataset.datasetRoot,
            );

          return new HotspotService(
            dataset,
            features,
          );
        },
      );
  }

  return hotspotServicePromise;
}

export function clearHotspotServiceCache(): void {
  hotspotServicePromise = null;
}
