export type IsoDateString = string;
export type IsoDateTimeString = string;

export interface NumericLookupReference {
  id: number;
  name: string;
}

export interface LegalReference {
  code: string;
  name: string;
}

export interface CaseLocation {
  locationId: number | null;
  locationName: string | null;
  zoneType: string | null;
  latitude: number;
  longitude: number;
}

export interface CaseSummary {
  caseId: number;

  crimeNumber: string;
  caseNumber: string;

  registeredDate: IsoDateString;

  incidentFrom: IsoDateTimeString | null;
  incidentTo: IsoDateTimeString | null;
  informationReceivedAt: IsoDateTimeString | null;

  category: NumericLookupReference;
  gravity: NumericLookupReference;

  majorCrimeHead: NumericLookupReference;
  minorCrimeHead: NumericLookupReference;

  status: NumericLookupReference;

  policeStation: NumericLookupReference;
  district: NumericLookupReference;
  state: NumericLookupReference;

  court: NumericLookupReference | null;
  location: CaseLocation | null;

  /**
   * Shortened and sanitized version used in list views.
   */
  briefFactsPreview: string | null;
}

export interface CasePerson {
  id: number;
  name: string;
  age: number | null;
  gender: NumericLookupReference | null;
}

export interface CaseAccused extends CasePerson {
  /**
   * FIR-local ordering value such as A1, A2 or A3.
   */
  personCode: string | null;

  /**
   * Filled later through AccusedEntityLink.
   */
  resolvedEntityId: number | null;
}

export interface CaseVictim extends CasePerson {
  isPolicePersonnel: boolean | null;
}

export interface CaseComplainant extends CasePerson {
  occupation: NumericLookupReference | null;
}

/**
 * Religion and caste remain available in the protected raw
 * dataset but are intentionally not exposed through this MVP
 * case-response contract.
 */
export interface CaseLegalSection {
  act: LegalReference;
  section: LegalReference;

  actOrder: number | null;
  sectionOrder: number | null;
}

export interface CaseArrestEvent {
  arrestSurrenderId: number;
  eventTypeId: number;
  eventDate: IsoDateString;

  state: NumericLookupReference | null;
  district: NumericLookupReference | null;
  policeStation: NumericLookupReference | null;

  investigatingOfficer: NumericLookupReference | null;
  court: NumericLookupReference | null;

  accusedIds: number[];

  isAccused: boolean | null;
  isComplainantAccused: boolean | null;
}

export type ChargesheetReportCode =
  | 'A'
  | 'B'
  | 'C'
  | string;

export interface CaseChargesheet {
  chargesheetId: number;
  chargesheetDate: IsoDateTimeString;

  /**
   * A = chargesheet
   * B = false case
   * C = undetected
   */
  reportCode: ChargesheetReportCode;

  policeOfficer: NumericLookupReference | null;
}

export interface CaseTimelineEvent {
  timelineEventId: number;

  eventDateTime: IsoDateTimeString;
  eventType: string;
  description: string;

  actor: NumericLookupReference | null;
  sourceType: string;
}

export interface CaseNarrative {
  languageCode: string;
  narrativeText: string;
  sourceType: string;
  dataOrigin: string;
}

export interface CaseEvidenceItem {
  evidenceId: number;

  evidenceType: string;
  description: string;

  collectedDateTime:
    IsoDateTimeString | null;

  /**
   * Reliability value supplied by the dataset.
   * Expected range: 0 to 1.
   */
  reliabilityScore: number | null;

  dataOrigin: string;
}

export interface CaseEntitySourceLink {
  role: string;

  sourceTable: string;
  sourceRecordId: number;

  confidence: number | null;
}

export interface CaseResolvedEntity {
  entityId: number;
  canonicalName: string;

  dateOfBirth: IsoDateString | null;

  gender:
    NumericLookupReference | null;

  occupation:
    NumericLookupReference | null;

  homeLocationId: number | null;

  dataOrigin: string;
  syntheticRepeatClass: string | null;
  active: boolean;

  resolutionStatus: string | null;
  resolutionConfidence: number | null;
  resolutionEvidence: string | null;

  accusedIds: number[];
  roles: string[];

  sourceLinks: CaseEntitySourceLink[];
}

export interface CaseDetail extends CaseSummary {
  registeringOfficer: NumericLookupReference;

  briefFacts: string | null;

  complainants: CaseComplainant[];
  victims: CaseVictim[];
  accused: CaseAccused[];

  resolvedEntities: CaseResolvedEntity[];

  legalSections: CaseLegalSection[];
  arrestEvents: CaseArrestEvent[];
  chargesheets: CaseChargesheet[];

  timeline: CaseTimelineEvent[];
  narratives: CaseNarrative[];
  evidenceItems: CaseEvidenceItem[];
}

export interface CaseListFilters {
  search?: string;

  districtId?: number;
  policeStationId?: number;

  categoryId?: number;
  gravityId?: number;
  statusId?: number;

  majorCrimeHeadId?: number;
  minorCrimeHeadId?: number;

  registeredFrom?: IsoDateString;
  registeredTo?: IsoDateString;
}

export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface CaseListResponse {
  items: CaseSummary[];
  pagination: PaginationMetadata;
}

export interface CasePoliceStationFilterOption
  extends NumericLookupReference {
  districtId: number;
}

export interface CaseMinorCrimeHeadFilterOption
  extends NumericLookupReference {
  majorCrimeHeadId: number;
}

export interface CaseFilterOptions {
  districts: NumericLookupReference[];

  policeStations:
    CasePoliceStationFilterOption[];

  gravities: NumericLookupReference[];
  statuses: NumericLookupReference[];

  majorCrimeHeads: NumericLookupReference[];

  minorCrimeHeads:
    CaseMinorCrimeHeadFilterOption[];
}

export interface CaseDashboardBreakdownItem
  extends NumericLookupReference {
  count: number;
  percentage: number;
}

export interface CaseDashboardDateCoverage {
  from: IsoDateString | null;
  to: IsoDateString | null;
}

export interface CaseDashboardSummary {
  totalCases: number;

  dateCoverage: CaseDashboardDateCoverage;

  casesWithArrestEvents: number;
  casesWithChargesheets: number;

  statusBreakdown:
    CaseDashboardBreakdownItem[];

  gravityBreakdown:
    CaseDashboardBreakdownItem[];

  topDistricts:
    CaseDashboardBreakdownItem[];

  topCrimeHeads:
    CaseDashboardBreakdownItem[];
}