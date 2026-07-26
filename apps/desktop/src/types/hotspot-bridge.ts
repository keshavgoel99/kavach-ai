import type {
  HotspotFilterOptions,
  HotspotLocationTrendResponse,
  HotspotSummaryQuery,
  HotspotSummaryResponse,
  HotspotTrendQuery,
} from '@kavach/shared-types';

export interface HotspotDesktopApi {
  getFilterOptions():
    Promise<HotspotFilterOptions>;

  getSummary(
    query?:
      HotspotSummaryQuery,
  ): Promise<HotspotSummaryResponse>;

  getLocationTrend(
    locationId: number,

    query?:
      HotspotTrendQuery,
  ): Promise<HotspotLocationTrendResponse>;
}
