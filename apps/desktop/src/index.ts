import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  session,
} from 'electron';

import {
  initializeKavachRuntime,
  stopKavachRuntime,
} from './release/runtime-bootstrap';

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
  fetchAuthStatus,
  fetchCurrentAuthSession,
  fetchSecurityAuditLog,
  loginOperator,
  logoutOperator,
  bootstrapAdministrator,
  recordSecurityAuditEvent,
  requestJson,
  setAuthenticationInvalidatedListener,
  getConfiguredApiBaseUrl,
  fetchIntelligenceAssistantResponse,
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

  getSecurityStatus:
    'kavach:security:get-status',

  bootstrapAdministrator:
    'kavach:security:bootstrap-administrator',

  login:
    'kavach:security:login',

  getSecuritySession:
    'kavach:security:get-session',

  logout:
    'kavach:security:logout',

  getSecurityAudit:
    'kavach:security:get-audit',

  recordSecurityAuditEvent:
    'kavach:security:record-audit-event',

  sessionExpired:
    'kavach:security:session-expired',

  queryAssistant:
    'kavach:assistant:query',
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

async function requestApiHealth(): Promise<ApiHealth> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 2_500);

  try {
    const response = await fetch(
      `${getConfiguredApiBaseUrl()}/health`,
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

  ipcMain.handle(
    IPC_CHANNELS
      .getSecurityStatus,

    () =>
      fetchAuthStatus(),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .bootstrapAdministrator,

    (
      _event,
      request: unknown,
    ) =>
      bootstrapAdministrator(
        request,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS.login,

    (
      _event,
      request: unknown,
    ) =>
      loginOperator(
        request,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getSecuritySession,

    () =>
      fetchCurrentAuthSession(),
  );

  ipcMain.handle(
    IPC_CHANNELS.logout,

    () =>
      logoutOperator(),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .getSecurityAudit,

    (
      _event,
      query: unknown,
    ) =>
      fetchSecurityAuditLog(
        query,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .recordSecurityAuditEvent,

    (
      _event,
      request: unknown,
    ) =>
      recordSecurityAuditEvent(
        request,
      ),
  );

  ipcMain.handle(
    IPC_CHANNELS
      .queryAssistant,

    (
      _event,
      request: unknown,
    ) =>
      fetchIntelligenceAssistantResponse(
        request,
      ),
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

      webSecurity: true,
      allowRunningInsecureContent:
        false,

      devTools:
        !app.isPackaged,

      spellcheck:
        false,
    },
  });

  mainWindow.webContents
    .setWindowOpenHandler(
      () => ({
        action: 'deny',
      }),
    );

  mainWindow.webContents.on(
    'will-navigate',
    (
      event,
      navigationUrl,
    ) => {
      const currentUrl =
        mainWindow
          .webContents
          .getURL();

      const currentOrigin =
        currentUrl
          ? new URL(
              currentUrl,
            ).origin
          : null;

      const targetOrigin =
        new URL(
          navigationUrl,
        ).origin;

      if (
        currentOrigin &&
        targetOrigin !==
          currentOrigin
      ) {
        event.preventDefault();
      }
    },
  );

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

app.whenReady()
  .then(
    async () => {
      await initializeKavachRuntime();

      registerIpcHandlers();

  session.defaultSession
    .webRequest
    .onHeadersReceived(
      (
        details,
        callback,
      ) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,

            'Content-Security-Policy': [
              [
                "default-src 'self'",
                "script-src 'self'",
                "style-src 'self' 'unsafe-inline'",
                "img-src 'self' data:",
                "font-src 'self' data:",
                "connect-src 'self'",
                "object-src 'none'",
                "frame-src 'none'",
                "base-uri 'none'",
                "form-action 'self'",
              ].join('; '),
            ],
          },
        });
      },
    );
  
  setAuthenticationInvalidatedListener(
    () => {
      BrowserWindow
        .getAllWindows()
        .forEach(
          (window) => {
            if (
              !window.isDestroyed()
            ) {
              window.webContents.send(
                IPC_CHANNELS
                  .sessionExpired,
              );
            }
          },
        );
    },
  );

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})
.catch(
  (
    error: unknown,
  ) => {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      'KAVACH STARTUP FAILED',
    );

    console.error(
      message,
    );

    dialog.showErrorBox(
      'KAVACH AI could not start',
      message,
    );

    app.quit();
  },
);

let runtimeShutdownStarted =
  false;

app.on(
  'before-quit',
  (
    event,
  ) => {
    if (
      runtimeShutdownStarted
    ) {
      return;
    }

    runtimeShutdownStarted =
      true;

    event.preventDefault();

    void stopKavachRuntime()
      .catch(
        (
          error: unknown,
        ) => {
          console.error(
            'KAVACH runtime shutdown failed.',
          );

          console.error(
            error,
          );
        },
      )
      .finally(
        () => {
          app.quit();
        },
      );
  },
);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
