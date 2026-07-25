import type {
  CaseSummary,
} from './case';

export type CasePriorityBand =
  | 'ROUTINE'
  | 'ELEVATED'
  | 'HIGH'
  | 'CRITICAL';

export type CasePriorityFactorCode =
  | 'VERIFIED_RECENT_CASES'
  | 'VERIFIED_SHARED_IDENTIFIERS'
  | 'HIGH_GRAVITY_RECENT_CASE'
  | 'REPEATED_MODUS_OPERANDI'
  | 'HIGH_CONFIDENCE_NETWORK_BRIDGES'
  | 'UNRESOLVED_RECENT_CASE_CLUSTER'
  | 'STRONG_IDENTITY_CONFLICTS';

export type CasePriorityFactorDirection =
  | 'INCREASE'
  | 'DECREASE';

export interface CasePriorityEvidenceReference {
  sourceTable: string;

  sourceRecordId: string;

  field: string | null;

  caseId: number | null;

  description: string;
}

export interface CasePriorityFactor {
  code: CasePriorityFactorCode;

  label: string;
  explanation: string;

  direction:
    CasePriorityFactorDirection;

  rawValue: number | boolean;

  points: number;

  maximumAbsolutePoints: number;

  capped: boolean;

  evidence:
    CasePriorityEvidenceReference[];
}

export interface CasePriorityAssessment {
  caseId: number;

  score: number;

  band: CasePriorityBand;

  factors: CasePriorityFactor[];

  ruleVersion: string;

  assessedAt: string;

  humanReviewRequired: true;

  permittedUse: string;

  excludedInputs: string[];
}

export interface CasePriorityQueueItem {
  case: CaseSummary;

  assessment:
    CasePriorityAssessment;
}

export interface CasePriorityQueueQuery {
  page?: number;
  pageSize?: number;

  bands?: CasePriorityBand[];

  districtIds?: number[];

  policeStationIds?: number[];
}

export interface CasePriorityQueueResponse {
  items: CasePriorityQueueItem[];

  total: number;

  page: number;
  pageSize: number;

  generatedAt: string;

  ruleVersion: string;
}