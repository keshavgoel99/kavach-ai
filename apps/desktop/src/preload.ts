import { contextBridge, ipcRenderer } from 'electron';
import type { KavachDesktopApi } from './types/desktop-api';

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',
} as const;

const kavachDesktopApi: KavachDesktopApi = {
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