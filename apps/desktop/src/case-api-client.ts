import type {
  ApiErrorResponse,
  CaseDashboardSummary,
  CaseDetail,
  CaseFilterOptions,
  CaseListResponse,
  CasePriorityAssessment,
  CasePriorityBand,
  CasePriorityQueueQuery,
  CasePriorityQueueResponse,
  EntityProfileDetail,
} from '@kavach/shared-types';

import type {
  CaseListRequest,
} from './types/case-bridge';

const API_BASE_URL =
  'http://127.0.0.1:4000/api/v1';

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  );
}

const ALLOWED_PRIORITY_BANDS =
  new Set<CasePriorityBand>([
    'ROUTINE',
    'ELEVATED',
    'HIGH',
    'CRITICAL',
  ]);

function readOptionalPositiveInteger(
  value: Record<string, unknown>,
  key: string,
  maximum?: number,
): number | undefined {
  const supplied =
    value[key];

  if (supplied === undefined) {
    return undefined;
  }

  if (
    typeof supplied !== 'number' ||
    !Number.isSafeInteger(supplied) ||
    supplied < 1
  ) {
    throw new Error(
      `${key} must be a positive integer.`,
    );
  }

  if (
    maximum !== undefined &&
    supplied > maximum
  ) {
    throw new Error(
      `${key} cannot be greater than ${maximum}.`,
    );
  }

  return supplied;
}

function readOptionalPositiveIntegerArray(
  value: Record<string, unknown>,
  key: string,
): number[] | undefined {
  const supplied =
    value[key];

  if (supplied === undefined) {
    return undefined;
  }

  if (!Array.isArray(supplied)) {
    throw new Error(
      `${key} must be an array.`,
    );
  }

  const uniqueValues =
    new Set<number>();

  supplied.forEach((item) => {
    if (
      typeof item !== 'number' ||
      !Number.isSafeInteger(item) ||
      item < 1
    ) {
      throw new Error(
        `${key} must contain positive integers.`,
      );
    }

    uniqueValues.add(item);
  });

  return [
    ...uniqueValues,
  ];
}

function readOptionalPriorityBands(
  value: Record<string, unknown>,
): CasePriorityBand[] | undefined {
  const supplied =
    value.bands;

  if (supplied === undefined) {
    return undefined;
  }

  if (!Array.isArray(supplied)) {
    throw new Error(
      'bands must be an array.',
    );
  }

  const uniqueBands =
    new Set<CasePriorityBand>();

  supplied.forEach((item) => {
    if (
      typeof item !== 'string' ||
      !ALLOWED_PRIORITY_BANDS.has(
        item as CasePriorityBand,
      )
    ) {
      throw new Error(
        `Unsupported priority band: ${String(
          item,
        )}.`,
      );
    }

    uniqueBands.add(
      item as CasePriorityBand,
    );
  });

  return [
    ...uniqueBands,
  ];
}

function normalizePriorityQueueQuery(
  value: unknown,
): CasePriorityQueueQuery {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      'A priority queue query object is required.',
    );
  }

  return {
    page:
      readOptionalPositiveInteger(
        value,
        'page',
      ),

    pageSize:
      readOptionalPositiveInteger(
        value,
        'pageSize',
        100,
      ),

    bands:
      readOptionalPriorityBands(
        value,
      ),

    districtIds:
      readOptionalPositiveIntegerArray(
        value,
        'districtIds',
      ),

    policeStationIds:
      readOptionalPositiveIntegerArray(
        value,
        'policeStationIds',
      ),
  };
}

function getApiErrorMessage(
  payload: unknown,
  status: number,
): string {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === 'string'
  ) {
    return payload.error.message;
  }

  return `Kavach API request failed with status ${status}.`;
}

export async function requestJson<ResponseBody>(
  path: string,
): Promise<ResponseBody> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    },
  );

  let payload: unknown;

  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `Kavach API returned an unreadable response with status ${response.status}.`,
    );
  }

  if (!response.ok) {
    throw new Error(
      getApiErrorMessage(
        payload as ApiErrorResponse,
        response.status,
      ),
    );
  }

  return payload as ResponseBody;
}

function addQueryValue(
  parameters: URLSearchParams,
  key: string,
  value: string | number | undefined,
): void {
  if (value === undefined) {
    return;
  }

  const normalized = String(value).trim();

  if (normalized) {
    parameters.set(key, normalized);
  }
}

function addQueryList(
  parameters: URLSearchParams,
  key: string,

  values:
    readonly (
      string |
      number
    )[] |
    undefined,
): void {
  if (
    !values ||
    values.length === 0
  ) {
    return;
  }

  parameters.set(
    key,
    values.join(','),
  );
}

export async function fetchCaseList(
  request: CaseListRequest = {},
): Promise<CaseListResponse> {
  const parameters = new URLSearchParams();

  addQueryValue(
    parameters,
    'page',
    request.page ?? 1,
  );

  addQueryValue(
    parameters,
    'pageSize',
    request.pageSize ?? 25,
  );

  const filters = request.filters;

  if (filters) {
    addQueryValue(
      parameters,
      'search',
      filters.search,
    );

    addQueryValue(
      parameters,
      'districtId',
      filters.districtId,
    );

    addQueryValue(
      parameters,
      'policeStationId',
      filters.policeStationId,
    );

    addQueryValue(
      parameters,
      'categoryId',
      filters.categoryId,
    );

    addQueryValue(
      parameters,
      'gravityId',
      filters.gravityId,
    );

    addQueryValue(
      parameters,
      'statusId',
      filters.statusId,
    );

    addQueryValue(
      parameters,
      'majorCrimeHeadId',
      filters.majorCrimeHeadId,
    );

    addQueryValue(
      parameters,
      'minorCrimeHeadId',
      filters.minorCrimeHeadId,
    );

    addQueryValue(
      parameters,
      'registeredFrom',
      filters.registeredFrom,
    );

    addQueryValue(
      parameters,
      'registeredTo',
      filters.registeredTo,
    );
  }

  return requestJson<CaseListResponse>(
    `/cases?${parameters.toString()}`,
  );
}

export async function fetchCaseById(
  caseId: number,
): Promise<CaseDetail> {
  if (
    !Number.isSafeInteger(caseId) ||
    caseId < 1
  ) {
    throw new Error(
      'caseId must be a positive integer.',
    );
  }

  return requestJson<CaseDetail>(
    `/cases/${caseId}`,
  );
}

export async function fetchEntityById(
  entityId: number,
): Promise<EntityProfileDetail> {
  if (
    !Number.isSafeInteger(entityId) ||
    entityId < 1
  ) {
    throw new Error(
      'entityId must be a positive integer.',
    );
  }

  return requestJson<EntityProfileDetail>(
    `/entities/${entityId}`,
  );
}

export async function fetchCaseFilterOptions(): Promise<CaseFilterOptions> {
  return requestJson<CaseFilterOptions>(
    '/cases/filter-options',
  );
}

export async function fetchCaseDashboardSummary(): Promise<CaseDashboardSummary> {
  return requestJson<CaseDashboardSummary>(
    '/cases/dashboard-summary',
  );
}

export async function fetchCasePriorityAssessment(
  suppliedCaseId: unknown,
): Promise<CasePriorityAssessment> {
  if (
    typeof suppliedCaseId !==
      'number' ||
    !Number.isSafeInteger(
      suppliedCaseId,
    ) ||
    suppliedCaseId < 1
  ) {
    throw new Error(
      'caseId must be a positive integer.',
    );
  }

  return requestJson<
    CasePriorityAssessment
  >(
    `/cases/${suppliedCaseId}/priority`,
  );
}

export async function fetchPriorityQueue(
  suppliedQuery:
    unknown = {},
): Promise<CasePriorityQueueResponse> {
  const query =
    normalizePriorityQueueQuery(
      suppliedQuery,
    );

  const parameters =
    new URLSearchParams();

  addQueryValue(
    parameters,
    'page',
    query.page,
  );

  addQueryValue(
    parameters,
    'pageSize',
    query.pageSize,
  );

  addQueryList(
    parameters,
    'bands',
    query.bands,
  );

  addQueryList(
    parameters,
    'districtIds',
    query.districtIds,
  );

  addQueryList(
    parameters,
    'policeStationIds',
    query.policeStationIds,
  );

  const queryString =
    parameters.toString();

  return requestJson<
    CasePriorityQueueResponse
  >(
    queryString
      ? `/priority-queue?${queryString}`
      : '/priority-queue',
  );
}