export const DATASET_TABLES = [
  'State',
  'District',
  'UnitType',
  'Unit',
  'Rank',
  'Designation',
  'GenderMaster',
  'OccupationMaster',
  'ReligionMaster',
  'CasteMaster',
  'CaseCategory',
  'GravityOffence',
  'CaseStatusMaster',
  'CrimeHead',
  'CrimeSubHead',
  'Act',
  'Section',
  'CrimeHeadActSection',
  'ModusOperandi',
  'LocationMaster',
  'AreaSocioEconomic',
  'Employee',
  'Court',
  'Gang',
  'PersonEntity',
  'GangMembership',
  'DigitalIdentifier',
  'PersonIdentifierLink',
  'Vehicle',
  'PersonVehicleLink',
  'FinancialAccount',
  'PersonAccountLink',
  'EventCalendar',
  'FinancialTransaction',
  'KnownAssociation',
  'CaseMaster',
  'ComplainantDetails',
  'Victim',
  'Accused',
  'AccusedEntityLink',
  'CasePartyEntityLink',
  'ActSectionAssociation',
  'CaseMOAssociation',
  'ArrestSurrender',
  'ArrestSurrenderAccused',
  'ChargesheetDetails',
  'CaseTimeline',
  'CaseNarrative',
  'EvidenceItem',
  'CaseVehicleLink',
  'CaseIdentifierLink',
  'CaseFinancialLink',
] as const;

export type DatasetTableName =
  (typeof DATASET_TABLES)[number];

export interface DatasetImportGroup {
  readonly id: string;
  readonly description: string;
  readonly tables: readonly DatasetTableName[];
}

export const DATASET_IMPORT_GROUPS = [
  {
    id: 'police-geography',
    description:
      'Police organization, geography and personnel hierarchy.',
    tables: [
      'State',
      'District',
      'UnitType',
      'Unit',
      'Rank',
      'Designation',
      'Employee',
      'Court',
    ],
  },
  {
    id: 'lookups',
    description:
      'Shared demographic, category, gravity and status lookups.',
    tables: [
      'GenderMaster',
      'OccupationMaster',
      'ReligionMaster',
      'CasteMaster',
      'CaseCategory',
      'GravityOffence',
      'CaseStatusMaster',
    ],
  },
  {
    id: 'crime-and-legal',
    description:
      'Crime taxonomy, legal acts, sections and modus operandi.',
    tables: [
      'CrimeHead',
      'CrimeSubHead',
      'Act',
      'Section',
      'CrimeHeadActSection',
      'ModusOperandi',
    ],
  },
  {
    id: 'locations-and-entities',
    description:
      'Locations, area features and cross-case person entities.',
    tables: [
      'LocationMaster',
      'AreaSocioEconomic',
      'PersonEntity',
      'Gang',
      'GangMembership',
    ],
  },
  {
    id: 'case-facts',
    description:
      'Central FIR records and their immediate case parties.',
    tables: [
      'CaseMaster',
      'ComplainantDetails',
      'Victim',
      'Accused',
      'ActSectionAssociation',
    ],
  },
  {
    id: 'case-links-and-events',
    description:
      'Case linkage, custody, chargesheet, evidence and timeline data.',
    tables: [
      'AccusedEntityLink',
      'CasePartyEntityLink',
      'CaseMOAssociation',
      'ArrestSurrender',
      'ArrestSurrenderAccused',
      'ChargesheetDetails',
      'CaseTimeline',
      'CaseNarrative',
      'EvidenceItem',
    ],
  },
  {
    id: 'network-and-finance',
    description:
      'Identifiers, vehicles, accounts, transactions and associations.',
    tables: [
      'DigitalIdentifier',
      'PersonIdentifierLink',
      'Vehicle',
      'PersonVehicleLink',
      'FinancialAccount',
      'PersonAccountLink',
      'FinancialTransaction',
      'CaseFinancialLink',
      'CaseIdentifierLink',
      'CaseVehicleLink',
      'KnownAssociation',
    ],
  },
  {
    id: 'supporting-events',
    description:
      'Calendar and contextual event data.',
    tables: [
      'EventCalendar',
    ],
  },
] as const satisfies readonly DatasetImportGroup[];

export function isDatasetTableName(
  value: string,
): value is DatasetTableName {
  return (
    DATASET_TABLES as readonly string[]
  ).includes(value);
}

export function getTableCsvRelativePath(
  table: DatasetTableName,
): string {
  return `csv/${table}.csv`;
}