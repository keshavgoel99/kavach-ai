import type {
  CaseDetail,
  CaseFinancialTransaction,
  CaseResolvedEntity,
} from '@kavach/shared-types';

import './CaseEntityIntelligence.css';

interface CaseEntityIntelligenceProps {
  detail: CaseDetail;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Unavailable';
  }

  const dateOnly =
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  const date = new Date(
    dateOnly
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

function formatDateTime(
  value: string,
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
    'entity-intelligence__confidence';

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

function formatMoney(
  amount: number,
  currency: string,
): string {
  const normalizedCurrency =
    currency.trim().toUpperCase();

  try {
    return new Intl.NumberFormat(
      'en-IN',
      {
        style: 'currency',
        currency: normalizedCurrency,
        maximumFractionDigits: 2,
      },
    ).format(amount);
  } catch {
    const formattedAmount =
      new Intl.NumberFormat(
        'en-IN',
        {
          maximumFractionDigits: 2,
        },
      ).format(amount);

    return normalizedCurrency
      ? `${normalizedCurrency} ${formattedAmount}`
      : formattedAmount;
  }
}

function EmptyState({
  children,
}: {
  children: string;
}) {
  return (
    <div className="entity-intelligence__empty">
      {children}
    </div>
  );
}

function EntityProfile({
  entity,
}: {
  entity: CaseResolvedEntity;
}) {
  const totalConnections =
    entity.identifiers.length +
    entity.vehicles.length +
    entity.financialAccounts.length +
    entity.knownAssociates.length +
    entity.gangMemberships.length;

  return (
    <details
      className="entity-profile"
      open={false}
    >
      <summary>
        <div className="entity-profile__identity">
          <div className="entity-profile__avatar">
            {entity.canonicalName
              .trim()
              .slice(0, 1)
              .toUpperCase() || '?'}
          </div>

          <div>
            <strong>
              {entity.canonicalName}
            </strong>

            <span>
              Entity #{entity.entityId}
              {' · '}
              {entity.roles.length > 0
                ? entity.roles.join(', ')
                : 'Unclassified role'}
            </span>
          </div>
        </div>

        <div className="entity-profile__summary-signals">
          <span
            className={confidenceClass(
              entity.resolutionConfidence,
            )}
          >
            Match{' '}
            {formatConfidence(
              entity.resolutionConfidence,
            )}
          </span>

          <span className="entity-profile__connection-count">
            {totalConnections}
            {' '}
            connections
          </span>
        </div>
      </summary>

      <div className="entity-profile__body">
        <div className="entity-profile__facts">
          <div>
            <span>Date of birth</span>
            <strong>
              {formatDate(
                entity.dateOfBirth,
              )}
            </strong>
          </div>

          <div>
            <span>Gender</span>
            <strong>
              {entity.gender?.name ??
                'Unavailable'}
            </strong>
          </div>

          <div>
            <span>Occupation</span>
            <strong>
              {entity.occupation?.name ??
                'Unavailable'}
            </strong>
          </div>

          <div>
            <span>Resolution status</span>
            <strong>
              {entity.resolutionStatus ??
                'Unavailable'}
            </strong>
          </div>

          <div>
            <span>Data origin</span>
            <strong>
              {entity.dataOrigin ||
                'Unavailable'}
            </strong>
          </div>

          <div>
            <span>Active entity</span>
            <strong>
              {entity.active ? 'Yes' : 'No'}
            </strong>
          </div>
        </div>

        {entity.resolutionEvidence && (
          <div className="entity-profile__resolution-note">
            <span>
              RESOLUTION EVIDENCE
            </span>

            <p>
              {entity.resolutionEvidence}
            </p>
          </div>
        )}

        <div className="entity-profile__collection">
          <h4>
            Digital identifiers
            <span>
              {entity.identifiers.length}
            </span>
          </h4>

          {entity.identifiers.length === 0 ? (
            <EmptyState>
              No digital identifiers are linked.
            </EmptyState>
          ) : (
            <div className="entity-profile__item-grid">
              {entity.identifiers.map(
                (identifier) => (
                  <article
                    key={
                      identifier.identifierId
                    }
                  >
                    <header>
                      <strong>
                        {
                          identifier
                            .identifierType
                        }
                      </strong>

                      {identifier
                        .directlyLinkedToCase && (
                        <span className="entity-intelligence__direct">
                          DIRECT CASE LINK
                        </span>
                      )}
                    </header>

                    <p className="entity-profile__value">
                      {
                        identifier
                          .identifierValue
                      }
                    </p>

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
                          identifier.confidence,
                        )}
                      </span>
                    </footer>
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        <div className="entity-profile__collection">
          <h4>
            Vehicles
            <span>
              {entity.vehicles.length}
            </span>
          </h4>

          {entity.vehicles.length === 0 ? (
            <EmptyState>
              No vehicles are linked.
            </EmptyState>
          ) : (
            <div className="entity-profile__item-grid">
              {entity.vehicles.map(
                (vehicle) => (
                  <article
                    key={vehicle.vehicleId}
                  >
                    <header>
                      <strong>
                        {
                          vehicle
                            .registrationNumber
                        }
                      </strong>

                      {vehicle
                        .directlyLinkedToCase && (
                        <span className="entity-intelligence__direct">
                          DIRECT CASE LINK
                        </span>
                      )}
                    </header>

                    <p>
                      {vehicle.vehicleType}
                      {vehicle.modelYear
                        ? ` · ${vehicle.modelYear}`
                        : ''}
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
        </div>

        <div className="entity-profile__collection">
          <h4>
            Financial accounts
            <span>
              {
                entity.financialAccounts
                  .length
              }
            </span>
          </h4>

          {entity.financialAccounts.length ===
          0 ? (
            <EmptyState>
              No financial accounts are linked.
            </EmptyState>
          ) : (
            <div className="entity-profile__item-grid">
              {entity.financialAccounts.map(
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

                      <span className="entity-intelligence__status">
                        {account.status}
                      </span>
                    </header>

                    <p>
                      {
                        account
                          .institutionName
                      }
                      {' · '}
                      {account.accountType}
                    </p>

                    <footer>
                      <span>
                        Opened{' '}
                        {formatDate(
                          account.openDate,
                        )}
                      </span>

                      <span>
                        Confidence{' '}
                        {formatConfidence(
                          account.confidence,
                        )}
                      </span>
                    </footer>
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        <div className="entity-profile__collection">
          <h4>
            Known associates
            <span>
              {
                entity.knownAssociates
                  .length
              }
            </span>
          </h4>

          {entity.knownAssociates.length ===
          0 ? (
            <EmptyState>
              No known associations are recorded.
            </EmptyState>
          ) : (
            <div className="entity-profile__association-list">
              {entity.knownAssociates.map(
                (associate) => (
                  <article
                    key={
                      associate.associationId
                    }
                  >
                    <div>
                      <strong>
                        {
                          associate
                            .canonicalName
                        }
                      </strong>

                      <span>
                        Entity #
                        {associate.entityId}
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          associate
                            .relationshipType
                        }
                      </strong>

                      <span>
                        Observed{' '}
                        {
                          associate
                            .observedCount
                        }
                        {' '}
                        times
                      </span>
                    </div>

                    <span
                      className={confidenceClass(
                        associate.confidence,
                      )}
                    >
                      {formatConfidence(
                        associate.confidence,
                      )}
                    </span>
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        <div className="entity-profile__collection">
          <h4>
            Gang memberships
            <span>
              {
                entity.gangMemberships
                  .length
              }
            </span>
          </h4>

          {entity.gangMemberships.length ===
          0 ? (
            <EmptyState>
              No gang memberships are recorded.
            </EmptyState>
          ) : (
            <div className="entity-profile__gang-list">
              {entity.gangMemberships.map(
                (membership) => (
                  <article
                    key={membership.gangId}
                  >
                    <div>
                      <strong>
                        {
                          membership
                            .gangName
                        }
                      </strong>

                      <span>
                        {
                          membership
                            .primaryCrimeType
                        }
                      </span>
                    </div>

                    <div>
                      <span>
                        Role
                      </span>

                      <strong>
                        {membership.role}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Since
                      </span>

                      <strong>
                        {formatDate(
                          membership.fromDate,
                        )}
                      </strong>
                    </div>

                    <span
                      className={confidenceClass(
                        membership.confidence,
                      )}
                    >
                      {formatConfidence(
                        membership.confidence,
                      )}
                    </span>
                  </article>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

function TransactionCard({
  transaction,
}: {
  transaction: CaseFinancialTransaction;
}) {
  return (
    <article
      className={
        transaction.suspicious
          ? 'case-transaction case-transaction--suspicious'
          : 'case-transaction'
      }
    >
      <header>
        <div>
          <span>
            Transaction #
            {transaction.transactionId}
          </span>

          <strong>
            {formatMoney(
              transaction.amount,
              transaction.currency,
            )}
          </strong>
        </div>

        {transaction.suspicious && (
          <span className="case-transaction__alert">
            SUSPICIOUS
          </span>
        )}
      </header>

      <div className="case-transaction__facts">
        <div>
          <span>Date</span>
          <strong>
            {formatDateTime(
              transaction.transactionDateTime,
            )}
          </strong>
        </div>

        <div>
          <span>Channel</span>
          <strong>
            {transaction.channel}
          </strong>
        </div>

        <div>
          <span>From account</span>
          <strong>
            {transaction.fromAccountId ??
              'Unavailable'}
          </strong>
        </div>

        <div>
          <span>To account</span>
          <strong>
            {transaction.toAccountId ??
              'Unavailable'}
          </strong>
        </div>
      </div>

      {transaction.narrative && (
        <p>{transaction.narrative}</p>
      )}

      <footer>
        <span>
          {transaction.relationshipType}
        </span>

        <span>
          Link confidence{' '}
          {formatConfidence(
            transaction.confidence,
          )}
        </span>

        <span>
          Risk score{' '}
          {formatConfidence(
            transaction.riskScore,
          )}
        </span>
      </footer>
    </article>
  );
}

export function CaseEntityIntelligence({
  detail,
}: CaseEntityIntelligenceProps) {
  return (
    <>
      <section className="case-detail__section">
        <div className="case-detail__section-heading">
          <div>
            <span>11</span>
            <h3>
              Resolved Entity Intelligence
            </h3>
          </div>

          <small>
            {detail.resolvedEntities.length}
            {' '}
            canonical profiles
          </small>
        </div>

        {detail.resolvedEntities.length ===
        0 ? (
          <EmptyState>
            No canonical entities are resolved for
            this case.
          </EmptyState>
        ) : (
          <div className="entity-intelligence__profiles">
            {detail.resolvedEntities.map(
              (entity) => (
                <EntityProfile
                  key={entity.entityId}
                  entity={entity}
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="case-detail__section">
        <div className="case-detail__section-heading">
          <div>
            <span>12</span>
            <h3>
              Direct Case Connections
            </h3>
          </div>

          <small>
            {detail.caseIdentifiers.length +
              detail.caseVehicles.length}
            {' '}
            linked assets
          </small>
        </div>

        <div className="entity-intelligence__direct-grid">
          <div>
            <h4>
              Identifiers
              <span>
                {
                  detail.caseIdentifiers
                    .length
                }
              </span>
            </h4>

            {detail.caseIdentifiers.length ===
            0 ? (
              <EmptyState>
                No identifiers are directly linked
                to this case.
              </EmptyState>
            ) : (
              <div className="entity-intelligence__direct-list">
                {detail.caseIdentifiers.map(
                  (identifier) => (
                    <article
                      key={
                        identifier
                          .identifierId
                      }
                    >
                      <span>
                        {
                          identifier
                            .identifierType
                        }
                      </span>

                      <strong>
                        {
                          identifier
                            .identifierValue
                        }
                      </strong>

                      <small>
                        {
                          identifier
                            .relationshipType
                        }
                        {' · '}
                        Confidence{' '}
                        {formatConfidence(
                          identifier.confidence,
                        )}
                      </small>
                    </article>
                  ),
                )}
              </div>
            )}
          </div>

          <div>
            <h4>
              Vehicles
              <span>
                {detail.caseVehicles.length}
              </span>
            </h4>

            {detail.caseVehicles.length ===
            0 ? (
              <EmptyState>
                No vehicles are directly linked to
                this case.
              </EmptyState>
            ) : (
              <div className="entity-intelligence__direct-list">
                {detail.caseVehicles.map(
                  (vehicle) => (
                    <article
                      key={vehicle.vehicleId}
                    >
                      <span>
                        {vehicle.vehicleType}
                      </span>

                      <strong>
                        {
                          vehicle
                            .registrationNumber
                        }
                      </strong>

                      <small>
                        {vehicle.modelYear ??
                          'Year unavailable'}
                        {' · '}
                        {
                          vehicle
                            .relationshipType
                        }
                      </small>
                    </article>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="case-detail__section">
        <div className="case-detail__section-heading">
          <div>
            <span>13</span>
            <h3>
              Financial Intelligence
            </h3>
          </div>

          <small>
            {
              detail
                .caseFinancialTransactions
                .length
            }
            {' '}
            transactions
          </small>
        </div>

        {detail.caseFinancialTransactions.length ===
        0 ? (
          <EmptyState>
            No financial transactions are directly
            linked to this case.
          </EmptyState>
        ) : (
          <div className="case-transactions">
            {detail.caseFinancialTransactions.map(
              (transaction) => (
                <TransactionCard
                  key={
                    transaction.transactionId
                  }
                  transaction={transaction}
                />
              ),
            )}
          </div>
        )}
      </section>
    </>
  );
}
