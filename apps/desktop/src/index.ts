import { app, BrowserWindow, ipcMain } from 'electron';
import type {
  ApiHealth,
  InvestigationGraphQuery,
  InvestigationGraphRelationshipType,
  InvestigationGraphResponse,
} from '@kavach/shared-types';

import {
  fetchCaseById,
  fetchCaseDashboardSummary,
  fetchCaseFilterOptions,
  fetchCaseList,
  fetchCasePriorityAssessment,
  fetchEntityById,
  fetchPriorityQueue,
  fetchSimilarCases,
  fetchAnalyticsFilterOptions,
  fetchAnalyticsOverview,
  requestJson,
} from './case-api-client';

import type {
  CaseListRequest,
} from './types/case-bridge';

import {
  exportReportDocument,
} from './reports/report-exporter';

// Handle creating/removing shortcuts on Windows during installation.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',
  getGraphNeighborhood: 'kavach:graph:get-neighborhood',
  getCasePriorityAssessment:
    'kavach:priority:get-case-assessment',
  getPriorityQueue:
    'kavach:priority:get-queue',
  getSimilarCases:
    'kavach:similarity:get-cases',
  getAnalyticsFilterOptions:
    'kavach:analytics:get-filter-options',
  getAnalyticsOverview:
    'kavach:analytics:get-overview',
  exportReport:
    'kavach:reports:export',
} as const;

const ALLOWED_GRAPH_RELATIONSHIPS =
  new Set<
    InvestigationGraphRelationshipType
  >([
    'OCCURRED_AT',
    'ACCUSED_IN',
    'USES_IDENTIFIER',
    'CO_ACCUSED',
    'LINKED_TO_ACCOUNT',
    'MEMBER_OF',
    'GANG_ASSOCIATION',
    'CO_WORKER',
    'FAMILY',
    'SHARED_ADDRESS',
  ]);

function validateGraphQuery(
  value: unknown,
): InvestigationGraphQuery {
  if (
    typeof value !== 'object' ||
    value === null
  ) {
    throw new Error(
      'A graph query object is required.',
    );
  }

  const supplied =
    value as Partial<
      InvestigationGraphQuery
    >;

  if (
    typeof supplied.rootNodeId !==
    'string'
  ) {
    throw new Error(
      'rootNodeId must be a string.',
    );
  }

  const rootNodeId =
    supplied.rootNodeId.trim();

  if (
    !rootNodeId ||
    rootNodeId.length > 128
  ) {
    throw new Error(
      'rootNodeId is invalid.',
    );
  }

  const depth =
    supplied.depth ?? 1;

  if (
    depth !== 1 &&
    depth !== 2
  ) {
    throw new Error(
      'depth must be either 1 or 2.',
    );
  }

  const nodeLimit =
    supplied.nodeLimit ?? 80;

  if (
    !Number.isSafeInteger(nodeLimit) ||
    nodeLimit < 2 ||
    nodeLimit > 200
  ) {
    throw new Error(
      'nodeLimit must be between 2 and 200.',
    );
  }

  let relationshipTypes:
    InvestigationGraphRelationshipType[] |
    undefined;

  if (
    supplied.relationshipTypes !==
    undefined
  ) {
    if (
      !Array.isArray(
        supplied.relationshipTypes,
      )
    ) {
      throw new Error(
        'relationshipTypes must be an array.',
      );
    }

    const uniqueRelationships =
      new Set<
        InvestigationGraphRelationshipType
      >();

    supplied.relationshipTypes.forEach(
      (relationshipType) => {
        if (
          typeof relationshipType !==
            'string' ||
          !ALLOWED_GRAPH_RELATIONSHIPS.has(
            relationshipType as
              InvestigationGraphRelationshipType,
          )
        ) {
          throw new Error(
            `Unsupported graph relationship: ${String(
              relationshipType,
            )}`,
          );
        }

        uniqueRelationships.add(
          relationshipType as
            InvestigationGraphRelationshipType,
        );
      },
    );

    if (
      uniqueRelationships.size > 0
    ) {
      relationshipTypes = [
        ...uniqueRelationships,
      ];
    }
  }

  return {
    rootNodeId,
    depth,
    nodeLimit,
    relationshipTypes,
  };
}

function createGraphNeighborhoodPath(
  query: InvestigationGraphQuery,
): string {
  const parameters =
    new URLSearchParams();

  parameters.set(
    'rootNodeId',
    query.rootNodeId,
  );

  parameters.set(
    'depth',
    String(query.depth ?? 1),
  );

  parameters.set(
    'nodeLimit',
    String(query.nodeLimit ?? 80),
  );

  if (
    query.relationshipTypes &&
    query.relationshipTypes.length > 0
  ) {
    parameters.set(
      'relationshipTypes',
      query.relationshipTypes.join(','),
    );
  }

  return (
    '/graph/neighborhood?' +
    parameters.toString()
  );
}

const API_BASE_URL =
  process.env.KAVACH_API_BASE_URL ?? 'http://127.0.0.1:4000';

async function requestApiHealth(): Promise<ApiHealth> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 2_500);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/v1/health`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(
        `Kavach API returned HTTP ${response.status}.`,
      );
    }

    return (await response.json()) as ApiHealth;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Kavach API health check timed out.');
    }

    if (error instanceof Error) {
      throw new Error(`Kavach API is unavailable: ${error.message}`);
    }

    throw new Error('Kavach API is unavailable.');
  } finally {
    clearTimeout(timeout);
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(
    'kavach:cases:list',
    (
      _event,
      request?: CaseListRequest,
    ) => fetchCaseList(request),
  );

  ipcMain.handle(
    'kavach:cases:get-by-id',
    (
      _event,
      caseId: number,
    ) => fetchCaseById(caseId),
  );

  ipcMain.handle(
    'kavach:entities:get-by-id',
    (
      _event,
      entityId: number,
    ) => fetchEntityById(entityId),
  );

  ipcMain.handle(
    IPC_CHANNELS.getGraphNeighborhood,
    async (
      _event,
      suppliedQuery: unknown,
    ): Promise<InvestigationGraphResponse> => {
      const query =
        validateGraphQuery(
          suppliedQuery,
        );

      return requestJson<
        InvestigationGraphResponse
      >(
        createGraphNeighborhoodPath(
          query,
        ),
      );
    },
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getCasePriorityAssessment,

    (
      _event,
      suppliedCaseId: unknown,
    ) =>
      fetchCasePriorityAssessment(
        suppliedCaseId,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getPriorityQueue,

    (
      _event,
      suppliedQuery: unknown,
    ) =>
      fetchPriorityQueue(
        suppliedQuery,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getSimilarCases,

    (
      _event,
      suppliedCaseId: unknown,
      suppliedQuery: unknown,
    ) =>
      fetchSimilarCases(
        suppliedCaseId,
        suppliedQuery,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getAnalyticsFilterOptions,

    () =>
      fetchAnalyticsFilterOptions(),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getAnalyticsOverview,

    (
      _event,
      suppliedQuery: unknown,
    ) =>
      fetchAnalyticsOverview(
        suppliedQuery,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS.exportReport,

    (
      _event,
      suppliedRequest: unknown,
    ) =>
      exportReportDocument(
        suppliedRequest,
      ),
  );

  ipcMain.handle(
    'kavach:cases:get-filter-options',
    () => fetchCaseFilterOptions(),
  );

  ipcMain.handle(
    'kavach:cases:get-dashboard-summary',
    () => fetchCaseDashboardSummary(),
  );

  ipcMain.handle(
    IPC_CHANNELS.getRuntimeInfo,
    () => ({
      appName: app.getName(),
      appVersion: app.getVersion(),
      platform: process.platform,
      architecture: process.arch,
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
    }),
  );

  ipcMain.handle(
    IPC_CHANNELS.getApiHealth,
    requestApiHealth,
  );
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    title: 'Kavach AI',
    backgroundColor: '#09111f',

    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  void mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({
      mode: 'detach',
    });
  }
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
