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
  CaseFilterOptions,
  CasePriorityAssessment,
  CasePriorityBand,
  CasePriorityQueueResponse,
  CaseSummary,
} from '@kavach/shared-types';

import {
  CaseDetailDrawer,
} from './CaseDetailDrawer';

import './PriorityQueuePanel.css';

const PAGE_SIZE = 12;

const PRIORITY_BANDS:
readonly CasePriorityBand[] = [
  'CRITICAL',
  'HIGH',
  'ELEVATED',
  'ROUTINE',
];

interface PriorityFilterValues {
  bands: CasePriorityBand[];

  districtId: string;
  policeStationId: string;
}

const EMPTY_PRIORITY_FILTERS:
PriorityFilterValues = {
  bands: [],

  districtId: '',
  policeStationId: '',
};

function formatDate(
  value: string,
): string {
  const date =
    new Date(
      `${value}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
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

function optionalNumber(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed =
    Number(value);

  return Number.isSafeInteger(
    parsed,
  )
    ? parsed
    : undefined;
}

function createBandClass(
  band: CasePriorityBand,
): string {
  return [
    'priority-band',
    `priority-band--${band.toLowerCase()}`,
  ].join(' ');
}

function createScoreClass(
  band: CasePriorityBand,
): string {
  return [
    'priority-score',
    `priority-score--${band.toLowerCase()}`,
  ].join(' ');
}

function countFilters(
  values: PriorityFilterValues,
): number {
  return (
    values.bands.length +
    (
      values.districtId
        ? 1
        : 0
    ) +
    (
      values.policeStationId
        ? 1
        : 0
    )
  );
}

function visibleFactors(
  assessment:
    CasePriorityAssessment,
) {
  return assessment.factors
    .filter(
      (factor) =>
        factor.points !== 0,
    )
    .sort(
      (
        left,
        right,
      ) =>
        Math.abs(
          right.points,
        ) -
        Math.abs(
          left.points,
        ),
    )
    .slice(0, 3);
}

interface PriorityRowProps {
  item: {
    case: CaseSummary;

    assessment:
      CasePriorityAssessment;
  };

  onSelect(
    caseId: number,
  ): void;
}

function PriorityRow({
  item,
  onSelect,
}: PriorityRowProps) {
  const factors =
    visibleFactors(
      item.assessment,
    );

  function selectCase(): void {
    onSelect(
      item.case.caseId,
    );
  }

  function handleKeyDown(
    event:
      KeyboardEvent<HTMLTableRowElement>,
  ): void {
    if (
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();

      selectCase();
    }
  }

  return (
    <tr
      className="priority-queue__row"
      tabIndex={0}
      role="button"
      aria-label={
        `Open priority case ${item.case.crimeNumber}`
      }
      onClick={selectCase}
      onKeyDown={handleKeyDown}
    >
      <td>
        <div
          className={createScoreClass(
            item.assessment.band,
          )}
        >
          <strong>
            {item.assessment.score}
          </strong>

          <span>
            / 100
          </span>
        </div>

        <span
          className={createBandClass(
            item.assessment.band,
          )}
        >
          {item.assessment.band}
        </span>
      </td>

      <td>
        <div className="priority-primary">
          {item.case.crimeNumber}
        </div>

        <div className="priority-secondary">
          Case ID {item.case.caseId}
        </div>
      </td>

      <td>
        <div className="priority-primary">
          {item.case.majorCrimeHead.name}
        </div>

        <div className="priority-secondary">
          {item.case.minorCrimeHead.name}
          {' · '}
          {item.case.gravity.name}
        </div>
      </td>

      <td>
        {factors.length > 0 ? (
          <div className="priority-factors">
            {factors.map(
              (factor) => (
                <span
                  key={factor.code}
                  className={
                    factor.points < 0
                      ? 'priority-factor priority-factor--reducing'
                      : 'priority-factor'
                  }
                  title={
                    factor.explanation
                  }
                >
                  {factor.label}

                  <strong>
                    {factor.points > 0
                      ? '+'
                      : ''}
                    {factor.points}
                  </strong>
                </span>
              ),
            )}
          </div>
        ) : (
          <span className="priority-secondary">
            No active scoring signals
          </span>
        )}
      </td>

      <td>
        <div className="priority-primary">
          {
            item.case
              .policeStation.name
          }
        </div>

        <div className="priority-secondary">
          {item.case.district.name}
        </div>
      </td>

      <td>
        <div className="priority-primary">
          {item.case.status.name}
        </div>

        <div className="priority-secondary">
          Registered{' '}
          {formatDate(
            item.case.registeredDate,
          )}
        </div>
      </td>

      <td>
        <button
          type="button"
          className="priority-queue__inspect"
          onClick={(event) => {
            event.stopPropagation();

            selectCase();
          }}
        >
          Review case
        </button>
      </td>
    </tr>
  );
}

export function PriorityQueuePanel() {
  const [
    draftFilters,
    setDraftFilters,
  ] =
    useState<PriorityFilterValues>({
      ...EMPTY_PRIORITY_FILTERS,
    });

  const [
    appliedFilters,
    setAppliedFilters,
  ] =
    useState<PriorityFilterValues>({
      ...EMPTY_PRIORITY_FILTERS,
    });

  const [
    filterOptions,
    setFilterOptions,
  ] =
    useState<CaseFilterOptions | null>(
      null,
    );

  const [
    filterOptionsLoading,
    setFilterOptionsLoading,
  ] =
    useState(true);

  const [
    filterOptionsError,
    setFilterOptionsError,
  ] =
    useState<string | null>(null);

  const [
    result,
    setResult,
  ] =
    useState<
      CasePriorityQueueResponse |
      null
    >(null);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] =
    useState<number | null>(null);

  const availablePoliceStations =
    useMemo(() => {
      const districtId =
        optionalNumber(
          draftFilters.districtId,
        );

      if (
        districtId === undefined
      ) {
        return [];
      }

      return (
        filterOptions
          ?.policeStations
          .filter(
            (station) =>
              station.districtId ===
              districtId,
          ) ?? []
      );
    }, [
      draftFilters.districtId,
      filterOptions,
    ]);

  useEffect(() => {
    let active = true;

    async function loadFilterOptions():
    Promise<void> {
      setFilterOptionsLoading(true);
      setFilterOptionsError(null);

      try {
        const response =
          await window.kavach.cases
            .getFilterOptions();

        if (active) {
          setFilterOptions(response);
        }
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setFilterOptions(null);

        setFilterOptionsError(
          requestError instanceof Error
            ? requestError.message
            : 'Priority filters could not be loaded.',
        );
      } finally {
        if (active) {
          setFilterOptionsLoading(false);
        }
      }
    }

    void loadFilterOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPriorityQueue():
    Promise<void> {
      setLoading(true);
      setError(null);

      const districtId =
        optionalNumber(
          appliedFilters.districtId,
        );

      const policeStationId =
        optionalNumber(
          appliedFilters
            .policeStationId,
        );

      try {
        const response =
          await window.kavach.priority
            .getQueue({
              page,
              pageSize: PAGE_SIZE,

              bands:
                appliedFilters
                  .bands.length > 0
                  ? appliedFilters.bands
                  : undefined,

              districtIds:
                districtId === undefined
                  ? undefined
                  : [districtId],

              policeStationIds:
                policeStationId ===
                undefined
                  ? undefined
                  : [policeStationId],
            });

        if (active) {
          setResult(response);
        }
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setResult(null);

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Priority queue could not be loaded.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPriorityQueue();

    return () => {
      active = false;
    };
  }, [
    appliedFilters,
    page,
  ]);

  function toggleBand(
    band: CasePriorityBand,
  ): void {
    const alreadySelected =
      draftFilters.bands.includes(
        band,
      );

    setDraftFilters({
      ...draftFilters,

      bands: alreadySelected
        ? draftFilters.bands.filter(
            (candidate) =>
              candidate !== band,
          )
        : [
            ...draftFilters.bands,
            band,
          ],
    });
  }

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setPage(1);

    setAppliedFilters({
      ...draftFilters,
      bands: [
        ...draftFilters.bands,
      ],
    });
  }

  function clearFilters(): void {
    setPage(1);

    setDraftFilters({
      ...EMPTY_PRIORITY_FILTERS,
    });

    setAppliedFilters({
      ...EMPTY_PRIORITY_FILTERS,
    });
  }

  const totalPages =
    result
      ? Math.max(
          1,
          Math.ceil(
            result.total /
              result.pageSize,
          ),
        )
      : 1;

  const firstItem =
    result &&
    result.total > 0
      ? (
          result.page - 1
        ) *
          result.pageSize +
        1
      : 0;

  const lastItem =
    result
      ? Math.min(
          result.page *
            result.pageSize,

          result.total,
        )
      : 0;

  const highestScore =
    result?.items[0]
      ?.assessment.score ?? null;

  const criticalCasesOnPage =
    result?.items.filter(
      (item) =>
        item.assessment.band ===
        'CRITICAL',
    ).length ?? 0;

  const appliedFilterCount =
    countFilters(
      appliedFilters,
    );

  return (
    <>
      <section
        className="priority-queue"
        aria-labelledby="priority-queue-title"
      >
        <header className="priority-queue__header">
          <div>
            <div className="priority-queue__eyebrow">
              OPERATIONAL INTELLIGENCE
            </div>

            <h2 id="priority-queue-title">
              Investigation Priority Queue
            </h2>

            <p>
              Order FIRs for human review
              using bounded, transparent and
              evidence-referenced signals.
            </p>
          </div>

          <div className="priority-queue__status">
            <span
              className="priority-queue__status-dot"
              aria-hidden="true"
            />

            EXPLAINABLE RULESET ACTIVE
          </div>
        </header>

        <aside className="priority-governance">
          <div className="priority-governance__mark">
            !
          </div>

          <div>
            <strong>
              Human review is mandatory
            </strong>

            <p>
              Priority scores only order
              cases for investigator review.
              They must not determine guilt,
              arrest, detention, bail,
              surveillance or punishment.
            </p>
          </div>

          <span>
            {
              result?.ruleVersion ??
              'KAVACH_PRIORITY_V1'
            }
          </span>
        </aside>

        <form
          className="priority-filters"
          onSubmit={handleSubmit}
        >
          <div className="priority-filters__heading">
            <div>
              <span>
                REVIEW PARAMETERS
              </span>

              <h3>
                Filter priority queue
              </h3>
            </div>

            <div className="priority-filters__active">
              {appliedFilterCount}
              {' '}
              active
            </div>
          </div>

          <div className="priority-filters__bands">
            <span className="priority-filters__label">
              Priority bands
            </span>

            <div className="priority-filters__band-list">
              {PRIORITY_BANDS.map(
                (band) => {
                  const selected =
                    draftFilters
                      .bands
                      .includes(band);

                  return (
                    <button
                      key={band}
                      type="button"
                      className={[
                        'priority-filter-band',
                        selected
                          ? 'priority-filter-band--selected'
                          : '',
                        `priority-filter-band--${band.toLowerCase()}`,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-pressed={
                        selected
                      }
                      onClick={() =>
                        toggleBand(band)
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

          <div className="priority-filters__grid">
            <label>
              <span>District</span>

              <select
                value={
                  draftFilters.districtId
                }
                disabled={
                  filterOptionsLoading ||
                  !filterOptions
                }
                onChange={(event) =>
                  setDraftFilters({
                    ...draftFilters,

                    districtId:
                      event.target.value,

                    policeStationId: '',
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
                        key={district.id}
                        value={district.id}
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
                  filterOptionsLoading ||
                  !filterOptions ||
                  !draftFilters.districtId
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
                  {draftFilters.districtId
                    ? 'All stations'
                    : 'Select district first'}
                </option>

                {availablePoliceStations.map(
                  (station) => (
                    <option
                      key={station.id}
                      value={station.id}
                    >
                      {station.name}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="priority-filters__actions">
              <button
                type="submit"
                disabled={loading}
              >
                Apply queue filters
              </button>

              <button
                type="button"
                className="priority-filters__clear"
                disabled={loading}
                onClick={clearFilters}
              >
                Clear
              </button>
            </div>
          </div>

          {filterOptionsError && (
            <div className="priority-filters__error">
              {filterOptionsError}
            </div>
          )}
        </form>

        <div className="priority-queue__metrics">
          <article>
            <span>
              Matching cases
            </span>

            <strong>
              {result?.total ?? '—'}
            </strong>

            <small>
              After current filters
            </small>
          </article>

          <article>
            <span>
              Highest visible score
            </span>

            <strong>
              {highestScore ?? '—'}
            </strong>

            <small>
              Current result page
            </small>
          </article>

          <article>
            <span>
              Critical on page
            </span>

            <strong>
              {criticalCasesOnPage}
            </strong>

            <small>
              Require immediate review
            </small>
          </article>

          <article>
            <span>
              Assessment generated
            </span>

            <strong className="priority-queue__generated">
              {result
                ? formatDateTime(
                    result.generatedAt,
                  )
                : '—'}
            </strong>

            <small>
              Dataset-anchored time
            </small>
          </article>
        </div>

        {error && (
          <div
            className="priority-queue__error"
            role="alert"
          >
            <strong>
              Priority intelligence
              unavailable
            </strong>

            <span>{error}</span>
          </div>
        )}

        <div className="priority-queue__table-shell">
          <table>
            <thead>
              <tr>
                <th>Priority</th>
                <th>Crime record</th>
                <th>Offence</th>
                <th>Primary factors</th>
                <th>Jurisdiction</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="priority-queue__message"
                  >
                    Calculating secured
                    review priorities…
                  </td>
                </tr>
              )}

              {!loading &&
                result?.items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="priority-queue__message"
                    >
                      No cases matched the
                      selected priority
                      parameters.
                    </td>
                  </tr>
                )}

              {!loading &&
                result?.items.map(
                  (item) => (
                    <PriorityRow
                      key={
                        item.case.caseId
                      }
                      item={item}
                      onSelect={
                        setSelectedCaseId
                      }
                    />
                  ),
                )}
            </tbody>
          </table>
        </div>

        <footer className="priority-queue__pagination">
          <div>
            {result &&
            result.total > 0
              ? `Showing ${firstItem}–${lastItem} of ${result.total}`
              : 'No cases to display'}
          </div>

          <div className="priority-queue__pagination-controls">
            <button
              type="button"
              disabled={
                loading ||
                page <= 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1,
                    ),
                )
              }
            >
              Previous
            </button>

            <span>
              Page {page} / {totalPages}
            </span>

            <button
              type="button"
              disabled={
                loading ||
                !result ||
                page >= totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1,
                )
              }
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      <CaseDetailDrawer
        caseId={selectedCaseId}
        onClose={() =>
          setSelectedCaseId(null)
        }
      />
    </>
  );
}
