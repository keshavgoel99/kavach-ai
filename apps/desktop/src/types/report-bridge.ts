import type {
  ReportExportRequest,
  ReportExportResponse,
} from '@kavach/shared-types';

export interface ReportDesktopApi {
  exportDocument(
    request:
      ReportExportRequest,
  ): Promise<ReportExportResponse>;
}
