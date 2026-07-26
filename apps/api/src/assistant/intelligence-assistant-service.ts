import type {
  IntelligenceAssistantConfidence,
  IntelligenceAssistantFilters,
  IntelligenceAssistantQuery,
  IntelligenceAssistantResponse,
  IntelligenceAssistantSource,
} from '@kavach/shared-types';

import type {
  LoadedCoreDataset,
} from '../data/dataset-loader';

import {
  getCoreDataset,
} from '../data/dataset-service';

const DEFAULT_RESULT_LIMIT =
  8;

const MAXIMUM_RESULT_LIMIT =
  25;

const DEFAULT_MINIMUM_SCORE =
  10;

const MAXIMUM_QUERY_LENGTH =
  500;

const STOP_WORDS =
  new Set([
    'a',
    'an',
    'and',
    'are',
    'as',
    'at',
    'be',
    'by',
    'case',
    'cases',
    'crime',
    'crimes',
    'during',
    'find',
    'for',
    'from',
    'in',
    'is',
    'me',
    'of',
    'on',
    'or',
    'registered',
    'related',
    'show',
    'the',
    'to',
    'with',
  ]);

const RESPONSIBLE_USE = [
  'This assistant retrieves and summarizes synthetic FIR records.',
  'It does not determine guilt, motive, identity, conspiracy or criminal responsibility.',
  'Every result requires human verification against the underlying source records.',
].join(' ');

const RETRIEVAL_METHOD = [
  'Offline weighted lexical retrieval with field-level boosts,',
  'inverse-document-frequency ranking, natural-language filter extraction',
  'and deterministic evidence-grounded synthesis.',
].join(' ');

const EXCLUDED_DATA = [
  'Sensitive identifier values',
  'Caste',
  'Religion',
  'Socio-economic indicators',
  'Individual risk predictions',
  'External internet content',
] as const;

interface AssistantCaseDocument {
  caseId: number;

  crimeNumber: string;
  caseNumber: string;

  registeredDate: string;

  districtId: number;
  district: string;

  policeStationId: number;
  policeStation: string;

  majorCrimeHeadId: number;
  majorCrimeHead: string;

  location: string;

  briefFacts: string;

  accusedNames: string[];
  modusOperandiNames: string[];

  normalizedCrimeNumber: string;
  normalizedCaseNumber: string;

  normalizedDistrict: string;
  normalizedPoliceStation: string;
  normalizedMajorCrimeHead: string;
  normalizedLocation: string;

  searchableText: string;

  termFrequency:
    ReadonlyMap<string, number>;

  weightedLength: number;
}

interface RankedAssistantDocument {
  document:
    AssistantCaseDocument;

  rawScore: number;
  retrievalScore: number;

  matchedTerms: string[];
}

interface LookupReference {
  id: number;
  name: string;
}

interface PoliceStationReference
  extends LookupReference {
  districtId: number;
}

export interface IntelligenceAssistantStatistics {
  indexedCases: number;
  indexedTerms: number;

  firstRegisteredDate: string;
  latestRegisteredDate: string;

  sampleCaseId: number;
  sampleCrimeNumber: string;
  sampleMajorCrimeHead: string;
}

function toPositiveInteger(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  if (!/^\d+$/.test(cleaned)) {
    throw new Error(
      `${label} must contain a positive integer.`,
    );
  }

  const parsed =
    Number(cleaned);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${label} must contain a positive integer.`,
    );
  }

  return parsed;
}

function normalizeText(
  value: string,
): string {
  return value
    .normalize('NFKD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .toLowerCase()
    .replace(
      /[^a-z0-9]+/g,
      ' ',
    )
    .trim()
    .replace(
      /\s+/g,
      ' ',
    );
}

function tokenize(
  value: string,
): string[] {
  return normalizeText(value)
    .split(' ')
    .map(
      (token) =>
        token.trim(),
    )
    .filter(
      (token) =>
        token.length > 1 &&
        !STOP_WORDS.has(token),
    );
}

function incrementWeightedTerms(
  target:
    Map<string, number>,

  value: string,
  weight: number,
): void {
  tokenize(value).forEach(
    (term) => {
      target.set(
        term,

        (
          target.get(term) ??
          0
        ) +
          weight,
      );
    },
  );
}

function createExcerpt(
  value: string,
  maximumLength = 260,
): string {
  const cleaned =
    value
      .replace(/\s+/g, ' ')
      .trim();

  if (
    cleaned.length <=
    maximumLength
  ) {
    return cleaned;
  }

  return [
    cleaned.slice(
      0,
      maximumLength - 1,
    ).trimEnd(),

    '…',
  ].join('');
}

function parseIsoDate(
  value: string,
): string | null {
  const cleaned =
    value
      .trim()
      .slice(0, 10);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      cleaned,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${cleaned}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    ) ||
    date
      .toISOString()
      .slice(0, 10) !==
      cleaned
  ) {
    return null;
  }

  return cleaned;
}

function percentageScore(
  rawScore: number,
): number {
  if (rawScore <= 0) {
    return 0;
  }

  return Math.round(
    Math.min(
      100,

      (
        rawScore /
        (
          rawScore +
          12
        )
      ) *
        100,
    ),
  );
}

function determineConfidence(
  sources:
    readonly IntelligenceAssistantSource[],
): IntelligenceAssistantConfidence {
  const topScore =
    sources[0]
      ?.retrievalScore ??
    0;

  const secondScore =
    sources[1]
      ?.retrievalScore ??
    0;

  if (
    topScore >= 72 &&
    (
      sources.length === 1 ||
      topScore - secondScore >=
        8
    )
  ) {
    return 'HIGH';
  }

  if (topScore >= 42) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function mostFrequentValue(
  values:
    readonly string[],
): {
  value: string;
  count: number;
} | null {
  const counts =
    new Map<string, number>();

  values
    .filter(Boolean)
    .forEach(
      (value) => {
        counts.set(
          value,

          (
            counts.get(value) ??
            0
          ) +
            1,
        );
      },
    );

  const result =
    [
      ...counts.entries(),
    ].sort(
      (
        left,
        right,
      ) =>
        right[1] -
          left[1] ||

        left[0].localeCompare(
          right[0],
        ),
    )[0];

  if (!result) {
    return null;
  }

  return {
    value:
      result[0],

    count:
      result[1],
  };
}

function createAnswer(
  sources:
    readonly IntelligenceAssistantSource[],

  matchingCaseCount: number,
): string {
  if (sources.length === 0) {
    return [
      'No sufficiently grounded FIR matches were found for this query.',
      'Try including a crime classification, location, district, police station, year, person name or crime number.',
    ].join(' ');
  }

  const strongest =
    sources[0];

  if (!strongest) {
    throw new Error(
      'The strongest assistant source is unavailable.',
    );
  }

  const lines:
    string[] = [];

  lines.push(
    [
      `I found ${matchingCaseCount}`,
      matchingCaseCount === 1
        ? 'relevant FIR.'
        : 'relevant FIRs.',

      `The strongest match is Crime No. ${strongest.crimeNumber}`,

      `registered on ${strongest.registeredDate}`,

      `at ${strongest.policeStation}`,

      `under ${strongest.majorCrimeHead}.`,

      `[Case ${strongest.caseId}]`,
    ].join(' '),
  );

  if (strongest.excerpt) {
    lines.push(
      [
        strongest.excerpt,

        `[Case ${strongest.caseId}]`,
      ].join(' '),
    );
  }

  const commonCrimeHead =
    mostFrequentValue(
      sources.map(
        (source) =>
          source.majorCrimeHead,
      ),
    );

  if (
    commonCrimeHead &&
    commonCrimeHead.count > 1
  ) {
    const citations =
      sources
        .filter(
          (source) =>
            source.majorCrimeHead ===
            commonCrimeHead.value,
        )
        .slice(0, 4)
        .map(
          (source) =>
            `[Case ${source.caseId}]`,
        )
        .join(' ');

    lines.push(
      [
        `${commonCrimeHead.value} appears in`,
        `${commonCrimeHead.count} of the`,
        `${sources.length} highest-ranked results.`,

        citations,
      ].join(' '),
    );
  }

  const commonDistrict =
    mostFrequentValue(
      sources.map(
        (source) =>
          source.district,
      ),
    );

  if (
    commonDistrict &&
    commonDistrict.count > 1
  ) {
    const citations =
      sources
        .filter(
          (source) =>
            source.district ===
            commonDistrict.value,
        )
        .slice(0, 4)
        .map(
          (source) =>
            `[Case ${source.caseId}]`,
        )
        .join(' ');

    lines.push(
      [
        `${commonDistrict.count} retrieved results`,
        `are registered in ${commonDistrict.value}.`,

        citations,
      ].join(' '),
    );
  }

  lines.push(
    [
      'These are retrieval matches rather than findings of guilt or criminal association.',
      'Open the cited FIRs and verify the original records before acting.',
    ].join(' '),
  );

  return lines.join('\n\n');
}

function uniqueNumbers(
  values:
    readonly number[],
): number[] {
  return [
    ...new Set(values),
  ];
}

function findNamedMatches<
  Reference extends
    LookupReference,
>(
  normalizedQuery: string,

  references:
    readonly Reference[],
): Reference[] {
  return references
    .filter(
      (reference) => {
        const normalizedName =
          normalizeText(
            reference.name,
          );

        return (
          normalizedName.length >
            2 &&
          normalizedQuery.includes(
            normalizedName,
          )
        );
      },
    )
    .sort(
      (
        left,
        right,
      ) =>
        right.name.length -
          left.name.length,
    );
}

function parseDateFilters(
  query: string,
): {
  registeredFrom: string | null;
  registeredTo: string | null;
} {
  const exactDates =
    [
      ...query.matchAll(
        /\b(20\d{2}-\d{2}-\d{2})\b/g,
      ),
    ]
      .map(
        (match) =>
          parseIsoDate(
            match[1] ?? '',
          ),
      )
      .filter(
        (
          value,
        ): value is string =>
          value !== null,
      )
      .sort();

  if (
    exactDates.length >= 2
  ) {
    return {
      registeredFrom:
        exactDates[0] ??
        null,

      registeredTo:
        exactDates[
          exactDates.length - 1
        ] ??
        null,
    };
  }

  if (
    exactDates.length === 1
  ) {
    return {
      registeredFrom:
        exactDates[0] ??
        null,

      registeredTo:
        exactDates[0] ??
        null,
    };
  }

  const years =
    [
      ...query.matchAll(
        /\b(20\d{2})\b/g,
      ),
    ]
      .map(
        (match) =>
          Number(
            match[1],
          ),
      )
      .filter(
        (year) =>
          Number.isSafeInteger(
            year,
          ),
      )
      .sort();

  if (
    years.length >= 2
  ) {
    return {
      registeredFrom:
        `${years[0]}-01-01`,

      registeredTo:
        `${
          years[
            years.length - 1
          ]
        }-12-31`,
    };
  }

  if (
    years.length === 1
  ) {
    return {
      registeredFrom:
        `${years[0]}-01-01`,

      registeredTo:
        `${years[0]}-12-31`,
    };
  }

  return {
    registeredFrom: null,
    registeredTo: null,
  };
}

export class IntelligenceAssistantService {
  private readonly documents:
    AssistantCaseDocument[];

  private readonly documentByCaseId =
    new Map<
      number,
      AssistantCaseDocument
    >();

  private readonly caseIdsByTerm =
    new Map<
      string,
      Set<number>
    >();

  private readonly documentFrequency =
    new Map<string, number>();

  private readonly districts:
    LookupReference[];

  private readonly policeStations:
    PoliceStationReference[];

  private readonly majorCrimeHeads:
    LookupReference[];

  private readonly averageDocumentLength:
    number;

  public constructor(
    private readonly dataset:
      LoadedCoreDataset,
  ) {
    const {
      documents,
      districts,
      policeStations,
      majorCrimeHeads,
    } =
      this.buildDocuments();

    this.documents =
      documents;

    this.districts =
      districts;

    this.policeStations =
      policeStations;

    this.majorCrimeHeads =
      majorCrimeHeads;

    this.documents.forEach(
      (document) => {
        this.documentByCaseId.set(
          document.caseId,
          document,
        );

        document.termFrequency
          .forEach(
            (
              _frequency,
              term,
            ) => {
              const caseIds =
                this.caseIdsByTerm.get(
                  term,
                ) ??
                new Set<number>();

              caseIds.add(
                document.caseId,
              );

              this.caseIdsByTerm.set(
                term,
                caseIds,
              );
            },
          );
      },
    );

    this.caseIdsByTerm.forEach(
      (
        caseIds,
        term,
      ) => {
        this.documentFrequency.set(
          term,
          caseIds.size,
        );
      },
    );

    this.averageDocumentLength =
      this.documents.length > 0
        ? (
            this.documents.reduce(
              (
                total,
                document,
              ) =>
                total +
                document.weightedLength,

              0,
            ) /
            this.documents.length
          )
        : 1;
  }

  public query(
    supplied:
      IntelligenceAssistantQuery,
  ): IntelligenceAssistantResponse {
    const cleanedQuery =
      supplied.query
        .trim();

    if (
      cleanedQuery.length < 3
    ) {
      throw new Error(
        'The natural-language query must contain at least 3 characters.',
      );
    }

    if (
      cleanedQuery.length >
      MAXIMUM_QUERY_LENGTH
    ) {
      throw new Error(
        `The natural-language query cannot exceed ${MAXIMUM_QUERY_LENGTH} characters.`,
      );
    }

    const limit =
      supplied.limit ??
      DEFAULT_RESULT_LIMIT;

    const minimumScore =
      supplied.minimumScore ??
      DEFAULT_MINIMUM_SCORE;

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit >
        MAXIMUM_RESULT_LIMIT
    ) {
      throw new Error(
        `Result limit must be between 1 and ${MAXIMUM_RESULT_LIMIT}.`,
      );
    }

    if (
      !Number.isFinite(
        minimumScore,
      ) ||
      minimumScore < 0 ||
      minimumScore > 100
    ) {
      throw new Error(
        'minimumScore must be between 0 and 100.',
      );
    }

    const normalizedQuery =
      normalizeText(
        cleanedQuery,
      );

    const districtMatches =
      findNamedMatches(
        normalizedQuery,
        this.districts,
      );

    const stationMatches =
      findNamedMatches(
        normalizedQuery,
        this.policeStations,
      );

    const crimeHeadMatches =
      findNamedMatches(
        normalizedQuery,
        this.majorCrimeHeads,
      );

    const dateFilters =
      parseDateFilters(
        cleanedQuery,
      );

    const filters:
      IntelligenceAssistantFilters = {
      registeredFrom:
        dateFilters.registeredFrom,

      registeredTo:
        dateFilters.registeredTo,

      districtIds:
        uniqueNumbers(
          districtMatches.map(
            (match) =>
              match.id,
          ),
        ),

      policeStationIds:
        uniqueNumbers(
          stationMatches.map(
            (match) =>
              match.id,
          ),
        ),

      majorCrimeHeadIds:
        uniqueNumbers(
          crimeHeadMatches.map(
            (match) =>
              match.id,
          ),
        ),

      matchedPhrases: [
        ...districtMatches.map(
          (match) =>
            match.name,
        ),

        ...stationMatches.map(
          (match) =>
            match.name,
        ),

        ...crimeHeadMatches.map(
          (match) =>
            match.name,
        ),
      ],
    };

    const queryTerms =
      [
        ...new Set(
          tokenize(
            cleanedQuery,
          ),
        ),
      ];

    const hasFilters =
      filters.registeredFrom !==
        null ||
      filters.registeredTo !==
        null ||
      filters.districtIds.length >
        0 ||
      filters
        .policeStationIds
        .length >
        0 ||
      filters
        .majorCrimeHeadIds
        .length >
        0;

    if (
      queryTerms.length === 0 &&
      !hasFilters
    ) {
      throw new Error(
        [
          'The query does not contain',
          'enough searchable information.',
        ].join(' '),
      );
    }

    const candidateCaseIds =
      new Set<number>();

    queryTerms.forEach(
      (term) => {
        this.caseIdsByTerm
          .get(term)
          ?.forEach(
            (caseId) => {
              candidateCaseIds.add(
                caseId,
              );
            },
          );
      },
    );

    if (
      candidateCaseIds.size === 0 &&
      hasFilters
    ) {
      this.documents.forEach(
        (document) => {
          candidateCaseIds.add(
            document.caseId,
          );
        },
      );
    }

    const districtFilter =
      filters.districtIds.length >
        0
        ? new Set(
            filters.districtIds,
          )
        : null;

    const stationFilter =
      filters
        .policeStationIds
        .length >
        0
        ? new Set(
            filters
              .policeStationIds,
          )
        : null;

    const crimeHeadFilter =
      filters
        .majorCrimeHeadIds
        .length >
        0
        ? new Set(
            filters
              .majorCrimeHeadIds,
          )
        : null;

    const ranked:
      RankedAssistantDocument[] =
      [];

    candidateCaseIds.forEach(
      (caseId) => {
        const document =
          this.documentByCaseId.get(
            caseId,
          );

        if (!document) {
          return;
        }

        if (
          filters.registeredFrom &&
          document.registeredDate <
            filters.registeredFrom
        ) {
          return;
        }

        if (
          filters.registeredTo &&
          document.registeredDate >
            filters.registeredTo
        ) {
          return;
        }

        if (
          districtFilter &&
          !districtFilter.has(
            document.districtId,
          )
        ) {
          return;
        }

        if (
          stationFilter &&
          !stationFilter.has(
            document.policeStationId,
          )
        ) {
          return;
        }

        if (
          crimeHeadFilter &&
          !crimeHeadFilter.has(
            document
              .majorCrimeHeadId,
          )
        ) {
          return;
        }

        let rawScore = 0;

        const matchedTerms:
          string[] = [];

        queryTerms.forEach(
          (term) => {
            const termFrequency =
              document.termFrequency.get(
                term,
              ) ??
              0;

            if (
              termFrequency <= 0
            ) {
              return;
            }

            matchedTerms.push(
              term,
            );

            const documentFrequency =
              this.documentFrequency.get(
                term,
              ) ??
              0;

            const inverseDocumentFrequency =
              Math.log(
                1 +
                (
                  this.documents.length -
                  documentFrequency +
                  0.5
                ) /
                (
                  documentFrequency +
                  0.5
                ),
              );

            const normalization =
              termFrequency +
              1.2 *
                (
                  1 -
                  0.75 +
                  0.75 *
                    (
                      document
                        .weightedLength /
                      this
                        .averageDocumentLength
                    )
                );

            rawScore +=
              inverseDocumentFrequency *
              (
                (
                  termFrequency *
                  2.2
                ) /
                normalization
              );
          },
        );

        if (
          normalizedQuery.includes(
            document
              .normalizedCrimeNumber,
          )
        ) {
          rawScore += 30;
        }

        if (
          document
            .normalizedCaseNumber &&
          normalizedQuery.includes(
            document
              .normalizedCaseNumber,
          )
        ) {
          rawScore += 20;
        }

        if (
          normalizedQuery.includes(
            document
              .normalizedPoliceStation,
          )
        ) {
          rawScore += 8;
        }

        if (
          normalizedQuery.includes(
            document
              .normalizedDistrict,
          )
        ) {
          rawScore += 7;
        }

        if (
          normalizedQuery.includes(
            document
              .normalizedMajorCrimeHead,
          )
        ) {
          rawScore += 10;
        }

        if (
          document
            .normalizedLocation &&
          normalizedQuery.includes(
            document
              .normalizedLocation,
          )
        ) {
          rawScore += 6;
        }

        const retrievalScore =
          percentageScore(
            rawScore,
          );

        if (
          retrievalScore <
          minimumScore
        ) {
          return;
        }

        ranked.push({
          document,

          rawScore,
          retrievalScore,

          matchedTerms:
            matchedTerms.sort(),
        });
      },
    );

    ranked.sort(
      (
        left,
        right,
      ) =>
        right.retrievalScore -
          left.retrievalScore ||

        right.rawScore -
          left.rawScore ||

        right.document
          .registeredDate
          .localeCompare(
            left.document
              .registeredDate,
          ) ||

        left.document.caseId -
          right.document.caseId,
    );

    const sources:
      IntelligenceAssistantSource[] =
      ranked
        .slice(
          0,
          limit,
        )
        .map(
          ({
            document,
            retrievalScore,
            matchedTerms,
          }) => ({
            caseId:
              document.caseId,

            crimeNumber:
              document.crimeNumber,

            caseNumber:
              document.caseNumber,

            registeredDate:
              document.registeredDate,

            district:
              document.district,

            policeStation:
              document.policeStation,

            majorCrimeHead:
              document.majorCrimeHead,

            location:
              document.location,

            retrievalScore,

            matchedTerms,

            excerpt:
              createExcerpt(
                document.briefFacts,
              ),
          }),
        );

    const answer =
      createAnswer(
        sources,
        ranked.length,
      );

    return {
      query:
        cleanedQuery,

      answer,

      confidence:
        determineConfidence(
          sources,
        ),

      grounded: true,

      generationMode:
        'DETERMINISTIC_EXTRACTIVE',

      provider:
        'LOCAL',

      model:
        null,

      fallbackUsed:
        false,

      citationCaseIds:
        sources.map(
          (source) =>
            source.caseId,
        ),

      limitations: [
        [
          'The answer was generated',
          'deterministically from lexical',
          'retrieval results.',
        ].join(' '),
      ],

      matchingCaseCount:
        ranked.length,

      returnedSourceCount:
        sources.length,

      filters,

      sources,

      generatedAt:
        new Date()
          .toISOString(),

      retrievalMethod:
        RETRIEVAL_METHOD,

      responsibleUse:
        RESPONSIBLE_USE,

      excludedData: [
        ...EXCLUDED_DATA,
      ],
    };
  }

  public getStatistics(): IntelligenceAssistantStatistics {
    const first =
      this.documents[0];

    const last =
      this.documents[
        this.documents.length - 1
      ];

    if (
      !first ||
      !last
    ) {
      throw new Error(
        'Assistant statistics are unavailable.',
      );
    }

    return {
      indexedCases:
        this.documents.length,

      indexedTerms:
        this.caseIdsByTerm.size,

      firstRegisteredDate:
        this.documents
          .map(
            (document) =>
              document.registeredDate,
          )
          .sort()[0] ??
        first.registeredDate,

      latestRegisteredDate:
        this.documents
          .map(
            (document) =>
              document.registeredDate,
          )
          .sort()
          .at(-1) ??
        last.registeredDate,

      sampleCaseId:
        first.caseId,

      sampleCrimeNumber:
        first.crimeNumber,

      sampleMajorCrimeHead:
        first.majorCrimeHead,
    };
  }

  private buildDocuments(): {
    documents:
      AssistantCaseDocument[];

    districts:
      LookupReference[];

    policeStations:
      PoliceStationReference[];

    majorCrimeHeads:
      LookupReference[];
  } {
    const districtNameById =
      new Map<number, string>();

    const policeStationById =
      new Map<
        number,
        PoliceStationReference
      >();

    const crimeHeadNameById =
      new Map<number, string>();

    const locationNameById =
      new Map<number, string>();

    const modusOperandiNameById =
      new Map<number, string>();

    const accusedNamesByCaseId =
      new Map<
        number,
        string[]
      >();

    const modusOperandiNamesByCaseId =
      new Map<
        number,
        string[]
      >();

    this.dataset
      .rawTables
      .District
      .forEach(
        (row) => {
          districtNameById.set(
            toPositiveInteger(
              row.DistrictID,
              'District.DistrictID',
            ),

            row.DistrictName.trim(),
          );
        },
      );

    this.dataset
      .rawTables
      .Unit
      .forEach(
        (row) => {
          const id =
            toPositiveInteger(
              row.UnitID,
              'Unit.UnitID',
            );

          policeStationById.set(
            id,

            {
              id,

              name:
                row.UnitName.trim(),

              districtId:
                toPositiveInteger(
                  row.DistrictID,
                  'Unit.DistrictID',
                ),
            },
          );
        },
      );

    this.dataset
      .rawTables
      .CrimeHead
      .forEach(
        (row) => {
          crimeHeadNameById.set(
            toPositiveInteger(
              row.CrimeHeadID,
              'CrimeHead.CrimeHeadID',
            ),

            row
              .CrimeGroupName
              .trim(),
          );
        },
      );

    this.dataset
      .rawTables
      .LocationMaster
      .forEach(
        (row) => {
          locationNameById.set(
            toPositiveInteger(
              row.LocationID,
              'LocationMaster.LocationID',
            ),

            row.LocationName.trim(),
          );
        },
      );

    this.dataset
      .rawTables
      .ModusOperandi
      .forEach(
        (row) => {
          modusOperandiNameById.set(
            toPositiveInteger(
              row.MOID,
              'ModusOperandi.MOID',
            ),

            row.MOName.trim(),
          );
        },
      );

    this.dataset
      .rawTables
      .Accused
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'Accused.CaseMasterID',
            );

          const names =
            accusedNamesByCaseId.get(
              caseId,
            ) ??
            [];

          const name =
            row.AccusedName.trim();

          if (name) {
            names.push(name);
          }

          accusedNamesByCaseId.set(
            caseId,
            names,
          );
        },
      );

    this.dataset
      .rawTables
      .CaseMOAssociation
      .forEach(
        (row) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,
              'CaseMOAssociation.CaseMasterID',
            );

          const modusOperandiId =
            toPositiveInteger(
              row.MOID,
              'CaseMOAssociation.MOID',
            );

          const name =
            modusOperandiNameById.get(
              modusOperandiId,
            );

          if (!name) {
            return;
          }

          const names =
            modusOperandiNamesByCaseId.get(
              caseId,
            ) ??
            [];

          if (
            !names.includes(name)
          ) {
            names.push(name);
          }

          modusOperandiNamesByCaseId.set(
            caseId,
            names,
          );
        },
      );

    const documents =
      this.dataset
        .rawTables
        .CaseMaster
        .map(
          (row) => {
            const caseId =
              toPositiveInteger(
                row.CaseMasterID,
                'CaseMaster.CaseMasterID',
              );

            const policeStationId =
              toPositiveInteger(
                row.PoliceStationID,
                'CaseMaster.PoliceStationID',
              );

            const policeStation =
              policeStationById.get(
                policeStationId,
              );

            if (!policeStation) {
              throw new Error(
                [
                  'Case',
                  caseId,
                  'references missing police station',
                  `${policeStationId}.`,
                ].join(' '),
              );
            }

            const district =
              districtNameById.get(
                policeStation.districtId,
              );

            if (!district) {
              throw new Error(
                [
                  'Case',
                  caseId,
                  'references missing district',
                  `${policeStation.districtId}.`,
                ].join(' '),
              );
            }

            const majorCrimeHeadId =
              toPositiveInteger(
                row.CrimeMajorHeadID,
                'CaseMaster.CrimeMajorHeadID',
              );

            const majorCrimeHead =
              crimeHeadNameById.get(
                majorCrimeHeadId,
              ) ??
              `Crime head ${majorCrimeHeadId}`;

            const locationId =
              toPositiveInteger(
                row.LocationID,
                'CaseMaster.LocationID',
              );

            const location =
              locationNameById.get(
                locationId,
              ) ??
              `Location ${locationId}`;

            const registeredDate =
              parseIsoDate(
                row.CrimeRegisteredDate,
              );

            if (!registeredDate) {
              throw new Error(
                [
                  'Case',
                  caseId,
                  'contains an invalid registration date.',
                ].join(' '),
              );
            }

            const crimeNumber =
              row.CrimeNo.trim();

            const caseNumber =
              row.CaseNo.trim();

            const briefFacts =
              row.BriefFacts.trim();

            const accusedNames =
              accusedNamesByCaseId.get(
                caseId,
              ) ??
              [];

            const modusOperandiNames =
              modusOperandiNamesByCaseId.get(
                caseId,
              ) ??
              [];

            const termFrequency =
              new Map<string, number>();

            incrementWeightedTerms(
              termFrequency,
              crimeNumber,
              12,
            );

            incrementWeightedTerms(
              termFrequency,
              caseNumber,
              8,
            );

            incrementWeightedTerms(
              termFrequency,
              district,
              6,
            );

            incrementWeightedTerms(
              termFrequency,
              policeStation.name,
              7,
            );

            incrementWeightedTerms(
              termFrequency,
              majorCrimeHead,
              8,
            );

            incrementWeightedTerms(
              termFrequency,
              location,
              6,
            );

            accusedNames.forEach(
              (name) => {
                incrementWeightedTerms(
                  termFrequency,
                  name,
                  7,
                );
              },
            );

            modusOperandiNames.forEach(
              (name) => {
                incrementWeightedTerms(
                  termFrequency,
                  name,
                  7,
                );
              },
            );

            incrementWeightedTerms(
              termFrequency,
              briefFacts,
              1,
            );

            const weightedLength =
              [
                ...termFrequency.values(),
              ].reduce(
                (
                  total,
                  value,
                ) =>
                  total + value,

                0,
              );

            return {
              caseId,

              crimeNumber,
              caseNumber,

              registeredDate,

              districtId:
                policeStation.districtId,

              district,

              policeStationId,

              policeStation:
                policeStation.name,

              majorCrimeHeadId,
              majorCrimeHead,

              location,

              briefFacts,

              accusedNames,
              modusOperandiNames,

              normalizedCrimeNumber:
                normalizeText(
                  crimeNumber,
                ),

              normalizedCaseNumber:
                normalizeText(
                  caseNumber,
                ),

              normalizedDistrict:
                normalizeText(
                  district,
                ),

              normalizedPoliceStation:
                normalizeText(
                  policeStation.name,
                ),

              normalizedMajorCrimeHead:
                normalizeText(
                  majorCrimeHead,
                ),

              normalizedLocation:
                normalizeText(
                  location,
                ),

              searchableText:
                normalizeText(
                  [
                    crimeNumber,
                    caseNumber,
                    district,
                    policeStation.name,
                    majorCrimeHead,
                    location,
                    ...accusedNames,
                    ...modusOperandiNames,
                    briefFacts,
                  ].join(' '),
                ),

              termFrequency,

              weightedLength:
                Math.max(
                  weightedLength,
                  1,
                ),
            };
          },
        );

    return {
      documents,

      districts: [
        ...districtNameById.entries(),
      ].map(
        ([
          id,
          name,
        ]) => ({
          id,
          name,
        }),
      ),

      policeStations: [
        ...policeStationById.values(),
      ],

      majorCrimeHeads: [
        ...crimeHeadNameById.entries(),
      ].map(
        ([
          id,
          name,
        ]) => ({
          id,
          name,
        }),
      ),
    };
  }
}

let assistantServicePromise:
  Promise<IntelligenceAssistantService> |
  null = null;

export function getIntelligenceAssistantService(): Promise<IntelligenceAssistantService> {
  if (!assistantServicePromise) {
    assistantServicePromise =
      getCoreDataset().then(
        (dataset) =>
          new IntelligenceAssistantService(
            dataset,
          ),
      );
  }

  return assistantServicePromise;
}
