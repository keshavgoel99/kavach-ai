import {
  useEffect,
  useState,
} from 'react';

import type {
  CaseDetail,
  CasePerson,
} from '@kavach/shared-types';

import './CaseDetailDrawer.css';

interface CaseDetailDrawerProps {
  caseId: number | null;
  onClose(): void;
}

function formatDate(
  value: string | null,
): string {
  if (!value) {
    return 'Unavailable';
  }

  const dateOnlyMatch =
    /^\d{4}-\d{2}-\d{2}$/.test(value);

  const date = new Date(
    dateOnlyMatch
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
  value: string | null,
): string {
  if (!value) {
    return 'Unavailable';
  }

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

function createSignalClass(
  value: string,
): string {
  const normalized =
    value.toLowerCase();

  if (
    normalized.includes('heinous') ||
    normalized.includes('grave') ||
    normalized.includes('serious')
  ) {
    return (
      'case-detail__signal ' +
      'case-detail__signal--critical'
    );
  }

  if (
    normalized.includes('pending') ||
    normalized.includes('investigation')
  ) {
    return (
      'case-detail__signal ' +
      'case-detail__signal--warning'
    );
  }

  if (
    normalized.includes('closed') ||
    normalized.includes('completed') ||
    normalized.includes('disposed')
  ) {
    return (
      'case-detail__signal ' +
      'case-detail__signal--success'
    );
  }

  return 'case-detail__signal';
}

function personMetadata(
  person: CasePerson,
): string {
  const values = [
    person.age === null
      ? null
      : `${person.age} years`,
    person.gender?.name ?? null,
  ].filter(
    (value): value is string =>
      Boolean(value),
  );

  return values.length > 0
    ? values.join(' · ')
    : 'Demographic details unavailable';
}

function EmptyCollection({
  message,
}: {
  message: string;
}) {
  return (
    <div className="case-detail__empty">
      {message}
    </div>
  );
}

export function CaseDetailDrawer({
  caseId,
  onClose,
}: CaseDetailDrawerProps) {
  const [detail, setDetail] =
    useState<CaseDetail | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (caseId === null) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return undefined;
    }

    let isActive = true;

    setDetail(null);
    setError(null);
    setLoading(true);

    async function loadDetail(): Promise<void> {
      try {
        const response =
          await window.kavach.cases.getById(
            caseId as number,
          );

        if (isActive) {
          setDetail(response);
        }
      } catch (requestError: unknown) {
        if (!isActive) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'The case record could not be loaded.',
        );
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      isActive = false;
    };
  }, [caseId]);

  useEffect(() => {
    if (caseId === null) {
      return undefined;
    }

    function handleKeyDown(
      event: globalThis.KeyboardEvent,
    ): void {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = 'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        originalOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [caseId, onClose]);

  if (caseId === null) {
    return null;
  }

  return (
    <div
      className="case-detail__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <aside
        className="case-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-detail-title"
      >
        <header className="case-detail__header">
          <div>
            <div className="case-detail__eyebrow">
              CASE INTELLIGENCE FILE
            </div>

            <h2 id="case-detail-title">
              {detail?.crimeNumber ??
                `Case ID ${caseId}`}
            </h2>

            <p>
              {detail
                ? `${detail.majorCrimeHead.name} · ${detail.policeStation.name}`
                : 'Retrieving secured FIR details…'}
            </p>
          </div>

          <button
            type="button"
            className="case-detail__close"
            onClick={onClose}
            aria-label="Close case details"
          >
            ×
          </button>
        </header>

        {loading && (
          <div className="case-detail__state">
            <div className="case-detail__loader" />

            <strong>
              Decrypting case record
            </strong>

            <span>
              Joining FIR, party, legal and
              procedural records…
            </span>
          </div>
        )}

        {!loading && error && (
          <div
            className="case-detail__state case-detail__state--error"
            role="alert"
          >
            <strong>
              Case record unavailable
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        )}

        {!loading && detail && (
          <div className="case-detail__content">
            <section className="case-detail__hero">
              <div>
                <span>Case number</span>
                <strong>
                  {detail.caseNumber}
                </strong>
              </div>

              <div>
                <span>Registered</span>
                <strong>
                  {formatDate(
                    detail.registeredDate,
                  )}
                </strong>
              </div>

              <div>
                <span>Police station</span>
                <strong>
                  {detail.policeStation.name}
                </strong>
              </div>

              <div>
                <span>District</span>
                <strong>
                  {detail.district.name}
                </strong>
              </div>
            </section>

            <div className="case-detail__signals">
              <span
                className={createSignalClass(
                  detail.gravity.name,
                )}
              >
                Gravity · {detail.gravity.name}
              </span>

              <span
                className={createSignalClass(
                  detail.status.name,
                )}
              >
                Status · {detail.status.name}
              </span>

              <span className="case-detail__signal">
                Category · {detail.category.name}
              </span>
            </div>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>01</span>
                  <h3>FIR Overview</h3>
                </div>
              </div>

              <div className="case-detail__facts-grid">
                <div>
                  <span>Major offence</span>
                  <strong>
                    {detail.majorCrimeHead.name}
                  </strong>
                </div>

                <div>
                  <span>Minor offence</span>
                  <strong>
                    {detail.minorCrimeHead.name}
                  </strong>
                </div>

                <div>
                  <span>Incident started</span>
                  <strong>
                    {formatDateTime(
                      detail.incidentFrom,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Incident ended</span>
                  <strong>
                    {formatDateTime(
                      detail.incidentTo,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Information received
                  </span>
                  <strong>
                    {formatDateTime(
                      detail.informationReceivedAt,
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Registering officer
                  </span>
                  <strong>
                    {
                      detail.registeringOfficer
                        .name
                    }
                  </strong>
                </div>

                <div>
                  <span>Court</span>
                  <strong>
                    {detail.court?.name ??
                      'Not assigned'}
                  </strong>
                </div>

                <div>
                  <span>State</span>
                  <strong>
                    {detail.state.name}
                  </strong>
                </div>
              </div>
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>02</span>
                  <h3>Location Intelligence</h3>
                </div>
              </div>

              {detail.location ? (
                <div className="case-detail__location">
                  <div>
                    <span>Location</span>
                    <strong>
                      {detail.location
                        .locationName ??
                        'Unnamed location'}
                    </strong>
                  </div>

                  <div>
                    <span>Zone type</span>
                    <strong>
                      {detail.location.zoneType ??
                        'Unavailable'}
                    </strong>
                  </div>

                  <div>
                    <span>Coordinates</span>
                    <strong>
                      {detail.location.latitude},
                      {' '}
                      {detail.location.longitude}
                    </strong>
                  </div>
                </div>
              ) : (
                <EmptyCollection message="No structured location record is attached to this FIR." />
              )}
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>03</span>
                  <h3>Brief Facts</h3>
                </div>
              </div>

              <div className="case-detail__narrative">
                {detail.briefFacts ??
                  'No brief-facts narrative is available.'}
              </div>
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>04</span>
                  <h3>Parties</h3>
                </div>
              </div>

              <div className="case-detail__party-group">
                <h4>
                  Complainants
                  <span>
                    {detail.complainants.length}
                  </span>
                </h4>

                {detail.complainants.length ===
                0 ? (
                  <EmptyCollection message="No complainant record is available." />
                ) : (
                  <div className="case-detail__cards">
                    {detail.complainants.map(
                      (person) => (
                        <article
                          key={person.id}
                          className="case-detail__person"
                        >
                          <strong>
                            {person.name}
                          </strong>

                          <span>
                            {personMetadata(person)}
                          </span>

                          <small>
                            Occupation:{' '}
                            {person.occupation
                              ?.name ??
                              'Unavailable'}
                          </small>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="case-detail__party-group">
                <h4>
                  Victims
                  <span>
                    {detail.victims.length}
                  </span>
                </h4>

                {detail.victims.length === 0 ? (
                  <EmptyCollection message="No victim record is available." />
                ) : (
                  <div className="case-detail__cards">
                    {detail.victims.map(
                      (person) => (
                        <article
                          key={person.id}
                          className="case-detail__person"
                        >
                          <strong>
                            {person.name}
                          </strong>

                          <span>
                            {personMetadata(person)}
                          </span>

                          <small>
                            Police personnel:{' '}
                            {person.isPolicePersonnel ===
                            null
                              ? 'Unknown'
                              : person.isPolicePersonnel
                                ? 'Yes'
                                : 'No'}
                          </small>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>

              <div className="case-detail__party-group">
                <h4>
                  Accused
                  <span>
                    {detail.accused.length}
                  </span>
                </h4>

                {detail.accused.length === 0 ? (
                  <EmptyCollection message="No accused record is available." />
                ) : (
                  <div className="case-detail__cards">
                    {detail.accused.map(
                      (person) => (
                        <article
                          key={person.id}
                          className="case-detail__person case-detail__person--accused"
                        >
                          <strong>
                            {person.name}
                          </strong>

                          <span>
                            {personMetadata(person)}
                          </span>

                          <small>
                            FIR code:{' '}
                            {person.personCode ??
                              'Unavailable'}
                          </small>
                        </article>
                      ),
                    )}
                  </div>
                )}
              </div>
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>05</span>
                  <h3>Legal Sections</h3>
                </div>
              </div>

              {detail.legalSections.length ===
              0 ? (
                <EmptyCollection message="No act-section associations are available." />
              ) : (
                <div className="case-detail__legal-list">
                  {detail.legalSections.map(
                    (item, index) => (
                      <article
                        key={
                          `${item.act.code}-` +
                          `${item.section.code}-` +
                          index
                        }
                      >
                        <div>
                          <span>
                            {item.act.code}
                          </span>

                          <strong>
                            {item.act.name}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Section{' '}
                            {item.section.code}
                          </span>

                          <p>
                            {item.section.name}
                          </p>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>06</span>
                  <h3>
                    Arrest and Surrender Events
                  </h3>
                </div>
              </div>

              {detail.arrestEvents.length ===
              0 ? (
                <EmptyCollection message="No arrest or surrender event is recorded." />
              ) : (
                <div className="case-detail__timeline">
                  {detail.arrestEvents.map(
                    (event) => (
                      <article
                        key={
                          event.arrestSurrenderId
                        }
                      >
                        <div className="case-detail__timeline-marker" />

                        <div>
                          <strong>
                            Event type{' '}
                            {event.eventTypeId}
                          </strong>

                          <span>
                            {formatDate(
                              event.eventDate,
                            )}
                          </span>

                          <p>
                            Police station:{' '}
                            {event.policeStation
                              ?.name ??
                              'Unavailable'}
                          </p>

                          <p>
                            Linked accused IDs:{' '}
                            {event.accusedIds
                              .length > 0
                              ? event.accusedIds.join(
                                  ', ',
                                )
                              : 'None'}
                          </p>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="case-detail__section">
              <div className="case-detail__section-heading">
                <div>
                  <span>07</span>
                  <h3>Chargesheets</h3>
                </div>
              </div>

              {detail.chargesheets.length ===
              0 ? (
                <EmptyCollection message="No chargesheet record is available." />
              ) : (
                <div className="case-detail__chargesheets">
                  {detail.chargesheets.map(
                    (chargesheet) => (
                      <article
                        key={
                          chargesheet.chargesheetId
                        }
                      >
                        <div>
                          <span>
                            Chargesheet ID
                          </span>

                          <strong>
                            {
                              chargesheet.chargesheetId
                            }
                          </strong>
                        </div>

                        <div>
                          <span>Date</span>

                          <strong>
                            {formatDateTime(
                              chargesheet
                                .chargesheetDate,
                            )}
                          </strong>
                        </div>

                        <div>
                          <span>Report code</span>

                          <strong>
                            {
                              chargesheet.reportCode
                            }
                          </strong>
                        </div>

                        <div>
                          <span>Police officer</span>

                          <strong>
                            {chargesheet
                              .policeOfficer?.name ??
                              'Unavailable'}
                          </strong>
                        </div>
                      </article>
                    ),
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  );
}
