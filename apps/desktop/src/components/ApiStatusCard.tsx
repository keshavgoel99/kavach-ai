import { useEffect, useState } from 'react';
import type { ApiHealth } from '@kavach/shared-types';

type ApiState =
  | {
      status: 'loading';
    }
  | {
      status: 'online';
      health: ApiHealth;
      latencyMilliseconds: number;
    }
  | {
      status: 'offline';
      message: string;
    };

export function ApiStatusCard() {
  const [apiState, setApiState] = useState<ApiState>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    async function checkApi(): Promise<void> {
      const startedAt = performance.now();

      try {
        const health = await window.kavach.api.getHealth();

        if (!isMounted) {
          return;
        }

        setApiState({
          status: 'online',
          health,
          latencyMilliseconds: Math.round(
            performance.now() - startedAt,
          ),
        });
      } catch (error: unknown) {
        if (!isMounted) {
          return;
        }

        setApiState({
          status: 'offline',
          message:
            error instanceof Error
              ? error.message
              : 'The backend API could not be reached.',
        });
      }
    }

    void checkApi();

    const interval = window.setInterval(() => {
      void checkApi();
    }, 10_000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const badgeText =
    apiState.status === 'online'
      ? 'OPERATIONAL'
      : apiState.status === 'offline'
        ? 'OFFLINE'
        : 'CONNECTING';

  return (
    <article
      className={`status-card api-status-card api-status-card--${apiState.status}`}
    >
      <div className="status-card__heading">
        <p className="status-card__title">Backend API</p>

        <span className="api-status-badge">
          <span className="api-status-badge__dot" />
          {badgeText}
        </span>
      </div>

      <strong className="status-card__value">
        {apiState.status === 'online'
          ? 'Ready'
          : apiState.status === 'offline'
            ? 'Unavailable'
            : 'Linking'}
      </strong>

      {apiState.status === 'loading' && (
        <p className="status-card__description">
          Establishing secure connection to the local Kavach API.
        </p>
      )}

      {apiState.status === 'offline' && (
        <p className="status-card__description">
          Start the API using <code>npm run dev</code>.
        </p>
      )}

      {apiState.status === 'online' && (
        <>
          <p className="status-card__description">
            Local service is responding normally.
          </p>

          <div className="api-status-meta">
            <span>{apiState.health.service}</span>
            <span>{apiState.latencyMilliseconds} ms</span>
          </div>
        </>
      )}
    </article>
  );
}