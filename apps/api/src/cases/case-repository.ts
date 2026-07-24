import type {
  CaseAccused,
  CaseArrestEvent,
  CaseChargesheet,
  CaseComplainant,
  CaseDashboardBreakdownItem,
  CaseDashboardSummary,
  CaseDetail,
  CaseEntityFinancialAccount,
  CaseEntityIdentifier,
  CaseEntitySourceLink,
  CaseEntityVehicle,
  CaseEvidenceItem,
  CaseFilterOptions,
  CaseFinancialTransaction,
  CaseGangMembership,
  CaseKnownAssociate,
  CaseLegalSection,
  CaseLinkedIdentifier,
  CaseLinkedVehicle,
  CaseListFilters,
  CaseListResponse,
  CaseLocation,
  CaseNarrative,
  CaseResolvedEntity,
  CaseSummary,
  CaseTimelineEvent,
  CaseVictim,
  LegalReference,
  NumericLookupReference,
  PaginationInput,
} from '@kavach/shared-types';

import type {
  LoadedCoreDataset,
} from '../data/dataset-loader';

import {
  getCoreDataset,
} from '../data/dataset-service';

import type {
  CaseMasterRecord,
} from '../data/case-master-record';

type RawTables =
  LoadedCoreDataset['rawTables'];

type AccusedRow =
  RawTables['Accused'][number];

type PersonEntityRow =
  RawTables['PersonEntity'][number];

type AccusedEntityLinkRow =
  RawTables['AccusedEntityLink'][number];

type CasePartyEntityLinkRow =
  RawTables['CasePartyEntityLink'][number];

type VictimRow =
  RawTables['Victim'][number];

type ComplainantRow =
  RawTables['ComplainantDetails'][number];

type LegalSectionRow =
  RawTables['ActSectionAssociation'][number];

type ArrestRow =
  RawTables['ArrestSurrender'][number];

type ArrestAccusedRow =
  RawTables['ArrestSurrenderAccused'][number];

type ChargesheetRow =
  RawTables['ChargesheetDetails'][number];

type TimelineRow =
  RawTables['CaseTimeline'][number];

type NarrativeRow =
  RawTables['CaseNarrative'][number];

type EvidenceRow =
  RawTables['EvidenceItem'][number];

type DigitalIdentifierRow =
  RawTables['DigitalIdentifier'][number];

type PersonIdentifierLinkRow =
  RawTables['PersonIdentifierLink'][number];

type VehicleRow =
  RawTables['Vehicle'][number];

type PersonVehicleLinkRow =
  RawTables['PersonVehicleLink'][number];

type FinancialAccountRow =
  RawTables['FinancialAccount'][number];

type PersonAccountLinkRow =
  RawTables['PersonAccountLink'][number];

type FinancialTransactionRow =
  RawTables['FinancialTransaction'][number];

type CaseIdentifierLinkRow =
  RawTables['CaseIdentifierLink'][number];

type CaseVehicleLinkRow =
  RawTables['CaseVehicleLink'][number];

type CaseFinancialLinkRow =
  RawTables['CaseFinancialLink'][number];

type KnownAssociationRow =
  RawTables['KnownAssociation'][number];

type GangRow =
  RawTables['Gang'][number];

type GangMembershipRow =
  RawTables['GangMembership'][number];

function toInteger(
  value: string,
  label: string,
): number {
  const cleaned = value.trim();

  if (!/^-?\d+$/.test(cleaned)) {
    throw new Error(
      `${label} must contain an integer.`,
    );
  }

  const parsed = Number(cleaned);

  if (!Number.isSafeInteger(parsed)) {
    throw new Error(
      `${label} exceeds the safe integer range.`,
    );
  }

  return parsed;
}

function toNullableInteger(
  value: string,
  label: string,
): number | null {
  if (!value.trim()) {
    return null;
  }

  return toInteger(value, label);
}

function toNullableDecimal(
  value: string,
  label: string,
): number | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${label} must contain a finite decimal value.`,
    );
  }

  return parsed;
}

function toRequiredDecimal(
  value: string,
  label: string,
): number {
  const parsed = toNullableDecimal(
    value,
    label,
  );

  if (parsed === null) {
    throw new Error(
      `${label} cannot be empty.`,
    );
  }

  return parsed;
}

function toConfidenceScore(
  value: string,
  label: string,
): number | null {
  const confidence = toNullableDecimal(
    value,
    label,
  );

  if (confidence === null) {
    return null;
  }

  if (
    confidence < 0 ||
    confidence > 1
  ) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }

  return confidence;
}

function toReliabilityScore(
  value: string,
  label: string,
): number | null {
  const score = toNullableDecimal(
    value,
    label,
  );

  if (score === null) {
    return null;
  }

  if (score < 0 || score > 1) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }

  return score;
}

function toNullableBoolean(
  value: string,
  label: string,
): boolean | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  const normalized =
    cleaned.toLowerCase();

  if (
    normalized === 'true' ||
    normalized === '1'
  ) {
    return true;
  }

  if (
    normalized === 'false' ||
    normalized === '0'
  ) {
    return false;
  }

  throw new Error(
    `${label} must be a valid boolean value.`,
  );
}

function toRequiredBoolean(
  value: string,
  label: string,
): boolean {
  const parsed = toNullableBoolean(
    value,
    label,
  );

  if (parsed === null) {
    throw new Error(
      `${label} cannot be empty.`,
    );
  }

  return parsed;
}

function toNullableString(
  value: string,
): string | null {
  const cleaned = value.trim();

  return cleaned || null;
}

function normalizeDateTime(
  value: string,
): string {
  return value.trim().replace(' ', 'T');
}

function createPreview(
  value: string | null,
  maximumLength = 180,
): string | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/\s+/g, ' ').trim();

  if (cleaned.length <= maximumLength) {
    return cleaned;
  }

  return `${cleaned.slice(0, maximumLength - 1)}…`;
}

function requireMapValue<Key, Value>(
  map: ReadonlyMap<Key, Value>,
  key: Key,
  label: string,
): Value {
  const value = map.get(key);

  if (value === undefined) {
    throw new Error(
      `Dataset relationship could not be resolved: ${label}.`,
    );
  }

  return value;
}

function buildNumericLookupMap<
  Row extends Record<string, string>,
>(
  rows: readonly Row[],
  idColumn: keyof Row & string,
  nameColumn: keyof Row & string,
  tableName: string,
): Map<number, NumericLookupReference> {
  const map =
    new Map<number, NumericLookupReference>();

  rows.forEach((row) => {
    const id = toInteger(
      row[idColumn]!,
      `${tableName}.${idColumn}`,
    );

    const name = row[nameColumn]!.trim();

    if (!name) {
      throw new Error(
        `${tableName}.${nameColumn} cannot be empty.`,
      );
    }

    map.set(id, {
      id,
      name,
    });
  });

  return map;
}

function buildNumericRowMap<
  Row extends Record<string, string>,
>(
  rows: readonly Row[],
  idColumn: keyof Row & string,
  tableName: string,
): Map<number, Row> {
  const map = new Map<number, Row>();

  rows.forEach((row) => {
    const id = toInteger(
      row[idColumn]!,
      `${tableName}.${idColumn}`,
    );

    map.set(id, row);
  });

  return map;
}

function groupRowsByInteger<
  Row extends Record<string, string>,
>(
  rows: readonly Row[],
  column: keyof Row & string,
  tableName: string,
): Map<number, Row[]> {
  const groups = new Map<number, Row[]>();

  rows.forEach((row) => {
    const id = toInteger(
      row[column]!,
      `${tableName}.${column}`,
    );

    const existing = groups.get(id);

    if (existing) {
      existing.push(row);
    } else {
      groups.set(id, [row]);
    }
  });

  return groups;
}

function sortFilterOptions<
  Option extends {
    id: number;
    name: string;
  },
>(
  options: Iterable<Option>,
): Option[] {
  return [...options].sort(
    (left, right) =>
      left.name.localeCompare(
        right.name,
        'en-IN',
      ) ||
      left.id - right.id,
  );
}

interface LookupCount {
  id: number;
  name: string;
  count: number;
}

function incrementLookupCount(
  counts: Map<number, LookupCount>,
  lookup: NumericLookupReference,
): void {
  const existing = counts.get(lookup.id);

  if (existing) {
    existing.count += 1;
    return;
  }

  counts.set(lookup.id, {
    id: lookup.id,
    name: lookup.name,
    count: 1,
  });
}

function createBreakdown(
  counts: ReadonlyMap<number, LookupCount>,
  totalCases: number,
  limit?: number,
): CaseDashboardBreakdownItem[] {
  const sorted = [...counts.values()].sort(
    (left, right) =>
      right.count - left.count ||
      left.name.localeCompare(
        right.name,
        'en-IN',
      ) ||
      left.id - right.id,
  );

  const selected =
    limit === undefined
      ? sorted
      : sorted.slice(0, limit);

  return selected.map((item) => ({
    id: item.id,
    name: item.name,
    count: item.count,

    percentage:
      totalCases === 0
        ? 0
        : Number(
            (
              (item.count / totalCases) *
              100
            ).toFixed(1),
          ),
  }));
}

export class CaseRepository {
  private readonly caseRecordsById =
    new Map<number, CaseMasterRecord>();

  private readonly summariesById =
    new Map<number, CaseSummary>();

  private readonly sortedSummaries:
    readonly CaseSummary[];

  private readonly categoryLookup;
  private readonly gravityLookup;
  private readonly statusLookup;

  private readonly crimeHeadLookup;
  private readonly crimeSubHeadLookup;

  private readonly unitLookup;
  private readonly districtLookup;
  private readonly stateLookup;
  private readonly courtLookup;
  private readonly employeeLookup;

  private readonly genderLookup;
  private readonly occupationLookup;

  private readonly unitRows;
  private readonly locationRows;
  private readonly personEntityRows;
  private readonly digitalIdentifierRows;
  private readonly vehicleRows;
  private readonly financialAccountRows;
  private readonly financialTransactionRows;
  private readonly gangRows;

  private readonly actLookup =
    new Map<string, LegalReference>();

  private readonly sectionLookup =
    new Map<string, LegalReference>();

  private readonly accusedByCase;
  private readonly victimsByCase;
  private readonly complainantsByCase;

  private readonly accusedEntityLinksByAccused;
  private readonly casePartyEntityLinksByCase;
  private readonly legalSectionsByCase;
  private readonly arrestsByCase;
  private readonly chargesheetsByCase;
  private readonly accusedByArrest;

  private readonly timelineByCase;
  private readonly narrativesByCase;
  private readonly evidenceByCase;

  private readonly identifierLinksByEntity;
  private readonly vehicleLinksByEntity;
  private readonly accountLinksByEntity;

  private readonly caseIdentifierLinksByCase;
  private readonly caseVehicleLinksByCase;
  private readonly caseFinancialLinksByCase;

  private readonly associationsByEntity;
  private readonly gangMembershipsByEntity;

  constructor(
    private readonly dataset: LoadedCoreDataset,
  ) {
    const tables = dataset.rawTables;

    this.categoryLookup = buildNumericLookupMap(
      tables.CaseCategory,
      'CaseCategoryID',
      'LookupValue',
      'CaseCategory',
    );

    this.gravityLookup = buildNumericLookupMap(
      tables.GravityOffence,
      'GravityOffenceID',
      'LookupValue',
      'GravityOffence',
    );

    this.statusLookup = buildNumericLookupMap(
      tables.CaseStatusMaster,
      'CaseStatusID',
      'CaseStatusName',
      'CaseStatusMaster',
    );

    this.crimeHeadLookup = buildNumericLookupMap(
      tables.CrimeHead,
      'CrimeHeadID',
      'CrimeGroupName',
      'CrimeHead',
    );

    this.crimeSubHeadLookup =
      buildNumericLookupMap(
        tables.CrimeSubHead,
        'CrimeSubHeadID',
        'CrimeHeadName',
        'CrimeSubHead',
      );

    this.unitLookup = buildNumericLookupMap(
      tables.Unit,
      'UnitID',
      'UnitName',
      'Unit',
    );

    this.districtLookup = buildNumericLookupMap(
      tables.District,
      'DistrictID',
      'DistrictName',
      'District',
    );

    this.stateLookup = buildNumericLookupMap(
      tables.State,
      'StateID',
      'StateName',
      'State',
    );

    this.courtLookup = buildNumericLookupMap(
      tables.Court,
      'CourtID',
      'CourtName',
      'Court',
    );

    this.employeeLookup = buildNumericLookupMap(
      tables.Employee,
      'EmployeeID',
      'FirstName',
      'Employee',
    );

    this.genderLookup = buildNumericLookupMap(
      tables.GenderMaster,
      'GenderID',
      'GenderName',
      'GenderMaster',
    );

    this.occupationLookup =
      buildNumericLookupMap(
        tables.OccupationMaster,
        'OccupationID',
        'OccupationName',
        'OccupationMaster',
      );

    this.unitRows = buildNumericRowMap(
      tables.Unit,
      'UnitID',
      'Unit',
    );

    this.locationRows = buildNumericRowMap(
      tables.LocationMaster,
      'LocationID',
      'LocationMaster',
    );

    this.personEntityRows =
      buildNumericRowMap(
        tables.PersonEntity,
        'EntityID',
        'PersonEntity',
      );

    this.digitalIdentifierRows =
      buildNumericRowMap(
        tables.DigitalIdentifier,
        'IdentifierID',
        'DigitalIdentifier',
      );

    this.vehicleRows =
      buildNumericRowMap(
        tables.Vehicle,
        'VehicleID',
        'Vehicle',
      );

    this.financialAccountRows =
      buildNumericRowMap(
        tables.FinancialAccount,
        'AccountID',
        'FinancialAccount',
      );

    this.financialTransactionRows =
      buildNumericRowMap(
        tables.FinancialTransaction,
        'TransactionID',
        'FinancialTransaction',
      );

    this.gangRows =
      buildNumericRowMap(
        tables.Gang,
        'GangID',
        'Gang',
      );

    tables.Act.forEach((row) => {
      this.actLookup.set(row.ActCode, {
        code: row.ActCode,
        name: row.ActDescription,
      });
    });

    tables.Section.forEach((row) => {
      this.sectionLookup.set(
        this.sectionKey(
          row.ActCode,
          row.SectionCode,
        ),
        {
          code: row.SectionCode,
          name: row.SectionDescription,
        },
      );
    });

    this.accusedByCase = groupRowsByInteger(
      tables.Accused,
      'CaseMasterID',
      'Accused',
    );

    this.victimsByCase = groupRowsByInteger(
      tables.Victim,
      'CaseMasterID',
      'Victim',
    );

    this.complainantsByCase =
      groupRowsByInteger(
        tables.ComplainantDetails,
        'CaseMasterID',
        'ComplainantDetails',
      );

    this.accusedEntityLinksByAccused =
      groupRowsByInteger(
        tables.AccusedEntityLink,
        'AccusedMasterID',
        'AccusedEntityLink',
      );

    this.casePartyEntityLinksByCase =
      groupRowsByInteger(
        tables.CasePartyEntityLink,
        'CaseMasterID',
        'CasePartyEntityLink',
      );

    this.legalSectionsByCase =
      groupRowsByInteger(
        tables.ActSectionAssociation,
        'CaseMasterID',
        'ActSectionAssociation',
      );

    this.arrestsByCase = groupRowsByInteger(
      tables.ArrestSurrender,
      'CaseMasterID',
      'ArrestSurrender',
    );

    this.chargesheetsByCase =
      groupRowsByInteger(
        tables.ChargesheetDetails,
        'CaseMasterID',
        'ChargesheetDetails',
      );

    this.timelineByCase =
      groupRowsByInteger(
        tables.CaseTimeline,
        'CaseMasterID',
        'CaseTimeline',
      );

    this.narrativesByCase =
      groupRowsByInteger(
        tables.CaseNarrative,
        'CaseMasterID',
        'CaseNarrative',
      );

    this.evidenceByCase =
      groupRowsByInteger(
        tables.EvidenceItem,
        'CaseMasterID',
        'EvidenceItem',
      );

    this.identifierLinksByEntity =
      groupRowsByInteger(
        tables.PersonIdentifierLink,
        'EntityID',
        'PersonIdentifierLink',
      );

    this.vehicleLinksByEntity =
      groupRowsByInteger(
        tables.PersonVehicleLink,
        'EntityID',
        'PersonVehicleLink',
      );

    this.accountLinksByEntity =
      groupRowsByInteger(
        tables.PersonAccountLink,
        'EntityID',
        'PersonAccountLink',
      );

    this.caseIdentifierLinksByCase =
      groupRowsByInteger(
        tables.CaseIdentifierLink,
        'CaseMasterID',
        'CaseIdentifierLink',
      );

    this.caseVehicleLinksByCase =
      groupRowsByInteger(
        tables.CaseVehicleLink,
        'CaseMasterID',
        'CaseVehicleLink',
      );

    this.caseFinancialLinksByCase =
      groupRowsByInteger(
        tables.CaseFinancialLink,
        'CaseMasterID',
        'CaseFinancialLink',
      );

    this.gangMembershipsByEntity =
      groupRowsByInteger(
        tables.GangMembership,
        'EntityID',
        'GangMembership',
      );

    this.associationsByEntity =
      new Map<number, KnownAssociationRow[]>();

    tables.KnownAssociation.forEach(
      (row: KnownAssociationRow) => {
        const firstEntityId = toInteger(
          row.EntityID1,
          'KnownAssociation.EntityID1',
        );

        const secondEntityId = toInteger(
          row.EntityID2,
          'KnownAssociation.EntityID2',
        );

        const firstRows =
          this.associationsByEntity.get(
            firstEntityId,
          ) ?? [];

        firstRows.push(row);

        this.associationsByEntity.set(
          firstEntityId,
          firstRows,
        );

        const secondRows =
          this.associationsByEntity.get(
            secondEntityId,
          ) ?? [];

        secondRows.push(row);

        this.associationsByEntity.set(
          secondEntityId,
          secondRows,
        );
      },
    );

    this.accusedByArrest =
      groupRowsByInteger(
        tables.ArrestSurrenderAccused,
        'ArrestSurrenderID',
        'ArrestSurrenderAccused',
      );

    dataset.cases.forEach((record) => {
      this.caseRecordsById.set(
        record.caseMasterId,
        record,
      );

      this.summariesById.set(
        record.caseMasterId,
        this.createCaseSummary(record),
      );
    });

    this.sortedSummaries = [
      ...this.summariesById.values(),
    ].sort((left, right) => {
      const dateComparison =
        right.registeredDate.localeCompare(
          left.registeredDate,
        );

      if (dateComparison !== 0) {
        return dateComparison;
      }

      return right.caseId - left.caseId;
    });
  }

  public getDashboardSummary(): CaseDashboardSummary {
    const totalCases =
      this.sortedSummaries.length;

    const statusCounts =
      new Map<number, LookupCount>();

    const gravityCounts =
      new Map<number, LookupCount>();

    const districtCounts =
      new Map<number, LookupCount>();

    const crimeHeadCounts =
      new Map<number, LookupCount>();

    let casesWithArrestEvents = 0;
    let casesWithChargesheets = 0;

    this.sortedSummaries.forEach(
      (caseSummary) => {
        incrementLookupCount(
          statusCounts,
          caseSummary.status,
        );

        incrementLookupCount(
          gravityCounts,
          caseSummary.gravity,
        );

        incrementLookupCount(
          districtCounts,
          caseSummary.district,
        );

        incrementLookupCount(
          crimeHeadCounts,
          caseSummary.majorCrimeHead,
        );

        if (
          (
            this.arrestsByCase.get(
              caseSummary.caseId,
            ) ?? []
          ).length > 0
        ) {
          casesWithArrestEvents += 1;
        }

        if (
          (
            this.chargesheetsByCase.get(
              caseSummary.caseId,
            ) ?? []
          ).length > 0
        ) {
          casesWithChargesheets += 1;
        }
      },
    );

    const latestCase =
      this.sortedSummaries[0];

    const earliestCase =
      this.sortedSummaries[
        this.sortedSummaries.length - 1
      ];

    return {
      totalCases,

      dateCoverage: {
        from:
          earliestCase?.registeredDate ??
          null,

        to:
          latestCase?.registeredDate ??
          null,
      },

      casesWithArrestEvents,
      casesWithChargesheets,

      statusBreakdown: createBreakdown(
        statusCounts,
        totalCases,
      ),

      gravityBreakdown: createBreakdown(
        gravityCounts,
        totalCases,
      ),

      topDistricts: createBreakdown(
        districtCounts,
        totalCases,
        5,
      ),

      topCrimeHeads: createBreakdown(
        crimeHeadCounts,
        totalCases,
        5,
      ),
    };
  }

  public getFilterOptions(): CaseFilterOptions {
    const districts =
      new Map<
        number,
        CaseFilterOptions['districts'][number]
      >();

    const policeStations =
      new Map<
        number,
        CaseFilterOptions['policeStations'][number]
      >();

    const gravities =
      new Map<
        number,
        CaseFilterOptions['gravities'][number]
      >();

    const statuses =
      new Map<
        number,
        CaseFilterOptions['statuses'][number]
      >();

    const majorCrimeHeads =
      new Map<
        number,
        CaseFilterOptions['majorCrimeHeads'][number]
      >();

    const minorCrimeHeads =
      new Map<
        number,
        CaseFilterOptions['minorCrimeHeads'][number]
      >();

    this.sortedSummaries.forEach(
      (caseSummary) => {
        districts.set(
          caseSummary.district.id,
          caseSummary.district,
        );

        policeStations.set(
          caseSummary.policeStation.id,
          {
            ...caseSummary.policeStation,
            districtId:
              caseSummary.district.id,
          },
        );

        gravities.set(
          caseSummary.gravity.id,
          caseSummary.gravity,
        );

        statuses.set(
          caseSummary.status.id,
          caseSummary.status,
        );

        majorCrimeHeads.set(
          caseSummary.majorCrimeHead.id,
          caseSummary.majorCrimeHead,
        );

        minorCrimeHeads.set(
          caseSummary.minorCrimeHead.id,
          {
            ...caseSummary.minorCrimeHead,
            majorCrimeHeadId:
              caseSummary.majorCrimeHead.id,
          },
        );
      },
    );

    return {
      districts: sortFilterOptions(
        districts.values(),
      ),

      policeStations: sortFilterOptions(
        policeStations.values(),
      ),

      gravities: sortFilterOptions(
        gravities.values(),
      ),

      statuses: sortFilterOptions(
        statuses.values(),
      ),

      majorCrimeHeads: sortFilterOptions(
        majorCrimeHeads.values(),
      ),

      minorCrimeHeads: sortFilterOptions(
        minorCrimeHeads.values(),
      ),
    };
  }

  public findCases(
    filters: CaseListFilters,
    pagination: PaginationInput,
  ): CaseListResponse {
    const searchTerm =
      filters.search?.trim().toLowerCase();

    const filtered = this.sortedSummaries.filter(
      (caseSummary) => {
        if (
          filters.districtId !== undefined &&
          caseSummary.district.id !==
            filters.districtId
        ) {
          return false;
        }

        if (
          filters.policeStationId !== undefined &&
          caseSummary.policeStation.id !==
            filters.policeStationId
        ) {
          return false;
        }

        if (
          filters.categoryId !== undefined &&
          caseSummary.category.id !==
            filters.categoryId
        ) {
          return false;
        }

        if (
          filters.gravityId !== undefined &&
          caseSummary.gravity.id !==
            filters.gravityId
        ) {
          return false;
        }

        if (
          filters.statusId !== undefined &&
          caseSummary.status.id !==
            filters.statusId
        ) {
          return false;
        }

        if (
          filters.majorCrimeHeadId !==
            undefined &&
          caseSummary.majorCrimeHead.id !==
            filters.majorCrimeHeadId
        ) {
          return false;
        }

        if (
          filters.minorCrimeHeadId !==
            undefined &&
          caseSummary.minorCrimeHead.id !==
            filters.minorCrimeHeadId
        ) {
          return false;
        }

        if (
          filters.registeredFrom &&
          caseSummary.registeredDate <
            filters.registeredFrom
        ) {
          return false;
        }

        if (
          filters.registeredTo &&
          caseSummary.registeredDate >
            filters.registeredTo
        ) {
          return false;
        }

        if (searchTerm) {
          const searchableText = [
            caseSummary.crimeNumber,
            caseSummary.caseNumber,
            caseSummary.majorCrimeHead.name,
            caseSummary.minorCrimeHead.name,
            caseSummary.policeStation.name,
            caseSummary.district.name,
            caseSummary.location?.locationName,
            caseSummary.briefFactsPreview,
          ]
            .filter(
              (value): value is string =>
                Boolean(value),
            )
            .join(' ')
            .toLowerCase();

          if (!searchableText.includes(searchTerm)) {
            return false;
          }
        }

        return true;
      },
    );

    const totalItems = filtered.length;

    const totalPages =
      totalItems === 0
        ? 0
        : Math.ceil(
            totalItems / pagination.pageSize,
          );

    const startIndex =
      (pagination.page - 1) *
      pagination.pageSize;

    return {
      items: filtered.slice(
        startIndex,
        startIndex + pagination.pageSize,
      ),

      pagination: {
        page: pagination.page,
        pageSize: pagination.pageSize,
        totalItems,
        totalPages,
      },
    };
  }

  public findCaseById(
    caseId: number,
  ): CaseDetail | null {
    const record =
      this.caseRecordsById.get(caseId);

    const summary =
      this.summariesById.get(caseId);

    if (!record || !summary) {
      return null;
    }

    return {
      ...summary,

      registeringOfficer: requireMapValue(
        this.employeeLookup,
        record.policePersonId,
        `Employee ${record.policePersonId}`,
      ),

      briefFacts: record.briefFacts,

      complainants:
        this.createComplainants(caseId),

      victims:
        this.createVictims(caseId),

      accused:
        this.createAccused(caseId),

      resolvedEntities:
        this.createResolvedEntities(caseId),

      caseIdentifiers:
        this.createCaseIdentifiers(caseId),

      caseVehicles:
        this.createCaseVehicles(caseId),

      caseFinancialTransactions:
        this.createCaseFinancialTransactions(
          caseId,
        ),

      legalSections:
        this.createLegalSections(caseId),

      arrestEvents:
        this.createArrestEvents(caseId),

      chargesheets:
        this.createChargesheets(caseId),

      timeline:
        this.createTimeline(caseId),

      narratives:
        this.createNarratives(caseId),

      evidenceItems:
        this.createEvidenceItems(caseId),
    };
  }

  private createCaseSummary(
    record: CaseMasterRecord,
  ): CaseSummary {
    const unitRow = requireMapValue(
      this.unitRows,
      record.policeStationId,
      `Unit ${record.policeStationId}`,
    );

    const districtId = toInteger(
      unitRow.DistrictID,
      'Unit.DistrictID',
    );

    const stateId = toInteger(
      unitRow.StateID,
      'Unit.StateID',
    );

    const court =
      record.courtId === null
        ? null
        : requireMapValue(
            this.courtLookup,
            record.courtId,
            `Court ${record.courtId}`,
          );

    return {
      caseId: record.caseMasterId,

      crimeNumber: record.crimeNumber,
      caseNumber: record.caseNumber,

      registeredDate:
        record.crimeRegisteredDate,

      incidentFrom:
        record.incidentFromDate,

      incidentTo:
        record.incidentToDate,

      informationReceivedAt:
        record.informationReceivedDate,

      category: requireMapValue(
        this.categoryLookup,
        record.caseCategoryId,
        `CaseCategory ${record.caseCategoryId}`,
      ),

      gravity: requireMapValue(
        this.gravityLookup,
        record.gravityOffenceId,
        `GravityOffence ${record.gravityOffenceId}`,
      ),

      majorCrimeHead: requireMapValue(
        this.crimeHeadLookup,
        record.crimeMajorHeadId,
        `CrimeHead ${record.crimeMajorHeadId}`,
      ),

      minorCrimeHead: requireMapValue(
        this.crimeSubHeadLookup,
        record.crimeMinorHeadId,
        `CrimeSubHead ${record.crimeMinorHeadId}`,
      ),

      status: requireMapValue(
        this.statusLookup,
        record.caseStatusId,
        `CaseStatus ${record.caseStatusId}`,
      ),

      policeStation: requireMapValue(
        this.unitLookup,
        record.policeStationId,
        `Unit ${record.policeStationId}`,
      ),

      district: requireMapValue(
        this.districtLookup,
        districtId,
        `District ${districtId}`,
      ),

      state: requireMapValue(
        this.stateLookup,
        stateId,
        `State ${stateId}`,
      ),

      court,

      location: this.createLocation(record),

      briefFactsPreview:
        createPreview(record.briefFacts),
    };
  }

  private createLocation(
    record: CaseMasterRecord,
  ): CaseLocation {
    const row = requireMapValue(
      this.locationRows,
      record.locationId,
      `Location ${record.locationId}`,
    );

    return {
      locationId: record.locationId,
      locationName:
        toNullableString(row.LocationName),
      zoneType:
        toNullableString(row.ZoneType),
      latitude: record.latitude,
      longitude: record.longitude,
    };
  }

  private createComplainants(
    caseId: number,
  ): CaseComplainant[] {
    const rows =
      this.complainantsByCase.get(caseId) ?? [];

    return rows.map((row: ComplainantRow) => ({
      id: toInteger(
        row.ComplainantID,
        'ComplainantDetails.ComplainantID',
      ),

      name: row.ComplainantName,

      age: toNullableInteger(
        row.AgeYear,
        'ComplainantDetails.AgeYear',
      ),

      gender: this.optionalLookup(
        this.genderLookup,
        row.GenderID,
        'ComplainantDetails.GenderID',
      ),

      occupation: this.optionalLookup(
        this.occupationLookup,
        row.OccupationID,
        'ComplainantDetails.OccupationID',
      ),
    }));
  }

  private createVictims(
    caseId: number,
  ): CaseVictim[] {
    const rows =
      this.victimsByCase.get(caseId) ?? [];

    return rows.map((row: VictimRow) => ({
      id: toInteger(
        row.VictimMasterID,
        'Victim.VictimMasterID',
      ),

      name: row.VictimName,

      age: toNullableInteger(
        row.AgeYear,
        'Victim.AgeYear',
      ),

      gender: this.optionalLookup(
        this.genderLookup,
        row.GenderID,
        'Victim.GenderID',
      ),

      isPolicePersonnel: toNullableBoolean(
        row.VictimPolice,
        'Victim.VictimPolice',
      ),
    }));
  }

  private findAccusedEntityLink(
    accusedId: number,
  ): AccusedEntityLinkRow | null {
    const links =
      this.accusedEntityLinksByAccused.get(
        accusedId,
      ) ?? [];

    if (links.length === 0) {
      return null;
    }

    return [...links].sort(
      (left, right) => {
        const leftConfidence =
          toConfidenceScore(
            left.Confidence,
            'AccusedEntityLink.Confidence',
          ) ?? -1;

        const rightConfidence =
          toConfidenceScore(
            right.Confidence,
            'AccusedEntityLink.Confidence',
          ) ?? -1;

        return (
          rightConfidence -
          leftConfidence
        );
      },
    )[0] ?? null;
  }

  private createEntitySourceLink(
    row: CasePartyEntityLinkRow,
  ): CaseEntitySourceLink {
    return {
      role: row.Role.trim(),

      sourceTable:
        row.SourceTable.trim(),

      sourceRecordId: toInteger(
        row.SourceRecordID,
        'CasePartyEntityLink.SourceRecordID',
      ),

      confidence: toConfidenceScore(
        row.Confidence,
        'CasePartyEntityLink.Confidence',
      ),
    };
  }

  private createAccused(
    caseId: number,
  ): CaseAccused[] {
    const rows =
      this.accusedByCase.get(caseId) ?? [];

    return rows.map((row: AccusedRow) => {
      const accusedId = toInteger(
        row.AccusedMasterID,
        'Accused.AccusedMasterID',
      );

      const entityLink =
        this.findAccusedEntityLink(
          accusedId,
        );

      return {
        id: accusedId,

        name: row.AccusedName,

        age: toNullableInteger(
          row.AgeYear,
          'Accused.AgeYear',
        ),

        gender: this.optionalLookup(
          this.genderLookup,
          row.GenderID,
          'Accused.GenderID',
        ),

        personCode:
          toNullableString(row.PersonID),

        resolvedEntityId:
          entityLink === null
            ? null
            : toInteger(
                entityLink.EntityID,
                'AccusedEntityLink.EntityID',
              ),
      };
    });
  }

  private createEntityIdentifiers(
    entityId: number,
    directlyLinkedIds: ReadonlySet<number>,
  ): CaseEntityIdentifier[] {
    const rows =
      this.identifierLinksByEntity.get(
        entityId,
      ) ?? [];

    return rows.map(
      (link: PersonIdentifierLinkRow) => {
        const identifierId = toInteger(
          link.IdentifierID,
          'PersonIdentifierLink.IdentifierID',
        );

        const identifier =
          requireMapValue(
            this.digitalIdentifierRows,
            identifierId,
            `DigitalIdentifier ${identifierId}`,
          ) as DigitalIdentifierRow;

        return {
          identifierId,

          identifierType:
            identifier.IdentifierType.trim(),

          identifierValue:
            identifier.IdentifierValue.trim(),

          firstObservedDate:
            toNullableString(
              identifier.FirstObservedDate,
            ),

          source:
            identifier.Source.trim(),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'PersonIdentifierLink.Confidence',
          ),

          directlyLinkedToCase:
            directlyLinkedIds.has(
              identifierId,
            ),
        };
      },
    );
  }

  private createEntityVehicles(
    entityId: number,
    directlyLinkedIds: ReadonlySet<number>,
  ): CaseEntityVehicle[] {
    const rows =
      this.vehicleLinksByEntity.get(
        entityId,
      ) ?? [];

    return rows.map(
      (link: PersonVehicleLinkRow) => {
        const vehicleId = toInteger(
          link.VehicleID,
          'PersonVehicleLink.VehicleID',
        );

        const vehicle =
          requireMapValue(
            this.vehicleRows,
            vehicleId,
            `Vehicle ${vehicleId}`,
          ) as VehicleRow;

        return {
          vehicleId,

          registrationNumber:
            vehicle.RegistrationNo.trim(),

          vehicleType:
            vehicle.VehicleType.trim(),

          modelYear: toNullableInteger(
            vehicle.ModelYear,
            'Vehicle.ModelYear',
          ),

          source:
            vehicle.Source.trim(),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'PersonVehicleLink.Confidence',
          ),

          directlyLinkedToCase:
            directlyLinkedIds.has(vehicleId),
        };
      },
    );
  }

  private createEntityAccounts(
    entityId: number,
  ): CaseEntityFinancialAccount[] {
    const rows =
      this.accountLinksByEntity.get(
        entityId,
      ) ?? [];

    return rows.map(
      (link: PersonAccountLinkRow) => {
        const accountId = toInteger(
          link.AccountID,
          'PersonAccountLink.AccountID',
        );

        const account =
          requireMapValue(
            this.financialAccountRows,
            accountId,
            `FinancialAccount ${accountId}`,
          ) as FinancialAccountRow;

        return {
          accountId,

          accountType:
            account.AccountType.trim(),

          maskedAccountNumber:
            account.MaskedAccountNo.trim(),

          institutionName:
            account.InstitutionName.trim(),

          openDate:
            toNullableString(
              account.OpenDate,
            ),

          status:
            account.Status.trim(),

          source:
            account.Source.trim(),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'PersonAccountLink.Confidence',
          ),
        };
      },
    );
  }

  private createKnownAssociates(
    entityId: number,
  ): CaseKnownAssociate[] {
    const rows =
      this.associationsByEntity.get(
        entityId,
      ) ?? [];

    return rows.map(
      (row: KnownAssociationRow) => {
        const firstEntityId = toInteger(
          row.EntityID1,
          'KnownAssociation.EntityID1',
        );

        const secondEntityId = toInteger(
          row.EntityID2,
          'KnownAssociation.EntityID2',
        );

        const associateId =
          firstEntityId === entityId
            ? secondEntityId
            : firstEntityId;

        const associate =
          requireMapValue(
            this.personEntityRows,
            associateId,
            `PersonEntity ${associateId}`,
          ) as PersonEntityRow;

        return {
          associationId: toInteger(
            row.AssociationID,
            'KnownAssociation.AssociationID',
          ),

          entityId: associateId,

          canonicalName:
            associate.CanonicalName.trim(),

          relationshipType:
            row.RelationshipType.trim(),

          observedCount: toInteger(
            row.ObservedCount,
            'KnownAssociation.ObservedCount',
          ),

          confidence: toConfidenceScore(
            row.Confidence,
            'KnownAssociation.Confidence',
          ),

          evidenceBasis:
            toNullableString(
              row.EvidenceBasis,
            ),
        };
      },
    );
  }

  private createGangMemberships(
    entityId: number,
  ): CaseGangMembership[] {
    const rows =
      this.gangMembershipsByEntity.get(
        entityId,
      ) ?? [];

    return rows.map(
      (membership: GangMembershipRow) => {
        const gangId = toInteger(
          membership.GangID,
          'GangMembership.GangID',
        );

        const gang =
          requireMapValue(
            this.gangRows,
            gangId,
            `Gang ${gangId}`,
          ) as GangRow;

        return {
          gangId,

          gangName:
            gang.GangName.trim(),

          primaryCrimeType:
            gang.PrimaryCrimeType.trim(),

          primaryLocationId:
            toNullableInteger(
              gang.PrimaryLocationID,
              'Gang.PrimaryLocationID',
            ),

          status:
            gang.Status.trim(),

          fromDate:
            toNullableString(
              membership.FromDate,
            ),

          role:
            membership.Role.trim(),

          confidence: toConfidenceScore(
            membership.Confidence,
            'GangMembership.Confidence',
          ),
        };
      },
    );
  }

  private createCaseIdentifiers(
    caseId: number,
  ): CaseLinkedIdentifier[] {
    const rows =
      this.caseIdentifierLinksByCase.get(
        caseId,
      ) ?? [];

    return rows.map(
      (link: CaseIdentifierLinkRow) => {
        const identifierId = toInteger(
          link.IdentifierID,
          'CaseIdentifierLink.IdentifierID',
        );

        const identifier =
          requireMapValue(
            this.digitalIdentifierRows,
            identifierId,
            `DigitalIdentifier ${identifierId}`,
          ) as DigitalIdentifierRow;

        return {
          identifierId,

          identifierType:
            identifier.IdentifierType.trim(),

          identifierValue:
            identifier.IdentifierValue.trim(),

          firstObservedDate:
            toNullableString(
              identifier.FirstObservedDate,
            ),

          source:
            identifier.Source.trim(),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'CaseIdentifierLink.Confidence',
          ),
        };
      },
    );
  }

  private createCaseVehicles(
    caseId: number,
  ): CaseLinkedVehicle[] {
    const rows =
      this.caseVehicleLinksByCase.get(
        caseId,
      ) ?? [];

    return rows.map(
      (link: CaseVehicleLinkRow) => {
        const vehicleId = toInteger(
          link.VehicleID,
          'CaseVehicleLink.VehicleID',
        );

        const vehicle =
          requireMapValue(
            this.vehicleRows,
            vehicleId,
            `Vehicle ${vehicleId}`,
          ) as VehicleRow;

        return {
          vehicleId,

          registrationNumber:
            vehicle.RegistrationNo.trim(),

          vehicleType:
            vehicle.VehicleType.trim(),

          modelYear: toNullableInteger(
            vehicle.ModelYear,
            'Vehicle.ModelYear',
          ),

          source:
            vehicle.Source.trim(),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'CaseVehicleLink.Confidence',
          ),
        };
      },
    );
  }

  private createCaseFinancialTransactions(
    caseId: number,
  ): CaseFinancialTransaction[] {
    const rows =
      this.caseFinancialLinksByCase.get(
        caseId,
      ) ?? [];

    return rows
      .map((link: CaseFinancialLinkRow) => {
        const transactionId = toInteger(
          link.TransactionID,
          'CaseFinancialLink.TransactionID',
        );

        const transaction =
          requireMapValue(
            this.financialTransactionRows,
            transactionId,
            `FinancialTransaction ${transactionId}`,
          ) as FinancialTransactionRow;

        return {
          transactionId,

          fromAccountId:
            toNullableInteger(
              transaction.FromAccountID,
              'FinancialTransaction.FromAccountID',
            ),

          toAccountId:
            toNullableInteger(
              transaction.ToAccountID,
              'FinancialTransaction.ToAccountID',
            ),

          transactionDateTime:
            normalizeDateTime(
              transaction.TransactionDateTime,
            ),

          amount: toRequiredDecimal(
            transaction.Amount,
            'FinancialTransaction.Amount',
          ),

          currency:
            transaction.Currency.trim(),

          channel:
            transaction.Channel.trim(),

          suspicious: toRequiredBoolean(
            transaction.SuspiciousFlag,
            'FinancialTransaction.SuspiciousFlag',
          ),

          riskScore: toConfidenceScore(
            transaction.RiskScore,
            'FinancialTransaction.RiskScore',
          ),

          narrative:
            toNullableString(
              transaction.Narrative,
            ),

          relationshipType:
            link.RelationshipType.trim(),

          confidence: toConfidenceScore(
            link.Confidence,
            'CaseFinancialLink.Confidence',
          ),
        };
      })
      .sort(
        (left, right) =>
          left.transactionDateTime.localeCompare(
            right.transactionDateTime,
          ) ||
          left.transactionId -
            right.transactionId,
      );
  }

  private createResolvedEntities(
    caseId: number,
  ): CaseResolvedEntity[] {
    const accusedRows =
      this.accusedByCase.get(caseId) ?? [];

    const casePartyLinks =
      this.casePartyEntityLinksByCase.get(
        caseId,
      ) ?? [];

    const directlyLinkedIdentifierIds =
      new Set(
        (
          this.caseIdentifierLinksByCase.get(
            caseId,
          ) ?? []
        ).map((row: CaseIdentifierLinkRow) =>
          toInteger(
            row.IdentifierID,
            'CaseIdentifierLink.IdentifierID',
          ),
        ),
      );

    const directlyLinkedVehicleIds =
      new Set(
        (
          this.caseVehicleLinksByCase.get(
            caseId,
          ) ?? []
        ).map((row: CaseVehicleLinkRow) =>
          toInteger(
            row.VehicleID,
            'CaseVehicleLink.VehicleID',
          ),
        ),
      );

    const accusedIdsByEntity =
      new Map<number, number[]>();

    const resolutionLinksByEntity =
      new Map<
        number,
        AccusedEntityLinkRow[]
      >();

    accusedRows.forEach(
      (accusedRow: AccusedRow) => {
        const accusedId = toInteger(
          accusedRow.AccusedMasterID,
          'Accused.AccusedMasterID',
        );

        const link =
          this.findAccusedEntityLink(
            accusedId,
          );

        if (!link) {
          return;
        }

        const entityId = toInteger(
          link.EntityID,
          'AccusedEntityLink.EntityID',
        );

        const accusedIds =
          accusedIdsByEntity.get(
            entityId,
          ) ?? [];

        accusedIds.push(accusedId);

        accusedIdsByEntity.set(
          entityId,
          accusedIds,
        );

        const resolutionLinks =
          resolutionLinksByEntity.get(
            entityId,
          ) ?? [];

        resolutionLinks.push(link);

        resolutionLinksByEntity.set(
          entityId,
          resolutionLinks,
        );
      },
    );

    const partyLinksByEntity =
      new Map<
        number,
        CasePartyEntityLinkRow[]
      >();

    casePartyLinks.forEach(
      (partyLink: CasePartyEntityLinkRow) => {
        const sourceTable =
          partyLink.SourceTable.trim();

        /*
         * EntityReference is heterogeneous:
         *
         * PersonEntity        -> numeric canonical entity ID
         * ComplainantDetails  -> values such as COMP-1
         * Victim              -> values such as VIC-1
         *
         * Only PersonEntity links belong in the canonical
         * resolved-entity collection.
         */
        if (sourceTable !== 'PersonEntity') {
          return;
        }

        const entityId = toInteger(
          partyLink.EntityReference,
          'CasePartyEntityLink.EntityReference',
        );

        const links =
          partyLinksByEntity.get(entityId) ?? [];

        links.push(partyLink);

        partyLinksByEntity.set(
          entityId,
          links,
        );
      },
    );

    const entityIds = new Set<number>([
      ...accusedIdsByEntity.keys(),
      ...partyLinksByEntity.keys(),
    ]);

    return [...entityIds]
      .map((entityId) => {
        const entityRow =
          requireMapValue(
            this.personEntityRows,
            entityId,
            `PersonEntity ${entityId}`,
          ) as PersonEntityRow;

        const resolutionLinks =
          resolutionLinksByEntity.get(
            entityId,
          ) ?? [];

        const strongestResolution =
          [...resolutionLinks].sort(
            (left, right) => {
              const leftConfidence =
                toConfidenceScore(
                  left.Confidence,
                  'AccusedEntityLink.Confidence',
                ) ?? -1;

              const rightConfidence =
                toConfidenceScore(
                  right.Confidence,
                  'AccusedEntityLink.Confidence',
                ) ?? -1;

              return (
                rightConfidence -
                leftConfidence
              );
            },
          )[0] ?? null;

        const partyLinks =
          partyLinksByEntity.get(
            entityId,
          ) ?? [];

        const roles = new Set<string>();

        if (
          (
            accusedIdsByEntity.get(
              entityId,
            ) ?? []
          ).length > 0
        ) {
          roles.add('ACCUSED');
        }

        partyLinks.forEach((link) => {
          const role = link.Role.trim();

          if (role) {
            roles.add(role);
          }
        });

        return {
          entityId,

          canonicalName:
            entityRow.CanonicalName.trim(),

          dateOfBirth:
            toNullableString(
              entityRow.DateOfBirth,
            ),

          gender: this.optionalLookup(
            this.genderLookup,
            entityRow.GenderID,
            'PersonEntity.GenderID',
          ),

          occupation: this.optionalLookup(
            this.occupationLookup,
            entityRow.OccupationID,
            'PersonEntity.OccupationID',
          ),

          homeLocationId:
            toNullableInteger(
              entityRow.HomeLocationID,
              'PersonEntity.HomeLocationID',
            ),

          dataOrigin:
            entityRow.DataOrigin.trim(),

          syntheticRepeatClass:
            toNullableString(
              entityRow.SyntheticRepeatClass,
            ),

          active: toRequiredBoolean(
            entityRow.Active,
            'PersonEntity.Active',
          ),

          resolutionStatus:
            strongestResolution
              ? toNullableString(
                  strongestResolution
                    .ResolutionStatus,
                )
              : null,

          resolutionConfidence:
            strongestResolution
              ? toConfidenceScore(
                  strongestResolution
                    .Confidence,
                  'AccusedEntityLink.Confidence',
                )
              : null,

          resolutionEvidence:
            strongestResolution
              ? toNullableString(
                  strongestResolution
                    .EvidenceBasis,
                )
              : null,

          accusedIds:
            accusedIdsByEntity.get(
              entityId,
            ) ?? [],

          roles: [...roles].sort(
            (left, right) =>
              left.localeCompare(
                right,
                'en-IN',
              ),
          ),

          sourceLinks: partyLinks.map(
            (link) =>
              this.createEntitySourceLink(
                link,
              ),
          ),

          identifiers:
            this.createEntityIdentifiers(
              entityId,
              directlyLinkedIdentifierIds,
            ),

          vehicles:
            this.createEntityVehicles(
              entityId,
              directlyLinkedVehicleIds,
            ),

          financialAccounts:
            this.createEntityAccounts(entityId),

          knownAssociates:
            this.createKnownAssociates(entityId),

          gangMemberships:
            this.createGangMemberships(entityId),
        };
      })
      .sort(
        (left, right) =>
          left.canonicalName.localeCompare(
            right.canonicalName,
            'en-IN',
          ) ||
          left.entityId - right.entityId,
      );
  }

  private createLegalSections(
    caseId: number,
  ): CaseLegalSection[] {
    const rows =
      this.legalSectionsByCase.get(caseId) ?? [];

    return rows
      .map((row: LegalSectionRow) => {
        const act = requireMapValue(
          this.actLookup,
          row.ActID,
          `Act ${row.ActID}`,
        );

        const section = requireMapValue(
          this.sectionLookup,
          this.sectionKey(
            row.ActID,
            row.SectionID,
          ),
          `Section ${row.ActID}/${row.SectionID}`,
        );

        return {
          act,
          section,

          actOrder: toNullableInteger(
            row.ActOrderID,
            'ActSectionAssociation.ActOrderID',
          ),

          sectionOrder: toNullableInteger(
            row.SectionOrderID,
            'ActSectionAssociation.SectionOrderID',
          ),
        };
      })
      .sort(
        (left, right) =>
          (left.actOrder ?? 0) -
            (right.actOrder ?? 0) ||
          (left.sectionOrder ?? 0) -
            (right.sectionOrder ?? 0),
      );
  }

  private createArrestEvents(
    caseId: number,
  ): CaseArrestEvent[] {
    const rows =
      this.arrestsByCase.get(caseId) ?? [];

    return rows.map((row: ArrestRow) => {
      const arrestId = toInteger(
        row.ArrestSurrenderID,
        'ArrestSurrender.ArrestSurrenderID',
      );

      const linkRows =
        this.accusedByArrest.get(arrestId) ?? [];

      const linkedAccusedIds = linkRows.map(
        (link: ArrestAccusedRow) =>
          toInteger(
            link.AccusedMasterID,
            'ArrestSurrenderAccused.AccusedMasterID',
          ),
      );

      const fallbackAccusedId =
        toNullableInteger(
          row.AccusedMasterID,
          'ArrestSurrender.AccusedMasterID',
        );

      const accusedIds = [
        ...new Set([
          ...linkedAccusedIds,
          ...(fallbackAccusedId === null
            ? []
            : [fallbackAccusedId]),
        ]),
      ];

      return {
        arrestSurrenderId: arrestId,

        eventTypeId: toInteger(
          row.ArrestSurrenderTypeID,
          'ArrestSurrender.ArrestSurrenderTypeID',
        ),

        eventDate: row.ArrestSurrenderDate,

        state: this.optionalLookup(
          this.stateLookup,
          row.ArrestSurrenderStateId,
          'ArrestSurrender.ArrestSurrenderStateId',
        ),

        district: this.optionalLookup(
          this.districtLookup,
          row.ArrestSurrenderDistrictId,
          'ArrestSurrender.ArrestSurrenderDistrictId',
        ),

        policeStation: this.optionalLookup(
          this.unitLookup,
          row.PoliceStationID,
          'ArrestSurrender.PoliceStationID',
        ),

        investigatingOfficer:
          this.optionalLookup(
            this.employeeLookup,
            row.IOID,
            'ArrestSurrender.IOID',
          ),

        court: this.optionalLookup(
          this.courtLookup,
          row.CourtID,
          'ArrestSurrender.CourtID',
        ),

        accusedIds,

        isAccused: toNullableBoolean(
          row.IsAccused,
          'ArrestSurrender.IsAccused',
        ),

        isComplainantAccused:
          toNullableBoolean(
            row.IsComplainantAccused,
            'ArrestSurrender.IsComplainantAccused',
          ),
      };
    });
  }

  private createChargesheets(
    caseId: number,
  ): CaseChargesheet[] {
    const rows =
      this.chargesheetsByCase.get(caseId) ?? [];

    return rows.map((row: ChargesheetRow) => ({
      chargesheetId: toInteger(
        row.CSID,
        'ChargesheetDetails.CSID',
      ),

      chargesheetDate:
        normalizeDateTime(row.csdate),

      reportCode: row.cstype,

      policeOfficer: this.optionalLookup(
        this.employeeLookup,
        row.PolicePersonID,
        'ChargesheetDetails.PolicePersonID',
      ),
    }));
  }

  private createTimeline(
    caseId: number,
  ): CaseTimelineEvent[] {
    const rows =
      this.timelineByCase.get(caseId) ?? [];

    return rows
      .map((row: TimelineRow) => ({
        timelineEventId: toInteger(
          row.TimelineEventID,
          'CaseTimeline.TimelineEventID',
        ),

        eventDateTime:
          normalizeDateTime(
            row.EventDateTime,
          ),

        eventType:
          row.EventType.trim(),

        description:
          row.EventDescription.trim(),

        actor: this.optionalLookup(
          this.employeeLookup,
          row.ActorEmployeeID,
          'CaseTimeline.ActorEmployeeID',
        ),

        sourceType:
          row.SourceType.trim(),
      }))
      .sort(
        (left, right) =>
          left.eventDateTime.localeCompare(
            right.eventDateTime,
          ) ||
          left.timelineEventId -
            right.timelineEventId,
      );
  }

  private createNarratives(
    caseId: number,
  ): CaseNarrative[] {
    const rows =
      this.narrativesByCase.get(caseId) ?? [];

    return rows
      .map((row: NarrativeRow) => ({
        languageCode:
          row.LanguageCode.trim(),

        narrativeText:
          row.NarrativeText.trim(),

        sourceType:
          row.SourceType.trim(),

        dataOrigin:
          row.DataOrigin.trim(),
      }))
      .sort(
        (left, right) =>
          left.languageCode.localeCompare(
            right.languageCode,
            'en-IN',
          ) ||
          left.sourceType.localeCompare(
            right.sourceType,
            'en-IN',
          ),
      );
  }

  private createEvidenceItems(
    caseId: number,
  ): CaseEvidenceItem[] {
    const rows =
      this.evidenceByCase.get(caseId) ?? [];

    return rows
      .map((row: EvidenceRow) => {
        const collectedDateTime =
          toNullableString(
            row.CollectedDateTime,
          );

        return {
          evidenceId: toInteger(
            row.EvidenceID,
            'EvidenceItem.EvidenceID',
          ),

          evidenceType:
            row.EvidenceType.trim(),

          description:
            row.Description.trim(),

          collectedDateTime:
            collectedDateTime === null
              ? null
              : normalizeDateTime(
                  collectedDateTime,
                ),

          reliabilityScore:
            toReliabilityScore(
              row.ReliabilityScore,
              'EvidenceItem.ReliabilityScore',
            ),

          dataOrigin:
            row.DataOrigin.trim(),
        };
      })
      .sort((left, right) => {
        if (
          left.collectedDateTime === null &&
          right.collectedDateTime === null
        ) {
          return (
            left.evidenceId -
            right.evidenceId
          );
        }

        if (left.collectedDateTime === null) {
          return 1;
        }

        if (right.collectedDateTime === null) {
          return -1;
        }

        return (
          left.collectedDateTime.localeCompare(
            right.collectedDateTime,
          ) ||
          left.evidenceId -
            right.evidenceId
        );
      });
  }

  private optionalLookup(
    map: ReadonlyMap<
      number,
      NumericLookupReference
    >,
    rawId: string,
    label: string,
  ): NumericLookupReference | null {
    const id = toNullableInteger(
      rawId,
      label,
    );

    if (id === null) {
      return null;
    }

    return requireMapValue(
      map,
      id,
      `${label}=${id}`,
    );
  }

  private sectionKey(
    actCode: string,
    sectionCode: string,
  ): string {
    return `${actCode}\u001f${sectionCode}`;
  }
}

let repositoryPromise:
  Promise<CaseRepository> | undefined;

export function getCaseRepository(): Promise<CaseRepository> {
  repositoryPromise ??=
    getCoreDataset().then(
      (dataset) =>
        new CaseRepository(dataset),
    );

  return repositoryPromise;
}