import type {
  CaseFilterOptions,
} from '@kavach/shared-types';

import type {
  FormEvent,
} from 'react';

import './CrimeRecordFilters.css';

export interface CrimeRecordFilterValues {
  search: string;

  districtId: string;
  policeStationId: string;

  gravityId: string;
  statusId: string;

  majorCrimeHeadId: string;
  minorCrimeHeadId: string;

  registeredFrom: string;
  registeredTo: string;
}

export const EMPTY_CRIME_RECORD_FILTERS:
CrimeRecordFilterValues = {
  search: '',

  districtId: '',
  policeStationId: '',

  gravityId: '',
  statusId: '',

  majorCrimeHeadId: '',
  minorCrimeHeadId: '',

  registeredFrom: '',
  registeredTo: '',
};

interface CrimeRecordFiltersProps {
  values: CrimeRecordFilterValues;

  options: CaseFilterOptions | null;
  optionsLoading: boolean;
  optionsError: string | null;

  requestLoading: boolean;
  appliedFilterCount: number;
  validationError: string | null;

  onChange(
    values: CrimeRecordFilterValues,
  ): void;

  onApply(): void;
  onClear(): void;
}

export function CrimeRecordFilters({
  values,
  options,
  optionsLoading,
  optionsError,
  requestLoading,
  appliedFilterCount,
  validationError,
  onChange,
  onApply,
  onClear,
}: CrimeRecordFiltersProps) {
  const districtId = values.districtId
    ? Number(values.districtId)
    : null;

  const majorCrimeHeadId =
    values.majorCrimeHeadId
      ? Number(values.majorCrimeHeadId)
      : null;

  const policeStations =
    districtId === null
      ? []
      : (
          options?.policeStations.filter(
            (station) =>
              station.districtId ===
              districtId,
          ) ?? []
        );

  const minorCrimeHeads =
    majorCrimeHeadId === null
      ? []
      : (
          options?.minorCrimeHeads.filter(
            (crimeHead) =>
              crimeHead.majorCrimeHeadId ===
              majorCrimeHeadId,
          ) ?? []
        );

  const hasDraftValues =
    Object.values(values).some(
      (value) => value.trim().length > 0,
    );

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();
    onApply();
  }

  return (
    <form
      className="record-filters"
      onSubmit={handleSubmit}
    >
      <div className="record-filters__top">
        <div>
          <div className="record-filters__eyebrow">
            QUERY PARAMETERS
          </div>

          <h3>Filter crime records</h3>
        </div>

        <div className="record-filters__count">
          {appliedFilterCount}
          {' '}
          active
        </div>
      </div>

      <div className="record-filters__search">
        <label htmlFor="crime-record-search">
          Search records
        </label>

        <input
          id="crime-record-search"
          type="search"
          value={values.search}
          onChange={(event) =>
            onChange({
              ...values,
              search: event.target.value,
            })
          }
          placeholder="Crime number, offence, station, district or location"
        />
      </div>

      <div className="record-filters__grid">
        <label>
          <span>District</span>

          <select
            value={values.districtId}
            disabled={
              optionsLoading ||
              !options
            }
            onChange={(event) =>
              onChange({
                ...values,
                districtId:
                  event.target.value,

                policeStationId: '',
              })
            }
          >
            <option value="">
              All districts
            </option>

            {options?.districts.map(
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
          <span>Police station</span>

          <select
            value={values.policeStationId}
            disabled={
              optionsLoading ||
              !options ||
              !values.districtId
            }
            onChange={(event) =>
              onChange({
                ...values,
                policeStationId:
                  event.target.value,
              })
            }
          >
            <option value="">
              {values.districtId
                ? 'All stations'
                : 'Select district first'}
            </option>

            {policeStations.map(
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

        <label>
          <span>Gravity</span>

          <select
            value={values.gravityId}
            disabled={
              optionsLoading ||
              !options
            }
            onChange={(event) =>
              onChange({
                ...values,
                gravityId:
                  event.target.value,
              })
            }
          >
            <option value="">
              All gravity levels
            </option>

            {options?.gravities.map(
              (gravity) => (
                <option
                  key={gravity.id}
                  value={gravity.id}
                >
                  {gravity.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>Case status</span>

          <select
            value={values.statusId}
            disabled={
              optionsLoading ||
              !options
            }
            onChange={(event) =>
              onChange({
                ...values,
                statusId:
                  event.target.value,
              })
            }
          >
            <option value="">
              All statuses
            </option>

            {options?.statuses.map(
              (status) => (
                <option
                  key={status.id}
                  value={status.id}
                >
                  {status.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>Major offence</span>

          <select
            value={
              values.majorCrimeHeadId
            }
            disabled={
              optionsLoading ||
              !options
            }
            onChange={(event) =>
              onChange({
                ...values,

                majorCrimeHeadId:
                  event.target.value,

                minorCrimeHeadId: '',
              })
            }
          >
            <option value="">
              All major offences
            </option>

            {options?.majorCrimeHeads.map(
              (crimeHead) => (
                <option
                  key={crimeHead.id}
                  value={crimeHead.id}
                >
                  {crimeHead.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>Minor offence</span>

          <select
            value={
              values.minorCrimeHeadId
            }
            disabled={
              optionsLoading ||
              !options ||
              !values.majorCrimeHeadId
            }
            onChange={(event) =>
              onChange({
                ...values,

                minorCrimeHeadId:
                  event.target.value,
              })
            }
          >
            <option value="">
              {values.majorCrimeHeadId
                ? 'All minor offences'
                : 'Select major offence first'}
            </option>

            {minorCrimeHeads.map(
              (crimeHead) => (
                <option
                  key={crimeHead.id}
                  value={crimeHead.id}
                >
                  {crimeHead.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label>
          <span>Registered from</span>

          <input
            type="date"
            value={values.registeredFrom}
            onChange={(event) =>
              onChange({
                ...values,

                registeredFrom:
                  event.target.value,
              })
            }
          />
        </label>

        <label>
          <span>Registered to</span>

          <input
            type="date"
            value={values.registeredTo}
            onChange={(event) =>
              onChange({
                ...values,

                registeredTo:
                  event.target.value,
              })
            }
          />
        </label>
      </div>

      {optionsLoading && (
        <div className="record-filters__notice">
          Loading filter intelligence…
        </div>
      )}

      {optionsError && (
        <div
          className="record-filters__notice record-filters__notice--error"
          role="alert"
        >
          {optionsError}
        </div>
      )}

      {validationError && (
        <div
          className="record-filters__notice record-filters__notice--error"
          role="alert"
        >
          {validationError}
        </div>
      )}

      <div className="record-filters__actions">
        <button
          type="submit"
          disabled={requestLoading}
        >
          Apply filters
        </button>

        <button
          type="button"
          className="record-filters__clear"
          disabled={
            requestLoading ||
            (
              !hasDraftValues &&
              appliedFilterCount === 0
            )
          }
          onClick={onClear}
        >
          Clear all
        </button>
      </div>
    </form>
  );
}
