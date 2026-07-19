import { contextBridge, ipcRenderer } from 'electron';
import type { KavachDesktopApi } from './types/desktop-api';

const kavachDesktopApi: KavachDesktopApi = {
  system: {
    getRuntimeInfo: () =>
      ipcRenderer.invoke('kavach:system:get-runtime-info'),
  },
};

contextBridge.exposeInMainWorld('kavach', kavachDesktopApi);