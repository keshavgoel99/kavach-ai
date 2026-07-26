import type {
  AnalyticsFilterOptions,
  AnalyticsOverviewResponse,
  AnalyticsQuery,
} from '@kavach/shared-types';

export interface AnalyticsDesktopApi {
  getFilterOptions(): Promise<AnalyticsFilterOptions>;

  getOverview(
    query?: AnalyticsQuery,
  ): Promise<AnalyticsOverviewResponse>;
}
