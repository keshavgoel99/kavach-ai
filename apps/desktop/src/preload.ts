import { contextBridge, ipcRenderer } from 'electron';
import type { KavachDesktopApi } from './types/desktop-api';
import type { CaseListRequest } from './types/case-bridge';

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',

  listCases: 'kavach:cases:list',
  getCaseById: 'kavach:cases:get-by-id',
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
};

contextBridge.exposeInMainWorld('kavach', kavachDesktopApi);