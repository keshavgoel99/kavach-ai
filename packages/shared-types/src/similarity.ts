import type {
  CaseSummary,
} from './case';

export type CaseSimilarityFactorCode =
  | 'SAME_MINOR_CRIME_HEAD'
  | 'SAME_MAJOR_CRIME_HEAD'
  | 'SHARED_MODUS_OPERANDI'
  | 'SHARED_LEGAL_SECTIONS'
  | 'SHARED_CANONICAL_ENTITIES'
  | 'SHARED_IDENTIFIERS'
  | 'SAME_LOCATION'
  | 'SIMILAR_INCIDENT_TIME';

export interface CaseSimilarityEvidenceReference {
  sourceTable: string;

  sourceRecordId: string;

  field: string | null;

  sourceCaseId: number;

  candidateCaseId: number;

  description: string;
}

export interface CaseSimilarityFactor {
  code: CaseSimilarityFactorCode;

  label: string;

  explanation: string;

  rawValue: number | boolean;

  points: number;

  maximumPoints: number;

  capped: boolean;

  evidence:
    CaseSimilarityEvidenceReference[];
}

export interface CaseSimilarityAssessment {
  sourceCaseId: number;

  candidateCaseId: number;

  similarityScore: number;

  factors:
    CaseSimilarityFactor[];

  ruleVersion: string;

  humanReviewRequired: true;

  permittedUse: string;

  excludedInputs: string[];
}

export interface SimilarCase {
  caseId: number;

  similarityScore: number;

  matchingFactors: string[];

  factors:
    CaseSimilarityFactor[];

  caseSummary: CaseSummary;
}

export interface SimilarCasesQuery {
  limit?: number;

  minimumScore?: number;
}

export interface SimilarCasesResponse {
  sourceCaseId: number;

  sourceCase: CaseSummary;

  generatedAt: string;

  ruleVersion: string;

  candidateCount: number;

  results: SimilarCase[];

  humanReviewRequired: true;

  permittedUse: string;
}
