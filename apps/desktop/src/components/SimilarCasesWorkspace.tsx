import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import type {
  CaseSimilarityFactor,
  SimilarCase,
  SimilarCasesResponse,
} from '@kavach/shared-types';

import './SimilarCasesWorkspace.css';

interface SimilarCasesWorkspaceProps {
  sourceCaseId: number;

  onOpenCase(
    caseId: number,
  ): void;
}

interface SimilarityQuery {
  limit: number;
  minimumScore: number;
}

const DEFAULT_QUERY:
SimilarityQuery = {
  limit: 10,
  minimumScore: 20,
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

function formatRawValue(
  value: number | boolean,
): string {
  if (
    typeof value === 'boolean'
  ) {
    return value
      ? 'Yes'
      : 'No';
  }

  return String(value);
}

function createScoreClass(
  score: number,
): string {
  if (score >= 75) {
    return [
      'similar-cases__score',
      'similar-cases__score--strong',
    ].join(' ');
  }

  if (score >= 50) {
    return [
      'similar-cases__score',
      'similar-cases__score--high',
    ].join(' ');
  }

  if (score >= 25) {
    return [
      'similar-cases__score',
      'similar-cases__score--moderate',
    ].join(' ');
  }

  return [
    'similar-cases__score',
    'similar-cases__score--weak',
  ].join(' ');
}

function createFactorClass(
  factor:
    CaseSimilarityFactor,
): string {
  return [
    'similarity-factor',
    factor.points > 0
      ? 'similarity-factor--active'
      : 'similarity-factor--inactive',
  ].join(' ');
}

function countActiveFactors(
  match: SimilarCase,
): number {
  return match.factors.filter(
    (factor) =>
      factor.points > 0,
  ).length;
}

function totalEvidenceRecords(
  match: SimilarCase,
): number {
  return match.factors.reduce(
    (
      total,
      factor,
    ) =>
      total +
      factor.evidence.length,

    0,
  );
}

function orderedFactors(
  match: SimilarCase,
): CaseSimilarityFactor[] {
  return [
    ...match.factors,
  ].sort(
    (
      left,
      right,
    ) => {
      const leftActive =
        left.points > 0;

      const rightActive =
        right.points > 0;

      if (
        leftActive !==
        rightActive
      ) {
        return leftActive
          ? -1
          : 1;
      }

      return (
        right.points -
          left.points ||

        left.label.localeCompare(
          right.label,
        )
      );
    },
  );
}

export function SimilarCasesWorkspace({
  sourceCaseId,
  onOpenCase,
}: SimilarCasesWorkspaceProps) {
  const [
    draftLimit,
    setDraftLimit,
  ] =
    useState(
      String(
        DEFAULT_QUERY.limit,
      ),
    );

  const [
    draftMinimumScore,
    setDraftMinimumScore,
  ] =
    useState(
      String(
        DEFAULT_QUERY
          .minimumScore,
      ),
    );

  const [
    query,
    setQuery,
  ] =
    useState<SimilarityQuery>({
      ...DEFAULT_QUERY,
    });

  const [
    result,
    setResult,
  ] =
    useState<
      SimilarCasesResponse |
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

  const [
    selectedCandidateId,
    setSelectedCandidateId,
  ] =
    useState<number | null>(
      null,
    );

  useEffect(() => {
    setDraftLimit(
      String(
        DEFAULT_QUERY.limit,
      ),
    );

    setDraftMinimumScore(
      String(
        DEFAULT_QUERY
          .minimumScore,
      ),
    );

    setQuery({
      ...DEFAULT_QUERY,
    });

    setSelectedCandidateId(
      null,
    );
  }, [
    sourceCaseId,
  ]);

  useEffect(() => {
    let active = true;

    async function loadSimilarCases():
    Promise<void> {
      setLoading(true);
      setError(null);

      try {
        const response =
          await window.kavach
            .similarity
            .getSimilarCases(
              sourceCaseId,
              {
                limit:
                  query.limit,

                minimumScore:
                  query.minimumScore,
              },
            );

        if (!active) {
          return;
        }

        setResult(response);

        setSelectedCandidateId(
          (
            currentCandidateId,
          ) => {
            const currentExists =
              response.results.some(
                (match) =>
                  match.caseId ===
                  currentCandidateId,
              );

            if (currentExists) {
              return currentCandidateId;
            }

            return (
              response.results[0]
                ?.caseId ??
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

        setResult(null);

        setSelectedCandidateId(
          null,
        );

        setError(
          requestError instanceof
            Error
            ? requestError.message
            : 'Similar cases could not be loaded.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadSimilarCases();

    return () => {
      active = false;
    };
  }, [
    query.limit,
    query.minimumScore,
    sourceCaseId,
  ]);

  const selectedMatch =
    useMemo<
      SimilarCase |
      null
    >(() => {
      if (
        !result ||
        selectedCandidateId ===
          null
      ) {
        return null;
      }

      return (
        result.results.find(
          (match) =>
            match.caseId ===
            selectedCandidateId,
        ) ??
        null
      );
    }, [
      result,
      selectedCandidateId,
    ]);

  const selectedFactors =
    useMemo(
      () =>
        selectedMatch
          ? orderedFactors(
              selectedMatch,
            )
          : [],

      [
        selectedMatch,
      ],
    );

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ): void {
    event.preventDefault();

    setQuery({
      limit:
        Number(draftLimit),

      minimumScore:
        Number(
          draftMinimumScore,
        ),
    });
  }

  return (
    <section
      className="similar-cases"
      aria-labelledby={
        `similar-cases-title-${sourceCaseId}`
      }
    >
      <header className="similar-cases__header">
        <div>
          <span className="similar-cases__eyebrow">
            EXPLAINABLE PATTERN MATCHING
          </span>

          <h3
            id={
              `similar-cases-title-${sourceCaseId}`
            }
          >
            Similar cases
          </h3>

          <p>
            Find FIRs with matching crime
            classifications, modus operandi,
            legal sections, verified
            entities, identifiers, locations
            and incident-time patterns.
          </p>
        </div>

        <span className="similar-cases__version">
          {
            result?.ruleVersion ??
            'KAVACH_SIMILARITY_V1'
          }
        </span>
      </header>

      <aside className="similar-cases__governance">
        <div
          className="similar-cases__governance-mark"
          aria-hidden="true"
        >
          !
        </div>

        <div>
          <strong>
            Results are investigative leads
          </strong>

          <p>
            {result?.permittedUse ??
              [
                'Similarity does not establish',
                'a shared offender, motive,',
                'conspiracy or criminal',
                'responsibility.',
              ].join(' ')}
          </p>
        </div>
      </aside>

      <form
        className="similar-cases__controls"
        onSubmit={handleSubmit}
      >
        <label>
          <span>
            Minimum similarity
          </span>

          <select
            value={
              draftMinimumScore
            }
            disabled={loading}
            onChange={(event) =>
              setDraftMinimumScore(
                event.target.value,
              )
            }
          >
            <option value="0">
              0 — All indexed matches
            </option>

            <option value="20">
              20 — Basic relationship
            </option>

            <option value="35">
              35 — Moderate relationship
            </option>

            <option value="50">
              50 — Strong relationship
            </option>

            <option value="70">
              70 — Very strong relationship
            </option>
          </select>
        </label>

        <label>
          <span>
            Maximum results
          </span>

          <select
            value={draftLimit}
            disabled={loading}
            onChange={(event) =>
              setDraftLimit(
                event.target.value,
              )
            }
          >
            <option value="5">
              5 cases
            </option>

            <option value="10">
              10 cases
            </option>

            <option value="20">
              20 cases
            </option>

            <option value="30">
              30 cases
            </option>

            <option value="50">
              50 cases
            </option>
          </select>
        </label>

        <button
          type="submit"
          disabled={loading}
        >
          Apply matching rules
        </button>
      </form>

      <div className="similar-cases__metrics">
        <article>
          <span>
            Indexed candidates
          </span>

          <strong>
            {
              result
                ?.candidateCount ??
              '—'
            }
          </strong>
        </article>

        <article>
          <span>
            Matches returned
          </span>

          <strong>
            {
              result
                ?.results.length ??
              '—'
            }
          </strong>
        </article>

        <article>
          <span>
            Minimum score
          </span>

          <strong>
            {query.minimumScore}
          </strong>
        </article>

        <article>
          <span>
            Generated
          </span>

          <strong className="similar-cases__generated">
            {result
              ? formatDateTime(
                  result.generatedAt,
                )
              : '—'}
          </strong>
        </article>
      </div>

      {loading && (
        <div className="similar-cases__message">
          Building indexed case
          comparisons…
        </div>
      )}

      {!loading && error && (
        <div
          className="similar-cases__error"
          role="alert"
        >
          <strong>
            Similar-case intelligence
            unavailable
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!loading &&
        !error &&
        result &&
        result.results.length ===
          0 && (
          <div className="similar-cases__message">
            No cases reached the selected
            minimum similarity score.
          </div>
        )}

      {!loading &&
        !error &&
        result &&
        result.results.length >
          0 && (
          <div className="similar-cases__workspace">
            <div className="similar-cases__results">
              <header>
                <div>
                  <span>
                    RANKED MATCHES
                  </span>

                  <strong>
                    Source FIR{' '}
                    {
                      result
                        .sourceCase
                        .crimeNumber
                    }
                  </strong>
                </div>

                <small>
                  Highest score first
                </small>
              </header>

              <div className="similar-cases__result-list">
                {result.results.map(
                  (
                    match,
                    index,
                  ) => {
                    const selected =
                      match.caseId ===
                      selectedCandidateId;

                    const visibleLabels =
                      match
                        .matchingFactors
                        .slice(0, 3);

                    const remainingLabels =
                      Math.max(
                        0,

                        match
                          .matchingFactors
                          .length -
                          visibleLabels.length,
                      );

                    return (
                      <button
                        key={
                          match.caseId
                        }
                        type="button"
                        className={[
                          'similar-case-card',
                          selected
                            ? 'similar-case-card--selected'
                            : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        aria-pressed={
                          selected
                        }
                        onClick={() =>
                          setSelectedCandidateId(
                            match.caseId,
                          )
                        }
                      >
                        <div className="similar-case-card__rank">
                          #
                          {index + 1}
                        </div>

                        <div className="similar-case-card__content">
                          <header>
                            <div>
                              <strong>
                                {
                                  match
                                    .caseSummary
                                    .crimeNumber
                                }
                              </strong>

                              <span>
                                Case ID{' '}
                                {
                                  match
                                    .caseId
                                }
                              </span>
                            </div>

                            <div
                              className={
                                createScoreClass(
                                  match
                                    .similarityScore,
                                )
                              }
                            >
                              <strong>
                                {
                                  match
                                    .similarityScore
                                }
                              </strong>

                              <span>
                                /100
                              </span>
                            </div>
                          </header>

                          <p>
                            {
                              match
                                .caseSummary
                                .minorCrimeHead
                                .name
                            }
                          </p>

                          <div className="similar-case-card__meta">
                            <span>
                              {
                                match
                                  .caseSummary
                                  .district
                                  .name
                              }
                            </span>

                            <span>
                              {formatDate(
                                match
                                  .caseSummary
                                  .registeredDate,
                              )}
                            </span>
                          </div>

                          <div className="similar-case-card__factors">
                            {visibleLabels.map(
                              (
                                label,
                              ) => (
                                <span
                                  key={
                                    label
                                  }
                                >
                                  {label}
                                </span>
                              ),
                            )}

                            {remainingLabels >
                              0 && (
                              <span>
                                +
                                {
                                  remainingLabels
                                }{' '}
                                more
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="similar-cases__inspector">
              {selectedMatch ? (
                <>
                  <header className="similar-cases__inspector-header">
                    <div>
                      <span>
                        SELECTED COMPARISON
                      </span>

                      <h4>
                        {
                          selectedMatch
                            .caseSummary
                            .crimeNumber
                        }
                      </h4>

                      <p>
                        {
                          selectedMatch
                            .caseSummary
                            .minorCrimeHead
                            .name
                        }
                      </p>
                    </div>

                    <div
                      className={
                        createScoreClass(
                          selectedMatch
                            .similarityScore,
                        )
                      }
                    >
                      <strong>
                        {
                          selectedMatch
                            .similarityScore
                        }
                      </strong>

                      <span>
                        /100
                      </span>
                    </div>
                  </header>

                  <div className="similar-cases__selected-meta">
                    <div>
                      <span>
                        Jurisdiction
                      </span>

                      <strong>
                        {
                          selectedMatch
                            .caseSummary
                            .policeStation
                            .name
                        }
                      </strong>

                      <small>
                        {
                          selectedMatch
                            .caseSummary
                            .district
                            .name
                        }
                      </small>
                    </div>

                    <div>
                      <span>
                        Registered
                      </span>

                      <strong>
                        {formatDate(
                          selectedMatch
                            .caseSummary
                            .registeredDate,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Active factors
                      </span>

                      <strong>
                        {countActiveFactors(
                          selectedMatch,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Evidence records
                      </span>

                      <strong>
                        {totalEvidenceRecords(
                          selectedMatch,
                        )}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="similar-cases__open-case"
                    onClick={() =>
                      onOpenCase(
                        selectedMatch
                          .caseId,
                      )
                    }
                  >
                    <span>
                      Open related FIR
                    </span>

                    <strong>
                      Review full case →
                    </strong>
                  </button>

                  <div className="similar-cases__factor-heading">
                    <span>
                      MATCH EXPLANATION
                    </span>

                    <strong>
                      Scoring factors
                    </strong>
                  </div>

                  <div className="similar-cases__factor-list">
                    {selectedFactors.map(
                      (factor) => (
                        <article
                          key={
                            factor.code
                          }
                          className={
                            createFactorClass(
                              factor,
                            )
                          }
                        >
                          <header>
                            <div>
                              <span>
                                {
                                  factor
                                    .code
                                }
                              </span>

                              <strong>
                                {
                                  factor
                                    .label
                                }
                              </strong>
                            </div>

                            <div className="similarity-factor__points">
                              <strong>
                                +
                                {
                                  factor
                                    .points
                                }
                              </strong>

                              <span>
                                /
                                {
                                  factor
                                    .maximumPoints
                                }
                              </span>
                            </div>
                          </header>

                          <p>
                            {
                              factor
                                .explanation
                            }
                          </p>

                          <div className="similarity-factor__metrics">
                            <div>
                              <span>
                                Raw value
                              </span>

                              <strong>
                                {formatRawValue(
                                  factor
                                    .rawValue,
                                )}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Cap status
                              </span>

                              <strong>
                                {factor.capped
                                  ? 'Reached'
                                  : 'Not reached'}
                              </strong>
                            </div>

                            <div>
                              <span>
                                Evidence
                              </span>

                              <strong>
                                {
                                  factor
                                    .evidence
                                    .length
                                }
                              </strong>
                            </div>
                          </div>

                          <details className="similarity-factor__evidence">
                            <summary>
                              <span>
                                Inspect source
                                records
                              </span>

                              <strong>
                                {
                                  factor
                                    .evidence
                                    .length
                                }
                              </strong>
                            </summary>

                            {factor
                              .evidence
                              .length >
                            0 ? (
                              <div className="similarity-factor__evidence-list">
                                {factor.evidence.map(
                                  (
                                    reference,
                                    index,
                                  ) => (
                                    <article
                                      key={[
                                        reference
                                          .sourceTable,
                                        reference
                                          .sourceRecordId,
                                        reference
                                          .field ??
                                          '',
                                        index,
                                      ].join(
                                        ':',
                                      )}
                                    >
                                      <header>
                                        <strong>
                                          {
                                            reference
                                              .sourceTable
                                          }
                                        </strong>

                                        <span>
                                          Record{' '}
                                          {
                                            reference
                                              .sourceRecordId
                                          }
                                        </span>
                                      </header>

                                      <p>
                                        {
                                          reference
                                            .description
                                        }
                                      </p>

                                      <footer>
                                        <span>
                                          Source
                                          case{' '}
                                          {
                                            reference
                                              .sourceCaseId
                                          }
                                        </span>

                                        <span>
                                          Candidate
                                          case{' '}
                                          {
                                            reference
                                              .candidateCaseId
                                          }
                                        </span>

                                        {reference
                                          .field && (
                                          <span>
                                            Field{' '}
                                            {
                                              reference
                                                .field
                                            }
                                          </span>
                                        )}
                                      </footer>
                                    </article>
                                  ),
                                )}
                              </div>
                            ) : (
                              <div className="similarity-factor__empty-evidence">
                                This rule did
                                not affect the
                                similarity
                                score.
                              </div>
                            )}
                          </details>
                        </article>
                      ),
                    )}
                  </div>
                </>
              ) : (
                <div className="similar-cases__message">
                  Select a related FIR to
                  inspect its matching
                  factors.
                </div>
              )}
            </div>
          </div>
        )}
    </section>
  );
}
