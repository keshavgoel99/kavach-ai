import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import type {
  EntityProfileDetail,
} from '@kavach/shared-types';

import './EntityProfileWorkspace.css';

interface EntityProfileWorkspaceProps {
  entityId: number;
  onClose: () => void;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? `${value}T00:00:00`
      : value,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

function formatConfidence(
  value: number | null,
): string {
  if (value === null) {
    return 'Not scored';
  }

  return `${Math.round(value * 100)}%`;
}

function confidenceClass(
  value: number | null,
): string {
  const base =
    'entity-workspace__confidence';

  if (value === null) {
    return base;
  }

  if (value >= 0.8) {
    return `${base} ${base}--high`;
  }

  if (value >= 0.5) {
    return `${base} ${base}--medium`;
  }

  return `${base} ${base}--low`;
}

function createInitials(
  name: string,
): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return '?';
  }

  return parts
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function EmptyState({
  children,
}: {
  children: string;
}) {
  return (
    <div className="entity-workspace__empty">
      {children}
    </div>
  );
}

export function EntityProfileWorkspace({
  entityId,
  onClose,
}: EntityProfileWorkspaceProps) {
  const [
    profile,
    setProfile,
  ] = useState<EntityProfileDetail | null>(
    null,
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setProfile(null);
    setLoading(true);
    setError(null);

    window.kavach.entities
      .getById(entityId)
      .then((result) => {
        if (!active) {
          return;
        }

        setProfile(result);
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : 'The entity profile could not be loaded.',
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [entityId]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [onClose]);

  const connectionCount = useMemo(
    () => {
      if (!profile) {
        return 0;
      }

      return (
        profile.identifiers.length +
        profile.vehicles.length +
        profile.financialAccounts.length +
        profile.knownAssociates.length +
        profile.gangMemberships.length
      );
    },
    [profile],
  );

  return createPortal(
    <div
      className="entity-workspace"
      role="dialog"
      aria-modal="true"
      aria-label="Canonical entity profile"
    >
      <button
        type="button"
        className="entity-workspace__backdrop"
        aria-label="Close entity profile"
        onClick={onClose}
      />

      <section className="entity-workspace__panel">
        <header className="entity-workspace__topbar">
          <div>
            <span>
              CROSS-CASE ENTITY INTELLIGENCE
            </span>

            <strong>
              Canonical Profile
            </strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close entity profile"
          >
            ×
          </button>
        </header>

        {loading && (
          <div className="entity-workspace__state">
            <div className="entity-workspace__loader" />

            <strong>
              Loading canonical entity
            </strong>

            <span>
              Resolving connected assets and FIR
              history…
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="entity-workspace__state entity-workspace__state--error">
            <strong>
              Entity profile unavailable
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={onClose}
            >
              Return to case
            </button>
          </div>
        )}

        {!loading && profile && (
          <div className="entity-workspace__content">
            <section className="entity-workspace__hero">
              <div className="entity-workspace__avatar">
                {createInitials(
                  profile.canonicalName,
                )}
              </div>

              <div className="entity-workspace__identity">
                <span>
                  ENTITY #{profile.entityId}
                </span>

                <h2>
                  {profile.canonicalName}
                </h2>

                <p>
                  {profile.occupation?.name ??
                    'Occupation unavailable'}
                  {' · '}
                  {profile.gender?.name ??
                    'Gender unavailable'}
                </p>
              </div>

              <div className="entity-workspace__signals">
                <div>
                  <span>Linked FIRs</span>
                  <strong>
                    {profile.linkedCases.length}
                  </strong>
                </div>

                <div>
                  <span>Connections</span>
                  <strong>
                    {connectionCount}
                  </strong>
                </div>

                <div>
                  <span>Status</span>
                  <strong>
                    {profile.active
                      ? 'ACTIVE'
                      : 'INACTIVE'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="entity-workspace__facts">
              <div>
                <span>Date of birth</span>
                <strong>
                  {formatDate(
                    profile.dateOfBirth,
                  )}
                </strong>
              </div>

              <div>
                <span>Home location ID</span>
                <strong>
                  {profile.homeLocationId ??
                    'Unavailable'}
                </strong>
              </div>

              <div>
                <span>Data origin</span>
                <strong>
                  {profile.dataOrigin ||
                    'Unavailable'}
                </strong>
              </div>

              <div>
                <span>Repeat class</span>
                <strong>
                  {
                    profile
                      .syntheticRepeatClass ??
                    'Not classified'
                  }
                </strong>
              </div>
            </section>

            <div className="entity-workspace__layout">
              <main>
                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>01</span>
                      <h3>
                        Linked FIR History
                      </h3>
                    </div>

                    <small>
                      {profile.linkedCases.length}
                      {' '}
                      cases
                    </small>
                  </header>

                  {profile.linkedCases.length ===
                  0 ? (
                    <EmptyState>
                      No FIR history is linked to
                      this canonical entity.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__cases">
                      {profile.linkedCases.map(
                        (connection) => (
                          <article
                            key={
                              connection.case
                                .caseId
                            }
                          >
                            <div className="entity-workspace__case-marker">
                              <span />
                            </div>

                            <div className="entity-workspace__case-body">
                              <header>
                                <div>
                                  <span>
                                    CASE #
                                    {
                                      connection
                                        .case.caseId
                                    }
                                  </span>

                                  <strong>
                                    {
                                      connection
                                        .case
                                        .crimeNumber
                                    }
                                  </strong>
                                </div>

                                <span
                                  className={confidenceClass(
                                    connection
                                      .resolutionConfidence,
                                  )}
                                >
                                  Match{' '}
                                  {formatConfidence(
                                    connection
                                      .resolutionConfidence,
                                  )}
                                </span>
                              </header>

                              <div className="entity-workspace__case-facts">
                                <div>
                                  <span>
                                    Registered
                                  </span>

                                  <strong>
                                    {formatDate(
                                      connection
                                        .case
                                        .registeredDate,
                                    )}
                                  </strong>
                                </div>

                                <div>
                                  <span>Roles</span>

                                  <strong>
                                    {connection
                                      .roles.length >
                                    0
                                      ? connection
                                          .roles
                                          .join(', ')
                                      : 'Unavailable'}
                                  </strong>
                                </div>

                                <div>
                                  <span>
                                    Accused records
                                  </span>

                                  <strong>
                                    {connection
                                      .accusedIds
                                      .length > 0
                                      ? connection
                                          .accusedIds
                                          .join(', ')
                                      : 'None'}
                                  </strong>
                                </div>
                              </div>

                              {connection
                                .sourceLinks
                                .length > 0 && (
                                <footer>
                                  {
                                    connection
                                      .sourceLinks
                                      .length
                                  }
                                  {' '}
                                  direct source
                                  links
                                </footer>
                              )}
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>02</span>
                      <h3>
                        Digital Identifiers
                      </h3>
                    </div>

                    <small>
                      {profile.identifiers.length}
                      {' '}
                      identifiers
                    </small>
                  </header>

                  {profile.identifiers.length ===
                  0 ? (
                    <EmptyState>
                      No digital identifiers are
                      linked to this entity.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__card-grid">
                      {profile.identifiers.map(
                        (identifier) => (
                          <article
                            key={
                              identifier
                                .identifierId
                            }
                          >
                            <header>
                              <span>
                                {
                                  identifier
                                    .identifierType
                                }
                              </span>

                              <small>
                                #
                                {
                                  identifier
                                    .identifierId
                                }
                              </small>
                            </header>

                            <strong className="entity-workspace__break-value">
                              {
                                identifier
                                  .identifierValue
                              }
                            </strong>

                            <footer>
                              <span>
                                {
                                  identifier
                                    .relationshipType
                                }
                              </span>

                              <span>
                                Confidence{' '}
                                {formatConfidence(
                                  identifier
                                    .confidence,
                                )}
                              </span>
                            </footer>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>03</span>
                      <h3>
                        Vehicles
                      </h3>
                    </div>

                    <small>
                      {profile.vehicles.length}
                      {' '}
                      vehicles
                    </small>
                  </header>

                  {profile.vehicles.length ===
                  0 ? (
                    <EmptyState>
                      No vehicles are linked to this
                      entity.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__card-grid">
                      {profile.vehicles.map(
                        (vehicle) => (
                          <article
                            key={
                              vehicle.vehicleId
                            }
                          >
                            <header>
                              <span>
                                {
                                  vehicle
                                    .vehicleType
                                }
                              </span>

                              <small>
                                #
                                {vehicle.vehicleId}
                              </small>
                            </header>

                            <strong>
                              {
                                vehicle
                                  .registrationNumber
                              }
                            </strong>

                            <p>
                              {vehicle.modelYear ??
                                'Model year unavailable'}
                              {' · '}
                              {vehicle.source}
                            </p>

                            <footer>
                              <span>
                                {
                                  vehicle
                                    .relationshipType
                                }
                              </span>

                              <span>
                                Confidence{' '}
                                {formatConfidence(
                                  vehicle.confidence,
                                )}
                              </span>
                            </footer>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>
              </main>

              <aside>
                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>04</span>
                      <h3>
                        Financial Accounts
                      </h3>
                    </div>

                    <small>
                      {
                        profile
                          .financialAccounts
                          .length
                      }
                    </small>
                  </header>

                  {profile.financialAccounts
                    .length === 0 ? (
                    <EmptyState>
                      No accounts are linked to this
                      entity.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__stack">
                      {profile.financialAccounts.map(
                        (account) => (
                          <article
                            key={account.accountId}
                          >
                            <header>
                              <strong>
                                {
                                  account
                                    .maskedAccountNumber
                                }
                              </strong>

                              <span>
                                {account.status}
                              </span>
                            </header>

                            <p>
                              {
                                account
                                  .institutionName
                              }
                            </p>

                            <footer>
                              {account.accountType}
                              {' · Opened '}
                              {formatDate(
                                account.openDate,
                              )}
                            </footer>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>05</span>
                      <h3>
                        Known Associates
                      </h3>
                    </div>

                    <small>
                      {
                        profile
                          .knownAssociates
                          .length
                      }
                    </small>
                  </header>

                  {profile.knownAssociates
                    .length === 0 ? (
                    <EmptyState>
                      No known associates are
                      recorded.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__stack">
                      {profile.knownAssociates.map(
                        (associate) => (
                          <article
                            key={
                              associate
                                .associationId
                            }
                          >
                            <header>
                              <strong>
                                {
                                  associate
                                    .canonicalName
                                }
                              </strong>

                              <span>
                                Entity #
                                {
                                  associate
                                    .entityId
                                }
                              </span>
                            </header>

                            <p>
                              {
                                associate
                                  .relationshipType
                              }
                            </p>

                            <footer>
                              Observed{' '}
                              {
                                associate
                                  .observedCount
                              }
                              {' times · '}
                              {formatConfidence(
                                associate.confidence,
                              )}
                            </footer>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>

                <section className="entity-workspace__section">
                  <header>
                    <div>
                      <span>06</span>
                      <h3>
                        Gang Intelligence
                      </h3>
                    </div>

                    <small>
                      {
                        profile
                          .gangMemberships
                          .length
                      }
                    </small>
                  </header>

                  {profile.gangMemberships
                    .length === 0 ? (
                    <EmptyState>
                      No gang memberships are
                      recorded.
                    </EmptyState>
                  ) : (
                    <div className="entity-workspace__stack">
                      {profile.gangMemberships.map(
                        (membership) => (
                          <article
                            key={
                              membership.gangId
                            }
                          >
                            <header>
                              <strong>
                                {
                                  membership
                                    .gangName
                                }
                              </strong>

                              <span>
                                {membership.status}
                              </span>
                            </header>

                            <p>
                              {
                                membership
                                  .primaryCrimeType
                              }
                            </p>

                            <footer>
                              {membership.role}
                              {' · Since '}
                              {formatDate(
                                membership.fromDate,
                              )}
                              {' · '}
                              {formatConfidence(
                                membership.confidence,
                              )}
                            </footer>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </section>
              </aside>
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
