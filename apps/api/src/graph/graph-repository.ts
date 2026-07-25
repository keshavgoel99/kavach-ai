import {
  existsSync,
  readFileSync,
} from 'node:fs';

import {
  join,
  resolve,
} from 'node:path';

import {
  parse,
} from 'csv-parse/sync';

import {
  GRAPH_EDGE_COLUMNS,
  GRAPH_NODE_COLUMNS,
} from '@kavach/schema-catalog';

import type {
  GraphEdgeRow,
  GraphNodeRow,
} from '@kavach/schema-catalog';

import type {
  InvestigationGraphEdge,
  InvestigationGraphNode,
  InvestigationGraphQuery,
  InvestigationGraphRelationshipType,
  InvestigationGraphResponse,
} from '@kavach/shared-types';

const DEFAULT_NODE_LIMIT = 80;
const MAXIMUM_NODE_LIMIT = 200;

function resolveDatasetRoot(): string {
  const configuredRoot =
    process.env.KAVACH_DATASET_ROOT?.trim();

  const candidates = [
    configuredRoot,

    resolve(
      process.cwd(),
      'data',
      'KAVACH_Synthetic_Crime_Dataset_v1',
    ),

    resolve(
      process.cwd(),
      'data',
      'raw',
      'KAVACH_Synthetic_Crime_Dataset_v1',
    ),

    resolve(
      process.cwd(),
      '..',
      '..',
      'data',
      'KAVACH_Synthetic_Crime_Dataset_v1',
    ),

    resolve(
      process.cwd(),
      '..',
      '..',
      'data',
      'raw',
      'KAVACH_Synthetic_Crime_Dataset_v1',
    ),

    resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'data',
      'KAVACH_Synthetic_Crime_Dataset_v1',
    ),
  ].filter(
    (
      candidate,
    ): candidate is string =>
      Boolean(candidate),
  );

  const matchedRoot =
    candidates.find((candidate) => {
      const nodesPath = join(
        candidate,
        'graph',
        'nodes.csv',
      );

      const edgesPath = join(
        candidate,
        'graph',
        'edges.csv',
      );

      return (
        existsSync(nodesPath) &&
        existsSync(edgesPath)
      );
    });

  if (!matchedRoot) {
    throw new Error(
      [
        'The KAVACH graph dataset could not be located.',
        `Current working directory: ${process.cwd()}.`,
        `Checked: ${candidates.join(' | ')}.`,
        'Set KAVACH_DATASET_ROOT to the folder',
        'that directly contains graph\\nodes.csv.',
      ].join(' '),
    );
  }

  return matchedRoot;
}

function readGraphCsv<
  Row extends Record<string, string>,
>(
  filePath: string,
  expectedColumns: readonly string[],
): Row[] {
  if (!existsSync(filePath)) {
    throw new Error(
      `Graph CSV does not exist: ${filePath}`,
    );
  }

  const records = parse(
    readFileSync(filePath, 'utf8'),
    {
      bom: true,
      skip_empty_lines: true,
      relax_column_count: false,
    },
  ) as string[][];

  const header = records[0];

  if (!header) {
    throw new Error(
      `Graph CSV is empty: ${filePath}`,
    );
  }

  const actualHeader =
    header.join(',');

  const expectedHeader =
    expectedColumns.join(',');

  if (actualHeader !== expectedHeader) {
    throw new Error(
      [
        `Unexpected graph header in ${filePath}.`,
        `Expected: ${expectedHeader}`,
        `Actual: ${actualHeader}`,
      ].join('\n'),
    );
  }

  return records
    .slice(1)
    .map((cells, rowIndex) => {
      if (
        cells.length !==
        expectedColumns.length
      ) {
        throw new Error(
          [
            `Invalid column count in ${filePath}.`,
            `CSV row: ${rowIndex + 2}.`,
          ].join(' '),
        );
      }

      return Object.fromEntries(
        expectedColumns.map(
          (column, columnIndex) => [
            column,
            cells[columnIndex] ?? '',
          ],
        ),
      ) as Row;
    });
}

function requireText(
  value: string,
  label: string,
): string {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new Error(
      `${label} cannot be empty.`,
    );
  }

  return cleaned;
}

function toNullableInteger(
  value: string,
  label: string,
): number | null {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  if (!/^\d+$/.test(cleaned)) {
    throw new Error(
      `${label} must contain an integer.`,
    );
  }

  const parsed = Number(cleaned);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    throw new Error(
      `${label} must be a positive integer.`,
    );
  }

  return parsed;
}

function toRequiredConfidence(
  value: string,
  label: string,
): number {
  const cleaned = value.trim();
  const parsed = Number(cleaned);

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

function toSyntheticBoolean(
  value: string,
  label: string,
): boolean {
  const cleaned = value.trim();

  if (cleaned === '1') {
    return true;
  }

  if (cleaned === '0') {
    return false;
  }

  throw new Error(
    `${label} must be 0 or 1.`,
  );
}

function createNode(
  row: GraphNodeRow,
): InvestigationGraphNode {
  return {
    nodeId: requireText(
      row.NodeID,
      'GraphNode.NodeID',
    ),

    nodeType: requireText(
      row.NodeType,
      'GraphNode.NodeType',
    ) as InvestigationGraphNode['nodeType'],

    label: requireText(
      row.Label,
      'GraphNode.Label',
    ),

    category:
      row.Category.trim() || null,

    districtId:
      toNullableInteger(
        row.DistrictID,
        'GraphNode.DistrictID',
      ),

    locationId:
      toNullableInteger(
        row.LocationID,
        'GraphNode.LocationID',
      ),

    synthetic:
      toSyntheticBoolean(
        row.SyntheticFlag,
        'GraphNode.SyntheticFlag',
      ),
  };
}

function createEdge(
  row: GraphEdgeRow,
): InvestigationGraphEdge {
  return {
    edgeId: requireText(
      row.EdgeID,
      'GraphEdge.EdgeID',
    ),

    sourceNodeId: requireText(
      row.SourceNodeID,
      'GraphEdge.SourceNodeID',
    ),

    targetNodeId: requireText(
      row.TargetNodeID,
      'GraphEdge.TargetNodeID',
    ),

    relationshipType: requireText(
      row.RelationshipType,
      'GraphEdge.RelationshipType',
    ) as InvestigationGraphRelationshipType,

    confidence:
      toRequiredConfidence(
        row.Confidence,
        'GraphEdge.Confidence',
      ),

    caseId:
      toNullableInteger(
        row.CaseMasterID,
        'GraphEdge.CaseMasterID',
      ),

    evidenceBasis:
      requireText(
        row.EvidenceBasis,
        'GraphEdge.EvidenceBasis',
      ),
  };
}

export class InvestigationGraphRepository {
  private readonly nodesById =
    new Map<
      string,
      InvestigationGraphNode
    >();

  private readonly edgesById =
    new Map<
      string,
      InvestigationGraphEdge
    >();

  private readonly adjacency =
    new Map<
      string,
      InvestigationGraphEdge[]
    >();

  private readonly relationshipTypes =
    new Set<
      InvestigationGraphRelationshipType
    >();

  public constructor(
    nodeRows: GraphNodeRow[],
    edgeRows: GraphEdgeRow[],
  ) {
    nodeRows.forEach((row) => {
      const node = createNode(row);

      if (
        this.nodesById.has(
          node.nodeId,
        )
      ) {
        throw new Error(
          `Duplicate graph node ${node.nodeId}.`,
        );
      }

      this.nodesById.set(
        node.nodeId,
        node,
      );

      this.adjacency.set(
        node.nodeId,
        [],
      );
    });

    edgeRows.forEach((row) => {
      const edge = createEdge(row);

      if (
        this.edgesById.has(
          edge.edgeId,
        )
      ) {
        throw new Error(
          `Duplicate graph edge ${edge.edgeId}.`,
        );
      }

      if (
        !this.nodesById.has(
          edge.sourceNodeId,
        )
      ) {
        throw new Error(
          [
            `Graph edge ${edge.edgeId}`,
            `references missing source`,
            `${edge.sourceNodeId}.`,
          ].join(' '),
        );
      }

      if (
        !this.nodesById.has(
          edge.targetNodeId,
        )
      ) {
        throw new Error(
          [
            `Graph edge ${edge.edgeId}`,
            `references missing target`,
            `${edge.targetNodeId}.`,
          ].join(' '),
        );
      }

      this.edgesById.set(
        edge.edgeId,
        edge,
      );

      this.relationshipTypes.add(
        edge.relationshipType,
      );

      this.adjacency
        .get(edge.sourceNodeId)
        ?.push(edge);

      this.adjacency
        .get(edge.targetNodeId)
        ?.push(edge);
    });
  }

  public hasNode(
    nodeId: string,
  ): boolean {
    return this.nodesById.has(nodeId);
  }

  public getNodeCount(): number {
    return this.nodesById.size;
  }

  public getEdgeCount(): number {
    return this.edgesById.size;
  }

  public getNeighborhood(
    query: InvestigationGraphQuery,
  ): InvestigationGraphResponse {
    const rootNode =
      this.nodesById.get(
        query.rootNodeId,
      );

    if (!rootNode) {
      throw new Error(
        `Graph node ${query.rootNodeId} does not exist.`,
      );
    }

    const depth =
      query.depth ?? 1;

    const requestedNodeLimit =
      query.nodeLimit ??
      DEFAULT_NODE_LIMIT;

    const nodeLimit = Math.min(
      Math.max(
        requestedNodeLimit,
        2,
      ),
      MAXIMUM_NODE_LIMIT,
    );

    const relationshipFilter =
      query.relationshipTypes &&
      query.relationshipTypes.length > 0
        ? new Set(
            query.relationshipTypes,
          )
        : null;

    const selectedNodes =
      new Map<
        string,
        InvestigationGraphNode
      >([
        [
          rootNode.nodeId,
          rootNode,
        ],
      ]);

    const selectedEdges =
      new Map<
        string,
        InvestigationGraphEdge
      >();

    let frontier = [
      rootNode.nodeId,
    ];

    let truncated = false;

    for (
      let currentDepth = 1;
      currentDepth <= depth;
      currentDepth += 1
    ) {
      const nextFrontier =
        new Set<string>();

      frontier.forEach(
        (currentNodeId) => {
          const connectedEdges =
            this.adjacency.get(
              currentNodeId,
            ) ?? [];

          connectedEdges.forEach(
            (edge) => {
              if (
                relationshipFilter &&
                !relationshipFilter.has(
                  edge.relationshipType,
                )
              ) {
                return;
              }

              const otherNodeId =
                edge.sourceNodeId ===
                currentNodeId
                  ? edge.targetNodeId
                  : edge.sourceNodeId;

              const otherNode =
                this.nodesById.get(
                  otherNodeId,
                );

              if (!otherNode) {
                return;
              }

              if (
                !selectedNodes.has(
                  otherNodeId,
                )
              ) {
                if (
                  selectedNodes.size >=
                  nodeLimit
                ) {
                  truncated = true;
                  return;
                }

                selectedNodes.set(
                  otherNodeId,
                  otherNode,
                );

                nextFrontier.add(
                  otherNodeId,
                );
              }

              selectedEdges.set(
                edge.edgeId,
                edge,
              );
            },
          );
        },
      );

      frontier = [
        ...nextFrontier,
      ];

      if (frontier.length === 0) {
        break;
      }
    }

    const nodes = [
      ...selectedNodes.values(),
    ].sort((left, right) => {
      if (
        left.nodeId ===
        rootNode.nodeId
      ) {
        return -1;
      }

      if (
        right.nodeId ===
        rootNode.nodeId
      ) {
        return 1;
      }

      return (
        left.nodeType.localeCompare(
          right.nodeType,
          'en-IN',
        ) ||
        left.label.localeCompare(
          right.label,
          'en-IN',
        ) ||
        left.nodeId.localeCompare(
          right.nodeId,
          'en-IN',
        )
      );
    });

    const includedNodeIds =
      new Set(
        nodes.map(
          (node) => node.nodeId,
        ),
      );

    const edges = [
      ...selectedEdges.values(),
    ]
      .filter(
        (edge) =>
          includedNodeIds.has(
            edge.sourceNodeId,
          ) &&
          includedNodeIds.has(
            edge.targetNodeId,
          ),
      )
      .sort(
        (left, right) =>
          left.relationshipType.localeCompare(
            right.relationshipType,
            'en-IN',
          ) ||
          left.edgeId.localeCompare(
            right.edgeId,
            'en-IN',
          ),
      );

    return {
      rootNodeId:
        rootNode.nodeId,

      depth,
      nodeLimit,

      nodes,
      edges,

      truncated,

      availableRelationshipTypes: [
        ...this.relationshipTypes,
      ].sort(
        (left, right) =>
          left.localeCompare(
            right,
            'en-IN',
          ),
      ),
    };
  }
}

function loadGraphRepository(): InvestigationGraphRepository {
  const datasetRoot =
    resolveDatasetRoot();

  const graphRoot =
    join(
      datasetRoot,
      'graph',
    );

  const nodeRows =
    readGraphCsv<GraphNodeRow>(
      join(
        graphRoot,
        'nodes.csv',
      ),
      GRAPH_NODE_COLUMNS,
    );

  const edgeRows =
    readGraphCsv<GraphEdgeRow>(
      join(
        graphRoot,
        'edges.csv',
      ),
      GRAPH_EDGE_COLUMNS,
    );

  return new InvestigationGraphRepository(
    nodeRows,
    edgeRows,
  );
}

let repositoryPromise: Promise<InvestigationGraphRepository> | null = null;

export function getGraphRepository(): Promise<InvestigationGraphRepository> {
  if (!repositoryPromise) {
    repositoryPromise =
      Promise.resolve().then(() => {
        const repository =
          loadGraphRepository();

        console.log(
          [
            'KAVACH graph loaded:',
            `${repository.getNodeCount()} nodes,`,
            `${repository.getEdgeCount()} edges`,
          ].join(' '),
        );

        return repository;
      });
  }

  return repositoryPromise;
}
