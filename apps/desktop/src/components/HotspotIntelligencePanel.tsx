import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
  KeyboardEvent,
} from 'react';

import type {
  HotspotFilterOptions,
  HotspotLocationTrendResponse,
  HotspotRiskBand,
  HotspotSummaryItem,
  HotspotSummaryResponse,
} from '@kavach/shared-types';

import {
  EntityProfileWorkspace,
} from './EntityProfileWorkspace';

import {
  InvestigationGraphWorkspace,
} from './InvestigationGraphWorkspace';

import './HotspotIntelligencePanel.css';

interface HotspotFilters {
  periodKey: string;

  districtId: string;
  policeStationId: string;

  riskBands:
    HotspotRiskBand[];
}

interface GraphWorkspaceState {
  rootNodeId: string;
  title: string;
}

interface SpatialPoint {
  item:
    HotspotSummaryItem;

  x: number;
  y: number;

  radius: number;
}

interface TrendPoint {
  x: number;
  y: number;

  pressureScore: number;
  crimeCount: number;

  label: string;
}

interface CrimeBar {
  x: number;
  y: number;

  width: number;
  height: number;
}

const MAP_WIDTH = 820;
const MAP_HEIGHT = 440;
const MAP_PADDING = 38;

const TREND_WIDTH = 760;
const TREND_HEIGHT = 230;
const TREND_PADDING_X = 38;
const TREND_PADDING_Y = 25;

const HOTSPOT_RISK_BANDS:
readonly HotspotRiskBand[] = [
  'CRITICAL',
  'HIGH',
  'MODERATE',
  'LOW',
];

const EMPTY_FILTERS:
HotspotFilters = {
  periodKey: '',

  districtId: '',
  policeStationId: '',

  riskBands: [],
};

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'en-IN',
  ).format(value);
}

function formatDecimal(
  value: number,
): string {
  return new Intl.NumberFormat(
    'en-IN',
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function parseOptionalId(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return undefined;
  }

  return parsed;
}

function parsePeriodKey(
  value: string,
): {
  year: number;
  month: number;
} | null {
  const match =
    /^(\d{4})-(\d{2})$/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const year =
    Number(match[1]);

  const month =
    Number(match[2]);

  if (
    !Number.isSafeInteger(year) ||
    !Number.isSafeInteger(month) ||
    year < 1 ||
    month < 1 ||
    month > 12
  ) {
    return null;
  }

  return {
    year,
    month,
  };
}

function riskBandClass(
  baseClass: string,
  band:
    HotspotRiskBand,
): string {
  return [
    baseClass,

    `${baseClass}--${band.toLowerCase()}`,
  ].join(' ');
}

function trendLabel(
  direction:
    HotspotSummaryItem[
      'trendDirection'
    ],
): string {
  switch (direction) {
    case 'RISING':
      return '↑ Rising';

    case 'FALLING':
      return '↓ Falling';

    default:
      return '→ Stable';
  }
}

function trendClass(
  direction:
    HotspotSummaryItem[
      'trendDirection'
    ],
): string {
  return [
    'hotspot-trend-indicator',

    `hotspot-trend-indicator--${direction.toLowerCase()}`,
  ].join(' ');
}

function calculateSpatialPoints(
  items:
    readonly HotspotSummaryItem[],
): SpatialPoint[] {
  if (items.length === 0) {
    return [];
  }

  const latitudes =
    items.map(
      (item) =>
        item.location.latitude,
    );

  const longitudes =
    items.map(
      (item) =>
        item.location.longitude,
    );

  const minimumLatitude =
    Math.min(...latitudes);

  const maximumLatitude =
    Math.max(...latitudes);

  const minimumLongitude =
    Math.min(...longitudes);

  const maximumLongitude =
    Math.max(...longitudes);

  const latitudeRange =
    maximumLatitude -
      minimumLatitude ||
    1;

  const longitudeRange =
    maximumLongitude -
      minimumLongitude ||
    1;

  return items.map(
    (item) => {
      const normalizedX =
        (
          item.location.longitude -
          minimumLongitude
        ) /
        longitudeRange;

      const normalizedY =
        (
          item.location.latitude -
          minimumLatitude
        ) /
        latitudeRange;

      return {
        item,

        x:
          MAP_PADDING +
          normalizedX *
            (
              MAP_WIDTH -
              MAP_PADDING * 2
            ),

        y:
          MAP_HEIGHT -
          MAP_PADDING -
          normalizedY *
            (
              MAP_HEIGHT -
              MAP_PADDING * 2
            ),

        radius:
          5 +
          (
            item.pressureScore /
            100
          ) *
            10,
      };
    },
  );
}

function calculateTrendPoints(
  trend:
    HotspotLocationTrendResponse |
    null,
): {
  points: TrendPoint[];
  bars: CrimeBar[];
  polyline: string;
  maximumCrimeCount: number;
} {
  const sourcePoints =
    trend?.points ?? [];

  if (
    sourcePoints.length === 0
  ) {
    return {
      points: [],
      bars: [],
      polyline: '',
      maximumCrimeCount: 0,
    };
  }

  const graphWidth =
    TREND_WIDTH -
    TREND_PADDING_X * 2;

  const graphHeight =
    TREND_HEIGHT -
    TREND_PADDING_Y * 2;

  const xStep =
    sourcePoints.length === 1
      ? 0
      : graphWidth /
        (
          sourcePoints.length -
          1
        );

  const maximumCrimeCount =
    Math.max(
      1,

      ...sourcePoints.map(
        (point) =>
          point.crimeCount,
      ),
    );

  const points =
    sourcePoints.map(
      (
        point,
        index,
      ) => {
        const x =
          sourcePoints.length === 1
            ? TREND_WIDTH / 2
            : (
                TREND_PADDING_X +
                index * xStep
              );

        const y =
          TREND_HEIGHT -
          TREND_PADDING_Y -
          (
            point.pressureScore /
            100
          ) *
            graphHeight;

        return {
          x,
          y,

          pressureScore:
            point.pressureScore,

          crimeCount:
            point.crimeCount,

          label:
            point.period.label,
        };
      },
    );

  const barSpace =
    graphWidth /
    Math.max(
      sourcePoints.length,
      1,
    );

  const barWidth =
    Math.max(
      3,
      Math.min(
        18,
        barSpace * 0.48,
      ),
    );

  const bars =
    sourcePoints.map(
      (
        point,
        index,
      ) => {
        const centerX =
          sourcePoints.length === 1
            ? TREND_WIDTH / 2
            : (
                TREND_PADDING_X +
                index * xStep
              );

        const height =
          (
            point.crimeCount /
            maximumCrimeCount
          ) *
          graphHeight;

        return {
          x:
            centerX -
            barWidth / 2,

          y:
            TREND_HEIGHT -
            TREND_PADDING_Y -
            height,

          width:
            barWidth,

          height,
        };
      },
    );

  return {
    points,

    bars,

    polyline:
      points
        .map(
          (point) =>
            `${point.x},${point.y}`,
        )
        .join(' '),

    maximumCrimeCount,
  };
}

function createFilterCount(
  filters:
    HotspotFilters,
): number {
  return (
    filters.riskBands.length +
    (
      filters.districtId
        ? 1
        : 0
    ) +
    (
      filters.policeStationId
        ? 1
        : 0
    )
  );
}

export function HotspotIntelligencePanel() {
  const [
    filterOptions,
    setFilterOptions,
  ] =
    useState<
      HotspotFilterOptions |
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
    useState<HotspotFilters>({
      ...EMPTY_FILTERS,
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<HotspotFilters>({
      ...EMPTY_FILTERS,
    });

  const [
    summary,
    setSummary,
  ] =
    useState<
      HotspotSummaryResponse |
      null
    >(null);

  const [
    summaryLoading,
    setSummaryLoading,
  ] =
    useState(true);

  const [
    summaryError,
    setSummaryError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    selectedLocationId,
    setSelectedLocationId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    trend,
    setTrend,
  ] =
    useState<
      HotspotLocationTrendResponse |
      null
    >(null);

  const [
    trendMonths,
    setTrendMonths,
  ] =
    useState(12);

  const [
    trendLoading,
    setTrendLoading,
  ] =
    useState(false);

  const [
    trendError,
    setTrendError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    graphWorkspace,
    setGraphWorkspace,
  ] =
    useState<
      GraphWorkspaceState |
      null
    >(null);

  const [
    selectedEntityId,
    setSelectedEntityId,
  ] =
    useState<number | null>(
      null,
    );

  useEffect(() => {
    let active = true;

    async function loadFilterOptions():
    Promise<void> {
      setFiltersLoading(true);
      setFiltersError(null);

      try {
        const result =
          await window.kavach.hotspots
            .getFilterOptions();

        if (!active) {
          return;
        }

        setFilterOptions(result);

        const initialFilters:
          HotspotFilters = {
          ...EMPTY_FILTERS,

          periodKey:
            result
              .defaultPeriod
              .key,
        };

        setDraftFilters(
          initialFilters,
        );

        setAppliedFilters(
          initialFilters,
        );
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setFilterOptions(null);

        setFiltersError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Hotspot filter options could not be loaded.',
        );
      } finally {
        if (active) {
          setFiltersLoading(false);
        }
      }
    }

    void loadFilterOptions();

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

    async function loadSummary():
    Promise<void> {
      setSummaryLoading(true);
      setSummaryError(null);

      const period =
        parsePeriodKey(
          appliedFilters.periodKey,
        );

      const districtId =
        parseOptionalId(
          appliedFilters.districtId,
        );

      const policeStationId =
        parseOptionalId(
          appliedFilters
            .policeStationId,
        );

      try {
        const result =
          await window.kavach.hotspots
            .getSummary({
              year:
                period?.year,

              month:
                period?.month,

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

              riskBands:
                appliedFilters
                  .riskBands.length >
                0
                  ? appliedFilters
                      .riskBands
                  : undefined,

              limit: 180,
            });

        if (!active) {
          return;
        }

        setSummary(result);

        setSelectedLocationId(
          (
            currentLocationId,
          ) => {
            const currentExists =
              result.items.some(
                (item) =>
                  item.location.id ===
                  currentLocationId,
              );

            if (currentExists) {
              return currentLocationId;
            }

            return (
              result.items[0]
                ?.location.id ??
              null
            );
          },
        );
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setSummary(null);

        setSelectedLocationId(
          null,
        );

        setSummaryError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Hotspot summary could not be loaded.',
        );
      } finally {
        if (active) {
          setSummaryLoading(false);
        }
      }
    }

    void loadSummary();

    return () => {
      active = false;
    };
  }, [
    appliedFilters,
    filterOptions,
    filtersLoading,
  ]);

  useEffect(() => {
    if (
      selectedLocationId ===
      null
    ) {
      setTrend(null);
      setTrendError(null);

      return undefined;
    }

    let active = true;

    async function loadTrend():
    Promise<void> {
      setTrendLoading(true);
      setTrendError(null);

      try {
        const result =
          await window.kavach.hotspots
            .getLocationTrend(
              selectedLocationId,

              {
                months:
                  trendMonths,
              },
            );

        if (active) {
          setTrend(result);
        }
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setTrend(null);

        setTrendError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Location trend could not be loaded.',
        );
      } finally {
        if (active) {
          setTrendLoading(false);
        }
      }
    }

    void loadTrend();

    return () => {
      active = false;
    };
  }, [
    selectedLocationId,
    trendMonths,
  ]);

  const availablePoliceStations =
    useMemo(() => {
      const districtId =
        parseOptionalId(
          draftFilters.districtId,
        );

      if (
        !filterOptions ||
        districtId === undefined
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
    }, [
      draftFilters.districtId,
      filterOptions,
    ]);

  const selectedItem =
    useMemo(
      () => {
        if (
          !summary ||
          selectedLocationId ===
            null
        ) {
          return null;
        }

        return (
          summary.items.find(
            (item) =>
              item.location.id ===
              selectedLocationId,
          ) ??
          null
        );
      },
      [
        selectedLocationId,
        summary,
      ],
    );

  const spatialPoints =
    useMemo(
      () =>
        calculateSpatialPoints(
          summary?.items ?? [],
        ),
      [
        summary,
      ],
    );

  const trendPlot =
    useMemo(
      () =>
        calculateTrendPoints(
          trend,
        ),
      [
        trend,
      ],
    );

  const visibleRankedItems =
    useMemo(
      () =>
        (
          summary?.items ?? []
        ).slice(0, 40),
      [
        summary,
      ],
    );

  function toggleRiskBand(
    band: HotspotRiskBand,
  ): void {
    const selected =
      draftFilters
        .riskBands
        .includes(band);

    setDraftFilters({
      ...draftFilters,

      riskBands:
        selected
          ? draftFilters
              .riskBands
              .filter(
                (candidate) =>
                  candidate !==
                  band,
              )
          : [
              ...draftFilters
                .riskBands,

              band,
            ],
    });
  }

  function applyFilters(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setAppliedFilters({
      ...draftFilters,

      riskBands: [
        ...draftFilters
          .riskBands,
      ],
    });
  }

  function clearFilters(): void {
    const cleared:
      HotspotFilters = {
      ...EMPTY_FILTERS,

      periodKey:
        filterOptions
          ?.defaultPeriod
          .key ??
        '',
    };

    setDraftFilters(
      cleared,
    );

    setAppliedFilters(
      cleared,
    );
  }

  function handleSpatialKeyDown(
    event:
      KeyboardEvent<SVGGElement>,

    locationId: number,
  ): void {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();

      setSelectedLocationId(
        locationId,
      );
    }
  }

  function openLocationGraph(): void {
    if (!selectedItem) {
      return;
    }

    setGraphWorkspace({
      rootNodeId:
        `LOCATION:${selectedItem.location.id}`,

      title:
        [
          'Location graph',
          selectedItem
            .location.name,
        ].join(' · '),
    });
  }

  const activeFilterCount =
    createFilterCount(
      appliedFilters,
    );

  return (
    <>
      <section
        className="hotspot-intelligence"
        aria-labelledby="hotspot-intelligence-title"
      >
        <header className="hotspot-intelligence__header">
          <div>
            <span className="hotspot-intelligence__eyebrow">
              AGGREGATE OPERATIONAL ANALYSIS
            </span>

            <h2 id="hotspot-intelligence-title">
              Hotspot Intelligence
            </h2>

            <p>
              Review historical crime
              concentration across normalized
              locations using transparent,
              aggregate operational signals.
            </p>
          </div>

          <div className="hotspot-intelligence__status">
            <span
              aria-hidden="true"
            />

            HISTORICAL PRESSURE MODEL
          </div>
        </header>

        <aside className="hotspot-intelligence__governance">
          <div
            className="hotspot-intelligence__governance-mark"
            aria-hidden="true"
          >
            !
          </div>

          <div>
            <strong>
              Aggregate planning support only
            </strong>

            <p>
              {summary?.responsibleUse ??
                [
                  'Hotspot pressure must not',
                  'be used to label residents,',
                  'communities or individuals',
                  'as criminal or suspicious.',
                ].join(' ')}
            </p>
          </div>

          <span>
            NO INDIVIDUAL RISK SCORING
          </span>
        </aside>

        <form
          className="hotspot-filters"
          onSubmit={applyFilters}
        >
          <div className="hotspot-filters__heading">
            <div>
              <span>
                OPERATIONAL PARAMETERS
              </span>

              <h3>
                Filter historical concentration
              </h3>
            </div>

            <div className="hotspot-filters__active">
              {activeFilterCount}
              {' '}
              active filters
            </div>
          </div>

          <div className="hotspot-filters__grid">
            <label>
              <span>
                Reporting period
              </span>

              <select
                value={
                  draftFilters.periodKey
                }
                disabled={
                  filtersLoading ||
                  !filterOptions
                }
                onChange={(event) =>
                  setDraftFilters({
                    ...draftFilters,

                    periodKey:
                      event.target.value,
                  })
                }
              >
                {filterOptions
                  ?.periods
                  .map(
                    (period) => (
                      <option
                        key={
                          period.key
                        }
                        value={
                          period.key
                        }
                      >
                        {period.label}
                      </option>
                    ),
                  )}
              </select>
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
                  !filterOptions ||
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

                {availablePoliceStations
                  .map(
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

            <div className="hotspot-filters__actions">
              <button
                type="submit"
                disabled={
                  summaryLoading ||
                  filtersLoading
                }
              >
                Apply filters
              </button>

              <button
                type="button"
                className="hotspot-filters__clear"
                disabled={
                  summaryLoading
                }
                onClick={
                  clearFilters
                }
              >
                Clear
              </button>
            </div>
          </div>

          <div className="hotspot-filters__bands">
            <span>
              Pressure bands
            </span>

            <div>
              {HOTSPOT_RISK_BANDS.map(
                (band) => {
                  const selected =
                    draftFilters
                      .riskBands
                      .includes(band);

                  return (
                    <button
                      key={band}
                      type="button"
                      className={[
                        riskBandClass(
                          'hotspot-filter-band',
                          band,
                        ),

                        selected
                          ? 'hotspot-filter-band--selected'
                          : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={
                        selected
                      }
                      onClick={() =>
                        toggleRiskBand(
                          band,
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                      />

                      {band}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {filtersError && (
            <div className="hotspot-filters__error">
              {filtersError}
            </div>
          )}
        </form>

        <div className="hotspot-intelligence__metrics">
          <article>
            <span>
              Matching locations
            </span>

            <strong>
              {summary
                ? formatNumber(
                    summary
                      .matchingLocations,
                  )
                : '—'}
            </strong>

            <small>
              After current filters
            </small>
          </article>

          <article>
            <span>
              Monthly cases
            </span>

            <strong>
              {summary
                ? formatNumber(
                    summary
                      .totalCrimeCount,
                  )
                : '—'}
            </strong>

            <small>
              Across matching locations
            </small>
          </article>

          <article>
            <span>
              Average pressure
            </span>

            <strong>
              {summary
                ? formatDecimal(
                    summary
                      .averagePressureScore,
                  )
                : '—'}
            </strong>

            <small>
              Out of 100
            </small>
          </article>

          <article>
            <span>
              Critical locations
            </span>

            <strong>
              {summary
                ? summary
                    .criticalLocationCount
                : '—'}
            </strong>

            <small>
              Highest concentration band
            </small>
          </article>

          <article>
            <span>
              High locations
            </span>

            <strong>
              {summary
                ? summary
                    .highLocationCount
                : '—'}
            </strong>

            <small>
              Elevated operational pressure
            </small>
          </article>
        </div>

        {summaryError && (
          <div
            className="hotspot-intelligence__error"
            role="alert"
          >
            <strong>
              Hotspot intelligence unavailable
            </strong>

            <span>
              {summaryError}
            </span>
          </div>
        )}

        <div className="hotspot-intelligence__workspace">
          <article className="hotspot-map-panel">
            <header>
              <div>
                <span>
                  SPATIAL LOCATION BOARD
                </span>

                <h3>
                  {summary?.period.label ??
                    'Current period'}
                </h3>
              </div>

              <small>
                Larger markers indicate
                higher pressure
              </small>
            </header>

            <div className="hotspot-map-panel__legend">
              {HOTSPOT_RISK_BANDS.map(
                (band) => (
                  <span
                    key={band}
                    className={
                      riskBandClass(
                        'hotspot-map-legend',
                        band,
                      )
                    }
                  >
                    <i
                      aria-hidden="true"
                    />

                    {band}
                  </span>
                ),
              )}
            </div>

            <div className="hotspot-map-panel__canvas">
              {summaryLoading && (
                <div className="hotspot-map-panel__message">
                  Loading location
                  concentration…
                </div>
              )}

              {!summaryLoading &&
                spatialPoints.length ===
                  0 && (
                  <div className="hotspot-map-panel__message">
                    No locations match the
                    selected filters.
                  </div>
                )}

              {!summaryLoading &&
                spatialPoints.length >
                  0 && (
                  <svg
                    viewBox={
                      `0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`
                    }
                    role="img"
                    aria-label="Coordinate plot of hotspot locations"
                  >
                    <defs>
                      <pattern
                        id="hotspot-grid"
                        width="42"
                        height="42"
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d="M 42 0 L 0 0 0 42"
                          className="hotspot-map-panel__grid-line"
                        />
                      </pattern>
                    </defs>

                    <rect
                      width={
                        MAP_WIDTH
                      }
                      height={
                        MAP_HEIGHT
                      }
                      className="hotspot-map-panel__background"
                    />

                    <rect
                      width={
                        MAP_WIDTH
                      }
                      height={
                        MAP_HEIGHT
                      }
                      fill="url(#hotspot-grid)"
                    />

                    <path
                      d={[
                        `M ${MAP_PADDING} ${MAP_HEIGHT / 2}`,
                        `L ${MAP_WIDTH - MAP_PADDING} ${MAP_HEIGHT / 2}`,
                      ].join(' ')}
                      className="hotspot-map-panel__axis"
                    />

                    <path
                      d={[
                        `M ${MAP_WIDTH / 2} ${MAP_PADDING}`,
                        `L ${MAP_WIDTH / 2} ${MAP_HEIGHT - MAP_PADDING}`,
                      ].join(' ')}
                      className="hotspot-map-panel__axis"
                    />

                    {spatialPoints.map(
                      (point) => {
                        const selected =
                          point
                            .item
                            .location
                            .id ===
                          selectedLocationId;

                        return (
                          <g
                            key={
                              point
                                .item
                                .location
                                .id
                            }
                            role="button"
                            tabIndex={0}
                            className={[
                              'hotspot-map-point',

                              `hotspot-map-point--${point.item.riskBand.toLowerCase()}`,

                              selected
                                ? 'hotspot-map-point--selected'
                                : '',
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(' ')}
                            onClick={() =>
                              setSelectedLocationId(
                                point
                                  .item
                                  .location
                                  .id,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) =>
                              handleSpatialKeyDown(
                                event,
                                point
                                  .item
                                  .location
                                  .id,
                              )
                            }
                          >
                            <circle
                              cx={
                                point.x
                              }
                              cy={
                                point.y
                              }
                              r={
                                point.radius +
                                7
                              }
                              className="hotspot-map-point__halo"
                            />

                            <circle
                              cx={
                                point.x
                              }
                              cy={
                                point.y
                              }
                              r={
                                point.radius
                              }
                              className="hotspot-map-point__marker"
                            />

                            <title>
                              {[
                                point
                                  .item
                                  .location
                                  .name,

                                `${point.item.pressureScore}/100`,

                                point
                                  .item
                                  .riskBand,

                                `${point.item.crimeCount} cases`,
                              ].join(
                                ' · ',
                              )}
                            </title>

                            {selected && (
                              <>
                                <line
                                  x1={
                                    point.x
                                  }
                                  y1={
                                    point.y -
                                    point.radius -
                                    4
                                  }
                                  x2={
                                    point.x
                                  }
                                  y2={
                                    point.y -
                                    point.radius -
                                    16
                                  }
                                  className="hotspot-map-point__connector"
                                />

                                <text
                                  x={
                                    point.x
                                  }
                                  y={
                                    point.y -
                                    point.radius -
                                    21
                                  }
                                  textAnchor="middle"
                                  className="hotspot-map-point__label"
                                >
                                  {
                                    point
                                      .item
                                      .location
                                      .name
                                  }
                                </text>
                              </>
                            )}
                          </g>
                        );
                      },
                    )}
                  </svg>
                )}
            </div>

            <footer>
              <span>
                Coordinate-derived operational
                view
              </span>

              <small>
                This is not an administrative
                boundary map.
              </small>
            </footer>
          </article>

          <article className="hotspot-ranking">
            <header>
              <div>
                <span>
                  LOCATION RANKING
                </span>

                <h3>
                  Highest pressure locations
                </h3>
              </div>

              <small>
                Top{' '}
                {visibleRankedItems.length}
              </small>
            </header>

            <div className="hotspot-ranking__list">
              {summaryLoading && (
                <div className="hotspot-ranking__message">
                  Ranking locations…
                </div>
              )}

              {!summaryLoading &&
                visibleRankedItems
                  .length === 0 && (
                  <div className="hotspot-ranking__message">
                    No locations available.
                  </div>
                )}

              {!summaryLoading &&
                visibleRankedItems.map(
                  (
                    item,
                    index,
                  ) => {
                    const selected =
                      item
                        .location
                        .id ===
                      selectedLocationId;

                    return (
                      <button
                        key={
                          item
                            .location
                            .id
                        }
                        type="button"
                        className={[
                          'hotspot-ranking-card',

                          selected
                            ? 'hotspot-ranking-card--selected'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          setSelectedLocationId(
                            item
                              .location
                              .id,
                          )
                        }
                      >
                        <div className="hotspot-ranking-card__rank">
                          #
                          {index + 1}
                        </div>

                        <div className="hotspot-ranking-card__content">
                          <header>
                            <div>
                              <strong>
                                {
                                  item
                                    .location
                                    .name
                                }
                              </strong>

                              <span>
                                {
                                  item
                                    .location
                                    .zoneType
                                }
                              </span>
                            </div>

                            <div className="hotspot-ranking-card__score">
                              <strong>
                                {
                                  item
                                    .pressureScore
                                }
                              </strong>

                              <span>
                                /100
                              </span>
                            </div>
                          </header>

                          <p>
                            {
                              item
                                .location
                                .policeStation
                                .name
                            }
                            {' · '}
                            {
                              item
                                .location
                                .district
                                .name
                            }
                          </p>

                          <div className="hotspot-ranking-card__meta">
                            <span
                              className={
                                riskBandClass(
                                  'hotspot-risk-band',
                                  item
                                    .riskBand,
                                )
                              }
                            >
                              {
                                item
                                  .riskBand
                              }
                            </span>

                            <span
                              className={
                                trendClass(
                                  item
                                    .trendDirection,
                                )
                              }
                            >
                              {trendLabel(
                                item
                                  .trendDirection,
                              )}
                            </span>

                            <span>
                              {
                                item
                                  .crimeCount
                              }{' '}
                              cases
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
            </div>
          </article>
        </div>

        <div className="hotspot-intelligence__analysis">
          <article className="hotspot-location-inspector">
            <header>
              <div>
                <span>
                  SELECTED LOCATION
                </span>

                <h3>
                  {selectedItem
                    ?.location.name ??
                    'Select a location'}
                </h3>
              </div>

              {selectedItem && (
                <div className="hotspot-location-inspector__score">
                  <strong>
                    {
                      selectedItem
                        .pressureScore
                    }
                  </strong>

                  <span>
                    /100
                  </span>
                </div>
              )}
            </header>

            {selectedItem ? (
              <>
                <div className="hotspot-location-inspector__badges">
                  <span
                    className={
                      riskBandClass(
                        'hotspot-risk-band',
                        selectedItem
                          .riskBand,
                      )
                    }
                  >
                    {
                      selectedItem
                        .riskBand
                    }
                  </span>

                  <span
                    className={
                      trendClass(
                        selectedItem
                          .trendDirection,
                      )
                    }
                  >
                    {trendLabel(
                      selectedItem
                        .trendDirection,
                    )}
                  </span>

                  <span>
                    {
                      selectedItem
                        .dataSplit
                    }{' '}
                    dataset split
                  </span>
                </div>

                <div className="hotspot-location-inspector__grid">
                  <div>
                    <span>
                      District
                    </span>

                    <strong>
                      {
                        selectedItem
                          .location
                          .district
                          .name
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Police station
                    </span>

                    <strong>
                      {
                        selectedItem
                          .location
                          .policeStation
                          .name
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Zone type
                    </span>

                    <strong>
                      {
                        selectedItem
                          .location
                          .zoneType
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Monthly cases
                    </span>

                    <strong>
                      {
                        selectedItem
                          .crimeCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Previous month
                    </span>

                    <strong>
                      {
                        selectedItem
                          .lag1CrimeCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Three-month average
                    </span>

                    <strong>
                      {formatDecimal(
                        selectedItem
                          .lag3AverageCrimeCount,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Twelve-month lag
                    </span>

                    <strong>
                      {
                        selectedItem
                          .lag12CrimeCount
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Average severity
                    </span>

                    <strong>
                      {formatDecimal(
                        selectedItem
                          .averageSeverity,
                      )}
                    </strong>
                  </div>
                </div>

                <div className="hotspot-location-inspector__crime">
                  <span>
                    Dominant crime type
                  </span>

                  <strong>
                    {
                      selectedItem
                        .dominantCrimeType
                    }
                  </strong>
                </div>

                <div className="hotspot-location-inspector__coordinates">
                  <div>
                    <span>
                      Latitude
                    </span>

                    <strong>
                      {formatDecimal(
                        selectedItem
                          .location
                          .latitude,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Longitude
                    </span>

                    <strong>
                      {formatDecimal(
                        selectedItem
                          .location
                          .longitude,
                      )}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="hotspot-location-inspector__graph"
                  onClick={
                    openLocationGraph
                  }
                >
                  <span>
                    Investigate linked cases,
                    people and identifiers
                  </span>

                  <strong>
                    Open location graph →
                  </strong>
                </button>
              </>
            ) : (
              <div className="hotspot-location-inspector__empty">
                Select a marker or ranked
                location to inspect it.
              </div>
            )}
          </article>

          <article className="hotspot-trend-panel">
            <header>
              <div>
                <span>
                  HISTORICAL TREND
                </span>

                <h3>
                  Pressure and crime activity
                </h3>
              </div>

              <label>
                <span>
                  Window
                </span>

                <select
                  value={
                    trendMonths
                  }
                  disabled={
                    trendLoading ||
                    selectedLocationId ===
                      null
                  }
                  onChange={(event) =>
                    setTrendMonths(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                >
                  <option value={6}>
                    6 months
                  </option>

                  <option value={12}>
                    12 months
                  </option>

                  <option value={24}>
                    24 months
                  </option>

                  <option value={41}>
                    Full history
                  </option>
                </select>
              </label>
            </header>

            <div className="hotspot-trend-panel__legend">
              <span>
                <i className="hotspot-trend-panel__legend-line" />

                Pressure score
              </span>

              <span>
                <i className="hotspot-trend-panel__legend-bar" />

                Monthly cases
              </span>
            </div>

            <div className="hotspot-trend-panel__chart">
              {trendLoading && (
                <div className="hotspot-trend-panel__message">
                  Loading historical trend…
                </div>
              )}

              {!trendLoading &&
                trendError && (
                  <div className="hotspot-trend-panel__message hotspot-trend-panel__message--error">
                    {trendError}
                  </div>
                )}

              {!trendLoading &&
                !trendError &&
                trendPlot
                  .points
                  .length === 0 && (
                  <div className="hotspot-trend-panel__message">
                    Select a location to
                    view its trend.
                  </div>
                )}

              {!trendLoading &&
                !trendError &&
                trendPlot
                  .points
                  .length > 0 && (
                  <svg
                    viewBox={
                      `0 0 ${TREND_WIDTH} ${TREND_HEIGHT}`
                    }
                    role="img"
                    aria-label="Historical hotspot pressure and crime-count trend"
                  >
                    {[0, 25, 50, 75, 100]
                      .map(
                        (score) => {
                          const y =
                            TREND_HEIGHT -
                            TREND_PADDING_Y -
                            (
                              score /
                              100
                            ) *
                              (
                                TREND_HEIGHT -
                                TREND_PADDING_Y *
                                  2
                              );

                          return (
                            <g
                              key={
                                score
                              }
                            >
                              <line
                                x1={
                                  TREND_PADDING_X
                                }
                                x2={
                                  TREND_WIDTH -
                                  TREND_PADDING_X
                                }
                                y1={y}
                                y2={y}
                                className="hotspot-trend-panel__grid-line"
                              />

                              <text
                                x={
                                  TREND_PADDING_X -
                                  8
                                }
                                y={
                                  y + 3
                                }
                                textAnchor="end"
                                className="hotspot-trend-panel__axis-label"
                              >
                                {score}
                              </text>
                            </g>
                          );
                        },
                      )}

                    {trendPlot.bars.map(
                      (
                        bar,
                        index,
                      ) => (
                        <rect
                          key={[
                            'bar',
                            index,
                          ].join(
                            ':',
                          )}
                          x={bar.x}
                          y={bar.y}
                          width={
                            bar.width
                          }
                          height={
                            bar.height
                          }
                          className="hotspot-trend-panel__bar"
                        />
                      ),
                    )}

                    <polyline
                      points={
                        trendPlot.polyline
                      }
                      className="hotspot-trend-panel__line"
                    />

                    {trendPlot.points.map(
                      (
                        point,
                        index,
                      ) => {
                        const showLabel =
                          index === 0 ||
                          index ===
                            trendPlot
                              .points
                              .length -
                              1 ||
                          index %
                            Math.max(
                              1,
                              Math.ceil(
                                trendPlot
                                  .points
                                  .length /
                                  5,
                              ),
                            ) ===
                            0;

                        return (
                          <g
                            key={[
                              point.label,
                              index,
                            ].join(
                              ':',
                            )}
                          >
                            <circle
                              cx={
                                point.x
                              }
                              cy={
                                point.y
                              }
                              r={4}
                              className="hotspot-trend-panel__point"
                            >
                              <title>
                                {[
                                  point.label,

                                  `Pressure ${point.pressureScore}`,

                                  `${point.crimeCount} cases`,
                                ].join(
                                  ' · ',
                                )}
                              </title>
                            </circle>

                            {showLabel && (
                              <text
                                x={
                                  point.x
                                }
                                y={
                                  TREND_HEIGHT -
                                  7
                                }
                                textAnchor="middle"
                                className="hotspot-trend-panel__period-label"
                              >
                                {
                                  point.label
                                }
                              </text>
                            )}
                          </g>
                        );
                      },
                    )}
                  </svg>
                )}
            </div>

            <footer>
              <div>
                <span>
                  Latest pressure
                </span>

                <strong>
                  {trend?.points[
                    trend.points.length -
                      1
                  ]?.pressureScore ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Latest cases
                </span>

                <strong>
                  {trend?.points[
                    trend.points.length -
                      1
                  ]?.crimeCount ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Maximum visible cases
                </span>

                <strong>
                  {
                    trendPlot
                      .maximumCrimeCount
                  }
                </strong>
              </div>
            </footer>
          </article>
        </div>

        <section className="hotspot-methodology">
          <div>
            <span>
              METHODOLOGY
            </span>

            <h3>
              Historical pressure calculation
            </h3>

            <p>
              {summary?.methodology ??
                [
                  'The score uses current',
                  'monthly activity, historical',
                  'lags and average offence',
                  'severity.',
                ].join(' ')}
            </p>
          </div>

          <div>
            <span>
              EXCLUDED FROM SCORING
            </span>

            <div className="hotspot-methodology__excluded">
              {(summary?.excludedInputs ??
                [
                  'TargetNextMonthCrimeCount',
                  'UrbanizationIndex',
                  'UnemploymentRate',
                  'EconomicStressIndex',
                  'PopulationDensity',
                ]
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

      {graphWorkspace && (
        <InvestigationGraphWorkspace
          rootNodeId={
            graphWorkspace
              .rootNodeId
          }
          title={
            graphWorkspace.title
          }
          onOpenEntity={(
            entityId,
          ) =>
            setSelectedEntityId(
              entityId,
            )
          }
          onClose={() =>
            setGraphWorkspace(
              null,
            )
          }
        />
      )}

      {selectedEntityId !==
        null && (
        <EntityProfileWorkspace
          entityId={
            selectedEntityId
          }
          onOpenGraph={(
            rootNodeId,
            title,
          ) =>
            setGraphWorkspace({
              rootNodeId,
              title,
            })
          }
          onClose={() =>
            setSelectedEntityId(
              null,
            )
          }
        />
      )}
    </>
  );
}
