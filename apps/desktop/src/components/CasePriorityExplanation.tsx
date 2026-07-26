import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  CasePriorityAssessment,
  CasePriorityBand,
  CasePriorityFactor,
} from '@kavach/shared-types';

import './CasePriorityExplanation.css';

interface CasePriorityExplanationProps {
  caseId: number;
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

function createBandClass(
  band: CasePriorityBand,
): string {
  return [
    'case-priority__band',
    `case-priority__band--${band.toLowerCase()}`,
  ].join(' ');
}

function createScoreClass(
  band: CasePriorityBand,
): string {
  return [
    'case-priority__score',
    `case-priority__score--${band.toLowerCase()}`,
  ].join(' ');
}

function createFactorClass(
  factor: CasePriorityFactor,
): string {
  if (factor.points < 0) {
    return [
      'case-priority-factor',
      'case-priority-factor--reducing',
    ].join(' ');
  }

  if (factor.points > 0) {
    return [
      'case-priority-factor',
      'case-priority-factor--increasing',
    ].join(' ');
  }

  return [
    'case-priority-factor',
    'case-priority-factor--inactive',
  ].join(' ');
}

function formatRawValue(
  value: number | boolean,
): string {
  if (typeof value === 'boolean') {
    return value
      ? 'Yes'
      : 'No';
  }

  return String(value);
}

function formatPoints(
  points: number,
): string {
  if (points > 0) {
    return `+${points}`;
  }

  return String(points);
}

function factorStrength(
  factor: CasePriorityFactor,
): number {
  if (
    factor.maximumAbsolutePoints <= 0
  ) {
    return 0;
  }

  return Math.min(
    100,
    Math.round(
      (
        Math.abs(factor.points) /
        factor.maximumAbsolutePoints
      ) * 100,
    ),
  );
}

export function CasePriorityExplanation({
  caseId,
}: CasePriorityExplanationProps) {
  const [
    assessment,
    setAssessment,
  ] =
    useState<
      CasePriorityAssessment |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadAssessment():
    Promise<void> {
      setLoading(true);
      setError(null);
      setAssessment(null);

      try {
        const result =
          await window.kavach.priority
            .getCaseAssessment(
              caseId,
            );

        if (active) {
          setAssessment(result);
        }
      } catch (
        requestError: unknown
      ) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Priority assessment could not be loaded.',
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAssessment();

    return () => {
      active = false;
    };
  }, [
    caseId,
  ]);

  const summary =
    useMemo(() => {
      if (!assessment) {
        return {
          increasingPoints: 0,
          reducingPoints: 0,
          activeFactors: 0,
          evidenceRecords: 0,
        };
      }

      return assessment.factors.reduce(
        (
          result,
          factor,
        ) => {
          if (factor.points > 0) {
            result.increasingPoints +=
              factor.points;
          }

          if (factor.points < 0) {
            result.reducingPoints +=
              factor.points;
          }

          if (factor.points !== 0) {
            result.activeFactors += 1;
          }

          result.evidenceRecords +=
            factor.evidence.length;

          return result;
        },
        {
          increasingPoints: 0,
          reducingPoints: 0,
          activeFactors: 0,
          evidenceRecords: 0,
        },
      );
    }, [
      assessment,
    ]);

  const orderedFactors =
    useMemo(() => {
      if (!assessment) {
        return [];
      }

      return [
        ...assessment.factors,
      ].sort(
        (
          left,
          right,
        ) => {
          const leftActive =
            left.points !== 0;

          const rightActive =
            right.points !== 0;

          if (
            leftActive !== rightActive
          ) {
            return leftActive
              ? -1
              : 1;
          }

          return (
            Math.abs(right.points) -
              Math.abs(left.points) ||
            left.label.localeCompare(
              right.label,
            )
          );
        },
      );
    }, [
      assessment,
    ]);

  return (
    <section
      className="case-priority"
      aria-labelledby={
        `case-priority-title-${caseId}`
      }
    >
      <header className="case-priority__header">
        <div>
          <span className="case-priority__eyebrow">
            EXPLAINABLE REVIEW PRIORITY
          </span>

          <h3
            id={
              `case-priority-title-${caseId}`
            }
          >
            Investigation priority
          </h3>

          <p>
            A bounded review-ordering
            assessment supported by
            traceable dataset records.
          </p>
        </div>

        {assessment && (
          <span className="case-priority__version">
            {assessment.ruleVersion}
          </span>
        )}
      </header>

      {loading && (
        <div className="case-priority__message">
          Calculating priority factors…
        </div>
      )}

      {!loading && error && (
        <div
          className="case-priority__error"
          role="alert"
        >
          <strong>
            Priority assessment unavailable
          </strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {!loading && assessment && (
        <>
          <div className="case-priority__overview">
            <div
              className={createScoreClass(
                assessment.band,
              )}
            >
              <span>
                Review score
              </span>

              <div>
                <strong>
                  {assessment.score}
                </strong>

                <small>
                  / 100
                </small>
              </div>

              <span
                className={createBandClass(
                  assessment.band,
                )}
              >
                {assessment.band}
              </span>
            </div>

            <div className="case-priority__summary">
              <article>
                <span>
                  Increasing points
                </span>

                <strong>
                  +{summary.increasingPoints}
                </strong>
              </article>

              <article>
                <span>
                  Reducing points
                </span>

                <strong>
                  {summary.reducingPoints}
                </strong>
              </article>

              <article>
                <span>
                  Active factors
                </span>

                <strong>
                  {summary.activeFactors}
                </strong>
              </article>

              <article>
                <span>
                  Evidence records
                </span>

                <strong>
                  {summary.evidenceRecords}
                </strong>
              </article>
            </div>
          </div>

          <aside className="case-priority__governance">
            <div
              className="case-priority__governance-mark"
              aria-hidden="true"
            >
              !
            </div>

            <div>
              <strong>
                Human review is mandatory
              </strong>

              <p>
                {assessment.permittedUse}
              </p>
            </div>
          </aside>

          <div className="case-priority__metadata">
            <div>
              <span>
                Assessment time
              </span>

              <strong>
                {formatDateTime(
                  assessment.assessedAt,
                )}
              </strong>
            </div>

            <div>
              <span>
                Review requirement
              </span>

              <strong>
                {assessment
                  .humanReviewRequired
                  ? 'Required'
                  : 'Not specified'}
              </strong>
            </div>

            <div>
              <span>
                Case reference
              </span>

              <strong>
                Case ID {assessment.caseId}
              </strong>
            </div>
          </div>

          <div className="case-priority__section-heading">
            <div>
              <span>
                FACTOR BREAKDOWN
              </span>

              <h4>
                Score calculation
              </h4>
            </div>

            <small>
              Every factor is capped
            </small>
          </div>

          <div className="case-priority__factors">
            {orderedFactors.map(
              (factor) => (
                <article
                  key={factor.code}
                  className={
                    createFactorClass(
                      factor,
                    )
                  }
                >
                  <header>
                    <div>
                      <span className="case-priority-factor__code">
                        {factor.code}
                      </span>

                      <h5>
                        {factor.label}
                      </h5>
                    </div>

                    <div className="case-priority-factor__points">
                      <strong>
                        {formatPoints(
                          factor.points,
                        )}
                      </strong>

                      <span>
                        points
                      </span>
                    </div>
                  </header>

                  <p>
                    {factor.explanation}
                  </p>

                  <div className="case-priority-factor__metrics">
                    <div>
                      <span>
                        Raw value
                      </span>

                      <strong>
                        {formatRawValue(
                          factor.rawValue,
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Direction
                      </span>

                      <strong>
                        {factor.direction}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Maximum effect
                      </span>

                      <strong>
                        {
                          factor
                            .maximumAbsolutePoints
                        }
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
                  </div>

                  <div className="case-priority-factor__strength">
                    <div>
                      <span>
                        Rule utilisation
                      </span>

                      <strong>
                        {factorStrength(
                          factor,
                        )}
                        %
                      </strong>
                    </div>

                    <div className="case-priority-factor__track">
                      <span
                        style={{
                          width:
                            `${factorStrength(
                              factor,
                            )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <details className="case-priority-factor__evidence">
                    <summary>
                      <span>
                        Supporting records
                      </span>

                      <strong>
                        {factor.evidence.length}
                      </strong>
                    </summary>

                    {factor.evidence.length >
                    0 ? (
                      <div className="case-priority-factor__evidence-list">
                        {factor.evidence.map(
                          (
                            reference,
                            index,
                          ) => (
                            <article
                              key={[
                                reference.sourceTable,
                                reference.sourceRecordId,
                                reference.field ??
                                  '',
                                index,
                              ].join(':')}
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
                                {reference.caseId !==
                                  null && (
                                  <span>
                                    Case{' '}
                                    {
                                      reference
                                        .caseId
                                    }
                                  </span>
                                )}

                                {reference.field && (
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
                      <div className="case-priority-factor__no-evidence">
                        No supporting records were
                        required because this factor
                        did not affect the score.
                      </div>
                    )}
                  </details>
                </article>
              ),
            )}
          </div>

          <div className="case-priority__excluded">
            <div className="case-priority__section-heading">
              <div>
                <span>
                  RESPONSIBLE USE
                </span>

                <h4>
                  Inputs excluded from scoring
                </h4>
              </div>
            </div>

            <div className="case-priority__excluded-list">
              {assessment.excludedInputs.map(
                (input) => (
                  <span key={input}>
                    {input}
                  </span>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
