import type {
  CaseDetail,
  CaseListFilters,
  CaseListResponse,
} from '@kavach/shared-types';

export interface CaseListRequest {
  filters?: CaseListFilters;
  page?: number;
  pageSize?: number;
}

export interface CaseBridge {
  list(
    request?: CaseListRequest,
  ): Promise<CaseListResponse>;

  getById(
    caseId: number,
  ): Promise<CaseDetail>;
}