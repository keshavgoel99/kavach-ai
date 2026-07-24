import type {
  CaseBridge,
} from './case-bridge';
import type {
  EntityDesktopApi,
} from './entity-bridge';
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
  cases: CaseBridge;
  system: {
    getRuntimeInfo: () => Promise<RuntimeInfo>;
  };

  api: {
    getHealth: () => Promise<ApiHealth>;
  };

  entities: EntityDesktopApi;
}