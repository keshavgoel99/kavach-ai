import type {
  ApiErrorResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthSession,
  AuthStatusResponse,
  CaseDashboardSummary,
  CaseDetail,
  CaseFilterOptions,
  CaseListResponse,
  CasePriorityAssessment,
  CasePriorityBand,
  CasePriorityQueueQuery,
  CasePriorityQueueResponse,
  ClientAuditEventRequest,
  EntityProfileDetail,
  HotspotFilterOptions,
  HotspotLocationTrendResponse,
  HotspotRiskBand,
  HotspotSummaryQuery,
  HotspotSummaryResponse,
  AnalyticsFilterOptions,
  AnalyticsOverviewResponse,
  AnalyticsQuery,
  HotspotTrendQuery,
  SecurityAuditQuery,
  SecurityAuditResponse,
  SimilarCasesQuery,
  SimilarCasesResponse,
} from '@kavach/shared-types';

import type {
  CaseListRequest,
} from './types/case-bridge';

const API_BASE_URL =
  'http://127.0.0.1:4000/api/v1';

let apiAccessToken:
  string | null = null;

let cachedAuthSession:
  AuthSession | null = null;

type AuthenticationInvalidatedListener =
  () => void;

let authenticationInvalidatedListener:
  AuthenticationInvalidatedListener |
  null = null;

export function setAuthenticationInvalidatedListener(
  listener:
    AuthenticationInvalidatedListener |
    null,
): void {
  authenticationInvalidatedListener =
    listener;
}

function invalidateAuthentication(): void {
  const hadAuthentication =
    apiAccessToken !== null ||
    cachedAuthSession !== null;

  apiAccessToken = null;
  cachedAuthSession = null;

  if (hadAuthentication) {
    authenticationInvalidatedListener?.();
  }
}

export function getCachedAuthSession(): AuthSession | null {
  return cachedAuthSession;
}

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
  init:
    RequestInit = {},
): Promise<ResponseBody> {
  const headers =
    new Headers(
      init.headers,
    );

  headers.set(
    'accept',
    'application/json',
  );

  if (apiAccessToken) {
    headers.set(
      'authorization',
      `Bearer ${apiAccessToken}`,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...init,
      headers,
    },
  );

  if (
    response.status === 401 &&
    path !== '/auth/login' &&
    path !== '/auth/status'
  ) {
    invalidateAuthentication();
  }

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

function normalizeSimilarCasesQuery(
  value: unknown,
): SimilarCasesQuery {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      'A similar-cases query object is required.',
    );
  }

  const suppliedLimit =
    value.limit;

  const suppliedMinimumScore =
    value.minimumScore;

  let limit:
    number | undefined;

  let minimumScore:
    number | undefined;

  if (
    suppliedLimit !== undefined
  ) {
    if (
      typeof suppliedLimit !==
        'number' ||
      !Number.isSafeInteger(
        suppliedLimit,
      ) ||
      suppliedLimit < 1
    ) {
      throw new Error(
        'limit must be a positive integer.',
      );
    }

    if (
      suppliedLimit > 50
    ) {
      throw new Error(
        'limit cannot be greater than 50.',
      );
    }

    limit = suppliedLimit;
  }

  if (
    suppliedMinimumScore !==
      undefined
  ) {
    if (
      typeof suppliedMinimumScore !==
        'number' ||
      !Number.isFinite(
        suppliedMinimumScore,
      ) ||
      suppliedMinimumScore < 0 ||
      suppliedMinimumScore > 100
    ) {
      throw new Error(
        'minimumScore must be between 0 and 100.',
      );
    }

    minimumScore =
      suppliedMinimumScore;
  }

  return {
    limit,
    minimumScore,
  };
}

export async function fetchSimilarCases(
  suppliedCaseId: unknown,

  suppliedQuery:
    unknown = {},
): Promise<SimilarCasesResponse> {
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

  const query =
    normalizeSimilarCasesQuery(
      suppliedQuery,
    );

  const parameters =
    new URLSearchParams();

  if (
    query.limit !== undefined
  ) {
    parameters.set(
      'limit',
      String(query.limit),
    );
  }

  if (
    query.minimumScore !==
      undefined
  ) {
    parameters.set(
      'minimumScore',
      String(
        query.minimumScore,
      ),
    );
  }

  const queryString =
    parameters.toString();

  return requestJson<
    SimilarCasesResponse
  >(
    queryString
      ? (
          `/cases/${suppliedCaseId}` +
          `/similar?${queryString}`
        )
      : (
          `/cases/${suppliedCaseId}` +
          '/similar'
        ),
  );
}

const ALLOWED_HOTSPOT_RISK_BANDS =
  new Set<HotspotRiskBand>([
    'LOW',
    'MODERATE',
    'HIGH',
    'CRITICAL',
  ]);

function normalizeHotspotRiskBands(
  value: unknown,
): HotspotRiskBand[] |
undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(
      'riskBands must be an array.',
    );
  }

  const result =
    new Set<HotspotRiskBand>();

  value.forEach(
    (item) => {
      if (
        typeof item !== 'string' ||
        !ALLOWED_HOTSPOT_RISK_BANDS.has(
          item as
            HotspotRiskBand,
        )
      ) {
        throw new Error(
          `Unsupported hotspot risk band: ${String(
            item,
          )}.`,
        );
      }

      result.add(
        item as HotspotRiskBand,
      );
    },
  );

  return [
    ...result,
  ];
}

function normalizeHotspotSummaryQuery(
  value: unknown,
): HotspotSummaryQuery {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      'A hotspot summary query object is required.',
    );
  }

  return {
    year:
      readOptionalPositiveInteger(
        value,
        'year',
      ),

    month:
      readOptionalPositiveInteger(
        value,
        'month',
        12,
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

    riskBands:
      normalizeHotspotRiskBands(
        value.riskBands,
      ),

    limit:
      readOptionalPositiveInteger(
        value,
        'limit',
        180,
      ),
  };
}

function normalizeHotspotTrendQuery(
  value: unknown,
): HotspotTrendQuery {
  if (value === undefined) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      'A hotspot trend query object is required.',
    );
  }

  return {
    months:
      readOptionalPositiveInteger(
        value,
        'months',
        41,
      ),
  };
}

function normalizeAnalyticsDate(
  value: unknown,
  label: string,
): string | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (
    typeof value !== 'string'
  ) {
    throw new Error(
      `${label} must be a date string.`,
    );
  }

  const cleaned =
    value.trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      cleaned,
    )
  ) {
    throw new Error(
      `${label} must use YYYY-MM-DD format.`,
    );
  }

  const date =
    new Date(
      `${cleaned}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
      cleaned
  ) {
    throw new Error(
      `${label} must contain a valid date.`,
    );
  }

  return cleaned;
}

function normalizeAnalyticsIdList(
  value: unknown,
  label: string,
): number[] | undefined {
  if (
    value === undefined
  ) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `${label} must be an array.`,
    );
  }

  const result =
    new Set<number>();

  value.forEach(
    (item) => {
      if (
        typeof item !== 'number' ||
        !Number.isSafeInteger(
          item,
        ) ||
        item < 1
      ) {
        throw new Error(
          `${label} must contain positive integers.`,
        );
      }

      result.add(item);
    },
  );

  return [
    ...result,
  ];
}

function normalizeAnalyticsQuery(
  value: unknown,
): AnalyticsQuery {
  if (
    value === undefined
  ) {
    return {};
  }

  if (!isRecord(value)) {
    throw new Error(
      'An analytics query object is required.',
    );
  }

  const registeredFrom =
    normalizeAnalyticsDate(
      value.registeredFrom,
      'registeredFrom',
    );

  const registeredTo =
    normalizeAnalyticsDate(
      value.registeredTo,
      'registeredTo',
    );

  if (
    registeredFrom &&
    registeredTo &&
    registeredFrom >
      registeredTo
  ) {
    throw new Error(
      'registeredFrom cannot be after registeredTo.',
    );
  }

  return {
    registeredFrom,
    registeredTo,

    districtIds:
      normalizeAnalyticsIdList(
        value.districtIds,
        'districtIds',
      ),

    policeStationIds:
      normalizeAnalyticsIdList(
        value.policeStationIds,
        'policeStationIds',
      ),

    majorCrimeHeadIds:
      normalizeAnalyticsIdList(
        value.majorCrimeHeadIds,
        'majorCrimeHeadIds',
      ),
  };
}

function addAnalyticsList(
  parameters:
    URLSearchParams,

  key: string,

  values:
    readonly number[] |
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

export async function fetchHotspotFilterOptions(): Promise<HotspotFilterOptions> {
  return requestJson<HotspotFilterOptions>(
    '/hotspots/filter-options',
  );
}

export async function fetchHotspotSummary(
  suppliedQuery:
    unknown = {},
): Promise<HotspotSummaryResponse> {
  const query =
    normalizeHotspotSummaryQuery(
      suppliedQuery,
    );

  const parameters =
    new URLSearchParams();

  addQueryValue(
    parameters,
    'year',
    query.year,
  );

  addQueryValue(
    parameters,
    'month',
    query.month,
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

  addQueryList(
    parameters,
    'riskBands',
    query.riskBands,
  );

  addQueryValue(
    parameters,
    'limit',
    query.limit,
  );

  const queryString =
    parameters.toString();

  return requestJson<
    HotspotSummaryResponse
  >(
    queryString
      ? `/hotspots/summary?${queryString}`
      : '/hotspots/summary',
  );
}

export async function fetchHotspotLocationTrend(
  locationId: number,
  suppliedQuery:
    unknown = {},
): Promise<HotspotLocationTrendResponse> {
  if (
    !Number.isSafeInteger(locationId) ||
    locationId < 1
  ) {
    throw new Error(
      'locationId must be a positive integer.',
    );
  }

  const query =
    normalizeHotspotTrendQuery(
      suppliedQuery,
    );

  const parameters =
    new URLSearchParams();

  addQueryValue(
    parameters,
    'months',
    query.months,
  );

  const queryString =
    parameters.toString();

  return requestJson<
    HotspotLocationTrendResponse
  >(
    queryString
      ? `/hotspots/locations/${locationId}/trend?${queryString}`
      : `/hotspots/locations/${locationId}/trend`,
  );
}
export async function fetchAnalyticsFilterOptions(): Promise<AnalyticsFilterOptions> {
  return requestJson<
    AnalyticsFilterOptions
  >(
    '/analytics/filter-options',
  );
}

export async function fetchAnalyticsOverview(
  suppliedQuery:
    unknown = {},
): Promise<AnalyticsOverviewResponse> {
  const query =
    normalizeAnalyticsQuery(
      suppliedQuery,
    );

  const parameters =
    new URLSearchParams();

  addQueryValue(
    parameters,
    'registeredFrom',
    query.registeredFrom,
  );

  addQueryValue(
    parameters,
    'registeredTo',
    query.registeredTo,
  );

  addAnalyticsList(
    parameters,
    'districtIds',
    query.districtIds,
  );

  addAnalyticsList(
    parameters,
    'policeStationIds',
    query.policeStationIds,
  );

  addAnalyticsList(
    parameters,
    'majorCrimeHeadIds',
    query.majorCrimeHeadIds,
  );

  const queryString =
    parameters.toString();

  return requestJson<
    AnalyticsOverviewResponse
  >(
    queryString
      ? "/analytics/overview?${queryString}"
      : '/analytics/overview',
  );
}

export async function fetchAuthStatus(): Promise<AuthStatusResponse> {
  return requestJson<
    AuthStatusResponse
  >(
    '/auth/status',
  );
}

export async function loginOperator(
  suppliedRequest:
    unknown,
): Promise<AuthSession> {
  if (
    !isRecord(
      suppliedRequest,
    ) ||
    typeof suppliedRequest
      .username !==
      'string' ||
    typeof suppliedRequest
      .password !==
      'string'
  ) {
    throw new Error(
      'Username and password are required.',
    );
  }

  const request:
    AuthLoginRequest = {
    username:
      suppliedRequest
        .username
        .trim(),

    password:
      suppliedRequest.password,
  };

  const response =
    await requestJson<
      AuthLoginResponse
    >(
      '/auth/login',

      {
        method: 'POST',

        headers: {
          'content-type':
            'application/json',
        },

        body:
          JSON.stringify(
            request,
          ),
      },
    );

  apiAccessToken =
    response.accessToken;

  cachedAuthSession =
    response.session;

  return response.session;
}

export async function fetchCurrentAuthSession(): Promise<AuthSession | null> {
  if (!apiAccessToken) {
    cachedAuthSession =
      null;

    return null;
  }

  try {
    const session =
      await requestJson<
        AuthSession
      >(
        '/auth/session',
      );

    cachedAuthSession =
      session;

    return session;
  } catch {
    invalidateAuthentication();

    return null;
  }
}

export async function logoutOperator(): Promise<void> {
  try {
    if (apiAccessToken) {
      await requestJson<void>(
        '/auth/logout',

        {
          method: 'POST',
        },
      );
    }
  } finally {
    invalidateAuthentication();
  }
}

export async function fetchSecurityAuditLog(
  suppliedQuery:
    unknown = {},
): Promise<SecurityAuditResponse> {
  if (
    suppliedQuery !==
      undefined &&
    !isRecord(
      suppliedQuery,
    )
  ) {
    throw new Error(
      'An audit query object is required.',
    );
  }

  const query =
    suppliedQuery as
      SecurityAuditQuery;

  const parameters =
    new URLSearchParams();

  if (
    query.limit !==
      undefined
  ) {
    if (
      !Number.isSafeInteger(
        query.limit,
      ) ||
      query.limit < 1 ||
      query.limit > 500
    ) {
      throw new Error(
        'Audit limit must be between 1 and 500.',
      );
    }

    parameters.set(
      'limit',
      String(query.limit),
    );
  }

  if (
    query.eventTypes &&
    query.eventTypes.length >
      0
  ) {
    parameters.set(
      'eventTypes',

      query.eventTypes.join(
        ',',
      ),
    );
  }

  const queryString =
    parameters.toString();

  return requestJson<
    SecurityAuditResponse
  >(
    queryString
      ? `/security/audit?${queryString}`
      : '/security/audit',
  );
}

export async function recordSecurityAuditEvent(
  suppliedRequest:
    unknown,
): Promise<void> {
  if (
    !isRecord(
      suppliedRequest,
    )
  ) {
    throw new Error(
      'An audit event is required.',
    );
  }

  await requestJson<void>(
    '/security/audit/events',

    {
      method: 'POST',

      headers: {
        'content-type':
          'application/json',
      },

      body:
        JSON.stringify(
          suppliedRequest as
            unknown as
            ClientAuditEventRequest,
        ),
    },
  );
}
