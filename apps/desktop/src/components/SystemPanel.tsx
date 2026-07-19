import { useEffect, useState } from 'react';
import type { RuntimeInfo } from '../types/desktop-api';

type RuntimeState =
  | {
      status: 'loading';
    }
  | {
      status: 'ready';
      info: RuntimeInfo;
    }
  | {
      status: 'error';
      message: string;
    };

function formatPlatform(platform: string): string {
  const platformNames: Record<string, string> = {
    win32: 'Windows',
    darwin: 'macOS',
    linux: 'Linux',
  };

  return platformNames[platform] ?? platform;
}

export function SystemPanel() {
  const [runtime, setRuntime] = useState<RuntimeState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    window.kavach.system
      .getRuntimeInfo()
      .then((info) => {
        if (isMounted) {
          setRuntime({
            status: 'ready',
            info,
          });
        }
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'Desktop bridge could not be reached.';

        setRuntime({
          status: 'error',
          message,
        });
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <article className="panel">
      <div className="panel__header">
        <div>
          <p className="panel__eyebrow">System</p>
          <h3>Runtime diagnostics</h3>
        </div>

        <span
          className={`runtime-badge ${
            runtime.status === 'ready'
              ? 'runtime-badge--online'
              : runtime.status === 'error'
                ? 'runtime-badge--error'
                : ''
          }`}
        >
          <span className="runtime-badge__dot" />

          {runtime.status === 'ready'
            ? 'LIVE'
            : runtime.status === 'error'
              ? 'FAULT'
              : 'LINKING'}
        </span>
      </div>

      {runtime.status === 'loading' && (
        <p className="runtime-message">
          Establishing secure desktop bridge…
        </p>
      )}

      {runtime.status === 'error' && (
        <p className="runtime-message runtime-message--error">
          {runtime.message}
        </p>
      )}

      {runtime.status === 'ready' && (
        <dl className="system-list">
          <div>
            <dt>Application</dt>
            <dd>{runtime.info.appName}</dd>
          </div>

          <div>
            <dt>Version</dt>
            <dd>v{runtime.info.appVersion}</dd>
          </div>

          <div>
            <dt>Operating system</dt>
            <dd>
              {formatPlatform(runtime.info.platform)} ·{' '}
              {runtime.info.architecture}
            </dd>
          </div>

          <div>
            <dt>Electron</dt>
            <dd>v{runtime.info.electronVersion}</dd>
          </div>

          <div>
            <dt>Node runtime</dt>
            <dd>v{runtime.info.nodeVersion}</dd>
          </div>

          <div>
            <dt>Security bridge</dt>
            <dd>Isolated · operational</dd>
          </div>
        </dl>
      )}
    </article>
  );
}