import type {
  CasePriorityAssessment,
  CasePriorityEvidenceReference,
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
  createCasePriorityAssessment,
} from './priority-engine';

import type {
  CasePrioritySignals,
} from './priority-engine';

type RawTables =
  LoadedCoreDataset['rawTables'];

type AccusedRow =
  RawTables['Accused'][number];

type AccusedEntityLinkRow =
  RawTables[
    'AccusedEntityLink'
  ][number];

type CaseIdentifierLinkRow =
  RawTables[
    'CaseIdentifierLink'
  ][number];

type PersonIdentifierLinkRow =
  RawTables[
    'PersonIdentifierLink'
  ][number];

type CaseMOAssociationRow =
  RawTables[
    'CaseMOAssociation'
  ][number];

type KnownAssociationRow =
  RawTables[
    'KnownAssociation'
  ][number];

interface EntityCaseResolution {
  accusedId: number;
  caseId: number;
  entityId: number;

  resolutionStatus: string;

  confidence: number;

  sourceRecordId: string;
}

interface CaseIdentifierResolution {
  caseId: number;
  identifierId: number;

  relationshipType: string;

  confidence: number;

  sourceRecordId: string;
}

interface EntityIdentifierResolution {
  entityId: number;
  identifierId: number;

  relationshipType: string;

  confidence: number;

  sourceRecordId: string;
}

interface CaseMOResolution {
  caseId: number;
  moId: number;

  associationType: string;

  confidence: number;

  sourceRecordId: string;
}

const ENTITY_RESOLUTION_THRESHOLD =
  0.8;

const IDENTIFIER_LINK_THRESHOLD =
  0.7;

const MO_LINK_THRESHOLD =
  0.75;

const NETWORK_BRIDGE_THRESHOLD =
  0.8;

const RECENT_WINDOW_MONTHS =
  24;

function toInteger(
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
    !Number.isSafeInteger(
      parsed,
    ) ||
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

function addToGroupedMap<
  Key,
  Value,
>(
  map:
    Map<Key, Value[]>,

  key: Key,
  value: Value,
): void {
  const values =
    map.get(key) ?? [];

  values.push(value);

  map.set(
    key,
    values,
  );
}

function createUtcDate(
  dateValue: string,
): Date {
  const parsed =
    new Date(
      `${dateValue}T00:00:00.000Z`,
    );

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    throw new Error(
      `Invalid ISO date: ${dateValue}`,
    );
  }

  return parsed;
}

function subtractUtcMonths(
  value: Date,
  months: number,
): Date {
  const result =
    new Date(value);

  result.setUTCMonth(
    result.getUTCMonth() -
      months,
  );

  return result;
}

function normalizeGravity(
  value: string,
):
  | 'MINOR'
  | 'SERIOUS'
  | 'HEINOUS'
  | 'UNKNOWN' {
  const normalized =
    value
      .trim()
      .toUpperCase();

  if (
    normalized === 'MINOR'
  ) {
    return 'MINOR';
  }

  if (
    normalized === 'SERIOUS'
  ) {
    return 'SERIOUS';
  }

  if (
    normalized === 'HEINOUS'
  ) {
    return 'HEINOUS';
  }

  return 'UNKNOWN';
}

function isClosedStatus(
  value: string,
): boolean {
  return value
    .trim()
    .toLowerCase()
    .startsWith('closed');
}

function evidence(
  sourceTable: string,
  sourceRecordId: string,

  caseId:
    number | null,

  description: string,

  field:
    string | null = null,
): CasePriorityEvidenceReference {
  return {
    sourceTable,
    sourceRecordId,
    field,
    caseId,
    description,
  };
}

function deduplicateEvidence(
  references:
    readonly CasePriorityEvidenceReference[],
): CasePriorityEvidenceReference[] {
  const seen =
    new Set<string>();

  return references.filter(
    (reference) => {
      const key = [
        reference.sourceTable,
        reference.sourceRecordId,
        reference.field ?? '',
        reference.caseId ?? '',
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

export class CasePriorityService {
  private readonly caseById =
    new Map<
      number,
      CaseMasterRecord
    >();

  private readonly gravityNameById =
    new Map<number, string>();

  private readonly statusNameById =
    new Map<number, string>();

  private readonly entityResolutionsByCase =
    new Map<
      number,
      EntityCaseResolution[]
    >();

  private readonly entityResolutionsByEntity =
    new Map<
      number,
      EntityCaseResolution[]
    >();

  private readonly caseIdentifierLinksByCase =
    new Map<
      number,
      CaseIdentifierResolution[]
    >();

  private readonly caseIdentifierLinksByIdentifier =
    new Map<
      number,
      CaseIdentifierResolution[]
    >();

  private readonly entityIdentifierLinksByEntity =
    new Map<
      number,
      EntityIdentifierResolution[]
    >();

  private readonly caseMOLinksByCase =
    new Map<
      number,
      CaseMOResolution[]
    >();

  private readonly caseMOLinksByMO =
    new Map<
      number,
      CaseMOResolution[]
    >();

  private readonly associationsByEntity =
    new Map<
      number,
      KnownAssociationRow[]
    >();

  private readonly recentCutoffDate:
    Date;

  public readonly assessedAt:
    string;

  public constructor(
    private readonly dataset:
      LoadedCoreDataset,
  ) {
    const tables =
      dataset.rawTables;

    dataset.cases.forEach(
      (caseRecord) => {
        this.caseById.set(
          caseRecord.caseMasterId,
          caseRecord,
        );
      },
    );

    tables.GravityOffence.forEach(
      (row) => {
        this.gravityNameById.set(
          toInteger(
            row.GravityOffenceID,

            'GravityOffence.GravityOffenceID',
          ),

          row.LookupValue.trim(),
        );
      },
    );

    tables.CaseStatusMaster.forEach(
      (row) => {
        this.statusNameById.set(
          toInteger(
            row.CaseStatusID,

            'CaseStatusMaster.CaseStatusID',
          ),

          row.CaseStatusName.trim(),
        );
      },
    );

    const accusedCaseById =
      new Map<number, number>();

    tables.Accused.forEach(
      (row: AccusedRow) => {
        accusedCaseById.set(
          toInteger(
            row.AccusedMasterID,

            'Accused.AccusedMasterID',
          ),

          toInteger(
            row.CaseMasterID,

            'Accused.CaseMasterID',
          ),
        );
      },
    );

    tables.AccusedEntityLink.forEach(
      (
        row:
          AccusedEntityLinkRow,
      ) => {
        const accusedId =
          toInteger(
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
            `AccusedEntityLink references missing accused ${accusedId}.`,
          );
        }

        const entityId =
          toInteger(
            row.EntityID,

            'AccusedEntityLink.EntityID',
          );

        const resolution:
          EntityCaseResolution = {
          accusedId,
          caseId,
          entityId,

          resolutionStatus:
            row
              .ResolutionStatus
              .trim(),

          confidence:
            toConfidence(
              row.Confidence,

              'AccusedEntityLink.Confidence',
            ),

          sourceRecordId:
            `${accusedId}:${entityId}`,
        };

        addToGroupedMap(
          this
            .entityResolutionsByCase,

          caseId,
          resolution,
        );

        addToGroupedMap(
          this
            .entityResolutionsByEntity,

          entityId,
          resolution,
        );
      },
    );

    tables.CaseIdentifierLink.forEach(
      (
        row:
          CaseIdentifierLinkRow,
      ) => {
        const caseId =
          toInteger(
            row.CaseMasterID,

            'CaseIdentifierLink.CaseMasterID',
          );

        const identifierId =
          toInteger(
            row.IdentifierID,

            'CaseIdentifierLink.IdentifierID',
          );

        const link:
          CaseIdentifierResolution = {
          caseId,
          identifierId,

          relationshipType:
            row
              .RelationshipType
              .trim(),

          confidence:
            toConfidence(
              row.Confidence,

              'CaseIdentifierLink.Confidence',
            ),

          sourceRecordId:
            `${caseId}:${identifierId}`,
        };

        addToGroupedMap(
          this
            .caseIdentifierLinksByCase,

          caseId,
          link,
        );

        addToGroupedMap(
          this
            .caseIdentifierLinksByIdentifier,

          identifierId,
          link,
        );
      },
    );

    tables.PersonIdentifierLink.forEach(
      (
        row:
          PersonIdentifierLinkRow,
      ) => {
        const entityId =
          toInteger(
            row.EntityID,

            'PersonIdentifierLink.EntityID',
          );

        const identifierId =
          toInteger(
            row.IdentifierID,

            'PersonIdentifierLink.IdentifierID',
          );

        addToGroupedMap(
          this
            .entityIdentifierLinksByEntity,

          entityId,

          {
            entityId,
            identifierId,

            relationshipType:
              row
                .RelationshipType
                .trim(),

            confidence:
              toConfidence(
                row.Confidence,

                'PersonIdentifierLink.Confidence',
              ),

            sourceRecordId:
              `${entityId}:${identifierId}`,
          },
        );
      },
    );

    tables.CaseMOAssociation.forEach(
      (
        row:
          CaseMOAssociationRow,
      ) => {
        const caseId =
          toInteger(
            row.CaseMasterID,

            'CaseMOAssociation.CaseMasterID',
          );

        const moId =
          toInteger(
            row.MOID,

            'CaseMOAssociation.MOID',
          );

        const link:
          CaseMOResolution = {
          caseId,
          moId,

          associationType:
            row
              .AssociationType
              .trim(),

          confidence:
            toConfidence(
              row.Confidence,

              'CaseMOAssociation.Confidence',
            ),

          sourceRecordId:
            `${caseId}:${moId}`,
        };

        addToGroupedMap(
          this.caseMOLinksByCase,

          caseId,
          link,
        );

        addToGroupedMap(
          this.caseMOLinksByMO,

          moId,
          link,
        );
      },
    );

    tables.KnownAssociation.forEach(
      (
        row:
          KnownAssociationRow,
      ) => {
        const firstEntityId =
          toInteger(
            row.EntityID1,

            'KnownAssociation.EntityID1',
          );

        const secondEntityId =
          toInteger(
            row.EntityID2,

            'KnownAssociation.EntityID2',
          );

        addToGroupedMap(
          this
            .associationsByEntity,

          firstEntityId,
          row,
        );

        addToGroupedMap(
          this
            .associationsByEntity,

          secondEntityId,
          row,
        );
      },
    );

    const datasetEnd =
      createUtcDate(
        dataset
          .manifest
          .date_range
          .end,
      );

    this.recentCutoffDate =
      subtractUtcMonths(
        datasetEnd,

        RECENT_WINDOW_MONTHS,
      );

    this.assessedAt =
      `${dataset.manifest.date_range.end}T23:59:59.000Z`;
  }

  public assessCase(
    caseId: number,
  ): CasePriorityAssessment | null {
    const caseRecord =
      this.caseById.get(caseId);

    if (!caseRecord) {
      return null;
    }

    return createCasePriorityAssessment(
      caseId,

      this.assessedAt,

      this.createSignals(
        caseRecord,
      ),
    );
  }

  public assessAll():
  CasePriorityAssessment[] {
    return this.dataset.cases.map(
      (caseRecord) =>
        createCasePriorityAssessment(
          caseRecord.caseMasterId,

          this.assessedAt,

          this.createSignals(
            caseRecord,
          ),
        ),
    );
  }

  private isRecentCase(
    caseRecord:
      CaseMasterRecord,
  ): boolean {
    return (
      createUtcDate(
        caseRecord
          .crimeRegisteredDate,
      ).getTime() >=
      this
        .recentCutoffDate
        .getTime()
    );
  }

  private isVerifiedResolution(
    resolution:
      EntityCaseResolution,
  ): boolean {
    return (
      resolution
        .resolutionStatus
        .trim()
        .toLowerCase() ===
        'resolved' &&

      resolution.confidence >=
        ENTITY_RESOLUTION_THRESHOLD
    );
  }

  private getVerifiedCurrentResolutions(
    caseId: number,
  ): EntityCaseResolution[] {
    return (
      this
        .entityResolutionsByCase
        .get(caseId) ?? []
    ).filter(
      (resolution) =>
        this.isVerifiedResolution(
          resolution,
        ),
    );
  }

  private getVerifiedRecentLinkedCaseIds(
    caseId: number,

    currentResolutions:
      readonly EntityCaseResolution[],
  ): Set<number> {
    const linkedCaseIds =
      new Set<number>();

    currentResolutions.forEach(
      (currentResolution) => {
        const entityHistory =
          this
            .entityResolutionsByEntity
            .get(
              currentResolution
                .entityId,
            ) ?? [];

        entityHistory.forEach(
          (linkedResolution) => {
            if (
              linkedResolution.caseId ===
                caseId ||

              !this.isVerifiedResolution(
                linkedResolution,
              )
            ) {
              return;
            }

            const linkedCase =
              this.caseById.get(
                linkedResolution
                  .caseId,
              );

            if (
              linkedCase &&
              this.isRecentCase(
                linkedCase,
              )
            ) {
              linkedCaseIds.add(
                linkedCase
                  .caseMasterId,
              );
            }
          },
        );
      },
    );

    return linkedCaseIds;
  }

  private createSignals(
    caseRecord:
      CaseMasterRecord,
  ): CasePrioritySignals {
    const caseId =
      caseRecord.caseMasterId;

    const currentResolutions =
      this
        .getVerifiedCurrentResolutions(
          caseId,
        );

    const currentEntityIds =
      new Set(
        currentResolutions.map(
          (resolution) =>
            resolution.entityId,
        ),
      );

    const linkedRecentCaseIds =
      this
        .getVerifiedRecentLinkedCaseIds(
          caseId,
          currentResolutions,
        );

    return {
      verifiedRecentCases:
        this.createRecentCasesSignal(
          linkedRecentCaseIds,
          currentResolutions,
        ),

      verifiedSharedIdentifiers:
        this.createSharedIdentifierSignal(
          caseId,
          currentEntityIds,
        ),

      highGravityRecentCase:
        this.createGravitySignal(
          caseRecord,
        ),

      repeatedModusOperandi:
        this.createRepeatedMOSignal(
          caseId,
          linkedRecentCaseIds,
        ),

      highConfidenceNetworkBridges:
        this.createNetworkBridgeSignal(
          caseId,
          currentEntityIds,
        ),

      unresolvedRecentCaseCluster:
        this.createUnresolvedClusterSignal(
          linkedRecentCaseIds,
        ),

      strongIdentityConflicts:
        this.createIdentityConflictSignal(
          caseId,
        ),
    };
  }

  private createRecentCasesSignal(
    linkedCaseIds:
      ReadonlySet<number>,

    currentResolutions:
      readonly EntityCaseResolution[],
  ) {
    const evidenceReferences:
      CasePriorityEvidenceReference[] =
      [];

    [...linkedCaseIds]
      .sort(
        (
          left,
          right,
        ) =>
          left - right,
      )
      .forEach(
        (linkedCaseId) => {
          const linkingResolution =
            currentResolutions.find(
              (
                currentResolution,
              ) =>
                (
                  this
                    .entityResolutionsByEntity
                    .get(
                      currentResolution
                        .entityId,
                    ) ?? []
                ).some(
                  (
                    linkedResolution,
                  ) =>
                    linkedResolution
                      .caseId ===
                      linkedCaseId &&

                    this
                      .isVerifiedResolution(
                        linkedResolution,
                      ),
                ),
            );

          evidenceReferences.push(
            evidence(
              'CaseMaster',

              String(
                linkedCaseId,
              ),

              linkedCaseId,

              linkingResolution
                ? `Recent case ${linkedCaseId} shares verified canonical entity ${linkingResolution.entityId}.`
                : `Recent case ${linkedCaseId} shares a verified canonical entity.`,

              'CrimeRegisteredDate',
            ),
          );
        },
      );

    return {
      count:
        linkedCaseIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }

  private createSharedIdentifierSignal(
    caseId: number,

    currentEntityIds:
      ReadonlySet<number>,
  ) {
    const candidateIdentifierIds =
      new Set<number>();

    const evidenceByIdentifier =
      new Map<
        number,
        CasePriorityEvidenceReference[]
      >();

    const addCandidate = (
      identifierId: number,

      reference:
        CasePriorityEvidenceReference,
    ) => {
      candidateIdentifierIds.add(
        identifierId,
      );

      const references =
        evidenceByIdentifier.get(
          identifierId,
        ) ?? [];

      references.push(reference);

      evidenceByIdentifier.set(
        identifierId,
        references,
      );
    };

    (
      this
        .caseIdentifierLinksByCase
        .get(caseId) ?? []
    )
      .filter(
        (link) =>
          link.confidence >=
          IDENTIFIER_LINK_THRESHOLD,
      )
      .forEach(
        (link) => {
          addCandidate(
            link.identifierId,

            evidence(
              'CaseIdentifierLink',

              link.sourceRecordId,

              caseId,

              `Identifier ${link.identifierId} is directly linked to case ${caseId} at confidence ${link.confidence.toFixed(3)}.`,

              'Confidence',
            ),
          );
        },
      );

    currentEntityIds.forEach(
      (entityId) => {
        (
          this
            .entityIdentifierLinksByEntity
            .get(entityId) ?? []
        )
          .filter(
            (link) =>
              link.confidence >=
              ENTITY_RESOLUTION_THRESHOLD,
          )
          .forEach(
            (link) => {
              addCandidate(
                link.identifierId,

                evidence(
                  'PersonIdentifierLink',

                  link.sourceRecordId,

                  caseId,

                  `Identifier ${link.identifierId} is linked to resolved entity ${entityId} at confidence ${link.confidence.toFixed(3)}.`,

                  'Confidence',
                ),
              );
            },
          );
      },
    );

    const sharedIdentifierIds =
      new Set<number>();

    candidateIdentifierIds.forEach(
      (identifierId) => {
        const otherCaseLinks =
          (
            this
              .caseIdentifierLinksByIdentifier
              .get(
                identifierId,
              ) ?? []
          ).filter(
            (link) =>
              link.caseId !==
                caseId &&

              link.confidence >=
                IDENTIFIER_LINK_THRESHOLD,
          );

        if (
          otherCaseLinks.length === 0
        ) {
          return;
        }

        sharedIdentifierIds.add(
          identifierId,
        );

        const references =
          evidenceByIdentifier.get(
            identifierId,
          ) ?? [];

        otherCaseLinks.forEach(
          (link) => {
            references.push(
              evidence(
                'CaseIdentifierLink',

                link.sourceRecordId,

                link.caseId,

                `The same identifier ${identifierId} is linked to case ${link.caseId} at confidence ${link.confidence.toFixed(3)}.`,

                'Confidence',
              ),
            );
          },
        );

        evidenceByIdentifier.set(
          identifierId,
          references,
        );
      },
    );

    const evidenceReferences =
      [...sharedIdentifierIds]
        .sort(
          (
            left,
            right,
          ) =>
            left - right,
        )
        .flatMap(
          (identifierId) =>
            evidenceByIdentifier.get(
              identifierId,
            ) ?? [],
        );

    return {
      count:
        sharedIdentifierIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }

  private createGravitySignal(
    caseRecord:
      CaseMasterRecord,
  ) {
    const gravityName =
      this.gravityNameById.get(
        caseRecord
          .gravityOffenceId,
      ) ?? 'Unknown';

    const gravity =
      normalizeGravity(
        gravityName,
      );

    const recent =
      this.isRecentCase(
        caseRecord,
      );

    const evidenceReferences =
      gravity === 'SERIOUS' ||
      gravity === 'HEINOUS'
        ? [
            evidence(
              'CaseMaster',

              String(
                caseRecord
                  .caseMasterId,
              ),

              caseRecord
                .caseMasterId,

              `Case gravity is ${gravityName}; registered on ${caseRecord.crimeRegisteredDate}.`,

              'GravityOffenceID',
            ),
          ]
        : [];

    return {
      gravity,
      recent,

      evidence:
        evidenceReferences,
    };
  }

  private createRepeatedMOSignal(
    caseId: number,

    linkedRecentCaseIds:
      ReadonlySet<number>,
  ) {
    const currentMOLinks =
      (
        this
          .caseMOLinksByCase
          .get(caseId) ?? []
      ).filter(
        (link) =>
          link.confidence >=
          MO_LINK_THRESHOLD,
      );

    const repeatedCaseIds =
      new Set<number>();

    const evidenceReferences:
      CasePriorityEvidenceReference[] =
      [];

    currentMOLinks.forEach(
      (currentLink) => {
        const matchingLinks =
          this
            .caseMOLinksByMO
            .get(
              currentLink.moId,
            ) ?? [];

        matchingLinks.forEach(
          (matchingLink) => {
            if (
              matchingLink.caseId ===
                caseId ||

              matchingLink.confidence <
                MO_LINK_THRESHOLD ||

              !linkedRecentCaseIds.has(
                matchingLink.caseId,
              )
            ) {
              return;
            }

            repeatedCaseIds.add(
              matchingLink.caseId,
            );

            evidenceReferences.push(
              evidence(
                'CaseMOAssociation',

                currentLink
                  .sourceRecordId,

                caseId,

                `Current case uses MO ${currentLink.moId} at confidence ${currentLink.confidence.toFixed(3)}.`,

                'Confidence',
              ),

              evidence(
                'CaseMOAssociation',

                matchingLink
                  .sourceRecordId,

                matchingLink.caseId,

                `Entity-linked recent case ${matchingLink.caseId} uses the same MO ${matchingLink.moId} at confidence ${matchingLink.confidence.toFixed(3)}.`,

                'Confidence',
              ),
            );
          },
        );
      },
    );

    return {
      count:
        repeatedCaseIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }

  private createNetworkBridgeSignal(
    caseId: number,

    currentEntityIds:
      ReadonlySet<number>,
  ) {
    const qualifyingAssociationIds =
      new Set<number>();

    const evidenceReferences:
      CasePriorityEvidenceReference[] =
      [];

    currentEntityIds.forEach(
      (entityId) => {
        const associations =
          this
            .associationsByEntity
            .get(entityId) ?? [];

        associations.forEach(
          (row) => {
            const confidence =
              toConfidence(
                row.Confidence,

                'KnownAssociation.Confidence',
              );

            if (
              confidence <
              NETWORK_BRIDGE_THRESHOLD
            ) {
              return;
            }

            const associationId =
              toInteger(
                row.AssociationID,

                'KnownAssociation.AssociationID',
              );

            const firstEntityId =
              toInteger(
                row.EntityID1,

                'KnownAssociation.EntityID1',
              );

            const secondEntityId =
              toInteger(
                row.EntityID2,

                'KnownAssociation.EntityID2',
              );

            const associateEntityId =
              firstEntityId ===
              entityId
                ? secondEntityId
                : firstEntityId;

            const associateHasCaseHistory =
              (
                this
                  .entityResolutionsByEntity
                  .get(
                    associateEntityId,
                  ) ?? []
              ).some(
                (resolution) => {
                  if (
                    resolution.caseId ===
                      caseId ||

                    !this
                      .isVerifiedResolution(
                        resolution,
                      )
                  ) {
                    return false;
                  }

                  const linkedCase =
                    this.caseById.get(
                      resolution.caseId,
                    );

                  return Boolean(
                    linkedCase &&
                    this.isRecentCase(
                      linkedCase,
                    ),
                  );
                },
              );

            if (
              !associateHasCaseHistory
            ) {
              return;
            }

            qualifyingAssociationIds.add(
              associationId,
            );

            evidenceReferences.push(
              evidence(
                'KnownAssociation',

                String(
                  associationId,
                ),

                caseId,

                `Resolved entity ${entityId} connects to entity ${associateEntityId} through ${row.RelationshipType.trim()} at confidence ${confidence.toFixed(3)}; the associated entity has verified recent case history.`,

                'Confidence',
              ),
            );
          },
        );
      },
    );

    return {
      count:
        qualifyingAssociationIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }

  private createUnresolvedClusterSignal(
    linkedRecentCaseIds:
      ReadonlySet<number>,
  ) {
    const unresolvedCaseIds =
      new Set<number>();

    const evidenceReferences:
      CasePriorityEvidenceReference[] =
      [];

    linkedRecentCaseIds.forEach(
      (linkedCaseId) => {
        const linkedCase =
          this.caseById.get(
            linkedCaseId,
          );

        if (!linkedCase) {
          return;
        }

        const statusName =
          this.statusNameById.get(
            linkedCase
              .caseStatusId,
          ) ?? 'Unknown';

        if (
          isClosedStatus(
            statusName,
          )
        ) {
          return;
        }

        unresolvedCaseIds.add(
          linkedCaseId,
        );

        evidenceReferences.push(
          evidence(
            'CaseMaster',

            String(
              linkedCaseId,
            ),

            linkedCaseId,

            `Recent linked case ${linkedCaseId} remains in status ${statusName}.`,

            'CaseStatusID',
          ),
        );
      },
    );

    return {
      count:
        unresolvedCaseIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }

  private createIdentityConflictSignal(
    caseId: number,
  ) {
    const resolutions =
      this
        .entityResolutionsByCase
        .get(caseId) ?? [];

    const conflictingAccusedIds =
      new Set<number>();

    const evidenceReferences:
      CasePriorityEvidenceReference[] =
      [];

    const resolutionsByAccused =
      new Map<
        number,
        EntityCaseResolution[]
      >();

    resolutions.forEach(
      (resolution) => {
        addToGroupedMap(
          resolutionsByAccused,

          resolution.accusedId,
          resolution,
        );
      },
    );

    resolutionsByAccused.forEach(
      (
        accusedResolutions,
        accusedId,
      ) => {
        const distinctEntityIds =
          new Set(
            accusedResolutions.map(
              (resolution) =>
                resolution.entityId,
            ),
          );

        const hasConflict =
          distinctEntityIds.size > 1 ||

          accusedResolutions.some(
            (resolution) =>
              !this
                .isVerifiedResolution(
                  resolution,
                ),
          );

        if (!hasConflict) {
          return;
        }

        conflictingAccusedIds.add(
          accusedId,
        );

        accusedResolutions.forEach(
          (resolution) => {
            evidenceReferences.push(
              evidence(
                'AccusedEntityLink',

                resolution
                  .sourceRecordId,

                caseId,

                `Accused ${accusedId} has entity link ${resolution.entityId} with status ${resolution.resolutionStatus} and confidence ${resolution.confidence.toFixed(3)}.`,

                'Confidence',
              ),
            );
          },
        );
      },
    );

    return {
      count:
        conflictingAccusedIds.size,

      evidence:
        deduplicateEvidence(
          evidenceReferences,
        ),
    };
  }
}

let priorityServicePromise:
  Promise<CasePriorityService> |
  null = null;

export function getCasePriorityService(): Promise<CasePriorityService> {
  if (!priorityServicePromise) {
    priorityServicePromise =
      getCoreDataset().then(
        (dataset) =>
          new CasePriorityService(
            dataset,
          ),
      );
  }

  return priorityServicePromise;
}

export function clearCasePriorityServiceCache(): void {
  priorityServicePromise = null;
}
