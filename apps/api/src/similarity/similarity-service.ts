import type {
  CaseSimilarityAssessment,
  CaseSimilarityEvidenceAction,
  CaseSimilarityEvidenceReference,
  CaseSummary,
  SimilarCase,
  SimilarCasesQuery,
  SimilarCasesResponse,
} from '@kavach/shared-types';

import type {
  LoadedCoreDataset,
} from '../data/dataset-loader';

import {
  getCoreDataset,
} from '../data/dataset-service';

import type {
  CaseMasterRecord,
} from '../data/case-master-record';

import {
  CaseRepository,
  getCaseRepository,
} from '../cases/case-repository';

import {
  createCaseSimilarityAssessment,
  getActiveSimilarityFactorLabels,
  SIMILARITY_PERMITTED_USE,
  SIMILARITY_RULE_VERSION,
} from './similarity-engine';

import type {
  CaseSimilaritySignals,
} from './similarity-engine';

type RawTables =
  LoadedCoreDataset['rawTables'];

type AccusedRow =
  RawTables['Accused'][number];

type AccusedEntityLinkRow =
  RawTables[
    'AccusedEntityLink'
  ][number];

type CaseMOAssociationRow =
  RawTables[
    'CaseMOAssociation'
  ][number];

type ActSectionAssociationRow =
  RawTables[
    'ActSectionAssociation'
  ][number];

type CaseIdentifierLinkRow =
  RawTables[
    'CaseIdentifierLink'
  ][number];

type PersonIdentifierLinkRow =
  RawTables[
    'PersonIdentifierLink'
  ][number];

interface EvidencePointer {
  sourceTable: string;

  sourceRecordId: string;

  field: string | null;
}

interface SimilarityCaseProfile {
  caseId: number;

  caseRecord:
    CaseMasterRecord;

  caseSummary:
    CaseSummary;

  majorCrimeHeadId: number;
  minorCrimeHeadId: number;

  locationId: number;

  incidentHour:
    number | null;

  moIds:
    Set<number>;

  legalSectionKeys:
    Set<string>;

  entityIds:
    Set<number>;

  identifierIds:
    Set<number>;

  moEvidence:
    Map<
      number,
      EvidencePointer[]
    >;

  legalSectionEvidence:
    Map<
      string,
      EvidencePointer[]
    >;

  entityEvidence:
    Map<
      number,
      EvidencePointer[]
    >;

  identifierEvidence:
    Map<
      number,
      EvidencePointer[]
    >;
}

export interface SimilarityIndexStatistics {
  indexedCases: number;

  majorCrimeHeadBuckets:
    number;

  minorCrimeHeadBuckets:
    number;

  modusOperandiBuckets:
    number;

  legalSectionBuckets:
    number;

  entityBuckets:
    number;

  identifierBuckets:
    number;

  locationBuckets:
    number;

  cachedAssessments:
    number;
}

const ENTITY_CONFIDENCE_THRESHOLD =
  0.8;

const MO_CONFIDENCE_THRESHOLD =
  0.75;

const CASE_IDENTIFIER_THRESHOLD =
  0.7;

const PERSON_IDENTIFIER_THRESHOLD =
  0.8;

const DEFAULT_RESULT_LIMIT =
  10;

const MAXIMUM_RESULT_LIMIT =
  50;

const DEFAULT_MINIMUM_SCORE =
  20;

const LEGAL_SECTION_SEPARATOR =
  '\u001f';

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

function toConfidence(
  value: string,
  label: string,
): number {
  const cleaned =
    value.trim();

  const parsed =
    Number(cleaned);

  if (
    !cleaned ||
    !Number.isFinite(parsed) ||
    parsed < 0 ||
    parsed > 1
  ) {
    throw new Error(
      `${label} must be between 0 and 1.`,
    );
  }

  return parsed;
}

function addToSetMap<
  Key,
  Value,
>(
  map:
    Map<Key, Set<Value>>,

  key: Key,
  value: Value,
): void {
  const values =
    map.get(key) ??
    new Set<Value>();

  values.add(value);

  map.set(
    key,
    values,
  );
}

function addEvidencePointer<
  Key,
>(
  map:
    Map<
      Key,
      EvidencePointer[]
    >,

  key: Key,

  pointer:
    EvidencePointer,
): void {
  const pointers =
    map.get(key) ?? [];

  const alreadyPresent =
    pointers.some(
      (candidate) =>
        candidate.sourceTable ===
          pointer.sourceTable &&
        candidate.sourceRecordId ===
          pointer.sourceRecordId &&
        candidate.field ===
          pointer.field,
    );

  if (!alreadyPresent) {
    pointers.push(pointer);
  }

  map.set(
    key,
    pointers,
  );
}

function createLegalSectionKey(
  actId: string,
  sectionId: string,
): string {
  return [
    actId.trim(),
    sectionId.trim(),
  ].join(
    LEGAL_SECTION_SEPARATOR,
  );
}

function formatLegalSectionKey(
  key: string,
): string {
  const separatorIndex =
    key.indexOf(
      LEGAL_SECTION_SEPARATOR,
    );

  if (separatorIndex < 0) {
    return key;
  }

  const actId =
    key.slice(
      0,
      separatorIndex,
    );

  const sectionId =
    key.slice(
      separatorIndex + 1,
    );

  return `${actId} ${sectionId}`;
}

function readIncidentHour(
  value: string,
): number | null {
  const match =
    /(?:T|\s)(\d{2}):(\d{2})/.exec(
      value,
    );

  if (!match) {
    return null;
  }

  const hour =
    Number(match[1]);

  const minute =
    Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return (
    hour +
    minute / 60
  );
}

function calculateCircularHourDifference(
  first:
    number | null,

  second:
    number | null,
): number | null {
  if (
    first === null ||
    second === null
  ) {
    return null;
  }

  const absoluteDifference =
    Math.abs(
      first - second,
    );

  return Math.min(
    absoluteDifference,
    24 - absoluteDifference,
  );
}

function intersectValues<
  Value extends
    string |
    number,
>(
  first:
    ReadonlySet<Value>,

  second:
    ReadonlySet<Value>,
): Value[] {
  return [...first]
    .filter(
      (value) =>
        second.has(value),
    )
    .sort(
      (
        left,
        right,
      ) =>
        String(left).localeCompare(
          String(right),
          undefined,
          {
            numeric: true,
          },
        ),
    );
}

function deduplicateEvidence(
  references:
    readonly CaseSimilarityEvidenceReference[],
): CaseSimilarityEvidenceReference[] {
  const seen =
    new Set<string>();

  return references.filter(
    (reference) => {
      const key = [
        reference.sourceTable,
        reference.sourceRecordId,
        reference.field ?? '',
        reference.sourceCaseId,
        reference.candidateCaseId,
        reference.description,
      ].join('|');

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    },
  );
}

function createEvidenceReference(
  pointer:
    EvidencePointer,

  sourceCaseId:
    number,

  candidateCaseId:
    number,

  description:
    string,

  actions:
    readonly CaseSimilarityEvidenceAction[] =
      [],
): CaseSimilarityEvidenceReference {
  return {
    sourceTable:
      pointer.sourceTable,

    sourceRecordId:
      pointer.sourceRecordId,

    field:
      pointer.field,

    sourceCaseId,

    candidateCaseId,

    description,

    actions: [
      ...actions,
    ],
  };
}

function normalizeQuery(
  query:
    SimilarCasesQuery = {},
): Required<SimilarCasesQuery> {
  const limit =
    query.limit ??
    DEFAULT_RESULT_LIMIT;

  const minimumScore =
    query.minimumScore ??
    DEFAULT_MINIMUM_SCORE;

  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit >
      MAXIMUM_RESULT_LIMIT
  ) {
    throw new Error(
      [
        'limit must be a positive',
        `integer no greater than ${MAXIMUM_RESULT_LIMIT}.`,
      ].join(' '),
    );
  }

  if (
    typeof minimumScore !==
      'number' ||
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

  return {
    limit,
    minimumScore,
  };
}

function isVerifiedEntityLink(
  row:
    AccusedEntityLinkRow,
): boolean {
  return (
    row
      .ResolutionStatus
      .trim()
      .toLowerCase() ===
      'resolved' &&

    toConfidence(
      row.Confidence,

      'AccusedEntityLink.Confidence',
    ) >=
      ENTITY_CONFIDENCE_THRESHOLD
  );
}

export class CaseSimilarityService {
  private readonly profileByCaseId =
    new Map<
      number,
      SimilarityCaseProfile
    >();

  private readonly majorCrimeHeadIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly minorCrimeHeadIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly modusOperandiIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly legalSectionIndex =
    new Map<
      string,
      Set<number>
    >();

  private readonly entityIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly identifierIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly locationIndex =
    new Map<
      number,
      Set<number>
    >();

  private readonly assessmentCache =
    new Map<
      string,
      CaseSimilarityAssessment
    >();

  public readonly generatedAt:
    string;

  public constructor(
    private readonly dataset:
      LoadedCoreDataset,

    private readonly caseRepository:
      CaseRepository,
  ) {
    this.generatedAt =
      [
        dataset
          .manifest
          .date_range
          .end,

        'T23:59:59.000Z',
      ].join('');

    this.createBaseProfiles();

    this.indexLegalSections();

    this.indexModusOperandi();

    this.indexCanonicalEntities();

    this.indexIdentifiers();

    this.buildCandidateIndexes();
  }

  public findSimilarCases(
    sourceCaseId: number,

    query:
      SimilarCasesQuery = {},
  ): SimilarCasesResponse | null {
    if (
      !Number.isSafeInteger(
        sourceCaseId,
      ) ||
      sourceCaseId < 1
    ) {
      throw new Error(
        'sourceCaseId must be a positive integer.',
      );
    }

    const sourceProfile =
      this.profileByCaseId.get(
        sourceCaseId,
      );

    if (!sourceProfile) {
      return null;
    }

    const normalizedQuery =
      normalizeQuery(query);

    const candidateIds =
      this.collectCandidateIds(
        sourceProfile,
      );

    const results:
      SimilarCase[] = [];

    candidateIds.forEach(
      (candidateCaseId) => {
        const candidateProfile =
          this.profileByCaseId.get(
            candidateCaseId,
          );

        if (!candidateProfile) {
          return;
        }

        const assessment =
          this.assessProfiles(
            sourceProfile,
            candidateProfile,
          );

        if (
          assessment.similarityScore <
          normalizedQuery.minimumScore
        ) {
          return;
        }

        results.push({
          caseId:
            candidateCaseId,

          similarityScore:
            assessment
              .similarityScore,

          matchingFactors:
            getActiveSimilarityFactorLabels(
              assessment,
            ),

          factors:
            assessment.factors,

          caseSummary:
            candidateProfile
              .caseSummary,
        });
      },
    );

    results.sort(
      (
        left,
        right,
      ) =>
        right.similarityScore -
          left.similarityScore ||

        right
          .caseSummary
          .registeredDate
          .localeCompare(
            left
              .caseSummary
              .registeredDate,
          ) ||

        left.caseId -
          right.caseId,
    );

    return {
      sourceCaseId,

      sourceCase:
        sourceProfile.caseSummary,

      generatedAt:
        this.generatedAt,

      ruleVersion:
        SIMILARITY_RULE_VERSION,

      candidateCount:
        candidateIds.size,

      results:
        results.slice(
          0,
          normalizedQuery.limit,
        ),

      humanReviewRequired:
        true,

      permittedUse:
        SIMILARITY_PERMITTED_USE,
    };
  }

  public assessCasePair(
    sourceCaseId: number,

    candidateCaseId: number,
  ): CaseSimilarityAssessment | null {
    if (
      sourceCaseId ===
      candidateCaseId
    ) {
      throw new Error(
        'A case cannot be compared with itself.',
      );
    }

    const sourceProfile =
      this.profileByCaseId.get(
        sourceCaseId,
      );

    const candidateProfile =
      this.profileByCaseId.get(
        candidateCaseId,
      );

    if (
      !sourceProfile ||
      !candidateProfile
    ) {
      return null;
    }

    return this.assessProfiles(
      sourceProfile,
      candidateProfile,
    );
  }

  public getStatistics(): SimilarityIndexStatistics {
    return {
      indexedCases:
        this.profileByCaseId.size,

      majorCrimeHeadBuckets:
        this.majorCrimeHeadIndex.size,

      minorCrimeHeadBuckets:
        this.minorCrimeHeadIndex.size,

      modusOperandiBuckets:
        this.modusOperandiIndex.size,

      legalSectionBuckets:
        this.legalSectionIndex.size,

      entityBuckets:
        this.entityIndex.size,

      identifierBuckets:
        this.identifierIndex.size,

      locationBuckets:
        this.locationIndex.size,

      cachedAssessments:
        this.assessmentCache.size,
    };
  }

  private createBaseProfiles(): void {
    this.dataset.cases.forEach(
      (caseRecord) => {
        const caseSummary =
          this.caseRepository
            .findCaseSummaryById(
              caseRecord
                .caseMasterId,
            );

        if (!caseSummary) {
          throw new Error(
            [
              'Similarity index could not',
              'resolve summary for case',
              `${caseRecord.caseMasterId}.`,
            ].join(' '),
          );
        }

        this.profileByCaseId.set(
          caseRecord.caseMasterId,

          {
            caseId:
              caseRecord
                .caseMasterId,

            caseRecord,

            caseSummary,

            majorCrimeHeadId:
              caseRecord
                .crimeMajorHeadId,

            minorCrimeHeadId:
              caseRecord
                .crimeMinorHeadId,

            locationId:
              caseRecord.locationId,

            incidentHour:
              readIncidentHour(
                caseRecord
                  .incidentFromDate,
              ),

            moIds:
              new Set<number>(),

            legalSectionKeys:
              new Set<string>(),

            entityIds:
              new Set<number>(),

            identifierIds:
              new Set<number>(),

            moEvidence:
              new Map(),

            legalSectionEvidence:
              new Map(),

            entityEvidence:
              new Map(),

            identifierEvidence:
              new Map(),
          },
        );
      },
    );
  }

  private indexLegalSections(): void {
    this.dataset
      .rawTables
      .ActSectionAssociation
      .forEach(
        (
          row:
            ActSectionAssociationRow,
        ) => {
          const caseId =
            toPositiveInteger(
              row.CaseMasterID,

              'ActSectionAssociation.CaseMasterID',
            );

          const profile =
            this.profileByCaseId.get(
              caseId,
            );

          if (!profile) {
            throw new Error(
              `Legal section references missing case ${caseId}.`,
            );
          }

          const key =
            createLegalSectionKey(
              row.ActID,
              row.SectionID,
            );

          profile
            .legalSectionKeys
            .add(key);

          addEvidencePointer(
            profile
              .legalSectionEvidence,

            key,

            {
              sourceTable:
                'ActSectionAssociation',

              sourceRecordId: [
                caseId,
                row.ActID.trim(),
                row.SectionID.trim(),
              ].join(':'),

              field: null,
            },
          );
        },
      );
  }

  private indexModusOperandi(): void {
    this.dataset
      .rawTables
      .CaseMOAssociation
      .forEach(
        (
          row:
            CaseMOAssociationRow,
        ) => {
          const confidence =
            toConfidence(
              row.Confidence,

              'CaseMOAssociation.Confidence',
            );

          if (
            confidence <
            MO_CONFIDENCE_THRESHOLD
          ) {
            return;
          }

          const caseId =
            toPositiveInteger(
              row.CaseMasterID,

              'CaseMOAssociation.CaseMasterID',
            );

          const moId =
            toPositiveInteger(
              row.MOID,

              'CaseMOAssociation.MOID',
            );

          const profile =
            this.profileByCaseId.get(
              caseId,
            );

          if (!profile) {
            throw new Error(
              `MO association references missing case ${caseId}.`,
            );
          }

          profile.moIds.add(
            moId,
          );

          addEvidencePointer(
            profile.moEvidence,

            moId,

            {
              sourceTable:
                'CaseMOAssociation',

              sourceRecordId:
                `${caseId}:${moId}`,

              field:
                'Confidence',
            },
          );
        },
      );
  }

  private indexCanonicalEntities(): void {
    const accusedCaseById =
      new Map<number, number>();

    this.dataset
      .rawTables
      .Accused
      .forEach(
        (
          row:
            AccusedRow,
        ) => {
          accusedCaseById.set(
            toPositiveInteger(
              row.AccusedMasterID,

              'Accused.AccusedMasterID',
            ),

            toPositiveInteger(
              row.CaseMasterID,

              'Accused.CaseMasterID',
            ),
          );
        },
      );

    this.dataset
      .rawTables
      .AccusedEntityLink
      .forEach(
        (
          row:
            AccusedEntityLinkRow,
        ) => {
          if (
            !isVerifiedEntityLink(
              row,
            )
          ) {
            return;
          }

          const accusedId =
            toPositiveInteger(
              row.AccusedMasterID,

              'AccusedEntityLink.AccusedMasterID',
            );

          const caseId =
            accusedCaseById.get(
              accusedId,
            );

          if (
            caseId === undefined
          ) {
            throw new Error(
              [
                'AccusedEntityLink',
                'references missing accused',
                `${accusedId}.`,
              ].join(' '),
            );
          }

          const entityId =
            toPositiveInteger(
              row.EntityID,

              'AccusedEntityLink.EntityID',
            );

          const profile =
            this.profileByCaseId.get(
              caseId,
            );

          if (!profile) {
            throw new Error(
              `Entity link references missing case ${caseId}.`,
            );
          }

          profile.entityIds.add(
            entityId,
          );

          addEvidencePointer(
            profile.entityEvidence,

            entityId,

            {
              sourceTable:
                'AccusedEntityLink',

              sourceRecordId:
                `${accusedId}:${entityId}`,

              field:
                'Confidence',
            },
          );
        },
      );
  }

  private indexIdentifiers(): void {
    const personIdentifiers =
      new Map<
        number,
        Map<
          number,
          EvidencePointer[]
        >
      >();

    this.dataset
      .rawTables
      .PersonIdentifierLink
      .forEach(
        (
          row:
            PersonIdentifierLinkRow,
        ) => {
          const confidence =
            toConfidence(
              row.Confidence,

              'PersonIdentifierLink.Confidence',
            );

          if (
            confidence <
            PERSON_IDENTIFIER_THRESHOLD
          ) {
            return;
          }

          const entityId =
            toPositiveInteger(
              row.EntityID,

              'PersonIdentifierLink.EntityID',
            );

          const identifierId =
            toPositiveInteger(
              row.IdentifierID,

              'PersonIdentifierLink.IdentifierID',
            );

          const entityIdentifiers =
            personIdentifiers.get(
              entityId,
            ) ??
            new Map<
              number,
              EvidencePointer[]
            >();

          addEvidencePointer(
            entityIdentifiers,

            identifierId,

            {
              sourceTable:
                'PersonIdentifierLink',

              sourceRecordId:
                `${entityId}:${identifierId}`,

              field:
                'Confidence',
            },
          );

          personIdentifiers.set(
            entityId,
            entityIdentifiers,
          );
        },
      );

    this.dataset
      .rawTables
      .CaseIdentifierLink
      .forEach(
        (
          row:
            CaseIdentifierLinkRow,
        ) => {
          const confidence =
            toConfidence(
              row.Confidence,

              'CaseIdentifierLink.Confidence',
            );

          if (
            confidence <
            CASE_IDENTIFIER_THRESHOLD
          ) {
            return;
          }

          const caseId =
            toPositiveInteger(
              row.CaseMasterID,

              'CaseIdentifierLink.CaseMasterID',
            );

          const identifierId =
            toPositiveInteger(
              row.IdentifierID,

              'CaseIdentifierLink.IdentifierID',
            );

          const profile =
            this.profileByCaseId.get(
              caseId,
            );

          if (!profile) {
            throw new Error(
              `Identifier link references missing case ${caseId}.`,
            );
          }

          profile.identifierIds.add(
            identifierId,
          );

          addEvidencePointer(
            profile
              .identifierEvidence,

            identifierId,

            {
              sourceTable:
                'CaseIdentifierLink',

              sourceRecordId:
                `${caseId}:${identifierId}`,

              field:
                'Confidence',
            },
          );
        },
      );

    this.profileByCaseId.forEach(
      (profile) => {
        profile.entityIds.forEach(
          (entityId) => {
            const entityIdentifiers =
              personIdentifiers.get(
                entityId,
              );

            if (!entityIdentifiers) {
              return;
            }

            entityIdentifiers.forEach(
              (
                pointers,
                identifierId,
              ) => {
                profile.identifierIds.add(
                  identifierId,
                );

                pointers.forEach(
                  (pointer) => {
                    addEvidencePointer(
                      profile
                        .identifierEvidence,

                      identifierId,

                      pointer,
                    );
                  },
                );
              },
            );
          },
        );
      },
    );
  }

  private buildCandidateIndexes(): void {
    this.profileByCaseId.forEach(
      (profile) => {
        addToSetMap(
          this.majorCrimeHeadIndex,

          profile.majorCrimeHeadId,

          profile.caseId,
        );

        addToSetMap(
          this.minorCrimeHeadIndex,

          profile.minorCrimeHeadId,

          profile.caseId,
        );

        addToSetMap(
          this.locationIndex,

          profile.locationId,

          profile.caseId,
        );

        profile.moIds.forEach(
          (moId) => {
            addToSetMap(
              this.modusOperandiIndex,

              moId,

              profile.caseId,
            );
          },
        );

        profile
          .legalSectionKeys
          .forEach(
            (sectionKey) => {
              addToSetMap(
                this.legalSectionIndex,

                sectionKey,

                profile.caseId,
              );
            },
          );

        profile.entityIds.forEach(
          (entityId) => {
            addToSetMap(
              this.entityIndex,

              entityId,

              profile.caseId,
            );
          },
        );

        profile.identifierIds.forEach(
          (identifierId) => {
            addToSetMap(
              this.identifierIndex,

              identifierId,

              profile.caseId,
            );
          },
        );
      },
    );
  }

  private collectCandidateIds(
    sourceProfile:
      SimilarityCaseProfile,
  ): Set<number> {
    const candidates =
      new Set<number>();

    const addBucket = (
      bucket:
        ReadonlySet<number> |
        undefined,
    ): void => {
      bucket?.forEach(
        (caseId) => {
          if (
            caseId !==
            sourceProfile.caseId
          ) {
            candidates.add(
              caseId,
            );
          }
        },
      );
    };

    addBucket(
      this.minorCrimeHeadIndex.get(
        sourceProfile
          .minorCrimeHeadId,
      ),
    );

    addBucket(
      this.majorCrimeHeadIndex.get(
        sourceProfile
          .majorCrimeHeadId,
      ),
    );

    addBucket(
      this.locationIndex.get(
        sourceProfile.locationId,
      ),
    );

    sourceProfile.moIds.forEach(
      (moId) => {
        addBucket(
          this.modusOperandiIndex.get(
            moId,
          ),
        );
      },
    );

    sourceProfile
      .legalSectionKeys
      .forEach(
        (sectionKey) => {
          addBucket(
            this.legalSectionIndex.get(
              sectionKey,
            ),
          );
        },
      );

    sourceProfile.entityIds.forEach(
      (entityId) => {
        addBucket(
          this.entityIndex.get(
            entityId,
          ),
        );
      },
    );

    sourceProfile
      .identifierIds
      .forEach(
        (identifierId) => {
          addBucket(
            this.identifierIndex.get(
              identifierId,
            ),
          );
        },
      );

    return candidates;
  }

  private assessProfiles(
    source:
      SimilarityCaseProfile,

    candidate:
      SimilarityCaseProfile,
  ): CaseSimilarityAssessment {
    const cacheKey =
      `${source.caseId}:${candidate.caseId}`;

    const cached =
      this.assessmentCache.get(
        cacheKey,
      );

    if (cached) {
      return cached;
    }

    const sharedMOIds =
      intersectValues(
        source.moIds,
        candidate.moIds,
      );

    const sharedLegalSections =
      intersectValues(
        source.legalSectionKeys,
        candidate.legalSectionKeys,
      );

    const sharedEntityIds =
      intersectValues(
        source.entityIds,
        candidate.entityIds,
      );

    const sharedIdentifierIds =
      intersectValues(
        source.identifierIds,
        candidate.identifierIds,
      );

    const sameMinorCrimeHead =
      source.minorCrimeHeadId ===
      candidate.minorCrimeHeadId;

    const sameMajorCrimeHead =
      !sameMinorCrimeHead &&
      source.majorCrimeHeadId ===
        candidate.majorCrimeHeadId;

    const sameLocation =
      source.locationId ===
      candidate.locationId;

    const incidentHourDifference =
      calculateCircularHourDifference(
        source.incidentHour,
        candidate.incidentHour,
      );

    const signals:
      CaseSimilaritySignals = {
      sameMinorCrimeHead: {
        value:
          sameMinorCrimeHead,

        evidence:
          sameMinorCrimeHead
            ? [
                this.createCaseMasterEvidence(
                  source,
                  candidate,
                  'CrimeMinorHeadID',

                  [
                    'Both cases use minor',
                    'crime head',
                    `${source.minorCrimeHeadId}.`,
                  ].join(' '),
                ),
              ]
            : [],
      },

      sameMajorCrimeHead: {
        value:
          sameMajorCrimeHead,

        evidence:
          sameMajorCrimeHead
            ? [
                this.createCaseMasterEvidence(
                  source,
                  candidate,
                  'CrimeMajorHeadID',

                  [
                    'Both cases use major',
                    'crime head',
                    `${source.majorCrimeHeadId},`,
                    'while their minor crime',
                    'heads differ.',
                  ].join(' '),
                ),
              ]
            : [],
      },

      sharedModusOperandi: {
        count:
          sharedMOIds.length,

        evidence:
          this.createSharedEvidence(
            source,
            candidate,
            sharedMOIds,

            source.moEvidence,
            candidate.moEvidence,

            (moId) =>
              `Both cases have a confidence-qualified association to modus operandi ${moId}.`,
          ),
      },

      sharedLegalSections: {
        count:
          sharedLegalSections.length,

        evidence:
          this.createSharedEvidence(
            source,
            candidate,
            sharedLegalSections,

            source
              .legalSectionEvidence,

            candidate
              .legalSectionEvidence,

            (sectionKey) =>
              [
                'Both cases contain',
                'registered legal section',
                `${formatLegalSectionKey(
                  sectionKey,
                )}.`,
              ].join(' '),
          ),
      },

      sharedCanonicalEntities: {
        count:
          sharedEntityIds.length,

        evidence:
          this.createSharedEvidence(
            source,
            candidate,
            sharedEntityIds,

            source.entityEvidence,
            candidate.entityEvidence,

            (entityId) =>
              [
                'Both cases connect to',
                'verified canonical entity',
                `${entityId}.`,
              ].join(' '),

            (entityId) => [
              {
                type:
                  'OPEN_ENTITY_PROFILE',

                label:
                  'Open entity profile',

                entityId: entityId as number,
              },

              {
                type:
                  'OPEN_GRAPH',

                label:
                  'Explore entity graph',

                rootNodeId:
                  `PERSON:${entityId}`,

                title:
                  `Entity graph · Person ${entityId}`,
              },
            ],
          ),
      },

      sharedIdentifiers: {
        count:
          sharedIdentifierIds.length,

        evidence:
          this.createSharedEvidence(
            source,
            candidate,
            sharedIdentifierIds,

            source
              .identifierEvidence,

            candidate
              .identifierEvidence,

            (identifierId) =>
              [
                'Both cases or their',
                'verified entities connect',
                'to identifier',
                `${identifierId}.`,
              ].join(' '),

            (identifierId) => [
              {
                type:
                  'OPEN_GRAPH',

                label:
                  'Explore identifier graph',

                rootNodeId:
                  `IDENTIFIER:${identifierId}`,

                title:
                  `Identifier graph · ${identifierId}`,
              },
            ],
          ),
      },

      sameLocation: {
        value:
          sameLocation,

        evidence:
          sameLocation
            ? [
                this.createCaseMasterEvidence(
                  source,
                  candidate,
                  'LocationID',

                  [
                    'Both cases reference',
                    'location',
                    `${source.locationId}.`,
                  ].join(' '),

                  [
                    {
                      type:
                        'OPEN_GRAPH',

                      label:
                        'Explore location graph',

                      rootNodeId:
                        `LOCATION:${source.locationId}`,

                      title:
                        `Location graph · ${source.locationId}`,
                    },
                  ],
                ),
              ]
            : [],
      },

      similarIncidentTime: {
        hourDifference:
          incidentHourDifference,

        evidence:
          incidentHourDifference !==
            null &&
          incidentHourDifference <= 4
            ? [
                this.createCaseMasterEvidence(
                  source,
                  candidate,
                  'IncidentFromDate',

                  [
                    'Incident start times',
                    'differ by',
                    `${incidentHourDifference.toFixed(
                      2,
                    )} hours.`,
                  ].join(' '),
                ),
              ]
            : [],
      },
    };

    const assessment =
      createCaseSimilarityAssessment(
        source.caseId,
        candidate.caseId,
        signals,
      );

    this.assessmentCache.set(
      cacheKey,
      assessment,
    );

    return assessment;
  }

  private createCaseMasterEvidence(
    source:
      SimilarityCaseProfile,

    candidate:
      SimilarityCaseProfile,

    field: string,

    description:
      string,

    actions:
      readonly CaseSimilarityEvidenceAction[] =
        [],
  ): CaseSimilarityEvidenceReference {
    return {
      sourceTable:
        'CaseMaster',

      sourceRecordId:
        `${source.caseId}:${candidate.caseId}:${field}`,

      field,

      sourceCaseId:
        source.caseId,

      candidateCaseId:
        candidate.caseId,

      description,

      actions: [
        ...actions,
      ],
    };
  }

  private createSharedEvidence<
    Key extends
      string |
      number,
  >(
    source:
      SimilarityCaseProfile,

    candidate:
      SimilarityCaseProfile,

    sharedValues:
      readonly Key[],

    sourceEvidence:
      ReadonlyMap<
        Key,
        EvidencePointer[]
      >,

    candidateEvidence:
      ReadonlyMap<
        Key,
        EvidencePointer[]
      >,

    createDescription: (
      value: Key,
    ) => string,

    createActions: (
      value: Key,
    ) =>
      readonly CaseSimilarityEvidenceAction[] =
      () => [],
  ): CaseSimilarityEvidenceReference[] {
    const references:
      CaseSimilarityEvidenceReference[] =
      [];

    sharedValues.forEach(
      (value) => {
        const description =
          createDescription(value);

        const actions =
          createActions(value);

        (
          sourceEvidence.get(
            value,
          ) ?? []
        ).forEach(
          (pointer) => {
            references.push(
              createEvidenceReference(
                pointer,

                source.caseId,
                candidate.caseId,

                [
                  'Source case:',
                  description,
                ].join(' '),

                actions,
              ),
            );
          },
        );

        (
          candidateEvidence.get(
            value,
          ) ?? []
        ).forEach(
          (pointer) => {
            references.push(
              createEvidenceReference(
                pointer,

                source.caseId,
                candidate.caseId,

                [
                  'Candidate case:',
                  description,
                ].join(' '),

                actions,
              ),
            );
          },
        );
      },
    );

    return deduplicateEvidence(
      references,
    );
  }
}

let similarityServicePromise:
  Promise<CaseSimilarityService> |
  null = null;

export function getCaseSimilarityService(): Promise<CaseSimilarityService> {
  if (!similarityServicePromise) {
    similarityServicePromise =
      Promise.all([
        getCoreDataset(),
        getCaseRepository(),
      ]).then(
        ([
          dataset,
          caseRepository,
        ]) =>
          new CaseSimilarityService(
            dataset,
            caseRepository,
          ),
      );
  }

  return similarityServicePromise;
}

export function clearCaseSimilarityServiceCache(): void {
  similarityServicePromise = null;
}
