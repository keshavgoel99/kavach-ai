import type { DatasetTableName } from './tables';

export type RelationshipCardinality =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-one'
  | 'many-to-many';

export interface SchemaRelationship {
  readonly parentTable: DatasetTableName;
  readonly parentColumn: string;
  readonly childTable: DatasetTableName;
  readonly childColumn: string;
  readonly cardinality: RelationshipCardinality;
  readonly description: string;
}

export const CORE_RELATIONSHIPS = [
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'Victim',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description: 'One case may contain multiple victims.',
  },
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'Accused',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description: 'One case may contain multiple accused records.',
  },
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'ComplainantDetails',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description: 'One case may contain multiple complainants.',
  },
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'ActSectionAssociation',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description: 'One case may invoke multiple act-section pairs.',
  },
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'ArrestSurrender',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description:
      'One case may contain multiple arrest or surrender events.',
  },
  {
    parentTable: 'CaseMaster',
    parentColumn: 'CaseMasterID',
    childTable: 'ChargesheetDetails',
    childColumn: 'CaseMasterID',
    cardinality: 'one-to-many',
    description: 'One case may contain chargesheet records.',
  },
  {
    parentTable: 'CaseCategory',
    parentColumn: 'CaseCategoryID',
    childTable: 'CaseMaster',
    childColumn: 'CaseCategoryID',
    cardinality: 'one-to-many',
    description: 'Many cases may share one case category.',
  },
  {
    parentTable: 'GravityOffence',
    parentColumn: 'GravityOffenceID',
    childTable: 'CaseMaster',
    childColumn: 'GravityOffenceID',
    cardinality: 'one-to-many',
    description: 'Many cases may share one gravity classification.',
  },
  {
    parentTable: 'CrimeHead',
    parentColumn: 'CrimeHeadID',
    childTable: 'CaseMaster',
    childColumn: 'CrimeMajorHeadID',
    cardinality: 'one-to-many',
    description: 'Many cases may share one major crime head.',
  },
  {
    parentTable: 'CrimeSubHead',
    parentColumn: 'CrimeSubHeadID',
    childTable: 'CaseMaster',
    childColumn: 'CrimeMinorHeadID',
    cardinality: 'one-to-many',
    description: 'Many cases may share one minor crime head.',
  },
  {
    parentTable: 'CaseStatusMaster',
    parentColumn: 'CaseStatusID',
    childTable: 'CaseMaster',
    childColumn: 'CaseStatusID',
    cardinality: 'one-to-many',
    description: 'Many cases may share one case status.',
  },
  {
    parentTable: 'Unit',
    parentColumn: 'UnitID',
    childTable: 'CaseMaster',
    childColumn: 'PoliceStationID',
    cardinality: 'one-to-many',
    description: 'One police station may register many cases.',
  },
  {
    parentTable: 'Employee',
    parentColumn: 'EmployeeID',
    childTable: 'CaseMaster',
    childColumn: 'PolicePersonID',
    cardinality: 'one-to-many',
    description: 'One employee may register many cases.',
  },
  {
    parentTable: 'Court',
    parentColumn: 'CourtID',
    childTable: 'CaseMaster',
    childColumn: 'CourtID',
    cardinality: 'one-to-many',
    description: 'One court may be linked to many cases.',
  },
  {
    parentTable: 'CrimeHead',
    parentColumn: 'CrimeHeadID',
    childTable: 'CrimeSubHead',
    childColumn: 'CrimeHeadID',
    cardinality: 'one-to-many',
    description: 'One crime head contains multiple sub-heads.',
  },
  {
    parentTable: 'Act',
    parentColumn: 'ActCode',
    childTable: 'Section',
    childColumn: 'ActCode',
    cardinality: 'one-to-many',
    description: 'One legal act contains multiple sections.',
  },
  {
    parentTable: 'Accused',
    parentColumn: 'AccusedMasterID',
    childTable: 'AccusedEntityLink',
    childColumn: 'AccusedMasterID',
    cardinality: 'one-to-one',
    description:
      'A case-local accused record maps to a resolved person entity.',
  },
  {
    parentTable: 'PersonEntity',
    parentColumn: 'EntityID',
    childTable: 'AccusedEntityLink',
    childColumn: 'EntityID',
    cardinality: 'one-to-many',
    description:
      'One resolved person entity may appear in multiple cases.',
  },
] as const satisfies readonly SchemaRelationship[];