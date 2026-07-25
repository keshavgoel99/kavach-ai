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
  GRAPH_NODE_TYPES,
  GRAPH_RELATIONSHIP_TYPES,
} from '@kavach/schema-catalog';

import type {
  GraphEdgeRow,
  GraphNodeRow,
} from '@kavach/schema-catalog';

interface DatasetManifest {
  row_counts: Record<string, number>;
}

function readCsv<Row extends Record<string, string>>(
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
        `Unexpected header in ${filePath}.`,
        `Expected: ${expectedHeader}`,
        `Actual:   ${actualHeader}`,
      ].join('\n'),
    );
  }

  return records
    .slice(1)
    .map((cells, index) => {
      if (
        cells.length !==
        expectedColumns.length
      ) {
        throw new Error(
          [
            `Invalid column count in ${filePath}.`,
            `CSV row: ${index + 2}`,
            `Expected: ${expectedColumns.length}`,
            `Actual: ${cells.length}`,
          ].join(' '),
        );
      }

      const entries =
        expectedColumns.map(
          (column, columnIndex) => [
            column,
            cells[columnIndex] ?? '',
          ],
        );

      return Object.fromEntries(
        entries,
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

function validateNullableInteger(
  value: string,
  label: string,
): void {
  const cleaned = value.trim();

  if (!cleaned) {
    return;
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
}

function validateConfidence(
  value: string,
  label: string,
): void {
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
}

function incrementCount(
  counts: Map<string, number>,
  key: string,
): void {
  counts.set(
    key,
    (counts.get(key) ?? 0) + 1,
  );
}

function validateGraphNodes(
  rows: GraphNodeRow[],
): {
  nodeIds: Set<string>;
  typeCounts: Map<string, number>;
} {
  const nodeIds = new Set<string>();
  const typeCounts =
    new Map<string, number>();

  const allowedTypes =
    new Set<string>(GRAPH_NODE_TYPES);

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const nodeId = requireText(
      row.NodeID,
      `nodes.csv row ${rowNumber} NodeID`,
    );

    const nodeType = requireText(
      row.NodeType,
      `nodes.csv row ${rowNumber} NodeType`,
    );

    if (nodeIds.has(nodeId)) {
      throw new Error(
        `Duplicate graph NodeID: ${nodeId}`,
      );
    }

    if (!allowedTypes.has(nodeType)) {
      throw new Error(
        `Unsupported graph NodeType: ${nodeType}`,
      );
    }

    if (
      !nodeId.startsWith(
        `${nodeType}:`,
      )
    ) {
      throw new Error(
        [
          `NodeID ${nodeId} does not match`,
          `NodeType ${nodeType}.`,
        ].join(' '),
      );
    }

    requireText(
      row.Label,
      `nodes.csv row ${rowNumber} Label`,
    );

    validateNullableInteger(
      row.DistrictID,
      `nodes.csv row ${rowNumber} DistrictID`,
    );

    validateNullableInteger(
      row.LocationID,
      `nodes.csv row ${rowNumber} LocationID`,
    );

    const syntheticFlag =
      row.SyntheticFlag.trim();

    if (
      syntheticFlag !== '0' &&
      syntheticFlag !== '1'
    ) {
      throw new Error(
        [
          `nodes.csv row ${rowNumber}`,
          'SyntheticFlag must be 0 or 1.',
        ].join(' '),
      );
    }

    nodeIds.add(nodeId);

    incrementCount(
      typeCounts,
      nodeType,
    );
  });

  return {
    nodeIds,
    typeCounts,
  };
}

function validateGraphEdges(
  rows: GraphEdgeRow[],
  nodeIds: ReadonlySet<string>,
): Map<string, number> {
  const edgeIds = new Set<string>();

  const relationshipCounts =
    new Map<string, number>();

  const allowedRelationships =
    new Set<string>(
      GRAPH_RELATIONSHIP_TYPES,
    );

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    const edgeId = requireText(
      row.EdgeID,
      `edges.csv row ${rowNumber} EdgeID`,
    );

    const sourceNodeId = requireText(
      row.SourceNodeID,
      `edges.csv row ${rowNumber} SourceNodeID`,
    );

    const targetNodeId = requireText(
      row.TargetNodeID,
      `edges.csv row ${rowNumber} TargetNodeID`,
    );

    const relationshipType =
      requireText(
        row.RelationshipType,
        `edges.csv row ${rowNumber} RelationshipType`,
      );

    if (edgeIds.has(edgeId)) {
      throw new Error(
        `Duplicate graph EdgeID: ${edgeId}`,
      );
    }

    if (!nodeIds.has(sourceNodeId)) {
      throw new Error(
        [
          `Edge ${edgeId} references missing`,
          `source node ${sourceNodeId}.`,
        ].join(' '),
      );
    }

    if (!nodeIds.has(targetNodeId)) {
      throw new Error(
        [
          `Edge ${edgeId} references missing`,
          `target node ${targetNodeId}.`,
        ].join(' '),
      );
    }

    if (
      !allowedRelationships.has(
        relationshipType,
      )
    ) {
      throw new Error(
        [
          `Unsupported RelationshipType`,
          `${relationshipType}.`,
        ].join(' '),
      );
    }

    validateConfidence(
      row.Confidence,
      `edges.csv row ${rowNumber} Confidence`,
    );

    validateNullableInteger(
      row.CaseMasterID,
      `edges.csv row ${rowNumber} CaseMasterID`,
    );

    requireText(
      row.EvidenceBasis,
      `edges.csv row ${rowNumber} EvidenceBasis`,
    );

    edgeIds.add(edgeId);

    incrementCount(
      relationshipCounts,
      relationshipType,
    );
  });

  return relationshipCounts;
}

function printCounts(
  title: string,
  counts: ReadonlyMap<string, number>,
): void {
  console.log(title);

  [...counts.entries()]
    .sort(
      (left, right) =>
        right[1] - left[1],
    )
    .forEach(([label, count]) => {
      console.log(
        `  ${label}: ${count}`,
      );
    });
}

function main(): void {
  const suppliedRoot =
    process.argv[2];

  if (!suppliedRoot) {
    throw new Error(
      [
        'Provide the extracted dataset root.',
        'Example:',
        'npm run graph:validate --',
        '"C:\\path\\to\\KAVACH_Synthetic_Crime_Dataset_v1"',
      ].join(' '),
    );
  }

  const datasetRoot =
    resolve(suppliedRoot);

  const graphRoot =
    join(datasetRoot, 'graph');

  const manifestPath =
    join(
      datasetRoot,
      'dataset_manifest.json',
    );

  if (!existsSync(manifestPath)) {
    throw new Error(
      `Dataset manifest does not exist: ${manifestPath}`,
    );
  }

  const manifest =
    JSON.parse(
      readFileSync(
        manifestPath,
        'utf8',
      ),
    ) as DatasetManifest;

  const nodes = readCsv<GraphNodeRow>(
    join(graphRoot, 'nodes.csv'),
    GRAPH_NODE_COLUMNS,
  );

  const edges = readCsv<GraphEdgeRow>(
    join(graphRoot, 'edges.csv'),
    GRAPH_EDGE_COLUMNS,
  );

  const expectedNodeCount =
    manifest.row_counts.graph_nodes;

  const expectedEdgeCount =
    manifest.row_counts.graph_edges;

  if (
    nodes.length !==
    expectedNodeCount
  ) {
    throw new Error(
      [
        'Graph node count mismatch.',
        `Expected ${expectedNodeCount}.`,
        `Actual ${nodes.length}.`,
      ].join(' '),
    );
  }

  if (
    edges.length !==
    expectedEdgeCount
  ) {
    throw new Error(
      [
        'Graph edge count mismatch.',
        `Expected ${expectedEdgeCount}.`,
        `Actual ${edges.length}.`,
      ].join(' '),
    );
  }

  const {
    nodeIds,
    typeCounts,
  } = validateGraphNodes(nodes);

  const relationshipCounts =
    validateGraphEdges(
      edges,
      nodeIds,
    );

  console.log('');
  console.log(
    'KAVACH GRAPH DATA · VALID',
  );
  console.log(
    `Nodes: ${nodes.length}`,
  );
  console.log(
    `Edges: ${edges.length}`,
  );
  console.log('');

  printCounts(
    'Node types:',
    typeCounts,
  );

  console.log('');

  printCounts(
    'Relationships:',
    relationshipCounts,
  );
}

try {
  main();
} catch (error: unknown) {
  console.error('');
  console.error(
    'KAVACH GRAPH DATA · INVALID',
  );

  console.error(
    error instanceof Error
      ? error.message
      : error,
  );

  process.exitCode = 1;
}
