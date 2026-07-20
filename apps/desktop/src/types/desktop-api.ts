import type { ApiHealth } from '@kavach/shared-types';

export interface RuntimeInfo {
  appName: string;
  appVersion: string;
  platform: string;
  architecture: string;
  electronVersion: string;
  nodeVersion: string;
  chromeVersion: string;
}

export interface KavachDesktopApi {
  system: {
    getRuntimeInfo: () => Promise<RuntimeInfo>;
  };

  api: {
    getHealth: () => Promise<ApiHealth>;
  };
}