import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import type {
  AnalyticsBreakdownItem,
  AnalyticsFilterOptions,
  AnalyticsMonthlyPoint,
  AnalyticsOverviewResponse,
} from '@kavach/shared-types';

import './AnalyticsIntelligencePanel.css';

interface AnalyticsFilters {
  registeredFrom: string;
  registeredTo: string;

  districtId: string;
  policeStationId: string;
  majorCrimeHeadId: string;
}

interface TrendChartData {
  maximum: number;

  caseBars: {
    x: number;
    y: number;
    width: number;
    height: number;
  }[];

  arrestLine: string;
  chargesheetLine: string;

  labels: {
    x: number;
    label: string;
  }[];
}

const CHART_WIDTH =
  920;

const CHART_HEIGHT =
  300;

const CHART_LEFT =
  45;

const CHART_RIGHT =
  20;

const CHART_TOP =
  22;

const CHART_BOTTOM =
  42;

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'en-IN',
  ).format(value);
}

function formatPercent(
  value: number,
): string {
  return `${value.toFixed(2)}%`;
}

function optionalId(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(
      parsed,
    ) ||
    parsed < 1
  ) {
    return undefined;
  }

  return parsed;
}

function calculateTrendChart(
  points:
    readonly AnalyticsMonthlyPoint[],
): TrendChartData {
  if (points.length === 0) {
    return {
      maximum: 0,

      caseBars: [],

      arrestLine: '',
      chargesheetLine: '',

      labels: [],
    };
  }

  const maximum =
    Math.max(
      1,

      ...points.map(
        (point) =>
          point.registeredCases,
      ),
    );

  const graphWidth =
    CHART_WIDTH -
    CHART_LEFT -
    CHART_RIGHT;

  const graphHeight =
    CHART_HEIGHT -
    CHART_TOP -
    CHART_BOTTOM;

  const step =
    graphWidth /
    Math.max(
      points.length,
      1,
    );

  const barWidth =
    Math.max(
      3,
      Math.min(
        15,
        step * 0.56,
      ),
    );

  const centerX = (
    index: number,
  ): number =>
    CHART_LEFT +
    step * index +
    step / 2;

  const toY = (
    value: number,
  ): number =>
    CHART_TOP +
    graphHeight -
    (
      value /
      maximum
    ) *
      graphHeight;

  const caseBars =
    points.map(
      (
        point,
        index,
      ) => {
        const y =
          toY(
            point.registeredCases,
          );

        return {
          x:
            centerX(index) -
            barWidth / 2,

          y,

          width:
            barWidth,

          height:
            CHART_TOP +
            graphHeight -
            y,
        };
      },
    );

  const arrestLine =
    points
      .map(
        (
          point,
          index,
        ) =>
          [
            centerX(index),
            toY(
              point
                .casesWithArrest,
            ),
          ].join(','),
      )
      .join(' ');

  const chargesheetLine =
    points
      .map(
        (
          point,
          index,
        ) =>
          [
            centerX(index),
            toY(
              point
                .casesWithChargesheet,
            ),
          ].join(','),
      )
      .join(' ');

  const labelInterval =
    Math.max(
      1,
      Math.ceil(
        points.length / 7,
      ),
    );

  const labels =
    points
      .map(
        (
          point,
          index,
        ) => ({
          x:
            centerX(index),

          label:
            point
              .period
              .label,

          visible:
            index === 0 ||
            index ===
              points.length - 1 ||
            index %
              labelInterval ===
              0,
        }),
      )
      .filter(
        (label) =>
          label.visible,
      )
      .map(
        ({
          x,
          label,
        }) => ({
          x,
          label,
        }),
      );

  return {
    maximum,

    caseBars,

    arrestLine,
    chargesheetLine,

    labels,
  };
}

function BreakdownBars({
  items,
  emptyMessage,
}: {
  items:
    readonly AnalyticsBreakdownItem[];

  emptyMessage: string;
}) {
  const maximum =
    Math.max(
      1,

      ...items.map(
        (item) =>
          item.count,
      ),
    );

  if (
    items.length === 0
  ) {
    return (
      <div className="analytics-empty">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="analytics-breakdown">
      {items.map(
        (item) => (
          <article key={item.id}>
            <header>
              <strong>
                {item.name}
              </strong>

              <span>
                {formatNumber(
                  item.count,
                )}
                {' · '}
                {formatPercent(
                  item.percentage,
                )}
              </span>
            </header>

            <div className="analytics-breakdown__track">
              <span
                style={{
                  width:
                    `${(
                      item.count /
                      maximum
                    ) * 100}%`,
                }}
              />
            </div>
          </article>
        ),
      )}
    </div>
  );
}

export function AnalyticsIntelligencePanel() {
  const [
    filterOptions,
    setFilterOptions,
  ] =
    useState<
      AnalyticsFilterOptions |
      null
    >(null);

  const [
    filtersLoading,
    setFiltersLoading,
  ] =
    useState(true);

  const [
    filtersError,
    setFiltersError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<AnalyticsFilters>({
      registeredFrom: '',
      registeredTo: '',

      districtId: '',
      policeStationId: '',
      majorCrimeHeadId: '',
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<AnalyticsFilters>({
      registeredFrom: '',
      registeredTo: '',

      districtId: '',
      policeStationId: '',
      majorCrimeHeadId: '',
    });

  const [
    result,
    setResult,
  ] =
    useState<
      AnalyticsOverviewResponse |
      null
    >(null);

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

    async function loadFilters():
    Promise<void> {
      setFiltersLoading(true);
      setFiltersError(null);

      try {
        const response =
          await window.kavach
            .analytics
            .getFilterOptions();

        if (!active) {
          return;
        }

        setFilterOptions(
          response,
        );

        const initial:
          AnalyticsFilters = {
          registeredFrom:
            response
              .defaultDateRange
              .from,

          registeredTo:
            response
              .defaultDateRange
              .to,

          districtId: '',
          policeStationId: '',
          majorCrimeHeadId: '',
        };

        setDraftFilters(
          initial,
        );

        setAppliedFilters(
          initial,
        );
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setFiltersError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Analytics filters could not be loaded.',
        );
      } finally {
        if (active) {
          setFiltersLoading(false);
        }
      }
    }

    void loadFilters();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (
      filtersLoading ||
      !filterOptions
    ) {
      return undefined;
    }

    let active = true;

    async function loadAnalytics():
    Promise<void> {
      setLoading(true);
      setError(null);

      const districtId =
        optionalId(
          appliedFilters
            .districtId,
        );

      const policeStationId =
        optionalId(
          appliedFilters
            .policeStationId,
        );

      const majorCrimeHeadId =
        optionalId(
          appliedFilters
            .majorCrimeHeadId,
        );

      try {
        const response =
          await window.kavach
            .analytics
            .getOverview({
              registeredFrom:
                appliedFilters
                  .registeredFrom,

              registeredTo:
                appliedFilters
                  .registeredTo,

              districtIds:
                districtId ===
                undefined
                  ? undefined
                  : [districtId],

              policeStationIds:
                policeStationId ===
                undefined
                  ? undefined
                  : [
                      policeStationId,
                    ],

              majorCrimeHeadIds:
                majorCrimeHeadId ===
                undefined
                  ? undefined
                  : [
                      majorCrimeHeadId,
                    ],
            });

        if (active) {
          setResult(
            response,
          );
        }
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setResult(null);

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Analytics could not be loaded.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      active = false;
    };
  }, [
    appliedFilters,
    filterOptions,
    filtersLoading,
  ]);

  const availableStations =
    useMemo(
      () => {
        const districtId =
          optionalId(
            draftFilters
              .districtId,
          );

        if (
          !filterOptions ||
          districtId ===
            undefined
        ) {
          return [];
        }

        return filterOptions
          .policeStations
          .filter(
            (station) =>
              station.districtId ===
              districtId,
          );
      },
      [
        draftFilters.districtId,
        filterOptions,
      ],
    );

  const trendChart =
    useMemo(
      () =>
        calculateTrendChart(
          result?.monthlyTrend ??
            [],
        ),
      [
        result,
      ],
    );

  const maximumDistrictCases =
    Math.max(
      1,

      ...(
        result
          ?.districtComparison ??
        []
      ).map(
        (district) =>
          district.totalCases,
      ),
    );

  function applyFilters(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setAppliedFilters({
      ...draftFilters,
    });
  }

  function resetFilters():
  void {
    if (!filterOptions) {
      return;
    }

    const reset:
      AnalyticsFilters = {
      registeredFrom:
        filterOptions
          .defaultDateRange
          .from,

      registeredTo:
        filterOptions
          .defaultDateRange
          .to,

      districtId: '',
      policeStationId: '',
      majorCrimeHeadId: '',
    };

    setDraftFilters(
      reset,
    );

    setAppliedFilters(
      reset,
    );
  }

  const overview =
    result?.overview;

  return (
    <section
      className="analytics-intelligence"
      aria-labelledby="analytics-title"
    >
      <header className="analytics-intelligence__header">
        <div>
          <span className="analytics-intelligence__eyebrow">
            DESCRIPTIVE CASE INTELLIGENCE
          </span>

          <h2 id="analytics-title">
            Crime Analytics
          </h2>

          <p>
            Compare FIR volumes,
            investigation milestones,
            jurisdictions, offence
            classifications and recurring
            modus-operandi patterns.
          </p>
        </div>

        <div className="analytics-intelligence__status">
          <span
            aria-hidden="true"
          />

          SYNTHETIC DATASET VERIFIED
        </div>
      </header>

      <aside className="analytics-governance">
        <div
          className="analytics-governance__mark"
          aria-hidden="true"
        >
          !
        </div>

        <div>
          <strong>
            Descriptive analysis only
          </strong>

          <p>
            {result?.responsibleUse ??
              [
                'Rates and counts are not',
                'automatic officer-performance',
                'scores, guilt assessments or',
                'community-risk labels.',
              ].join(' ')}
          </p>
        </div>
      </aside>

      <form
        className="analytics-filters"
        onSubmit={applyFilters}
      >
        <div className="analytics-filters__heading">
          <div>
            <span>
              ANALYTICAL SCOPE
            </span>

            <h3>
              Filter registered FIRs
            </h3>
          </div>

          <small>
            {
              result
                ?.query
                .registeredFrom ??
              '—'
            }
            {' to '}
            {
              result
                ?.query
                .registeredTo ??
              '—'
            }
          </small>
        </div>

        <div className="analytics-filters__grid">
          <label>
            <span>
              Registered from
            </span>

            <input
              type="date"
              value={
                draftFilters
                  .registeredFrom
              }
              min={
                filterOptions
                  ?.registeredDateRange
                  .from
              }
              max={
                filterOptions
                  ?.registeredDateRange
                  .to
              }
              disabled={
                filtersLoading
              }
              onChange={(event) =>
                setDraftFilters({
                  ...draftFilters,

                  registeredFrom:
                    event.target.value,
                })
              }
            />
          </label>

          <label>
            <span>
              Registered to
            </span>

            <input
              type="date"
              value={
                draftFilters
                  .registeredTo
              }
              min={
                filterOptions
                  ?.registeredDateRange
                  .from
              }
              max={
                filterOptions
                  ?.registeredDateRange
                  .to
              }
              disabled={
                filtersLoading
              }
              onChange={(event) =>
                setDraftFilters({
                  ...draftFilters,

                  registeredTo:
                    event.target.value,
                })
              }
            />
          </label>

          <label>
            <span>
              District
            </span>

            <select
              value={
                draftFilters
                  .districtId
              }
              disabled={
                filtersLoading ||
                !filterOptions
              }
              onChange={(event) =>
                setDraftFilters({
                  ...draftFilters,

                  districtId:
                    event.target.value,

                  policeStationId:
                    '',
                })
              }
            >
              <option value="">
                All districts
              </option>

              {filterOptions
                ?.districts
                .map(
                  (district) => (
                    <option
                      key={
                        district.id
                      }
                      value={
                        district.id
                      }
                    >
                      {district.name}
                    </option>
                  ),
                )}
            </select>
          </label>

          <label>
            <span>
              Police station
            </span>

            <select
              value={
                draftFilters
                  .policeStationId
              }
              disabled={
                filtersLoading ||
                !draftFilters
                  .districtId
              }
              onChange={(event) =>
                setDraftFilters({
                  ...draftFilters,

                  policeStationId:
                    event.target.value,
                })
              }
            >
              <option value="">
                {draftFilters
                  .districtId
                  ? 'All stations'
                  : 'Select district first'}
              </option>

              {availableStations.map(
                (station) => (
                  <option
                    key={
                      station.id
                    }
                    value={
                      station.id
                    }
                  >
                    {station.name}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>
              Major crime head
            </span>

            <select
              value={
                draftFilters
                  .majorCrimeHeadId
              }
              disabled={
                filtersLoading ||
                !filterOptions
              }
              onChange={(event) =>
                setDraftFilters({
                  ...draftFilters,

                  majorCrimeHeadId:
                    event.target.value,
                })
              }
            >
              <option value="">
                All classifications
              </option>

              {filterOptions
                ?.majorCrimeHeads
                .map(
                  (crimeHead) => (
                    <option
                      key={
                        crimeHead.id
                      }
                      value={
                        crimeHead.id
                      }
                    >
                      {crimeHead.name}
                    </option>
                  ),
                )}
            </select>
          </label>

          <div className="analytics-filters__actions">
            <button
              type="submit"
              disabled={
                loading ||
                filtersLoading
              }
            >
              Apply analytics
            </button>

            <button
              type="button"
              className="analytics-filters__reset"
              disabled={loading}
              onClick={
                resetFilters
              }
            >
              Reset
            </button>
          </div>
        </div>

        {filtersError && (
          <div className="analytics-filters__error">
            {filtersError}
          </div>
        )}
      </form>

      {error && (
        <div
          className="analytics-intelligence__error"
          role="alert"
        >
          <strong>
            Analytics unavailable
          </strong>

          <span>{error}</span>
        </div>
      )}

      <div className="analytics-kpis">
        <article>
          <span>
            Registered cases
          </span>

          <strong>
            {overview
              ? formatNumber(
                  overview
                    .totalCases,
                )
              : '—'}
          </strong>

          <small>
            Current analytical scope
          </small>
        </article>

        <article>
          <span>
            Accused records
          </span>

          <strong>
            {overview
              ? formatNumber(
                  overview
                    .accusedPersons,
                )
              : '—'}
          </strong>

          <small>
            FIR-local accused entries
          </small>
        </article>

        <article>
          <span>
            Cases with arrest
          </span>

          <strong>
            {overview
              ? formatPercent(
                  overview
                    .arrestCoverageRate,
                )
              : '—'}
          </strong>

          <small>
            {overview
              ? `${formatNumber(
                  overview
                    .casesWithArrest,
                )} cases`
              : '—'}
          </small>
        </article>

        <article>
          <span>
            Cases with chargesheet
          </span>

          <strong>
            {overview
              ? formatPercent(
                  overview
                    .chargesheetCoverageRate,
                )
              : '—'}
          </strong>

          <small>
            {overview
              ? `${formatNumber(
                  overview
                    .casesWithChargesheet,
                )} cases`
              : '—'}
          </small>
        </article>

        <article>
          <span>
            Avg. days to first arrest
          </span>

          <strong>
            {overview
              ?.averageDaysToFirstArrest ??
              '—'}
          </strong>

          <small>
            Cases with arrest events
          </small>
        </article>

        <article>
          <span>
            Avg. days to chargesheet
          </span>

          <strong>
            {overview
              ?.averageDaysToFirstChargesheet ??
              '—'}
          </strong>

          <small>
            Cases with chargesheets
          </small>
        </article>
      </div>

      <article className="analytics-trend">
        <header>
          <div>
            <span>
              MONTHLY CASE COHORTS
            </span>

            <h3>
              Registration and investigation
              milestones
            </h3>
          </div>

          <div className="analytics-trend__legend">
            <span>
              <i className="analytics-trend__case-key" />
              Registered
            </span>

            <span>
              <i className="analytics-trend__arrest-key" />
              With arrest
            </span>

            <span>
              <i className="analytics-trend__chargesheet-key" />
              With chargesheet
            </span>
          </div>
        </header>

        <div className="analytics-trend__chart">
          {loading && (
            <div className="analytics-empty">
              Loading monthly analytics…
            </div>
          )}

          {!loading &&
            trendChart.caseBars.length ===
              0 && (
              <div className="analytics-empty">
                No monthly cases match the
                selected filters.
              </div>
            )}

          {!loading &&
            trendChart.caseBars.length >
              0 && (
              <svg
                viewBox={
                  `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`
                }
                role="img"
                aria-label="Monthly cases, arrest coverage and chargesheet coverage"
              >
                {[0, 0.25, 0.5, 0.75, 1]
                  .map(
                    (ratio) => {
                      const y =
                        CHART_TOP +
                        (
                          1 - ratio
                        ) *
                          (
                            CHART_HEIGHT -
                            CHART_TOP -
                            CHART_BOTTOM
                          );

                      return (
                        <g key={ratio}>
                          <line
                            x1={
                              CHART_LEFT
                            }
                            x2={
                              CHART_WIDTH -
                              CHART_RIGHT
                            }
                            y1={y}
                            y2={y}
                            className="analytics-trend__grid"
                          />

                          <text
                            x={
                              CHART_LEFT -
                              8
                            }
                            y={y + 3}
                            textAnchor="end"
                            className="analytics-trend__axis-label"
                          >
                            {Math.round(
                              trendChart
                                .maximum *
                                ratio,
                            )}
                          </text>
                        </g>
                      );
                    },
                  )}

                {trendChart.caseBars.map(
                  (
                    bar,
                    index,
                  ) => (
                    <rect
                      key={[
                        'case',
                        index,
                      ].join(':')}
                      x={bar.x}
                      y={bar.y}
                      width={
                        bar.width
                      }
                      height={
                        bar.height
                      }
                      className="analytics-trend__bar"
                    />
                  ),
                )}

                <polyline
                  points={
                    trendChart
                      .arrestLine
                  }
                  className="analytics-trend__arrest-line"
                />

                <polyline
                  points={
                    trendChart
                      .chargesheetLine
                  }
                  className="analytics-trend__chargesheet-line"
                />

                {trendChart.labels.map(
                  (label) => (
                    <text
                      key={[
                        label.label,
                        label.x,
                      ].join(':')}
                      x={label.x}
                      y={
                        CHART_HEIGHT -
                        10
                      }
                      textAnchor="middle"
                      className="analytics-trend__month-label"
                    >
                      {label.label}
                    </text>
                  ),
                )}
              </svg>
            )}
        </div>
      </article>

      <div className="analytics-two-column">
        <article className="analytics-panel">
          <header>
            <div>
              <span>
                JURISDICTION COMPARISON
              </span>

              <h3>
                District case activity
              </h3>
            </div>

            <small>
              Cases · arrest · chargesheet
            </small>
          </header>

          <div className="analytics-districts">
            {(result
              ?.districtComparison ??
              []
            ).map(
              (district) => (
                <article
                  key={
                    district
                      .districtId
                  }
                >
                  <header>
                    <strong>
                      {
                        district
                          .districtName
                      }
                    </strong>

                    <span>
                      {formatNumber(
                        district
                          .totalCases,
                      )}{' '}
                      cases
                    </span>
                  </header>

                  <div className="analytics-districts__case-track">
                    <span
                      style={{
                        width:
                          `${(
                            district.totalCases /
                            maximumDistrictCases
                          ) * 100}%`,
                      }}
                    />
                  </div>

                  <footer>
                    <span>
                      Arrest{' '}
                      <strong>
                        {formatPercent(
                          district
                            .arrestCoverageRate,
                        )}
                      </strong>
                    </span>

                    <span>
                      Chargesheet{' '}
                      <strong>
                        {formatPercent(
                          district
                            .chargesheetCoverageRate,
                        )}
                      </strong>
                    </span>
                  </footer>
                </article>
              ),
            )}
          </div>
        </article>

        <article className="analytics-panel">
          <header>
            <div>
              <span>
                OFFENCE COMPOSITION
              </span>

              <h3>
                Major crime classifications
              </h3>
            </div>
          </header>

          <BreakdownBars
            items={
              result
                ?.crimeComposition ??
              []
            }
            emptyMessage="No crime classifications are available."
          />
        </article>
      </div>

      <div className="analytics-three-column">
        <article className="analytics-panel">
          <header>
            <div>
              <span>
                CASE OUTCOMES
              </span>

              <h3>
                Current case status
              </h3>
            </div>
          </header>

          <BreakdownBars
            items={
              result
                ?.statusDistribution ??
              []
            }
            emptyMessage="No status data is available."
          />
        </article>

        <article className="analytics-panel">
          <header>
            <div>
              <span>
                OFFENCE GRAVITY
              </span>

              <h3>
                Severity distribution
              </h3>
            </div>
          </header>

          <BreakdownBars
            items={
              result
                ?.gravityDistribution ??
              []
            }
            emptyMessage="No gravity data is available."
          />
        </article>

        <article className="analytics-panel">
          <header>
            <div>
              <span>
                INVESTIGATION VOLUME
              </span>

              <h3>
                Operational records
              </h3>
            </div>
          </header>

          <div className="analytics-record-volume">
            <div>
              <span>
                Arrest events
              </span>

              <strong>
                {overview
                  ? formatNumber(
                      overview
                        .arrestEvents,
                    )
                  : '—'}
              </strong>
            </div>

            <div>
              <span>
                Chargesheet records
              </span>

              <strong>
                {overview
                  ? formatNumber(
                      overview
                        .chargesheetRecords,
                    )
                  : '—'}
              </strong>
            </div>

            <div>
              <span>
                Victim records
              </span>

              <strong>
                {overview
                  ? formatNumber(
                      overview.victims,
                    )
                  : '—'}
              </strong>
            </div>
          </div>
        </article>
      </div>

      <article className="analytics-panel analytics-mo">
        <header>
          <div>
            <span>
              CONFIDENCE-QUALIFIED PATTERNS
            </span>

            <h3>
              Recurring modus operandi
            </h3>
          </div>

          <small>
            Minimum association confidence:
            0.75
          </small>
        </header>

        <div className="analytics-mo__grid">
          {(result
            ?.modusOperandiRecurrence ??
            []
          ).map(
            (
              item,
              index,
            ) => (
              <article
                key={
                  item
                    .modusOperandiId
                }
              >
                <div className="analytics-mo__rank">
                  #
                  {index + 1}
                </div>

                <div>
                  <strong>
                    {item.name}
                  </strong>

                  <span>
                    {formatNumber(
                      item.caseCount,
                    )}{' '}
                    cases
                    {' · '}
                    {formatPercent(
                      item.percentage,
                    )}
                  </span>
                </div>

                <div className="analytics-mo__confidence">
                  <span>
                    Confidence
                  </span>

                  <strong>
                    {
                      item
                        .averageConfidence
                    }
                  </strong>
                </div>
              </article>
            ),
          )}
        </div>
      </article>

      <section className="analytics-methodology">
        <div>
          <span>
            METHODOLOGY
          </span>

          <h3>
            Cohort-based descriptive analytics
          </h3>

          <p>
            {result?.methodology ??
              'Analytics summarize registered FIR cohorts and linked investigation records.'}
          </p>
        </div>

        <div>
          <span>
            EXCLUDED FROM ANALYSIS
          </span>

          <div>
            {(result
              ?.excludedInputs ??
              []
            ).map(
              (input) => (
                <strong
                  key={input}
                >
                  {input}
                </strong>
              ),
            )}
          </div>
        </div>
      </section>
    </section>
  );
}
