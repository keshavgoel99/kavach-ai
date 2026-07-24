import { app, BrowserWindow, ipcMain } from 'electron';
import type { ApiHealth } from '@kavach/shared-types';

import {
  fetchCaseById,
  fetchCaseFilterOptions,
  fetchCaseList,
} from './case-api-client';

import type {
  CaseListRequest,
} from './types/case-bridge';

// Handle creating/removing shortcuts on Windows during installation.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
  getApiHealth: 'kavach:api:get-health',
} as const;

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
    'kavach:cases:get-filter-options',
    () => fetchCaseFilterOptions(),
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