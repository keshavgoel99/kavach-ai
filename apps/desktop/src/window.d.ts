import type { KavachDesktopApi } from './types/desktop-api';

declare global {
  interface Window {
    kavach: KavachDesktopApi;
  }
}

export {};