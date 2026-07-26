import {
  useState,
} from 'react';

import type {
  FormEvent,
} from 'react';

import type {
  IntelligenceAssistantResponse,
} from '@kavach/shared-types';

import {
  CaseDetailDrawer,
} from './CaseDetailDrawer';

import './IntelligenceAssistantPanel.css';

const QUERY_SUGGESTIONS = [
  'Show robbery cases registered during 2025',

  'Find cases involving vehicle theft and repeated modus operandi',

  'Show FIRs related to cyber fraud',

  'Find cases registered at the same police station during 2026',
] as const;

function formatFilterDate(
  value: string | null,
): string {
  return value ?? 'Any date';
}

export function IntelligenceAssistantPanel() {
  const [
    query,
    setQuery,
  ] =
    useState('');

  const [
    response,
    setResponse,
  ] =
    useState<
      IntelligenceAssistantResponse |
      null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    selectedCaseId,
    setSelectedCaseId,
  ] =
    useState<number | null>(
      null,
    );

  async function submitQuery(
    event:
      FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const cleanedQuery =
      query.trim();

    if (
      cleanedQuery.length < 3
    ) {
      setError(
        'Enter a more specific natural-language query.',
      );

      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result =
        await window.kavach
          .assistant
          .query({
            query:
              cleanedQuery,

            limit: 10,
            minimumScore: 10,
          });

      setResponse(
        result,
      );
    } catch (
      requestError: unknown
    ) {
      setResponse(null);

      setError(
        requestError instanceof
          Error
          ? requestError.message
          : 'The assistant query could not be completed.',
      );
    } finally {
      setLoading(false);
    }
  }

  function useSuggestion(
    suggestion: string,
  ): void {
    setQuery(
      suggestion,
    );

    setError(null);
  }

  return (
    <>
      <section
        className="intelligence-assistant"
        aria-labelledby="intelligence-assistant-title"
      >
        <header className="intelligence-assistant__header">
          <div>
            <span className="intelligence-assistant__eyebrow">
              OFFLINE RETRIEVAL-GROUNDED SEARCH
            </span>

            <h2 id="intelligence-assistant-title">
              Intelligence Assistant
            </h2>

            <p>
              Search synthetic FIR records
              using natural language and
              receive evidence-grounded
              answers with direct case
              citations.
            </p>
          </div>

          <div className="intelligence-assistant__status">
            <span
              aria-hidden="true"
            />

            {response?.provider ===
              'GEMINI'
              ? `GEMINI · ${response.model ?? 'Configured model'}`
              : response?.fallbackUsed
                ? 'LOCAL FALLBACK'
                : 'LOCAL RETRIEVAL · GEMINI SYNTHESIS'}
          </div>
        </header>

        <aside className="intelligence-assistant__governance">
          <strong>
            Retrieval support only
          </strong>

          <p>
            Retrieval is performed locally.
            When generative mode is configured, only
            the highest-ranked masked FIR
            excerpts are sent for grounded
            answer generation. Results do not
            establish guilt, identity, motive,
            conspiracy or criminal association.
          </p>
        </aside>

        <form
          className="assistant-query"
          onSubmit={
            submitQuery
          }
        >
          <label>
            <span>
              Ask about the FIR dataset
            </span>

            <textarea
              value={query}
              maxLength={500}
              disabled={loading}
              placeholder="Example: Show robbery cases in Central District during 2025"
              onChange={(event) =>
                setQuery(
                  event.target.value,
                )
              }
            />
          </label>

          <div className="assistant-query__footer">
            <span>
              {query.length}/500
            </span>

            <button
              type="submit"
              disabled={
                loading ||
                query.trim()
                  .length < 3
              }
            >
              {loading
                ? 'Retrieving FIR evidence…'
                : 'Search and answer'}
            </button>
          </div>
        </form>

        <div className="assistant-suggestions">
          <span>
            EXAMPLE QUERIES
          </span>

          <div>
            {QUERY_SUGGESTIONS.map(
              (suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    useSuggestion(
                      suggestion,
                    )
                  }
                >
                  {suggestion}
                </button>
              ),
            )}
          </div>
        </div>

        {error && (
          <div
            className="intelligence-assistant__error"
            role="alert"
          >
            {error}
          </div>
        )}

        {!response &&
          !loading &&
          !error && (
          <div className="intelligence-assistant__empty">
            <strong>
              No query submitted
            </strong>

            <span>
              Enter a natural-language
              question to retrieve grounded
              FIR evidence.
            </span>
          </div>
        )}

        {response && (
          <div className="assistant-result">
            <article className="assistant-answer">
              <header>
                <div>
                  <span>
                    GROUNDED ANSWER
                  </span>

                  <h3>
                    {
                      response
                        .matchingCaseCount
                    }{' '}
                    matching FIRs
                  </h3>
                </div>

                <div
                  className={[
                    'assistant-confidence',

                    `assistant-confidence--${response.confidence.toLowerCase()}`,
                  ].join(' ')}
                >
                  {
                    response
                      .confidence
                  }{' '}
                  CONFIDENCE
                </div>
              </header>

              {response.fallbackUsed && (
                <div className="assistant-answer__fallback">
                  Generative mode was unavailable
                  or failed grounding validation.
                  The answer below was produced by
                  the deterministic local fallback.
                </div>
              )}

              <div className="assistant-answer__text">
                {response.answer
                  .split(
                    /\n{2,}/,
                  )
                  .map(
                    (
                      paragraph,
                      index,
                    ) => (
                      <p
                        key={[
                          index,
                          paragraph,
                        ].join(':')}
                      >
                        {paragraph}
                      </p>
                    ),
                  )}
              </div>

              <footer>
                <span>
                  {
                    response
                      .generationMode
                  }
                </span>

                <span>
                  {response.provider}
                  {response.model
                    ? ` · ${response.model}`
                    : ''}
                </span>

                <span>
                  {
                    response
                      .citationCaseIds
                      .length
                  }{' '}
                  validated citations
                </span>
              </footer>
            </article>

            <aside className="assistant-filters">
              <span>
                INTERPRETED FILTERS
              </span>

              <div>
                <article>
                  <small>
                    Registered from
                  </small>

                  <strong>
                    {formatFilterDate(
                      response
                        .filters
                        .registeredFrom,
                    )}
                  </strong>
                </article>

                <article>
                  <small>
                    Registered to
                  </small>

                  <strong>
                    {formatFilterDate(
                      response
                        .filters
                        .registeredTo,
                    )}
                  </strong>
                </article>

                <article>
                  <small>
                    District filters
                  </small>

                  <strong>
                    {
                      response
                        .filters
                        .districtIds
                        .length
                    }
                  </strong>
                </article>

                <article>
                  <small>
                    Station filters
                  </small>

                  <strong>
                    {
                      response
                        .filters
                        .policeStationIds
                        .length
                    }
                  </strong>
                </article>
              </div>

              {response
                .filters
                .matchedPhrases
                .length > 0 && (
                <section>
                  {response
                    .filters
                    .matchedPhrases
                    .map(
                      (phrase) => (
                        <strong
                          key={phrase}
                        >
                          {phrase}
                        </strong>
                      ),
                    )}
                </section>
              )}
            </aside>

            <section className="assistant-sources">
              <header>
                <div>
                  <span>
                    RETRIEVED FIR EVIDENCE
                  </span>

                  <h3>
                    Ranked sources
                  </h3>
                </div>

                <small>
                  Open any FIR to verify
                  the original record
                </small>
              </header>

              <div className="assistant-sources__list">
                {response.sources.map(
                  (
                    source,
                    index,
                  ) => (
                    <button
                      key={
                        source.caseId
                      }
                      type="button"
                      onClick={() =>
                        setSelectedCaseId(
                          source.caseId,
                        )
                      }
                    >
                      <div className="assistant-source__rank">
                        #{index + 1}
                      </div>

                      <div className="assistant-source__content">
                        <header>
                          <div>
                            <strong>
                              Crime No.{' '}
                              {
                                source
                                  .crimeNumber
                              }
                            </strong>

                            <span>
                              Case{' '}
                              {
                                source
                                  .caseId
                              }
                            </span>
                          </div>

                          <div className="assistant-source__score">
                            <strong>
                              {
                                source
                                  .retrievalScore
                              }
                            </strong>

                            <span>
                              /100
                            </span>
                          </div>
                        </header>

                        <p>
                          {
                            source
                              .majorCrimeHead
                          }
                          {' · '}
                          {
                            source
                              .policeStation
                          }
                          {' · '}
                          {
                            source
                              .district
                          }
                        </p>

                        <blockquote>
                          {
                            source
                              .excerpt ||
                            'No brief-facts excerpt is available.'
                          }
                        </blockquote>

                        <footer>
                          <span>
                            {
                              source
                                .registeredDate
                            }
                          </span>

                          <span>
                            {
                              source
                                .location
                            }
                          </span>

                          <strong>
                            Open FIR →
                          </strong>
                        </footer>
                      </div>
                    </button>
                  ),
                )}
              </div>
            </section>

            <section className="assistant-methodology">
              <div>
                <span>
                  ANSWER LIMITATIONS
                </span>

                <section>
                  {response.limitations.map(
                    (
                      limitation,
                      index,
                    ) => (
                      <strong
                        key={[
                          index,
                          limitation,
                        ].join(':')}
                      >
                        {limitation}
                      </strong>
                    ),
                  )}
                </section>
              </div>
              <div>
                <span>
                  RETRIEVAL METHOD
                </span>

                <p>
                  {
                    response
                      .retrievalMethod
                  }
                </p>
              </div>

              <div>
                <span>
                  RESPONSIBLE USE
                </span>

                <p>
                  {
                    response
                      .responsibleUse
                  }
                </p>
              </div>

              <div>
                <span>
                  EXCLUDED DATA
                </span>

                <section>
                  {response
                    .excludedData
                    .map(
                      (item) => (
                        <strong
                          key={item}
                        >
                          {item}
                        </strong>
                      ),
                    )}
                </section>
              </div>
            </section>
          </div>
        )}
      </section>

      {selectedCaseId !==
        null && (
        <CaseDetailDrawer
          caseId={
            selectedCaseId
          }
          onClose={() =>
            setSelectedCaseId(
              null,
            )
          }
        />
      )}
    </>
  );
}
