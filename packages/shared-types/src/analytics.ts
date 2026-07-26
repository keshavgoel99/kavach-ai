export interface AnalyticsLookupOption {
  id: number;
  name: string;
}

export interface AnalyticsPoliceStationOption
  extends AnalyticsLookupOption {
  districtId: number;
}

export interface AnalyticsDateRange {
  from: string;
  to: string;
}

export interface AnalyticsFilterOptions {
  registeredDateRange: AnalyticsDateRange;
  defaultDateRange: AnalyticsDateRange;

  districts: AnalyticsLookupOption[];

  policeStations: AnalyticsPoliceStationOption[];

  majorCrimeHeads: AnalyticsLookupOption[];
}

export interface AnalyticsQuery {
  registeredFrom?: string;
  registeredTo?: string;

  districtIds?: number[];
  policeStationIds?: number[];
  majorCrimeHeadIds?: number[];
}

export interface AnalyticsAppliedQuery {
  registeredFrom: string;
  registeredTo: string;

  districtIds: number[];
  policeStationIds: number[];
  majorCrimeHeadIds: number[];
}

export interface AnalyticsPeriod {
  key: string;

  year: number;
  month: number;

  label: string;
}

export interface AnalyticsOverviewMetrics {
  totalCases: number;

  accusedPersons: number;
  victims: number;

  arrestEvents: number;
  casesWithArrest: number;

  chargesheetRecords: number;
  casesWithChargesheet: number;

  arrestCoverageRate: number;
  chargesheetCoverageRate: number;

  averageDaysToFirstArrest: number | null;

  averageDaysToFirstChargesheet: number | null;
}

export interface AnalyticsMonthlyPoint {
  period: AnalyticsPeriod;

  registeredCases: number;
  casesWithArrest: number;
  casesWithChargesheet: number;

  arrestCoverageRate: number;
  chargesheetCoverageRate: number;
}

export interface AnalyticsBreakdownItem {
  id: number;
  name: string;

  count: number;
  percentage: number;
}

export interface AnalyticsDistrictComparisonItem {
  districtId: number;
  districtName: string;

  totalCases: number;

  casesWithArrest: number;
  casesWithChargesheet: number;

  arrestCoverageRate: number;
  chargesheetCoverageRate: number;
}

export interface AnalyticsModusOperandiItem {
  modusOperandiId: number;
  name: string;

  caseCount: number;
  percentage: number;

  averageConfidence: number;
}

export interface AnalyticsOverviewResponse {
  query: AnalyticsAppliedQuery;

  overview: AnalyticsOverviewMetrics;

  monthlyTrend: AnalyticsMonthlyPoint[];

  districtComparison: AnalyticsDistrictComparisonItem[];

  crimeComposition: AnalyticsBreakdownItem[];

  statusDistribution: AnalyticsBreakdownItem[];

  gravityDistribution: AnalyticsBreakdownItem[];

  modusOperandiRecurrence: AnalyticsModusOperandiItem[];

  generatedAt: string;

  methodology: string;

  responsibleUse: string;

  excludedInputs: string[];
}
