export type InvestigationGraphNodeType =
  | 'CASE'
  | 'PERSON'
  | 'IDENTIFIER'
  | 'ACCOUNT'
  | 'LOCATION'
  | 'GANG';

export type InvestigationGraphRelationshipType =
  | 'OCCURRED_AT'
  | 'ACCUSED_IN'
  | 'USES_IDENTIFIER'
  | 'CO_ACCUSED'
  | 'LINKED_TO_ACCOUNT'
  | 'MEMBER_OF'
  | 'GANG_ASSOCIATION'
  | 'CO_WORKER'
  | 'FAMILY'
  | 'SHARED_ADDRESS';

export interface InvestigationGraphNode {
  nodeId: string;
  nodeType: InvestigationGraphNodeType;

  label: string;
  category: string | null;

  districtId: number | null;
  locationId: number | null;

  synthetic: boolean;
}

export interface InvestigationGraphEdge {
  edgeId: string;

  sourceNodeId: string;
  targetNodeId: string;

  relationshipType:
    InvestigationGraphRelationshipType;

  confidence: number;

  caseId: number | null;

  evidenceBasis: string;
}

export interface InvestigationGraphQuery {
  rootNodeId: string;

  depth?: 1 | 2;

  nodeLimit?: number;

  relationshipTypes?:
    InvestigationGraphRelationshipType[];
}

export interface InvestigationGraphResponse {
  rootNodeId: string;

  depth: 1 | 2;
  nodeLimit: number;

  nodes: InvestigationGraphNode[];
  edges: InvestigationGraphEdge[];

  truncated: boolean;

  availableRelationshipTypes:
    InvestigationGraphRelationshipType[];
}
