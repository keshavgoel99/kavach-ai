import type {
  SimilarCasesQuery,
  SimilarCasesResponse,
} from '@kavach/shared-types';

export interface SimilarityDesktopApi {
  getSimilarCases(
    caseId: number,
    query?: SimilarCasesQuery,
  ): Promise<SimilarCasesResponse>;
}
