export interface RuntimeInfo {
  appName: string;
  appVersion: string;
  platform: string;
  architecture: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export interface ApiHealth {
  status: 'ok';
  service: string;
  version: string;
  timestamp: string;
  uptimeSeconds: number;
}

export interface KavachDesktopApi {
  system: {
    getRuntimeInfo: () => Promise<RuntimeInfo>;
  };

  api: {
    getHealth: () => Promise<ApiHealth>;
  };
}