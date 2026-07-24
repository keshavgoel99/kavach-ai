/**
 * Exact headers from the supplied synthetic CSV dataset.
 *
 * Raw CSV values remain strings at this layer.
 * Empty database values are represented by an empty string.
 */
export const CORE_TABLE_COLUMNS = {
  State: [
    'StateID',
    'StateName',
    'NationalityID',
    'Active',
  ],

  District: [
    'DistrictID',
    'DistrictName',
    'StateID',
    'Active',
  ],

  Unit: [
    'UnitID',
    'UnitName',
    'TypeID',
    'ParentUnit',
    'NationalityID',
    'StateID',
    'DistrictID',
    'Active',
  ],

  GenderMaster: [
    'GenderID',
    'GenderName',
    'Active',
  ],

  OccupationMaster: [
    'OccupationID',
    'OccupationName',
  ],

  ReligionMaster: [
    'ReligionID',
    'ReligionName',
  ],

  CasteMaster: [
    'caste_master_id',
    'caste_master_name',
  ],

  CaseCategory: [
    'CaseCategoryID',
    'LookupValue',
    'CategoryCode',
  ],

  GravityOffence: [
    'GravityOffenceID',
    'LookupValue',
  ],

  CaseStatusMaster: [
    'CaseStatusID',
    'CaseStatusName',
  ],

  CrimeHead: [
    'CrimeHeadID',
    'CrimeGroupName',
    'Active',
  ],

  CrimeSubHead: [
    'CrimeSubHeadID',
    'CrimeHeadID',
    'CrimeHeadName',
    'SeqID',
  ],

  Act: [
    'ActCode',
    'ActDescription',
    'ShortName',
    'Active',
  ],

  Section: [
    'ActCode',
    'SectionCode',
    'SectionDescription',
    'Active',
  ],

  LocationMaster: [
    'LocationID',
    'DistrictID',
    'PoliceStationID',
    'LocationName',
    'ZoneType',
    'Latitude',
    'Longitude',
    'Active',
  ],

  Employee: [
    'EmployeeID',
    'DistrictID',
    'UnitID',
    'RankID',
    'DesignationID',
    'KGID',
    'FirstName',
    'EmployeeDOB',
    'GenderID',
    'BloodGroupID',
    'PhysicallyChallenged',
    'AppointmentDate',
  ],

  Court: [
    'CourtID',
    'CourtName',
    'DistrictID',
    'StateID',
    'Active',
  ],

  CaseMaster: [
    'CaseMasterID',
    'CrimeNo',
    'CaseNo',
    'CrimeRegisteredDate',
    'PolicePersonID',
    'PoliceStationID',
    'CaseCategoryID',
    'GravityOffenceID',
    'CrimeMajorHeadID',
    'CrimeMinorHeadID',
    'CaseStatusID',
    'CourtID',
    'IncidentFromDate',
    'IncidentToDate',
    'InfoReceivedPSDate',
    'latitude',
    'longitude',
    'BriefFacts',
    'LocationID',
    'SyntheticFlag',
  ],

  ComplainantDetails: [
    'ComplainantID',
    'CaseMasterID',
    'ComplainantName',
    'AgeYear',
    'OccupationID',
    'ReligionID',
    'CasteID',
    'GenderID',
  ],

  Victim: [
    'VictimMasterID',
    'CaseMasterID',
    'VictimName',
    'AgeYear',
    'GenderID',
    'VictimPolice',
  ],

  Accused: [
    'AccusedMasterID',
    'CaseMasterID',
    'AccusedName',
    'AgeYear',
    'GenderID',
    'PersonID',
  ],

  ActSectionAssociation: [
    'CaseMasterID',
    'ActID',
    'SectionID',
    'ActOrderID',
    'SectionOrderID',
  ],

  ArrestSurrender: [
    'ArrestSurrenderID',
    'CaseMasterID',
    'ArrestSurrenderTypeID',
    'ArrestSurrenderDate',
    'ArrestSurrenderStateId',
    'ArrestSurrenderDistrictId',
    'PoliceStationID',
    'IOID',
    'CourtID',
    'AccusedMasterID',
    'IsAccused',
    'IsComplainantAccused',
  ],

  ArrestSurrenderAccused: [
    'ArrestSurrenderID',
    'AccusedMasterID',
    'LinkRole',
  ],

  ChargesheetDetails: [
    'CSID',
    'CaseMasterID',
    'csdate',
    'cstype',
    'PolicePersonID',
  ],

  CaseTimeline: [
    'TimelineEventID',
    'CaseMasterID',
    'EventDateTime',
    'EventType',
    'EventDescription',
    'ActorEmployeeID',
    'SourceType',
  ],

  CaseNarrative: [
    'CaseMasterID',
    'LanguageCode',
    'NarrativeText',
    'SourceType',
    'DataOrigin',
  ],

  EvidenceItem: [
    'EvidenceID',
    'CaseMasterID',
    'EvidenceType',
    'Description',
    'CollectedDateTime',
    'ReliabilityScore',
    'DataOrigin',
  ],

  PersonEntity: [
    'EntityID',
    'CanonicalName',
    'DateOfBirth',
    'GenderID',
    'OccupationID',
    'HomeLocationID',
    'DataOrigin',
    'SyntheticRepeatClass',
    'Active',
  ],

  AccusedEntityLink: [
    'AccusedMasterID',
    'EntityID',
    'ResolutionStatus',
    'Confidence',
    'EvidenceBasis',
  ],

  DigitalIdentifier: [
    'IdentifierID',
    'IdentifierType',
    'IdentifierValue',
    'FirstObservedDate',
    'Source',
  ],

  PersonIdentifierLink: [
    'EntityID',
    'IdentifierID',
    'RelationshipType',
    'Confidence',
  ],

  Vehicle: [
    'VehicleID',
    'RegistrationNo',
    'VehicleType',
    'ModelYear',
    'Source',
  ],

  PersonVehicleLink: [
    'EntityID',
    'VehicleID',
    'RelationshipType',
    'Confidence',
  ],

  FinancialAccount: [
    'AccountID',
    'AccountType',
    'MaskedAccountNo',
    'InstitutionName',
    'OpenDate',
    'Status',
    'Source',
  ],

  PersonAccountLink: [
    'EntityID',
    'AccountID',
    'RelationshipType',
    'Confidence',
  ],

  FinancialTransaction: [
    'TransactionID',
    'FromAccountID',
    'ToAccountID',
    'TransactionDateTime',
    'Amount',
    'Currency',
    'Channel',
    'SuspiciousFlag',
    'RiskScore',
    'Narrative',
  ],

  CasePartyEntityLink: [
    'CaseMasterID',
    'EntityReference',
    'Role',
    'SourceTable',
    'SourceRecordID',
    'Confidence',
  ],

  CaseVehicleLink: [
    'CaseMasterID',
    'VehicleID',
    'RelationshipType',
    'Confidence',
  ],

  CaseIdentifierLink: [
    'CaseMasterID',
    'IdentifierID',
    'RelationshipType',
    'Confidence',
  ],

  CaseFinancialLink: [
    'CaseMasterID',
    'TransactionID',
    'RelationshipType',
    'Confidence',
  ],

  KnownAssociation: [
    'AssociationID',
    'EntityID1',
    'EntityID2',
    'RelationshipType',
    'ObservedCount',
    'Confidence',
    'EvidenceBasis',
  ],

  Gang: [
    'GangID',
    'GangName',
    'PrimaryCrimeType',
    'PrimaryLocationID',
    'Status',
  ],

  GangMembership: [
    'GangID',
    'EntityID',
    'FromDate',
    'Role',
    'Confidence',
  ],
} as const;

export type CoreTableName =
  keyof typeof CORE_TABLE_COLUMNS;

export type CoreTableColumn<
  Table extends CoreTableName,
> = (typeof CORE_TABLE_COLUMNS)[Table][number];

/**
 * CSV parsers initially return every field as a string.
 *
 * Conversion to numbers, booleans and dates occurs in the
 * API dataset-loader layer.
 */
export type CoreCsvRow<
  Table extends CoreTableName,
> = Record<CoreTableColumn<Table>, string>;

export type CoreTableRowMap = {
  readonly [Table in CoreTableName]: CoreCsvRow<Table>;
};

export type StateRow =
  CoreTableRowMap['State'];

export type DistrictRow =
  CoreTableRowMap['District'];

export type UnitRow =
  CoreTableRowMap['Unit'];

export type GenderMasterRow =
  CoreTableRowMap['GenderMaster'];

export type OccupationMasterRow =
  CoreTableRowMap['OccupationMaster'];

export type ReligionMasterRow =
  CoreTableRowMap['ReligionMaster'];

export type CasteMasterRow =
  CoreTableRowMap['CasteMaster'];

export type CaseCategoryRow =
  CoreTableRowMap['CaseCategory'];

export type GravityOffenceRow =
  CoreTableRowMap['GravityOffence'];

export type CaseStatusMasterRow =
  CoreTableRowMap['CaseStatusMaster'];

export type CrimeHeadRow =
  CoreTableRowMap['CrimeHead'];

export type CrimeSubHeadRow =
  CoreTableRowMap['CrimeSubHead'];

export type ActRow =
  CoreTableRowMap['Act'];

export type SectionRow =
  CoreTableRowMap['Section'];

export type LocationMasterRow =
  CoreTableRowMap['LocationMaster'];

export type EmployeeRow =
  CoreTableRowMap['Employee'];

export type CourtRow =
  CoreTableRowMap['Court'];

export type CaseMasterRow =
  CoreTableRowMap['CaseMaster'];

export type ComplainantDetailsRow =
  CoreTableRowMap['ComplainantDetails'];

export type VictimRow =
  CoreTableRowMap['Victim'];

export type AccusedRow =
  CoreTableRowMap['Accused'];

export type ActSectionAssociationRow =
  CoreTableRowMap['ActSectionAssociation'];

export type ArrestSurrenderRow =
  CoreTableRowMap['ArrestSurrender'];

export type ArrestSurrenderAccusedRow =
  CoreTableRowMap['ArrestSurrenderAccused'];

export type ChargesheetDetailsRow =
  CoreTableRowMap['ChargesheetDetails'];

export type CaseTimelineRow =
  CoreTableRowMap['CaseTimeline'];

export type CaseNarrativeRow =
  CoreTableRowMap['CaseNarrative'];

export type EvidenceItemRow =
  CoreTableRowMap['EvidenceItem'];

export type PersonEntityRow =
  CoreTableRowMap['PersonEntity'];

export type AccusedEntityLinkRow =
  CoreTableRowMap['AccusedEntityLink'];

export type DigitalIdentifierRow =
  CoreTableRowMap['DigitalIdentifier'];

export type PersonIdentifierLinkRow =
  CoreTableRowMap['PersonIdentifierLink'];

export type VehicleRow =
  CoreTableRowMap['Vehicle'];

export type PersonVehicleLinkRow =
  CoreTableRowMap['PersonVehicleLink'];

export type FinancialAccountRow =
  CoreTableRowMap['FinancialAccount'];

export type PersonAccountLinkRow =
  CoreTableRowMap['PersonAccountLink'];

export type FinancialTransactionRow =
  CoreTableRowMap['FinancialTransaction'];

export type CasePartyEntityLinkRow =
  CoreTableRowMap['CasePartyEntityLink'];

export type CaseVehicleLinkRow =
  CoreTableRowMap['CaseVehicleLink'];

export type CaseIdentifierLinkRow =
  CoreTableRowMap['CaseIdentifierLink'];

export type CaseFinancialLinkRow =
  CoreTableRowMap['CaseFinancialLink'];

export type KnownAssociationRow =
  CoreTableRowMap['KnownAssociation'];

export type GangRow =
  CoreTableRowMap['Gang'];

export type GangMembershipRow =
  CoreTableRowMap['GangMembership'];

/**
 * Database or logical keys used for duplicate detection.
 *
 * Some junction tables do not have a separately declared
 * surrogate key, so their logical composite key is listed.
 */
export const CORE_TABLE_PRIMARY_KEYS = {
  State: ['StateID'],
  District: ['DistrictID'],
  Unit: ['UnitID'],

  GenderMaster: ['GenderID'],
  OccupationMaster: ['OccupationID'],
  ReligionMaster: ['ReligionID'],
  CasteMaster: ['caste_master_id'],

  CaseCategory: ['CaseCategoryID'],
  GravityOffence: ['GravityOffenceID'],
  CaseStatusMaster: ['CaseStatusID'],

  CrimeHead: ['CrimeHeadID'],
  CrimeSubHead: ['CrimeSubHeadID'],

  Act: ['ActCode'],
  Section: ['ActCode', 'SectionCode'],

  LocationMaster: ['LocationID'],
  Employee: ['EmployeeID'],
  Court: ['CourtID'],

  CaseMaster: ['CaseMasterID'],
  ComplainantDetails: ['ComplainantID'],
  Victim: ['VictimMasterID'],
  Accused: ['AccusedMasterID'],

  ActSectionAssociation: [
    'CaseMasterID',
    'ActID',
    'SectionID',
  ],

  ArrestSurrender: ['ArrestSurrenderID'],

  ArrestSurrenderAccused: [
    'ArrestSurrenderID',
    'AccusedMasterID',
  ],

  ChargesheetDetails: ['CSID'],

  CaseTimeline: [
    'TimelineEventID',
  ],

  CaseNarrative: [
    'CaseMasterID',
    'LanguageCode',
    'SourceType',
  ],

  EvidenceItem: [
    'EvidenceID',
  ],

  PersonEntity: [
    'EntityID',
  ],

  AccusedEntityLink: [
    'AccusedMasterID',
    'EntityID',
  ],

  DigitalIdentifier: [
    'IdentifierID',
  ],

  PersonIdentifierLink: [
    'EntityID',
    'IdentifierID',
  ],

  Vehicle: [
    'VehicleID',
  ],

  PersonVehicleLink: [
    'EntityID',
    'VehicleID',
  ],

  FinancialAccount: [
    'AccountID',
  ],

  PersonAccountLink: [
    'EntityID',
    'AccountID',
  ],

  FinancialTransaction: [
    'TransactionID',
  ],

  CasePartyEntityLink: [
    'CaseMasterID',
    'SourceTable',
    'SourceRecordID',
    'Role',
  ],

  CaseVehicleLink: [
    'CaseMasterID',
    'VehicleID',
  ],

  CaseIdentifierLink: [
    'CaseMasterID',
    'IdentifierID',
  ],

  CaseFinancialLink: [
    'CaseMasterID',
    'TransactionID',
  ],

  KnownAssociation: [
    'AssociationID',
  ],

  Gang: [
    'GangID',
  ],

  GangMembership: [
    'GangID',
    'EntityID',
  ],
} as const;