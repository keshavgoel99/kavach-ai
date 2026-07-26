import type {
  AnalyticsAppliedQuery,
  AnalyticsBreakdownItem,
  AnalyticsDistrictComparisonItem,
  AnalyticsFilterOptions,
  AnalyticsLookupOption,
  AnalyticsModusOperandiItem,
  AnalyticsMonthlyPoint,
  AnalyticsOverviewMetrics,
  AnalyticsOverviewResponse,
  AnalyticsPeriod,
  AnalyticsPoliceStationOption,
  AnalyticsQuery,
} from '@kavach/shared-types';

import type {
  LoadedCoreDataset,
} from '../data/dataset-loader';

import type {
  CaseMasterRecord,
} from '../data/case-master-record';

import {
  getCoreDataset,
} from '../data/dataset-service';

const MODUS_OPERANDI_CONFIDENCE_THRESHOLD =
  0.75;

export const ANALYTICS_METHODOLOGY = [
  'Analytics are descriptive summaries of the supplied synthetic FIR dataset.',
  'Arrest coverage represents cases with at least one arrest or surrender event.',
  'Chargesheet coverage represents cases with at least one chargesheet record.',
  'Rates do not represent guilt, conviction probability, officer performance or community risk.',
].join(' ');

export const ANALYTICS_RESPONSIBLE_USE = [
  'Use these summaries for aggregate workload review, investigative planning and data-quality analysis.',
  'Every operational interpretation requires human review and appropriate local context.',
  'Counts and rates must not be used as automatic performance targets or enforcement decisions.',
].join(' ');

export const ANALYTICS_EXCLUDED_INPUTS = [
  'Caste',
  'Religion',
  'Gender',
  'Victim demographics',
  'Complainant demographics',
  'Neighbourhood reputation',
  'Socio-economic indicators',
  'Individual risk predictions',
] as const;

interface UnitReference {
  id: number;
  name: string;

  districtId: number;
}

interface ModusOperandiReference {
  id: number;
  name: string;
}

interface CaseModusOperandiAssociation {
  modusOperandiId: number;
  confidence: number;
}

export interface AnalyticsServiceStatistics {
  cases: number;

  arrestEvents: number;
  casesWithArrest: number;

  chargesheetRecords: number;
  casesWithChargesheet: number;

  accusedPersons: number;
  victims: number;

  monthlyPeriods: number;

  firstRegisteredDate: string;
  latestRegisteredDate: string;
}

function toPositiveInteger(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  if (!/^\d+$/.test(cleaned)) {
    throw new Error(
      `${label} must contain a positive integer.`,
    );
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${label} must contain a positive integer.`,
    );
  }

  return parsed;
}

function toConfidence(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  const parsed =
    Number(cleaned);

  if (
    !cleaned ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 1
  ) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }

  return parsed;
}

function isIsoDate(
  value: string,
): boolean {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return false;
  }

  const date =
    new Date(
      `${value}T00:00:00.000Z`,
    );

  return (
    !Number.isNaN(
      date.getTime(),
    ) &&
    date
      .toISOString()
      .slice(0, 10) === value
  );
}

function assertIsoDate(
  value: string,
  label: string,
): void {
  if (!isIsoDate(value)) {
    throw new Error(
      `${label} must use YYYY-MM-DD format.`,
    );
  }
}

function percentage(
  numerator: number,
  denominator: number,
): number {
  if (denominator <= 0) {
    return 0;
  }

  return Number(
    (
      (
        numerator /
        denominator
      ) *
      100
    ).toFixed(2),
  );
}

function average(
  values: readonly number[],
): number | null {
  if (values.length === 0) {
    return null;
  }

  return Number(
    (
      values.reduce(
        (
          total,
          value,
        ) =>
          total + value,
        0,
      ) /
      values.length
    ).toFixed(2),
  );
}

function daysBetween(
  firstDate: string,
  secondDate: string,
): number {
  const first =
    new Date(
      `${firstDate.slice(0, 10)}T00:00:00.000Z`,
    );

  const second =
    new Date(
      `${secondDate.slice(0, 10)}T00:00:00.000Z`,
    );

  return Math.round(
    (
      second.getTime() -
      first.getTime()
    ) /
    86_400_000,
  );
}

function createPeriod(
  year: number,
  month: number,
): AnalyticsPeriod {
  const key = [
    year,
    String(month).padStart(
      2,
      '0',
    ),
  ].join('-');

  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        1,
      ),
    );

  return {
    key,

    year,
    month,

    label:
      new Intl.DateTimeFormat(
        'en-IN',
        {
          month: 'short',
          year: 'numeric',
          timeZone: 'UTC',
        },
      ).format(date),
  };
}

function createMonthSequence(
  registeredFrom: string,
  registeredTo: string,
): AnalyticsPeriod[] {
  const fromYear =
    Number(
      registeredFrom.slice(
        0,
        4,
      ),
    );

  const fromMonth =
    Number(
      registeredFrom.slice(
        5,
        7,
      ),
    );

  const toYear =
    Number(
      registeredTo.slice(
        0,
        4,
      ),
    );

  const toMonth =
    Number(
      registeredTo.slice(
        5,
        7,
      ),
    );

  const result:
    AnalyticsPeriod[] = [];

  let year =
    fromYear;

  let month =
    fromMonth;

  while (
    year < toYear ||
    (
      year === toYear &&
      month <= toMonth
    )
  ) {
    result.push(
      createPeriod(
        year,
        month,
      ),
    );

    month += 1;

    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return result;
}

function uniquePositiveIntegers(
  values: readonly number[] | undefined,
  label: string,
): number[] {
  if (!values) {
    return [];
  }

  const result =
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

      result.add(value);
    },
  );

  return [
    ...result,
  ];
}

function normalizeAnalyticsQuery(
  query: AnalyticsQuery,
  firstRegisteredDate: string,
  latestRegisteredDate: string,
): AnalyticsAppliedQuery {
  const registeredFrom =
    query.registeredFrom ??
    firstRegisteredDate;

  const registeredTo =
    query.registeredTo ??
    latestRegisteredDate;

  assertIsoDate(
    registeredFrom,
    'registeredFrom',
  );

  assertIsoDate(
    registeredTo,
    'registeredTo',
  );

  if (
    registeredFrom >
    registeredTo
  ) {
    throw new Error(
      'registeredFrom cannot be after registeredTo.',
    );
  }

  return {
    registeredFrom,
    registeredTo,

    districtIds:
      uniquePositiveIntegers(
        query.districtIds,
        'districtIds',
      ),

    policeStationIds:
      uniquePositiveIntegers(
        query.policeStationIds,
        'policeStationIds',
      ),

    majorCrimeHeadIds:
      uniquePositiveIntegers(
        query.majorCrimeHeadIds,
        'majorCrimeHeadIds',
      ),
  };
}

function createBreakdownItems(
  counts:
    ReadonlyMap<number, number>,

  names:
    ReadonlyMap<number, string>,

  total: number,
): AnalyticsBreakdownItem[] {
  return [
    ...counts.entries(),
  ]
    .map(
      ([
        id,
        count,
      ]) => ({
        id,

        name:
          names.get(id) ??
          `Unknown ${id}`,

        count,

        percentage:
          percentage(
            count,
            total,
          ),
      }),
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.count -
          left.count ||

        left.name.localeCompare(
          right.name,
        ),
    );
}

function incrementCount(
  counts:
    Map<number, number>,

  key: number,

  amount = 1,
): void {
  counts.set(
    key,

    (
      counts.get(key) ??
      0
    ) +
      amount,
  );
}

function incrementStringCount(
  counts:
    Map<string, number>,

  key: string,

  amount = 1,
): void {
  counts.set(
    key,

    (
      counts.get(key) ??
      0
    ) +
      amount,
  );
}

export class AnalyticsService {
  private readonly districtNameById =
    new Map<number, string>();

  private readonly unitById =
    new Map<number, UnitReference>();

  private readonly crimeHeadNameById =
    new Map<number, string>();

  private readonly statusNameById =
    new Map<number, string>();

  private readonly gravityNameById =
    new Map<number, string>();

  private readonly modusOperandiById =
    new Map<
      number,
      ModusOperandiReference
    >();

  private readonly arrestEventCountByCaseId =
    new Map<number, number>();

  private readonly firstArrestDateByCaseId =
    new Map<number, string>();

  private readonly chargesheetCountByCaseId =
    new Map<number, number>();

  private readonly firstChargesheetDateByCaseId =
    new Map<number, string>();

  private readonly accusedCountByCaseId =
    new Map<number, number>();

  private readonly victimCountByCaseId =
    new Map<number, number>();

  private readonly modusOperandiByCaseId =
    new Map<
      number,
      CaseModusOperandiAssociation[]
    >();

  private readonly firstRegisteredDate:
    string;

  private readonly latestRegisteredDate:
    string;

  public readonly generatedAt:
    string;

  public constructor(
    private readonly dataset:
      LoadedCoreDataset,
  ) {
    const registeredDates =
      dataset.cases
        .map(
          (caseRecord) =>
            caseRecord
              .crimeRegisteredDate,
        )
        .sort();

    const firstRegisteredDate =
      registeredDates[0];

    const latestRegisteredDate =
      registeredDates[
        registeredDates.length - 1
      ];

    if (
      !firstRegisteredDate ||
      !latestRegisteredDate
    ) {
      throw new Error(
        'Analytics cannot initialize without cases.',
      );
    }

    this.firstRegisteredDate =
      firstRegisteredDate;

    this.latestRegisteredDate =
      latestRegisteredDate;

    this.generatedAt =
      dataset.manifest.generated_at;

    this.buildLookupIndexes();
    this.buildEventIndexes();
    this.buildPartyIndexes();
    this.buildModusOperandiIndex();
    this.validateCaseDimensions();
  }

  public getFilterOptions(): AnalyticsFilterOptions {
    const districts:
      AnalyticsLookupOption[] = [
      ...this
        .districtNameById
        .entries(),
    ]
      .map(
        ([
          id,
          name,
        ]) => ({
          id,
          name,
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      );

    const policeStations:
      AnalyticsPoliceStationOption[] = [
      ...this.unitById.values(),
    ]
      .map(
        (unit) => ({
          id:
            unit.id,

          name:
            unit.name,

          districtId:
            unit.districtId,
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      );

    const majorCrimeHeads:
      AnalyticsLookupOption[] = [
      ...this
        .crimeHeadNameById
        .entries(),
    ]
      .map(
        ([
          id,
          name,
        ]) => ({
          id,
          name,
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          left.name.localeCompare(
            right.name,
          ),
      );

    return {
      registeredDateRange: {
        from:
          this.firstRegisteredDate,

        to:
          this.latestRegisteredDate,
      },

      defaultDateRange: {
        from:
          this.firstRegisteredDate,

        to:
          this.latestRegisteredDate,
      },

      districts,

      policeStations,

      majorCrimeHeads,
    };
  }

  public getOverview(
    query: AnalyticsQuery = {},
  ): AnalyticsOverviewResponse {
    const normalizedQuery =
      normalizeAnalyticsQuery(
        query,
        this.firstRegisteredDate,
        this.latestRegisteredDate,
      );

    const districtFilter =
      normalizedQuery
        .districtIds
        .length > 0
        ? new Set(
            normalizedQuery
              .districtIds,
          )
        : null;

    const policeStationFilter =
      normalizedQuery
        .policeStationIds
        .length > 0
        ? new Set(
            normalizedQuery
              .policeStationIds,
          )
        : null;

    const crimeHeadFilter =
      normalizedQuery
        .majorCrimeHeadIds
        .length > 0
        ? new Set(
            normalizedQuery
              .majorCrimeHeadIds,
          )
        : null;

    const filteredCases =
      this.dataset.cases.filter(
        (caseRecord) => {
          if (
            caseRecord
              .crimeRegisteredDate <
              normalizedQuery
                .registeredFrom ||

            caseRecord
              .crimeRegisteredDate >
              normalizedQuery
                .registeredTo
          ) {
            return false;
          }

          const unit =
            this.unitById.get(
              caseRecord
                .policeStationId,
            );

          if (!unit) {
            throw new Error(
              [
                'Case',
                caseRecord
                  .caseMasterId,
                'references missing police station',
                `${caseRecord.policeStationId}.`,
              ].join(' '),
            );
          }

          if (
            districtFilter &&
            !districtFilter.has(
              unit.districtId,
            )
          ) {
            return false;
          }

          if (
            policeStationFilter &&
            !policeStationFilter.has(
              caseRecord
                .policeStationId,
            )
          ) {
            return false;
          }

          if (
            crimeHeadFilter &&
            !crimeHeadFilter.has(
              caseRecord
                .crimeMajorHeadId,
            )
          ) {
            return false;
          }

          return true;
        },
      );

    const filteredCaseIds =
      new Set(
        filteredCases.map(
          (caseRecord) =>
            caseRecord.caseMasterId,
        ),
      );

    return {
      query:
        normalizedQuery,

      overview:
        this.createOverviewMetrics(
          filteredCases,
        ),

      monthlyTrend:
        this.createMonthlyTrend(
          filteredCases,
          normalizedQuery,
        ),

      districtComparison:
        this.createDistrictComparison(
          filteredCases,
        ),

      crimeComposition:
        this.createCrimeComposition(
          filteredCases,
        ),

      statusDistribution:
        this.createStatusDistribution(
          filteredCases,
        ),

      gravityDistribution:
        this.createGravityDistribution(
          filteredCases,
        ),

      modusOperandiRecurrence:
        this.createModusOperandiRecurrence(
          filteredCaseIds,
          filteredCases.length,
        ),

      generatedAt:
        this.generatedAt,

      methodology:
        ANALYTICS_METHODOLOGY,

      responsibleUse:
        ANALYTICS_RESPONSIBLE_USE,

      excludedInputs: [
        ...ANALYTICS_EXCLUDED_INPUTS,
      ],
    };
  }

  public getStatistics(): AnalyticsServiceStatistics {
    return {
      cases:
        this.dataset.cases.length,

      arrestEvents:
        this.dataset
          .rawTables
          .ArrestSurrender
          .length,

      casesWithArrest:
        this
          .arrestEventCountByCaseId
          .size,

      chargesheetRecords:
        this.dataset
          .rawTables
          .ChargesheetDetails
          .length,

      casesWithChargesheet:
        this
          .chargesheetCountByCaseId
          .size,

      accusedPersons:
        this.dataset
          .rawTables
          .Accused
          .length,

      victims:
        this.dataset
          .rawTables
          .Victim
          .length,

      monthlyPeriods:
        createMonthSequence(
          this.firstRegisteredDate,
          this.latestRegisteredDate,
        ).length,

      firstRegisteredDate:
        this.firstRegisteredDate,

      latestRegisteredDate:
        this.latestRegisteredDate,
    };
  }

  private buildLookupIndexes(): void {
    this.dataset
      .rawTables
      .District
      .forEach(
        (row) => {
          this
            .districtNameById
            .set(
              toPositiveInteger(
                row.DistrictID,
                'District.DistrictID',
              ),

              row.DistrictName.trim(),
            );
        },
      );

    this.dataset
      .rawTables
      .Unit
      .forEach(
        (row) => {
          const unitId =
            toPositiveInteger(
              row.UnitID,
              'Unit.UnitID',
            );

          this.unitById.set(
            unitId,

            {
              id:
                unitId,

              name:
                row.UnitName.trim(),

              districtId:
                toPositiveInteger(
                  row.DistrictID,
                  'Unit.DistrictID',
                ),
            },
          );
        },
      );

    this.dataset
      .rawTables
      .CrimeHead
      .forEach(
        (row) => {
          this
            .crimeHeadNameById
            .set(
              toPositiveInteger(
                row.CrimeHeadID,
                'CrimeHead.CrimeHeadID',
              ),

              row
                .CrimeGroupName
                .trim(),
            );
        },
      );

    this.dataset
      .rawTables
      .CaseStatusMaster
      .forEach(
        (row) => {
          this
            .statusNameById
            .set(
              toPositiveInteger(
                row.CaseStatusID,
                'CaseStatusMaster.CaseStatusID',
              ),

              row
                .CaseStatusName
                .trim(),
            );
        },
      );

    this.dataset
      .rawTables
      .GravityOffence
      .forEach(
        (row) => {
          this
            .gravityNameById
            .set(
              toPositiveInteger(
                row.GravityOffenceID,
                'GravityOffence.GravityOffenceID',
              ),

              row.LookupValue.trim(),
            );
        },
      );

    this.dataset
      .rawTables
      .ModusOperandi
      .forEach(
        (row) => {
          const modusOperandiId =
            toPositiveInteger(
              row.MOID,
              'ModusOperandi.MOID',
            );

          this
            .modusOperandiById
            .set(
              modusOperandiId,

              {
                id:
                  modusOperandiId,

                name:
                  row.MOName.trim(),
              },
            );
        },
      );
  }

  private buildEventIndexes(): void {
    this.dataset
      .rawTables
      .ArrestSurrender
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'ArrestSurrender.CaseMasterID',
            );

          const eventDate =
            row
              .ArrestSurrenderDate
              .trim();

          assertIsoDate(
            eventDate,
            'ArrestSurrender.ArrestSurrenderDate',
          );

          this
            .arrestEventCountByCaseId
            .set(
              caseId,

              (
                this
                  .arrestEventCountByCaseId
                  .get(caseId) ??
                0
              ) +
                1,
            );

          const existing =
            this
              .firstArrestDateByCaseId
              .get(caseId);

          if (
            !existing ||
            eventDate < existing
          ) {
            this
              .firstArrestDateByCaseId
              .set(
                caseId,
                eventDate,
              );
          }
        },
      );

    this.dataset
      .rawTables
      .ChargesheetDetails
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'ChargesheetDetails.CaseMasterID',
            );

          const chargesheetDate =
            row.csdate
              .trim()
              .slice(0, 10);

          assertIsoDate(
            chargesheetDate,
            'ChargesheetDetails.csdate',
          );

          this
            .chargesheetCountByCaseId
            .set(
              caseId,

              (
                this
                  .chargesheetCountByCaseId
                  .get(caseId) ??
                0
              ) +
                1,
            );

          const existing =
            this
              .firstChargesheetDateByCaseId
              .get(caseId);

          if (
            !existing ||
            chargesheetDate <
              existing
          ) {
            this
              .firstChargesheetDateByCaseId
              .set(
                caseId,
                chargesheetDate,
              );
          }
        },
      );
  }

  private buildPartyIndexes(): void {
    this.dataset
      .rawTables
      .Accused
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'Accused.CaseMasterID',
            );

          this
            .accusedCountByCaseId
            .set(
              caseId,

              (
                this
                  .accusedCountByCaseId
                  .get(caseId) ??
                0
              ) +
                1,
            );
        },
      );

    this.dataset
      .rawTables
      .Victim
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'Victim.CaseMasterID',
            );

          this
            .victimCountByCaseId
            .set(
              caseId,

              (
                this
                  .victimCountByCaseId
                  .get(caseId) ??
                0
              ) +
                1,
            );
        },
      );
  }

  private buildModusOperandiIndex(): void {
    this.dataset
      .rawTables
      .CaseMOAssociation
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'CaseMOAssociation.CaseMasterID',
            );

          const modusOperandiId =
            toPositiveInteger(
              row.MOID,
              'CaseMOAssociation.MOID',
            );

          const confidence =
            toConfidence(
              row.Confidence,
              'CaseMOAssociation.Confidence',
            );

          const associations =
            this
              .modusOperandiByCaseId
              .get(caseId) ??
            [];

          associations.push({
            modusOperandiId,
            confidence,
          });

          this
            .modusOperandiByCaseId
            .set(
              caseId,
              associations,
            );
        },
      );
  }

  private validateCaseDimensions(): void {
    this.dataset.cases.forEach(
      (caseRecord) => {
        if (
          !this.unitById.has(
            caseRecord
              .policeStationId,
          )
        ) {
          throw new Error(
            [
              'Case',
              caseRecord
                .caseMasterId,
              'references missing unit',
              `${caseRecord.policeStationId}.`,
            ].join(' '),
          );
        }

        if (
          !this
            .crimeHeadNameById
            .has(
              caseRecord
                .crimeMajorHeadId,
            )
        ) {
          throw new Error(
            [
              'Case',
              caseRecord
                .caseMasterId,
              'references missing crime head',
              `${caseRecord.crimeMajorHeadId}.`,
            ].join(' '),
          );
        }

        if (
          !this
            .statusNameById
            .has(
              caseRecord
                .caseStatusId,
            )
        ) {
          throw new Error(
            [
              'Case',
              caseRecord
                .caseMasterId,
              'references missing status',
              `${caseRecord.caseStatusId}.`,
            ].join(' '),
          );
        }

        if (
          !this
            .gravityNameById
            .has(
              caseRecord
                .gravityOffenceId,
            )
        ) {
          throw new Error(
            [
              'Case',
              caseRecord
                .caseMasterId,
              'references missing gravity',
              `${caseRecord.gravityOffenceId}.`,
            ].join(' '),
          );
        }
      },
    );
  }

  private createOverviewMetrics(
    cases:
      readonly CaseMasterRecord[],
  ): AnalyticsOverviewMetrics {
    let accusedPersons = 0;
    let victims = 0;

    let arrestEvents = 0;
    let casesWithArrest = 0;

    let chargesheetRecords = 0;
    let casesWithChargesheet = 0;

    const daysToFirstArrest:
      number[] = [];

    const daysToFirstChargesheet:
      number[] = [];

    cases.forEach(
      (caseRecord) => {
        const caseId =
          caseRecord
            .caseMasterId;

        accusedPersons +=
          this
            .accusedCountByCaseId
            .get(caseId) ??
          0;

        victims +=
          this
            .victimCountByCaseId
            .get(caseId) ??
          0;

        const arrestEventCount =
          this
            .arrestEventCountByCaseId
            .get(caseId) ??
          0;

        arrestEvents +=
          arrestEventCount;

        if (
          arrestEventCount > 0
        ) {
          casesWithArrest += 1;

          const firstArrestDate =
            this
              .firstArrestDateByCaseId
              .get(caseId);

          if (firstArrestDate) {
            daysToFirstArrest.push(
              daysBetween(
                caseRecord
                  .crimeRegisteredDate,

                firstArrestDate,
              ),
            );
          }
        }

        const chargesheetCount =
          this
            .chargesheetCountByCaseId
            .get(caseId) ??
          0;

        chargesheetRecords +=
          chargesheetCount;

        if (
          chargesheetCount > 0
        ) {
          casesWithChargesheet +=
            1;

          const firstChargesheetDate =
            this
              .firstChargesheetDateByCaseId
              .get(caseId);

          if (
            firstChargesheetDate
          ) {
            daysToFirstChargesheet.push(
              daysBetween(
                caseRecord
                  .crimeRegisteredDate,

                firstChargesheetDate,
              ),
            );
          }
        }
      },
    );

    return {
      totalCases:
        cases.length,

      accusedPersons,
      victims,

      arrestEvents,
      casesWithArrest,

      chargesheetRecords,
      casesWithChargesheet,

      arrestCoverageRate:
        percentage(
          casesWithArrest,
          cases.length,
        ),

      chargesheetCoverageRate:
        percentage(
          casesWithChargesheet,
          cases.length,
        ),

      averageDaysToFirstArrest:
        average(
          daysToFirstArrest,
        ),

      averageDaysToFirstChargesheet:
        average(
          daysToFirstChargesheet,
        ),
    };
  }

  private createMonthlyTrend(
    cases:
      readonly CaseMasterRecord[],

    query:
      AnalyticsAppliedQuery,
  ): AnalyticsMonthlyPoint[] {
    const caseCountByMonth =
      new Map<string, number>();

    const arrestCaseCountByMonth =
      new Map<string, number>();

    const chargesheetCaseCountByMonth =
      new Map<string, number>();

    cases.forEach(
      (caseRecord) => {
        const monthKey =
          caseRecord
            .crimeRegisteredDate
            .slice(0, 7);

        incrementStringCount(
          caseCountByMonth,
          monthKey,
        );

        if (
          this
            .arrestEventCountByCaseId
            .has(
              caseRecord
                .caseMasterId,
            )
        ) {
          incrementStringCount(
            arrestCaseCountByMonth,
            monthKey,
          );
        }

        if (
          this
            .chargesheetCountByCaseId
            .has(
              caseRecord
                .caseMasterId,
            )
        ) {
          incrementStringCount(
            chargesheetCaseCountByMonth,
            monthKey,
          );
        }
      },
    );

    return createMonthSequence(
      query.registeredFrom,
      query.registeredTo,
    ).map(
      (period) => {
        const registeredCases =
          caseCountByMonth.get(
            period.key,
          ) ??
          0;

        const casesWithArrest =
          arrestCaseCountByMonth.get(
            period.key,
          ) ??
          0;

        const casesWithChargesheet =
          chargesheetCaseCountByMonth.get(
            period.key,
          ) ??
          0;

        return {
          period,

          registeredCases,
          casesWithArrest,
          casesWithChargesheet,

          arrestCoverageRate:
            percentage(
              casesWithArrest,
              registeredCases,
            ),

          chargesheetCoverageRate:
            percentage(
              casesWithChargesheet,
              registeredCases,
            ),
        };
      },
    );
  }

  private createDistrictComparison(
    cases:
      readonly CaseMasterRecord[],
  ): AnalyticsDistrictComparisonItem[] {
    interface DistrictAccumulator {
      totalCases: number;

      casesWithArrest: number;
      casesWithChargesheet: number;
    }

    const accumulators =
      new Map<
        number,
        DistrictAccumulator
      >();

    cases.forEach(
      (caseRecord) => {
        const unit =
          this.unitById.get(
            caseRecord
              .policeStationId,
          );

        if (!unit) {
          return;
        }

        const accumulator =
          accumulators.get(
            unit.districtId,
          ) ?? {
            totalCases: 0,

            casesWithArrest: 0,
            casesWithChargesheet: 0,
          };

        accumulator.totalCases +=
          1;

        if (
          this
            .arrestEventCountByCaseId
            .has(
              caseRecord
                .caseMasterId,
            )
        ) {
          accumulator
            .casesWithArrest +=
            1;
        }

        if (
          this
            .chargesheetCountByCaseId
            .has(
              caseRecord
                .caseMasterId,
            )
        ) {
          accumulator
            .casesWithChargesheet +=
            1;
        }

        accumulators.set(
          unit.districtId,
          accumulator,
        );
      },
    );

    return [
      ...accumulators.entries(),
    ]
      .map(
        ([
          districtId,
          accumulator,
        ]) => ({
          districtId,

          districtName:
            this
              .districtNameById
              .get(districtId) ??
            `District ${districtId}`,

          totalCases:
            accumulator
              .totalCases,

          casesWithArrest:
            accumulator
              .casesWithArrest,

          casesWithChargesheet:
            accumulator
              .casesWithChargesheet,

          arrestCoverageRate:
            percentage(
              accumulator
                .casesWithArrest,

              accumulator
                .totalCases,
            ),

          chargesheetCoverageRate:
            percentage(
              accumulator
                .casesWithChargesheet,

              accumulator
                .totalCases,
            ),
        }),
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.totalCases -
            left.totalCases ||

          left.districtName.localeCompare(
            right.districtName,
          ),
      );
  }

  private createCrimeComposition(
    cases:
      readonly CaseMasterRecord[],
  ): AnalyticsBreakdownItem[] {
    const counts =
      new Map<number, number>();

    cases.forEach(
      (caseRecord) => {
        incrementCount(
          counts,

          caseRecord
            .crimeMajorHeadId,
        );
      },
    );

    return createBreakdownItems(
      counts,
      this.crimeHeadNameById,
      cases.length,
    );
  }

  private createStatusDistribution(
    cases:
      readonly CaseMasterRecord[],
  ): AnalyticsBreakdownItem[] {
    const counts =
      new Map<number, number>();

    cases.forEach(
      (caseRecord) => {
        incrementCount(
          counts,

          caseRecord
            .caseStatusId,
        );
      },
    );

    return createBreakdownItems(
      counts,
      this.statusNameById,
      cases.length,
    );
  }

  private createGravityDistribution(
    cases:
      readonly CaseMasterRecord[],
  ): AnalyticsBreakdownItem[] {
    const counts =
      new Map<number, number>();

    cases.forEach(
      (caseRecord) => {
        incrementCount(
          counts,

          caseRecord
            .gravityOffenceId,
        );
      },
    );

    return createBreakdownItems(
      counts,
      this.gravityNameById,
      cases.length,
    );
  }

  private createModusOperandiRecurrence(
    caseIds:
      ReadonlySet<number>,

    totalCases: number,
  ): AnalyticsModusOperandiItem[] {
    interface ModusOperandiAccumulator {
      caseIds:
        Set<number>;

      confidenceTotal:
        number;

      confidenceCount:
        number;
    }

    const accumulators =
      new Map<
        number,
        ModusOperandiAccumulator
      >();

    caseIds.forEach(
      (caseId) => {
        const associations =
          this
            .modusOperandiByCaseId
            .get(caseId) ??
          [];

        associations.forEach(
          (association) => {
            if (
              association.confidence <
              MODUS_OPERANDI_CONFIDENCE_THRESHOLD
            ) {
              return;
            }

            const accumulator =
              accumulators.get(
                association
                  .modusOperandiId,
              ) ?? {
                caseIds:
                  new Set<number>(),

                confidenceTotal:
                  0,

                confidenceCount:
                  0,
              };

            accumulator
              .caseIds
              .add(caseId);

            accumulator
              .confidenceTotal +=
              association.confidence;

            accumulator
              .confidenceCount +=
              1;

            accumulators.set(
              association
                .modusOperandiId,

              accumulator,
            );
          },
        );
      },
    );

    return [
      ...accumulators.entries(),
    ]
      .map(
        ([
          modusOperandiId,
          accumulator,
        ]) => {
          const reference =
            this
              .modusOperandiById
              .get(
                modusOperandiId,
              );

          const caseCount =
            accumulator
              .caseIds
              .size;

          return {
            modusOperandiId,

            name:
              reference?.name ??
              `Modus operandi ${modusOperandiId}`,

            caseCount,

            percentage:
              percentage(
                caseCount,
                totalCases,
              ),

            averageConfidence:
              accumulator
                .confidenceCount >
              0
                ? Number(
                    (
                      accumulator
                        .confidenceTotal /
                      accumulator
                        .confidenceCount
                    ).toFixed(3),
                  )
                : 0,
          };
        },
      )
      .sort(
        (
          left,
          right,
        ) =>
          right.caseCount -
            left.caseCount ||

          right.averageConfidence -
            left.averageConfidence ||

          left.name.localeCompare(
            right.name,
          ),
      )
      .slice(
        0,
        12,
      );
  }
}

let analyticsServicePromise:
  Promise<AnalyticsService> |
  null = null;

export function getAnalyticsService(): Promise<AnalyticsService> {
  if (!analyticsServicePromise) {
    analyticsServicePromise =
      getCoreDataset().then(
        (dataset) =>
          new AnalyticsService(
            dataset,
          ),
      );
  }

  return analyticsServicePromise;
}

export function clearAnalyticsServiceCache(): void {
  analyticsServicePromise =
    null;
}
