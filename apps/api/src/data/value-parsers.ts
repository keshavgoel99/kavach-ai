export interface DatasetFieldContext {
  table: string;
  column: string;
  rowNumber: number;
}

export class DatasetValidationError extends Error {
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    context?: Record<string, unknown>,
  ) {
    super(message);

    this.name = 'DatasetValidationError';
    this.context = context;
  }
}

function invalidValue(
  context: DatasetFieldContext,
  value: string,
  expected: string,
): DatasetValidationError {
  return new DatasetValidationError(
    `${context.table}.${context.column} contains an invalid value at CSV row ${context.rowNumber}.`,
    {
      table: context.table,
      column: context.column,
      rowNumber: context.rowNumber,
      value,
      expected,
    },
  );
}

export function parseRequiredString(
  value: string,
  context: DatasetFieldContext,
): string {
  const cleaned = value.trim();

  if (!cleaned) {
    throw invalidValue(
      context,
      value,
      'a non-empty string',
    );
  }

  return cleaned;
}

export function parseNullableString(
  value: string,
): string | null {
  const cleaned = value.trim();

  return cleaned || null;
}

export function parseRequiredInteger(
  value: string,
  context: DatasetFieldContext,
): number {
  const cleaned = value.trim();

  if (!/^-?\d+$/.test(cleaned)) {
    throw invalidValue(
      context,
      value,
      'an integer',
    );
  }

  const parsed = Number(cleaned);

  if (!Number.isSafeInteger(parsed)) {
    throw invalidValue(
      context,
      value,
      'a safe integer',
    );
  }

  return parsed;
}

export function parseNullableInteger(
  value: string,
  context: DatasetFieldContext,
): number | null {
  if (!value.trim()) {
    return null;
  }

  return parseRequiredInteger(value, context);
}

export function parseRequiredDecimal(
  value: string,
  context: DatasetFieldContext,
): number {
  const cleaned = value.trim();
  const parsed = Number(cleaned);

  if (!cleaned || !Number.isFinite(parsed)) {
    throw invalidValue(
      context,
      value,
      'a finite decimal number',
    );
  }

  return parsed;
}

export function parseRequiredDecimalInRange(
  value: string,
  minimum: number,
  maximum: number,
  context: DatasetFieldContext,
): number {
  const parsed = parseRequiredDecimal(
    value,
    context,
  );

  if (parsed < minimum || parsed > maximum) {
    throw invalidValue(
      context,
      value,
      `a number between ${minimum} and ${maximum}`,
    );
  }

  return parsed;
}

export function parseRequiredBoolean(
  value: string,
  context: DatasetFieldContext,
): boolean {
  const cleaned = value.trim().toLowerCase();

  if (cleaned === '1' || cleaned === 'true') {
    return true;
  }

  if (cleaned === '0' || cleaned === 'false') {
    return false;
  }

  throw invalidValue(
    context,
    value,
    '0, 1, true or false',
  );
}

export function parseNullableBoolean(
  value: string,
  context: DatasetFieldContext,
): boolean | null {
  if (!value.trim()) {
    return null;
  }

  return parseRequiredBoolean(value, context);
}

function isValidCalendarDate(
  year: number,
  month: number,
  day: number,
): boolean {
  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseRequiredDate(
  value: string,
  context: DatasetFieldContext,
): string {
  const cleaned = value.trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);

  if (!match) {
    throw invalidValue(
      context,
      value,
      'a date in YYYY-MM-DD format',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (!isValidCalendarDate(year, month, day)) {
    throw invalidValue(
      context,
      value,
      'a valid calendar date',
    );
  }

  return cleaned;
}

export function parseNullableDate(
  value: string,
  context: DatasetFieldContext,
): string | null {
  if (!value.trim()) {
    return null;
  }

  return parseRequiredDate(value, context);
}

export function parseRequiredDateTime(
  value: string,
  context: DatasetFieldContext,
): string {
  const cleaned = value.trim();

  const match =
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(
      cleaned,
    );

  if (!match) {
    throw invalidValue(
      context,
      value,
      'a date-time in YYYY-MM-DD HH:mm:ss format',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);

  const hasValidDate = isValidCalendarDate(
    year,
    month,
    day,
  );

  const hasValidTime =
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59 &&
    second >= 0 &&
    second <= 59;

  if (!hasValidDate || !hasValidTime) {
    throw invalidValue(
      context,
      value,
      'a valid date and time',
    );
  }

  return (
    `${match[1]}-${match[2]}-${match[3]}` +
    `T${match[4]}:${match[5]}:${match[6]}`
  );
}

export function parseNullableDateTime(
  value: string,
  context: DatasetFieldContext,
): string | null {
  if (!value.trim()) {
    return null;
  }

  return parseRequiredDateTime(value, context);
}