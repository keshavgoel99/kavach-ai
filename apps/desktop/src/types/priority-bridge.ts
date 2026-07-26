import type {
  CasePriorityAssessment,
  CasePriorityQueueQuery,
  CasePriorityQueueResponse,
} from '@kavach/shared-types';

export interface PriorityDesktopApi {
  getCaseAssessment(
    caseId: number,
  ): Promise<CasePriorityAssessment>;

  getQueue(
    query?: CasePriorityQueueQuery,
  ): Promise<CasePriorityQueueResponse>;
}
