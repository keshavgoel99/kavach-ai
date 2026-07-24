import {
  useEffect,
  useState,
} from 'react';

import type {
  KeyboardEvent,
} from 'react';

import type {
  CaseFilterOptions,
  CaseListFilters,
  CaseListResponse,
  CaseSummary,
} from '@kavach/shared-types';

import {
  CaseDetailDrawer,
} from './CaseDetailDrawer';

import {
  CrimeRecordFilters,
  EMPTY_CRIME_RECORD_FILTERS,
} from './CrimeRecordFilters';

import type {
  CrimeRecordFilterValues,
} from './CrimeRecordFilters';

import './CrimeRecordsPanel.css';

const PAGE_SIZE = 12;

function formatDate(value: string): string {
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

function createBadgeClass(
  value: string,
): string {
  const normalized =
    value.trim().toLowerCase();

  if (
    normalized.includes('heinous') ||
    normalized.includes('grave') ||
    normalized.includes('serious')
  ) {
    return (
      'records-badge ' +
      'records-badge--critical'
    );
  }

  if (
    normalized.includes('pending') ||
    normalized.includes('investigation')
  ) {
    return (
      'records-badge ' +
      'records-badge--warning'
    );
  }

  if (
    normalized.includes('closed') ||
    normalized.includes('disposed') ||
    normalized.includes('completed')
  ) {
    return (
      'records-badge ' +
      'records-badge--success'
    );
  }

  return 'records-badge';
}

function optionalNumber(
  value: string,
): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed)
    ? parsed
    : undefined;
}

function createApiFilters(
  values: CrimeRecordFilterValues,
): CaseListFilters {
  const filters: CaseListFilters = {};

  const search = values.search.trim();

  if (search) {
    filters.search = search;
  }

  const districtId =
    optionalNumber(values.districtId);

  if (districtId !== undefined) {
    filters.districtId = districtId;
  }

  const policeStationId =
    optionalNumber(
      values.policeStationId,
    );

  if (policeStationId !== undefined) {
    filters.policeStationId =
      policeStationId;
  }

  const gravityId =
    optionalNumber(values.gravityId);

  if (gravityId !== undefined) {
    filters.gravityId = gravityId;
  }

  const statusId =
    optionalNumber(values.statusId);

  if (statusId !== undefined) {
    filters.statusId = statusId;
  }

  const majorCrimeHeadId =
    optionalNumber(
      values.majorCrimeHeadId,
    );

  if (majorCrimeHeadId !== undefined) {
    filters.majorCrimeHeadId =
      majorCrimeHeadId;
  }

  const minorCrimeHeadId =
    optionalNumber(
      values.minorCrimeHeadId,
    );

  if (minorCrimeHeadId !== undefined) {
    filters.minorCrimeHeadId =
      minorCrimeHeadId;
  }

  if (values.registeredFrom) {
    filters.registeredFrom =
      values.registeredFrom;
  }

  if (values.registeredTo) {
    filters.registeredTo =
      values.registeredTo;
  }

  return filters;
}

function countFilters(
  values: CrimeRecordFilterValues,
): number {
  return Object.values(values).filter(
    (value) =>
      value.trim().length > 0,
  ).length;
}

interface CaseRowProps {
  item: CaseSummary;
  onSelect(caseId: number): void;
}

function CaseRow({
  item,
  onSelect,
}: CaseRowProps) {
  function selectRecord(): void {
    onSelect(item.caseId);
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
      selectRecord();
    }
  }

  return (
    <tr
      className="crime-records__row"
      tabIndex={0}
      role="button"
      aria-label={
        `Open case ${item.crimeNumber}`
      }
      onClick={selectRecord}
      onKeyDown={handleKeyDown}
    >
      <td>
        <div className="records-primary">
          {item.crimeNumber}
        </div>

        <div className="records-secondary">
          Case ID {item.caseId}
        </div>
      </td>

      <td>
        <div className="records-primary">
          {item.majorCrimeHead.name}
        </div>

        <div className="records-secondary">
          {item.minorCrimeHead.name}
        </div>
      </td>

      <td>
        <div className="records-primary">
          {item.policeStation.name}
        </div>

        <div className="records-secondary">
          {item.district.name}
        </div>
      </td>

      <td>
        <span
          className={createBadgeClass(
            item.gravity.name,
          )}
        >
          {item.gravity.name}
        </span>
      </td>

      <td>
        <span
          className={createBadgeClass(
            item.status.name,
          )}
        >
          {item.status.name}
        </span>
      </td>

      <td>
        <div className="records-primary">
          {formatDate(
            item.registeredDate,
          )}
        </div>

        <div className="records-secondary">
          {item.location?.locationName ??
            'Location unavailable'}
        </div>
      </td>

      <td>
        <button
          type="button"
          className="crime-records__inspect"
          onClick={(event) => {
            event.stopPropagation();
            selectRecord();
          }}
        >
          Inspect
        </button>
      </td>
    </tr>
  );
}

export function CrimeRecordsPanel() {
  const [
    draftFilters,
    setDraftFilters,
  ] = useState<CrimeRecordFilterValues>({
    ...EMPTY_CRIME_RECORD_FILTERS,
  });

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<CrimeRecordFilterValues>({
    ...EMPTY_CRIME_RECORD_FILTERS,
  });

  const [filterOptions, setFilterOptions] =
    useState<CaseFilterOptions | null>(
      null,
    );

  const [
    filterOptionsLoading,
    setFilterOptionsLoading,
  ] = useState(true);

  const [
    filterOptionsError,
    setFilterOptionsError,
  ] = useState<string | null>(null);

  const [
    filterValidationError,
    setFilterValidationError,
  ] = useState<string | null>(null);

  const [page, setPage] = useState(1);

  const [result, setResult] =
    useState<CaseListResponse | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] = useState<number | null>(null);

  const appliedFilterCount =
    countFilters(appliedFilters);

  useEffect(() => {
    let isActive = true;

    async function loadOptions():
    Promise<void> {
      setFilterOptionsLoading(true);
      setFilterOptionsError(null);

      try {
        const response =
          await window.kavach.cases
            .getFilterOptions();

        if (isActive) {
          setFilterOptions(response);
        }
      } catch (requestError: unknown) {
        if (!isActive) {
          return;
        }

        setFilterOptions(null);

        setFilterOptionsError(
          requestError instanceof Error
            ? requestError.message
            : 'Filter options could not be loaded.',
        );
      } finally {
        if (isActive) {
          setFilterOptionsLoading(false);
        }
      }
    }

    void loadOptions();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    async function loadCases():
    Promise<void> {
      setLoading(true);
      setError(null);

      const filters =
        createApiFilters(
          appliedFilters,
        );

      try {
        const response =
          await window.kavach.cases.list({
            page,
            pageSize: PAGE_SIZE,

            filters:
              Object.keys(filters).length > 0
                ? filters
                : undefined,
          });

        if (isActive) {
          setResult(response);
        }
      } catch (requestError: unknown) {
        if (!isActive) {
          return;
        }

        setResult(null);

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Crime records could not be loaded.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadCases();

    return () => {
      isActive = false;
    };
  }, [appliedFilters, page]);

  function applyFilters(): void {
    if (
      draftFilters.registeredFrom &&
      draftFilters.registeredTo &&
      draftFilters.registeredFrom >
        draftFilters.registeredTo
    ) {
      setFilterValidationError(
        'Registered-from date cannot be later than registered-to date.',
      );

      return;
    }

    setFilterValidationError(null);
    setPage(1);

    setAppliedFilters({
      ...draftFilters,
      search:
        draftFilters.search.trim(),
    });
  }

  function clearFilters(): void {
    setFilterValidationError(null);
    setPage(1);

    setDraftFilters({
      ...EMPTY_CRIME_RECORD_FILTERS,
    });

    setAppliedFilters({
      ...EMPTY_CRIME_RECORD_FILTERS,
    });
  }

  const pagination =
    result?.pagination;

  const firstItem =
    pagination &&
    pagination.totalItems > 0
      ? (
          pagination.page - 1
        ) * pagination.pageSize + 1
      : 0;

  const lastItem = pagination
    ? Math.min(
        pagination.page *
          pagination.pageSize,
        pagination.totalItems,
      )
    : 0;

  return (
    <>
      <section
        className="crime-records"
        aria-labelledby="crime-records-title"
      >
        <div className="crime-records__header">
          <div>
            <div className="crime-records__eyebrow">
              LIVE FIR INDEX
            </div>

            <h2 id="crime-records-title">
              Crime Records
            </h2>

            <p>
              Search, filter and inspect
              validated FIR records from the
              Kavach data layer.
            </p>
          </div>

          <div className="crime-records__signal">
            <span
              className="crime-records__signal-dot"
              aria-hidden="true"
            />

            DATA LINK ACTIVE
          </div>
        </div>

        <CrimeRecordFilters
          values={draftFilters}
          options={filterOptions}
          optionsLoading={
            filterOptionsLoading
          }
          optionsError={
            filterOptionsError
          }
          requestLoading={loading}
          appliedFilterCount={
            appliedFilterCount
          }
          validationError={
            filterValidationError
          }
          onChange={setDraftFilters}
          onApply={applyFilters}
          onClear={clearFilters}
        />

        <div className="crime-records__summary">
          <div>
            <strong>
              {pagination?.totalItems ??
                '—'}
            </strong>

            <span>
              {appliedFilterCount > 0
                ? ' matching records'
                : ' indexed records'}
            </span>
          </div>

          {appliedFilterCount > 0 && (
            <div className="crime-records__query">
              {appliedFilterCount}
              {' '}
              active query parameter
              {appliedFilterCount === 1
                ? ''
                : 's'}
            </div>
          )}
        </div>

        {error && (
          <div
            className="crime-records__error"
            role="alert"
          >
            <strong>
              Records link unavailable
            </strong>

            <span>{error}</span>
          </div>
        )}

        <div className="crime-records__table-shell">
          <table>
            <thead>
              <tr>
                <th>Crime record</th>
                <th>Offence</th>
                <th>Jurisdiction</th>
                <th>Gravity</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={7}
                    className="crime-records__message"
                  >
                    Loading secured FIR
                    records…
                  </td>
                </tr>
              )}

              {!loading &&
                result?.items.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="crime-records__message"
                    >
                      No crime records matched
                      the current filters.
                    </td>
                  </tr>
                )}

              {!loading &&
                result?.items.map(
                  (item) => (
                    <CaseRow
                      key={item.caseId}
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

        <div className="crime-records__pagination">
          <div>
            {pagination &&
            pagination.totalItems > 0
              ? `Showing ${firstItem}–${lastItem} of ${pagination.totalItems}`
              : 'No records to display'}
          </div>

          <div className="crime-records__pagination-controls">
            <button
              type="button"
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1,
                  ),
                )
              }
              disabled={
                loading ||
                !pagination ||
                pagination.page <= 1
              }
            >
              Previous
            </button>

            <span>
              Page{' '}
              {pagination?.page ?? 1}
              {' / '}
              {Math.max(
                pagination?.totalPages ??
                  1,
                1,
              )}
            </span>

            <button
              type="button"
              onClick={() =>
                setPage(
                  (current) =>
                    current + 1,
                )
              }
              disabled={
                loading ||
                !pagination ||
                pagination.totalPages ===
                  0 ||
                pagination.page >=
                  pagination.totalPages
              }
            >
              Next
            </button>
          </div>
        </div>
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
