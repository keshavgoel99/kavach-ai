import type {
  CaseBridge,
} from './case-bridge';
import type {
  EntityDesktopApi,
} from './entity-bridge';
import type {
  GraphDesktopApi,
} from './graph-bridge';
import type {
  PriorityDesktopApi,
} from './priority-bridge';
import type {
  SimilarityDesktopApi,
} from './similarity-bridge';

import type {
  HotspotDesktopApi,
} from './hotspot-bridge';

import type {
  AnalyticsDesktopApi,
} from './analytics-bridge';

import type {
  ReportDesktopApi,
} from './report-bridge';

import type {
  SecurityDesktopApi,
} from './security-bridge';

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

  graph: GraphDesktopApi;
  priority: PriorityDesktopApi;

  similarity: SimilarityDesktopApi;

  hotspots: HotspotDesktopApi;

  analytics: AnalyticsDesktopApi;

  reports: ReportDesktopApi;

  security:
    SecurityDesktopApi;
}