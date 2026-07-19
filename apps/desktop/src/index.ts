import { app, BrowserWindow, ipcMain } from 'electron';

// Handle creating/removing shortcuts on Windows during installation.
if (require('electron-squirrel-startup')) {
  app.quit();
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const IPC_CHANNELS = {
  getRuntimeInfo: 'kavach:system:get-runtime-info',
} as const;

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.getRuntimeInfo, () => ({
    appName: app.getName(),
    appVersion: app.getVersion(),
    platform: process.platform,
    architecture: process.arch,
    electronVersion: process.versions.electron,
    nodeVersion: process.versions.node,
    chromeVersion: process.versions.chrome,
  }));
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