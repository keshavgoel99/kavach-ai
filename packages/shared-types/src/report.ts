export type ReportExportFormat =
  | 'pdf'
  | 'html'
  | 'json'
  | 'csv';

export type ReportCellValue =
  | string
  | number
  | boolean
  | null;

export interface ReportKeyValueItem {
  label: string;

  value:
    ReportCellValue;
}

export interface ReportTableColumn {
  key: string;
  label: string;
}

export interface ReportTableRow {
  [key: string]:
    ReportCellValue;
}

export interface ReportTextSection {
  type: 'text';

  title: string;

  paragraphs: string[];
}

export interface ReportKeyValueSection {
  type: 'key-value';

  title: string;

  items:
    ReportKeyValueItem[];
}

export interface ReportTableSection {
  type: 'table';

  title: string;

  columns:
    ReportTableColumn[];

  rows:
    ReportTableRow[];
}

export type ReportSection =
  | ReportTextSection
  | ReportKeyValueSection
  | ReportTableSection;

export interface ReportDocument {
  title: string;

  subtitle: string;

  reference: string;

  classification: string;

  generatedAt: string;

  sections:
    ReportSection[];

  footerNotes:
    string[];
}

export interface ReportExportRequest {
  format:
    ReportExportFormat;

  suggestedFileName: string;

  document:
    ReportDocument;
}

export interface ReportExportResponse {
  cancelled: boolean;

  filePath:
    string | null;
}
