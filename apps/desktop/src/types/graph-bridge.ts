import type {
  InvestigationGraphQuery,
  InvestigationGraphResponse,
} from '@kavach/shared-types';

export interface GraphDesktopApi {
  getNeighborhood(
    query: InvestigationGraphQuery,
  ): Promise<InvestigationGraphResponse>;
}
