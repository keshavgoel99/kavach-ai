export const GRAPH_NODE_COLUMNS = [
  'NodeID',
  'NodeType',
  'Label',
  'Category',
  'DistrictID',
  'LocationID',
  'SyntheticFlag',
] as const;

export const GRAPH_EDGE_COLUMNS = [
  'EdgeID',
  'SourceNodeID',
  'TargetNodeID',
  'RelationshipType',
  'Confidence',
  'CaseMasterID',
  'EvidenceBasis',
] as const;

export const GRAPH_NODE_TYPES = [
  'CASE',
  'PERSON',
  'IDENTIFIER',
  'ACCOUNT',
  'LOCATION',
  'GANG',
] as const;

export const GRAPH_RELATIONSHIP_TYPES = [
  'OCCURRED_AT',
  'ACCUSED_IN',
  'USES_IDENTIFIER',
  'CO_ACCUSED',
  'LINKED_TO_ACCOUNT',
  'MEMBER_OF',
  'GANG_ASSOCIATION',
  'CO_WORKER',
  'FAMILY',
  'SHARED_ADDRESS',
] as const;

export const GRAPH_NODE_PRIMARY_KEY = [
  'NodeID',
] as const;

export const GRAPH_EDGE_PRIMARY_KEY = [
  'EdgeID',
] as const;

export type GraphNodeColumn =
  typeof GRAPH_NODE_COLUMNS[number];

export type GraphEdgeColumn =
  typeof GRAPH_EDGE_COLUMNS[number];

export type GraphNodeType =
  typeof GRAPH_NODE_TYPES[number];

export type GraphRelationshipType =
  typeof GRAPH_RELATIONSHIP_TYPES[number];

export type GraphNodeRow =
  Record<GraphNodeColumn, string>;

export type GraphEdgeRow =
  Record<GraphEdgeColumn, string>;
