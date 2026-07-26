import { contextBridge, ipcRenderer } from 'electron';
import type { KavachDesktopApi } from './types/desktop-api';
import type { CaseListRequest } from './types/case-bridge';

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',

  listCases: 'kavach:cases:list',
  getCaseById: 'kavach:cases:get-by-id',

  getEntityById: 'kavach:entities:get-by-id',

  getGraphNeighborhood: 'kavach:graph:get-neighborhood',

  getCasePriorityAssessment:
    'kavach:priority:get-case-assessment',

  getPriorityQueue:
    'kavach:priority:get-queue',

  getSimilarCases:
    'kavach:similarity:get-cases',

  getHotspotFilterOptions:
    'kavach:hotspots:get-filter-options',

  getHotspotSummary:
    'kavach:hotspots:get-summary',

  getHotspotLocationTrend:
    'kavach:hotspots:get-location-trend',

  getAnalyticsFilterOptions:
    'kavach:analytics:get-filter-options',

  getAnalyticsOverview:
    'kavach:analytics:get-overview',

  exportReport:
    'kavach:reports:export',

  getSecurityStatus:
    'kavach:security:get-status',

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
} as const;

const kavachDesktopApi: KavachDesktopApi = {
  cases: {
    list: (
      request?: CaseListRequest,
    ) =>
      ipcRenderer.invoke(
        'kavach:cases:list',
        request,
      ),

    getById: (
      caseId: number,
    ) =>
      ipcRenderer.invoke(
        'kavach:cases:get-by-id',
        caseId,
      ),

    getFilterOptions: () =>
      ipcRenderer.invoke(
        'kavach:cases:get-filter-options',
      ),

    getDashboardSummary: () =>
      ipcRenderer.invoke(
        'kavach:cases:get-dashboard-summary',
      ),
  },

  system: {
    getRuntimeInfo: () =>
      ipcRenderer.invoke(IPC_CHANNELS.getRuntimeInfo),
  },

  api: {
    getHealth: () =>
      ipcRenderer.invoke(IPC_CHANNELS.getApiHealth),
  },

  entities: {
    getById: (
      entityId: number,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.getEntityById,
        entityId,
      ),
  },

  graph: {
    getNeighborhood: (
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.getGraphNeighborhood,
        query,
      ),
  },

  priority: {
    getCaseAssessment: (
      caseId: number,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getCasePriorityAssessment,

        caseId,
      ),

    getQueue: (
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getPriorityQueue,

        query,
      ),
  },

  similarity: {
    getSimilarCases: (
      caseId: number,
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getSimilarCases,

        caseId,
        query,
      ),
  },

  hotspots: {
    getFilterOptions: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getHotspotFilterOptions,
      ),

    getSummary: (
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getHotspotSummary,

        query,
      ),

    getLocationTrend: (
      locationId: number,
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getHotspotLocationTrend,

        locationId,
        query,
      ),
  },

  analytics: {
    getFilterOptions: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getAnalyticsFilterOptions,
      ),

    getOverview: (
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getAnalyticsOverview,

        query,
      ),
  },

  reports: {
    exportDocument: (
      request,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .exportReport,

        request,
      ),
  },

  security: {
    getStatus: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getSecurityStatus,
      ),

    login: (
      request,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS.login,
        request,
      ),

    getSession: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getSecuritySession,
      ),

    logout: () =>
      ipcRenderer.invoke(
        IPC_CHANNELS.logout,
      ),

    getAuditLog: (
      query,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .getSecurityAudit,
        query,
      ),

    recordAuditEvent: (
      request,
    ) =>
      ipcRenderer.invoke(
        IPC_CHANNELS
          .recordSecurityAuditEvent,
        request,
      ),

    onSessionExpired: (
      listener: () => void,
    ) => {
      const handler = (): void => {
        listener();
      };

      ipcRenderer.on(
        IPC_CHANNELS
          .sessionExpired,
        handler,
      );

      return () => {
        ipcRenderer.removeListener(
          IPC_CHANNELS
            .sessionExpired,
          handler,
        );
      };
    },
  },
};

contextBridge.exposeInMainWorld('kavach', kavachDesktopApi);