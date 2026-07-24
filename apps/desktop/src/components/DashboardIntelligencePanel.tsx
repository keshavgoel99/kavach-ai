import {
  useEffect,
  useState,
} from 'react';

import type {
  CaseDashboardBreakdownItem,
  CaseDashboardSummary,
} from '@kavach/shared-types';

import './DashboardIntelligencePanel.css';

const integerFormatter =
  new Intl.NumberFormat('en-IN');

function formatInteger(
  value: number,
): string {
  return integerFormatter.format(value);
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(
    `${value}T00:00:00`,
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

function percentageOf(
  count: number,
  total: number,
): number {
  if (total === 0) {
    return 0;
  }

  return Number(
    (
      (count / total) *
      100
    ).toFixed(1),
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  signal?: 'neutral' | 'success' | 'warning';
}

function MetricCard({
  label,
  value,
  detail,
  signal = 'neutral',
}: MetricCardProps) {
  return (
    <article
      className={
        'dashboard-intelligence__metric ' +
        `dashboard-intelligence__metric--${signal}`
      }
    >
      <span>{label}</span>

      <strong>{value}</strong>

      <p>{detail}</p>
    </article>
  );
}

interface BreakdownListProps {
  eyebrow: string;
  title: string;
  items: CaseDashboardBreakdownItem[];
  emptyMessage: string;
}

function BreakdownList({
  eyebrow,
  title,
  items,
  emptyMessage,
}: BreakdownListProps) {
  return (
    <section className="dashboard-breakdown">
      <header>
        <div>
          <span>{eyebrow}</span>
          <h3>{title}</h3>
        </div>

        <small>
          {items.length} categories
        </small>
      </header>

      {items.length === 0 ? (
        <div className="dashboard-breakdown__empty">
          {emptyMessage}
        </div>
      ) : (
        <div className="dashboard-breakdown__list">
          {items.map((item) => (
            <article key={item.id}>
              <div className="dashboard-breakdown__row">
                <strong>{item.name}</strong>

                <div>
                  <span>
                    {formatInteger(item.count)}
                  </span>

                  <small>
                    {item.percentage.toFixed(1)}%
                  </small>
                </div>
              </div>

              <div
                className="dashboard-breakdown__track"
                aria-hidden="true"
              >
                <div
                  className="dashboard-breakdown__fill"
                  style={{
                    width:
                      `${Math.min(
                        100,
                        Math.max(
                          0,
                          item.percentage,
                        ),
                      )}%`,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function DashboardIntelligencePanel() {
  const [summary, setSummary] =
    useState<CaseDashboardSummary | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [reloadToken, setReloadToken] =
    useState(0);

  useEffect(() => {
    let isActive = true;

    async function loadSummary():
    Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response =
          await window.kavach.cases
            .getDashboardSummary();

        if (isActive) {
          setSummary(response);
        }
      } catch (requestError: unknown) {
        if (!isActive) {
          return;
        }

        setSummary(null);

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Dashboard intelligence could not be loaded.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      isActive = false;
    };
  }, [reloadToken]);

  const arrestCoverage = summary
    ? percentageOf(
        summary.casesWithArrestEvents,
        summary.totalCases,
      )
    : 0;

  const chargesheetCoverage = summary
    ? percentageOf(
        summary.casesWithChargesheets,
        summary.totalCases,
      )
    : 0;

  return (
    <section
      className="dashboard-intelligence"
      aria-labelledby="dashboard-intelligence-title"
    >
      <header className="dashboard-intelligence__header">
        <div>
          <div className="dashboard-intelligence__eyebrow">
            OPERATIONAL DATA PICTURE
          </div>

          <h2 id="dashboard-intelligence-title">
            Case Intelligence Overview
          </h2>

          <p>
            Live aggregate indicators calculated
            from the validated FIR dataset.
          </p>
        </div>

        <div className="dashboard-intelligence__status">
          <span aria-hidden="true" />
          LIVE DATA
        </div>
      </header>

      {loading && (
        <div className="dashboard-intelligence__state">
          <div className="dashboard-intelligence__loader" />

          <strong>
            Calculating intelligence summary
          </strong>

          <span>
            Aggregating jurisdiction, status,
            gravity and procedural coverage…
          </span>
        </div>
      )}

      {!loading && error && (
        <div
          className="dashboard-intelligence__state dashboard-intelligence__state--error"
          role="alert"
        >
          <strong>
            Intelligence summary unavailable
          </strong>

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setReloadToken(
                (current) => current + 1,
              )
            }
          >
            Retry
          </button>
        </div>
      )}

      {!loading && summary && (
        <div className="dashboard-intelligence__content">
          <div className="dashboard-intelligence__metrics">
            <MetricCard
              label="Indexed FIR records"
              value={formatInteger(
                summary.totalCases,
              )}
              detail="Validated synthetic case records available for search."
              signal="success"
            />

            <MetricCard
              label="Registration coverage"
              value={
                `${formatDate(
                  summary.dateCoverage.from,
                )} — ${formatDate(
                  summary.dateCoverage.to,
                )}`
              }
              detail="Earliest to latest registered FIR date."
            />

            <MetricCard
              label="Cases with arrest events"
              value={formatInteger(
                summary.casesWithArrestEvents,
              )}
              detail={
                `${arrestCoverage.toFixed(1)}% ` +
                'of indexed FIR records'
              }
              signal="warning"
            />

            <MetricCard
              label="Cases with chargesheets"
              value={formatInteger(
                summary.casesWithChargesheets,
              )}
              detail={
                `${chargesheetCoverage.toFixed(1)}% ` +
                'of indexed FIR records'
              }
              signal="success"
            />
          </div>

          <div className="dashboard-intelligence__grid">
            <BreakdownList
              eyebrow="CASE STATE"
              title="Status distribution"
              items={summary.statusBreakdown}
              emptyMessage="No case-status data is available."
            />

            <BreakdownList
              eyebrow="SEVERITY PROFILE"
              title="Gravity distribution"
              items={summary.gravityBreakdown}
              emptyMessage="No gravity data is available."
            />

            <BreakdownList
              eyebrow="JURISDICTION"
              title="Top districts"
              items={summary.topDistricts}
              emptyMessage="No district data is available."
            />

            <BreakdownList
              eyebrow="OFFENCE PATTERN"
              title="Top crime heads"
              items={summary.topCrimeHeads}
              emptyMessage="No offence-head data is available."
            />
          </div>
        </div>
      )}
    </section>
  );
}
