/* eslint-disable no-control-regex */
import {
  app,
  BrowserWindow,
  dialog,
} from 'electron';

import {
  mkdtemp,
  rm,
  writeFile,
} from 'node:fs/promises';

import path from 'node:path';

import type {
  ReportCellValue,
  ReportDocument,
  ReportExportFormat,
  ReportExportRequest,
  ReportExportResponse,
  ReportKeyValueItem,
  ReportSection,
  ReportTableColumn,
  ReportTableRow,
} from '@kavach/shared-types';

const MAXIMUM_SECTIONS = 50;

const MAXIMUM_TABLE_ROWS =
  5_000;

const MAXIMUM_COLUMNS = 30;

const MAXIMUM_TEXT_LENGTH =
  10_000;

const FORMAT_EXTENSIONS:
Readonly<
  Record<
    ReportExportFormat,
    string
  >
> = {
  pdf: '.pdf',
  html: '.html',
  json: '.json',
  csv: '.csv',
};

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    typeof value ===
      'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

function validateText(
  value: unknown,
  label: string,
  maximumLength =
    MAXIMUM_TEXT_LENGTH,
): string {
  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      `${label} must be text.`,
    );
  }

  const cleaned =
    value.trim();

  if (!cleaned) {
    throw new Error(
      `${label} cannot be empty.`,
    );
  }

  if (
    cleaned.length >
    maximumLength
  ) {
    throw new Error(
      `${label} is too long.`,
    );
  }

  return cleaned;
}

function validateCellValue(
  value: unknown,
  label: string,
): ReportCellValue {
  if (
    value === null ||
    typeof value ===
      'string' ||
    typeof value ===
      'boolean'
  ) {
    if (
      typeof value ===
        'string' &&
      value.length >
        MAXIMUM_TEXT_LENGTH
    ) {
      throw new Error(
        `${label} is too long.`,
      );
    }

    return value;
  }

  if (
    typeof value ===
      'number' &&
    Number.isFinite(value)
  ) {
    return value;
  }

  throw new Error(
    `${label} contains an unsupported value.`,
  );
}

function validateColumns(
  supplied: unknown,
  sectionIndex: number,
): ReportTableColumn[] {
  if (!Array.isArray(supplied)) {
    throw new Error(
      `Section ${sectionIndex} columns must be an array.`,
    );
  }

  if (
    supplied.length < 1 ||
    supplied.length >
      MAXIMUM_COLUMNS
  ) {
    throw new Error(
      `Section ${sectionIndex} has an invalid column count.`,
    );
  }

  const keys =
    new Set<string>();

  return supplied.map(
    (
      candidate,
      columnIndex,
    ) => {
      if (!isRecord(candidate)) {
        throw new Error(
          `Section ${sectionIndex} column ${columnIndex} is invalid.`,
        );
      }

      const key =
        validateText(
          candidate.key,
          `Section ${sectionIndex} column key`,
          100,
        );

      if (keys.has(key)) {
        throw new Error(
          `Section ${sectionIndex} contains duplicate column ${key}.`,
        );
      }

      keys.add(key);

      return {
        key,

        label:
          validateText(
            candidate.label,
            `Section ${sectionIndex} column label`,
            200,
          ),
      };
    },
  );
}

function validateRows(
  supplied: unknown,
  columns:
    readonly ReportTableColumn[],
  sectionIndex: number,
): ReportTableRow[] {
  if (!Array.isArray(supplied)) {
    throw new Error(
      `Section ${sectionIndex} rows must be an array.`,
    );
  }

  if (
    supplied.length >
    MAXIMUM_TABLE_ROWS
  ) {
    throw new Error(
      `Section ${sectionIndex} contains too many rows.`,
    );
  }

  return supplied.map(
    (
      candidate,
      rowIndex,
    ) => {
      if (!isRecord(candidate)) {
        throw new Error(
          `Section ${sectionIndex} row ${rowIndex} is invalid.`,
        );
      }

      const row:
        ReportTableRow = {};

      columns.forEach(
        (column) => {
          row[column.key] =
            validateCellValue(
              candidate[
                column.key
              ] ??
                null,

              [
                'Section',
                sectionIndex,
                'row',
                rowIndex,
                'column',
                column.key,
              ].join(' '),
            );
        },
      );

      return row;
    },
  );
}

function validateKeyValueItems(
  supplied: unknown,
  sectionIndex: number,
): ReportKeyValueItem[] {
  if (!Array.isArray(supplied)) {
    throw new Error(
      `Section ${sectionIndex} items must be an array.`,
    );
  }

  if (
    supplied.length >
    MAXIMUM_TABLE_ROWS
  ) {
    throw new Error(
      `Section ${sectionIndex} contains too many items.`,
    );
  }

  return supplied.map(
    (
      candidate,
      itemIndex,
    ) => {
      if (!isRecord(candidate)) {
        throw new Error(
          `Section ${sectionIndex} item ${itemIndex} is invalid.`,
        );
      }

      return {
        label:
          validateText(
            candidate.label,
            `Section ${sectionIndex} item label`,
            300,
          ),

        value:
          validateCellValue(
            candidate.value ??
              null,

            `Section ${sectionIndex} item value`,
          ),
      };
    },
  );
}

function validateSection(
  supplied: unknown,
  sectionIndex: number,
): ReportSection {
  if (!isRecord(supplied)) {
    throw new Error(
      `Report section ${sectionIndex} is invalid.`,
    );
  }

  const title =
    validateText(
      supplied.title,
      `Section ${sectionIndex} title`,
      500,
    );

  if (
    supplied.type ===
      'text'
  ) {
    if (
      !Array.isArray(
        supplied.paragraphs,
      )
    ) {
      throw new Error(
        `Section ${sectionIndex} paragraphs must be an array.`,
      );
    }

    return {
      type: 'text',

      title,

      paragraphs:
        supplied.paragraphs.map(
          (
            paragraph,
            paragraphIndex,
          ) =>
            validateText(
              paragraph,
              `Section ${sectionIndex} paragraph ${paragraphIndex}`,
            ),
        ),
    };
  }

  if (
    supplied.type ===
      'key-value'
  ) {
    return {
      type:
        'key-value',

      title,

      items:
        validateKeyValueItems(
          supplied.items,
          sectionIndex,
        ),
    };
  }

  if (
    supplied.type ===
      'table'
  ) {
    const columns =
      validateColumns(
        supplied.columns,
        sectionIndex,
      );

    return {
      type: 'table',

      title,

      columns,

      rows:
        validateRows(
          supplied.rows,
          columns,
          sectionIndex,
        ),
    };
  }

  throw new Error(
    `Section ${sectionIndex} has an unsupported type.`,
  );
}

function validateReportDocument(
  supplied: unknown,
): ReportDocument {
  if (!isRecord(supplied)) {
    throw new Error(
      'A report document is required.',
    );
  }

  if (
    !Array.isArray(
      supplied.sections,
    )
  ) {
    throw new Error(
      'Report sections must be an array.',
    );
  }

  if (
    supplied.sections.length <
      1 ||
    supplied.sections.length >
      MAXIMUM_SECTIONS
  ) {
    throw new Error(
      'The report has an invalid number of sections.',
    );
  }

  if (
    !Array.isArray(
      supplied.footerNotes,
    )
  ) {
    throw new Error(
      'Report footer notes must be an array.',
    );
  }

  return {
    title:
      validateText(
        supplied.title,
        'Report title',
        500,
      ),

    subtitle:
      validateText(
        supplied.subtitle,
        'Report subtitle',
        1_000,
      ),

    reference:
      validateText(
        supplied.reference,
        'Report reference',
        300,
      ),

    classification:
      validateText(
        supplied.classification,
        'Report classification',
        300,
      ),

    generatedAt:
      validateText(
        supplied.generatedAt,
        'Report generation time',
        100,
      ),

    sections:
      supplied.sections.map(
        (
          section,
          sectionIndex,
        ) =>
          validateSection(
            section,
            sectionIndex,
          ),
      ),

    footerNotes:
      supplied.footerNotes.map(
        (
          note,
          noteIndex,
        ) =>
          validateText(
            note,
            `Footer note ${noteIndex}`,
          ),
      ),
  };
}

function validateExportFormat(
  supplied: unknown,
): ReportExportFormat {
  if (
    supplied === 'pdf' ||
    supplied === 'html' ||
    supplied === 'json' ||
    supplied === 'csv'
  ) {
    return supplied;
  }

  throw new Error(
    'Unsupported report export format.',
  );
}

function validateExportRequest(
  supplied: unknown,
): ReportExportRequest {
  if (!isRecord(supplied)) {
    throw new Error(
      'A report export request is required.',
    );
  }

  return {
    format:
      validateExportFormat(
        supplied.format,
      ),

    suggestedFileName:
      validateText(
        supplied
          .suggestedFileName,
        'Suggested report filename',
        200,
      ),

    document:
      validateReportDocument(
        supplied.document,
      ),
  };
}

function escapeHtml(
  value:
    ReportCellValue |
    undefined,
): string {
  return String(
    value ?? '',
  )
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}

function formatGeneratedAt(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      dateStyle: 'medium',
      timeStyle: 'medium',
    },
  ).format(date);
}

function renderSection(
  section:
    ReportSection,
): string {
  if (
    section.type ===
      'text'
  ) {
    return `
      <section class="report-section">
        <h2>${escapeHtml(section.title)}</h2>

        ${section.paragraphs
          .map(
            (paragraph) =>
              `<p>${escapeHtml(paragraph)}</p>`,
          )
          .join('')}
      </section>
    `;
  }

  if (
    section.type ===
      'key-value'
  ) {
    return `
      <section class="report-section">
        <h2>${escapeHtml(section.title)}</h2>

        <div class="key-value-grid">
          ${section.items
            .map(
              (item) => `
                <div class="key-value-item">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${escapeHtml(item.value)}</strong>
                </div>
              `,
            )
            .join('')}
        </div>
      </section>
    `;
  }

  return `
    <section class="report-section report-table-section">
      <h2>${escapeHtml(section.title)}</h2>

      <table>
        <thead>
          <tr>
            ${section.columns
              .map(
                (column) =>
                  `<th>${escapeHtml(column.label)}</th>`,
              )
              .join('')}
          </tr>
        </thead>

        <tbody>
          ${section.rows.length > 0
            ? section.rows
                .map(
                  (row) => `
                    <tr>
                      ${section.columns
                        .map(
                          (column) =>
                            `<td>${escapeHtml(row[column.key])}</td>`,
                        )
                        .join('')}
                    </tr>
                  `,
                )
                .join('')
            : `
              <tr>
                <td
                  colspan="${section.columns.length}"
                  class="empty-cell"
                >
                  No records available
                </td>
              </tr>
            `}
        </tbody>
      </table>
    </section>
  `;
}

function renderHtmlDocument(
  document:
    ReportDocument,
): string {
  return `
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  />

  <title>${escapeHtml(document.title)}</title>

  <style>
    @page {
      size: A4;
      margin: 16mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      color: #17212b;
      background: #ffffff;
      font-family:
        Arial,
        Helvetica,
        sans-serif;
      font-size: 10px;
      line-height: 1.5;
    }

    .report {
      width: 100%;
    }

    .report-header {
      padding-bottom: 14px;
      border-bottom: 3px solid #176c65;
    }

    .report-brand {
      margin-bottom: 8px;
      color: #176c65;
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 0.15em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      color: #101820;
      font-size: 24px;
      line-height: 1.15;
    }

    .subtitle {
      margin: 6px 0 0;
      color: #465562;
      font-size: 11px;
    }

    .report-meta {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 13px;
    }

    .report-meta > div {
      padding: 8px;
      border: 1px solid #d5dde3;
      border-radius: 5px;
      background: #f6f8f9;
    }

    .report-meta span,
    .key-value-item span {
      display: block;
      color: #64727e;
      font-size: 7px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .report-meta strong,
    .key-value-item strong {
      display: block;
      margin-top: 4px;
      color: #16212a;
      font-size: 9px;
    }

    .report-section {
      margin-top: 16px;
      break-inside: avoid;
    }

    .report-table-section {
      break-inside: auto;
    }

    h2 {
      margin: 0 0 8px;
      padding-bottom: 5px;
      border-bottom: 1px solid #d7dfe5;
      color: #176c65;
      font-size: 13px;
    }

    p {
      margin: 6px 0;
      color: #33424e;
    }

    .key-value-grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 7px;
    }

    .key-value-item {
      min-height: 49px;
      padding: 8px;
      border: 1px solid #d7dfe5;
      border-radius: 5px;
      background: #fafbfc;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
    }

    th,
    td {
      padding: 6px;
      border: 1px solid #d7dfe5;
      overflow-wrap: anywhere;
      text-align: left;
      vertical-align: top;
    }

    th {
      color: #ffffff;
      background: #176c65;
      font-size: 7px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    td {
      color: #2f3d48;
      font-size: 8px;
    }

    tbody tr:nth-child(even) {
      background: #f7f9fa;
    }

    .empty-cell {
      padding: 20px;
      color: #72808b;
      text-align: center;
    }

    .report-footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #cfd8df;
      color: #667581;
      font-size: 7px;
    }

    .report-footer p {
      margin: 3px 0;
      color: inherit;
    }

    .synthetic-banner {
      margin-top: 12px;
      padding: 8px;
      border: 1px solid #d9b85d;
      border-radius: 5px;
      color: #66501e;
      background: #fff9e9;
      font-size: 8px;
      font-weight: 700;
    }

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>

<body>
  <main class="report">
    <header class="report-header">
      <div class="report-brand">
        KAVACH AI · CRIME INTELLIGENCE
      </div>

      <h1>${escapeHtml(document.title)}</h1>

      <p class="subtitle">
        ${escapeHtml(document.subtitle)}
      </p>

      <div class="report-meta">
        <div>
          <span>Reference</span>
          <strong>${escapeHtml(document.reference)}</strong>
        </div>

        <div>
          <span>Generated</span>
          <strong>${escapeHtml(formatGeneratedAt(document.generatedAt))}</strong>
        </div>

        <div>
          <span>Classification</span>
          <strong>${escapeHtml(document.classification)}</strong>
        </div>
      </div>

      <div class="synthetic-banner">
        This project uses synthetic demonstration data.
        The report is not an official police record or legal determination.
      </div>
    </header>

    ${document.sections
      .map(renderSection)
      .join('')}

    <footer class="report-footer">
      ${document.footerNotes
        .map(
          (note) =>
            `<p>${escapeHtml(note)}</p>`,
        )
        .join('')}
    </footer>
  </main>
</body>
</html>
  `.trim();
}

function escapeCsv(
  value:
    ReportCellValue |
    undefined,
): string {
  const text =
    String(
      value ?? '',
    );

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return [
      '"',
      text.replaceAll(
        '"',
        '""',
      ),
      '"',
    ].join('');
  }

  return text;
}

function renderCsvDocument(
  document:
    ReportDocument,
): string {
  const lines:
    string[] = [];

  lines.push(
    [
      'Report title',
      escapeCsv(
        document.title,
      ),
    ].join(','),
  );

  lines.push(
    [
      'Reference',
      escapeCsv(
        document.reference,
      ),
    ].join(','),
  );

  lines.push(
    [
      'Generated at',
      escapeCsv(
        document.generatedAt,
      ),
    ].join(','),
  );

  lines.push(
    [
      'Classification',
      escapeCsv(
        document.classification,
      ),
    ].join(','),
  );

  lines.push('');

  document.sections.forEach(
    (section) => {
      lines.push(
        escapeCsv(
          section.title,
        ),
      );

      if (
        section.type ===
          'text'
      ) {
        section.paragraphs.forEach(
          (paragraph) => {
            lines.push(
              escapeCsv(
                paragraph,
              ),
            );
          },
        );
      } else if (
        section.type ===
          'key-value'
      ) {
        lines.push(
          'Label,Value',
        );

        section.items.forEach(
          (item) => {
            lines.push(
              [
                escapeCsv(
                  item.label,
                ),

                escapeCsv(
                  item.value,
                ),
              ].join(','),
            );
          },
        );
      } else {
        lines.push(
          section.columns
            .map(
              (column) =>
                escapeCsv(
                  column.label,
                ),
            )
            .join(','),
        );

        section.rows.forEach(
          (row) => {
            lines.push(
              section.columns
                .map(
                  (column) =>
                    escapeCsv(
                      row[column.key],
                    ),
                )
                .join(','),
            );
          },
        );
      }

      lines.push('');
    },
  );

  lines.push(
    'Footer notes',
  );

  document.footerNotes.forEach(
    (note) => {
      lines.push(
        escapeCsv(note),
      );
    },
  );

  return [
    '\uFEFF',
    lines.join(
      '\r\n',
    ),
  ].join('');
}

function sanitizeFileName(
  supplied: string,
): string {
  const sanitized =
    supplied
      .trim()
      .replace(
        /[<>:"/\\|?*\u0000-\u001F]/g,
        '-',
      )
      .replace(
        /\s+/g,
        '-',
      )
      .replace(
        /-+/g,
        '-',
      )
      .replace(
        /^[-.]+|[-.]+$/g,
        '',
      )
      .slice(0, 120);

  return sanitized ||
    'kavach-report';
}

function ensureExtension(
  filePath: string,
  extension: string,
): string {
  if (
    filePath
      .toLowerCase()
      .endsWith(
        extension,
      )
  ) {
    return filePath;
  }

  return [
    filePath,
    extension,
  ].join('');
}

async function exportPdf(
  html: string,
  filePath: string,
): Promise<void> {
  const temporaryDirectory =
    await mkdtemp(
      path.join(
        app.getPath('temp'),
        'kavach-report-',
      ),
    );

  const temporaryHtmlPath =
    path.join(
      temporaryDirectory,
      'report.html',
    );

  const reportWindow =
    new BrowserWindow({
      show: false,

      width: 1_240,
      height: 1_754,

      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });

  try {
    await writeFile(
      temporaryHtmlPath,
      html,
      'utf8',
    );

    await reportWindow.loadFile(
      temporaryHtmlPath,
    );

    const pdf =
      await reportWindow
        .webContents
        .printToPDF({
          printBackground: true,
          pageSize: 'A4',
          preferCSSPageSize: true,
        });

    await writeFile(
      filePath,
      pdf,
    );
  } finally {
    if (
      !reportWindow.isDestroyed()
    ) {
      reportWindow.destroy();
    }

    await rm(
      temporaryDirectory,
      {
        recursive: true,
        force: true,
      },
    );
  }
}

export async function exportReportDocument(
  suppliedRequest: unknown,
): Promise<ReportExportResponse> {
  const request =
    validateExportRequest(
      suppliedRequest,
    );

  const extension =
    FORMAT_EXTENSIONS[
      request.format
    ];

  const suggestedName =
    ensureExtension(
      sanitizeFileName(
        request.suggestedFileName,
      ),

      extension,
    );

  const selection =
    await dialog.showSaveDialog({
      title:
        'Export KAVACH report',

      defaultPath:
        path.join(
          app.getPath('documents'),
          suggestedName,
        ),

      filters: [
        {
          name:
            request.format
              .toUpperCase(),

          extensions: [
            extension.slice(1),
          ],
        },
      ],

      properties: [
        'showOverwriteConfirmation',
        'createDirectory',
      ],
    });

  if (
    selection.canceled ||
    !selection.filePath
  ) {
    return {
      cancelled: true,

      filePath: null,
    };
  }

  const destination =
    ensureExtension(
      selection.filePath,
      extension,
    );

  if (
    request.format ===
      'pdf'
  ) {
    await exportPdf(
      renderHtmlDocument(
        request.document,
      ),

      destination,
    );
  } else if (
    request.format ===
      'html'
  ) {
    await writeFile(
      destination,

      renderHtmlDocument(
        request.document,
      ),

      'utf8',
    );
  } else if (
    request.format ===
      'json'
  ) {
    await writeFile(
      destination,

      JSON.stringify(
        request.document,
        null,
        2,
      ),

      'utf8',
    );
  } else {
    await writeFile(
      destination,

      renderCsvDocument(
        request.document,
      ),

      'utf8',
    );
  }

  return {
    cancelled: false,

    filePath:
      destination,
  };
}
