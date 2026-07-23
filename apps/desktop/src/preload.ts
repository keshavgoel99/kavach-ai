import { contextBridge, ipcRenderer } from 'electron';
import type { KavachDesktopApi } from './types/desktop-api';

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',

  listCases: 'kavach:cases:list',
  getCaseById: 'kavach:cases:get-by-id',
} as const;

const kavachDesktopApi: KavachDesktopApi = {
  cases: {
    list: (request) =>
      ipcRenderer.invoke(IPC_CHANNELS.listCases, request),

    getById: (caseId) =>
      ipcRenderer.invoke(IPC_CHANNELS.getCaseById, caseId),
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