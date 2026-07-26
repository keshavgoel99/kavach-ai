import {
  useEffect,
  useState,
} from 'react';

import type {
  SecurityAuditEntry,
  SecurityAuditEventType,
} from '@kavach/shared-types';

import './AuditLogPanel.css';

const EVENT_TYPES:
readonly SecurityAuditEventType[] = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILURE',
  'LOGOUT',
  'RESOURCE_ACCESSED',
  'ACCESS_DENIED',
  'REPORT_EXPORTED',
];

function formatDateTime(
  value: string,
): string {
  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? value
    : new Intl.DateTimeFormat(
        'en-IN',
        {
          dateStyle: 'medium',
          timeStyle: 'medium',
        },
      ).format(date);
}

export function AuditLogPanel() {
  const [
    entries,
    setEntries,
  ] =
    useState<
      SecurityAuditEntry[]
    >([]);

  const [
    eventType,
    setEventType,
  ] =
    useState<
      SecurityAuditEventType |
      ''
    >('');

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    async function loadAudit():
    Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response =
          await window.kavach
            .security
            .getAuditLog({
              limit: 250,

              eventTypes:
                eventType
                  ? [eventType]
                  : undefined,
            });

        if (active) {
          setEntries(
            response.items,
          );
        }
      } catch (
        requestError: unknown
      ) {
        if (active) {
          setError(
            requestError instanceof
              Error
              ? requestError.message
              : 'Audit records could not be loaded.',
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAudit();

    return () => {
      active = false;
    };
  }, [
    eventType,
  ]);

  return (
    <section className="audit-log">
      <header>
        <div>
          <span>
            SECURITY AND ACCOUNTABILITY
          </span>

          <h2>
            Audit Log
          </h2>

          <p>
            Review authentication,
            authorization, resource access
            and report-export activity.
          </p>
        </div>

        <label>
          <span>
            Event type
          </span>

          <select
            value={
              eventType
            }
            onChange={(event) =>
              setEventType(
                event.target
                  .value as
                  SecurityAuditEventType |
                  '',
              )
            }
          >
            <option value="">
              All events
            </option>

            {EVENT_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                >
                  {type}
                </option>
              ),
            )}
          </select>
        </label>
      </header>

      {loading && (
        <div className="audit-log__message">
          Loading audit records…
        </div>
      )}

      {error && (
        <div className="audit-log__error">
          {error}
        </div>
      )}

      {!loading &&
        !error && (
        <div className="audit-log__table">
          <table>
            <thead>
              <tr>
                <th>
                  Occurred
                </th>

                <th>
                  Event
                </th>

                <th>
                  Outcome
                </th>

                <th>
                  Operator
                </th>

                <th>
                  Resource
                </th>

                <th>
                  Method
                </th>

                <th>
                  Duration
                </th>
              </tr>
            </thead>

            <tbody>
              {entries.map(
                (entry) => (
                  <tr key={entry.id}>
                    <td>
                      {formatDateTime(
                        entry
                          .occurredAt,
                      )}
                    </td>

                    <td>
                      {
                        entry
                          .eventType
                      }
                    </td>

                    <td>
                      <span
                        className={[
                          'audit-outcome',

                          `audit-outcome--${entry.outcome.toLowerCase()}`,
                        ].join(' ')}
                      >
                        {
                          entry
                            .outcome
                        }
                      </span>
                    </td>

                    <td>
                      {entry.operator
                        ? [
                            entry
                              .operator
                              .displayName,

                            `(${entry.operator.username})`,
                          ].join(' ')
                        : 'Unauthenticated'}
                    </td>

                    <td>
                      {
                        entry
                          .resource
                      }
                    </td>

                    <td>
                      {
                        entry
                          .method ??
                        '—'
                      }
                    </td>

                    <td>
                      {entry
                        .durationMilliseconds ===
                        null
                        ? '—'
                        : `${entry.durationMilliseconds} ms`}
                    </td>
                  </tr>
                ),
              )}

              {entries.length ===
                0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="audit-log__empty"
                  >
                    No matching audit
                    records.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
