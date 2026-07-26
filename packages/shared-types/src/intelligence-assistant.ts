export type IntelligenceAssistantConfidence =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type IntelligenceAssistantProvider =
  | 'LOCAL'
  | 'GEMINI';

export type IntelligenceAssistantGenerationMode =
  | 'DETERMINISTIC_EXTRACTIVE'
  | 'GEMINI_GROUNDED';

export interface IntelligenceAssistantQuery {
  query: string;

  limit?: number;
  minimumScore?: number;
}

export interface IntelligenceAssistantFilters {
  registeredFrom: string | null;
  registeredTo: string | null;

  districtIds: number[];
  policeStationIds: number[];
  majorCrimeHeadIds: number[];

  matchedPhrases: string[];
}

export interface IntelligenceAssistantSource {
  caseId: number;

  crimeNumber: string;
  caseNumber: string;

  registeredDate: string;

  district: string;
  policeStation: string;

  majorCrimeHead: string;
  location: string;

  retrievalScore: number;

  matchedTerms: string[];

  excerpt: string;
}

export interface IntelligenceAssistantResponse {
  query: string;

  answer: string;

  confidence:
    IntelligenceAssistantConfidence;

  grounded: true;

  generationMode:
    IntelligenceAssistantGenerationMode;

  provider:
    IntelligenceAssistantProvider;

  model: string | null;

  fallbackUsed: boolean;

  citationCaseIds: number[];

  limitations: string[];

  matchingCaseCount: number;
  returnedSourceCount: number;

  filters:
    IntelligenceAssistantFilters;

  sources:
    IntelligenceAssistantSource[];

  generatedAt: string;

  retrievalMethod: string;
  responsibleUse: string;

  excludedData: string[];
}
