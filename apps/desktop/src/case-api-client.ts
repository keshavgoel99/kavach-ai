import type {
  ApiErrorResponse,
  CaseDetail,
  CaseListResponse,
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

async function requestJson<ResponseBody>(
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