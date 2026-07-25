import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createPortal,
} from 'react-dom';

import type {
  InvestigationGraphEdge,
  InvestigationGraphNode,
  InvestigationGraphRelationshipType,
  InvestigationGraphResponse,
} from '@kavach/shared-types';

import './InvestigationGraphWorkspace.css';

interface InvestigationGraphWorkspaceProps {
  rootNodeId: string;
  title: string;

  onOpenEntity: (
    entityId: number,
  ) => void;

  onClose: () => void;
}

interface PositionedGraphNode {
  node: InvestigationGraphNode;
  x: number;
  y: number;
  level: number;
}

const GRAPH_WIDTH = 1100;
const GRAPH_HEIGHT = 680;

const RELATIONSHIP_TYPES:
readonly InvestigationGraphRelationshipType[] = [
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
];

const NODE_LIMIT_OPTIONS = [
  30,
  60,
  100,
  150,
  200,
] as const;

function formatRelationship(
  value: string,
): string {
  return value
    .toLowerCase()
    .split('_')
    .map((part) =>
      part.length === 0
        ? part
        : part[0].toUpperCase() +
          part.slice(1),
    )
    .join(' ');
}

function formatConfidence(
  value: number,
): string {
  return `${Math.round(value * 100)}%`;
}

function shortenLabel(
  value: string,
  maximumLength = 24,
): string {
  const cleaned = value.trim();

  if (
    cleaned.length <= maximumLength
  ) {
    return cleaned;
  }

  return (
    cleaned.slice(
      0,
      maximumLength - 1,
    ) + '…'
  );
}

function nodeClassName(
  node: InvestigationGraphNode,
  selected: boolean,
  rootNodeId: string,
): string {
  const classes = [
    'investigation-graph__node',
    `investigation-graph__node--${node.nodeType.toLowerCase()}`,
  ];

  if (selected) {
    classes.push(
      'investigation-graph__node--selected',
    );
  }

  if (node.nodeId === rootNodeId) {
    classes.push(
      'investigation-graph__node--root',
    );
  }

  return classes.join(' ');
}

function buildNodeLevels(
  graph: InvestigationGraphResponse,
): Map<string, number> {
  const adjacency =
    new Map<string, string[]>();

  graph.nodes.forEach((node) => {
    adjacency.set(node.nodeId, []);
  });

  graph.edges.forEach((edge) => {
    adjacency
      .get(edge.sourceNodeId)
      ?.push(edge.targetNodeId);

    adjacency
      .get(edge.targetNodeId)
      ?.push(edge.sourceNodeId);
  });

  const levels =
    new Map<string, number>([
      [graph.rootNodeId, 0],
    ]);

  const queue = [
    graph.rootNodeId,
  ];

  while (queue.length > 0) {
    const currentNodeId =
      queue.shift();

    if (!currentNodeId) {
      continue;
    }

    const currentLevel =
      levels.get(currentNodeId) ?? 0;

    if (currentLevel >= graph.depth) {
      continue;
    }

    const connectedNodes =
      adjacency.get(currentNodeId) ?? [];

    connectedNodes.forEach(
      (connectedNodeId) => {
        if (
          levels.has(connectedNodeId)
        ) {
          return;
        }

        levels.set(
          connectedNodeId,
          currentLevel + 1,
        );

        queue.push(connectedNodeId);
      },
    );
  }

  graph.nodes.forEach((node) => {
    if (!levels.has(node.nodeId)) {
      levels.set(
        node.nodeId,
        graph.depth,
      );
    }
  });

  return levels;
}

function createGraphLayout(
  graph: InvestigationGraphResponse,
): PositionedGraphNode[] {
  const centreX = GRAPH_WIDTH / 2;
  const centreY = GRAPH_HEIGHT / 2;

  const levels =
    buildNodeLevels(graph);

  const groupedNodes =
    new Map<
      number,
      InvestigationGraphNode[]
    >();

  graph.nodes.forEach((node) => {
    const level =
      levels.get(node.nodeId) ?? 1;

    const nodes =
      groupedNodes.get(level) ?? [];

    nodes.push(node);

    groupedNodes.set(level, nodes);
  });

  const positioned:
    PositionedGraphNode[] = [];

  const rootNode =
    graph.nodes.find(
      (node) =>
        node.nodeId ===
        graph.rootNodeId,
    );

  if (rootNode) {
    positioned.push({
      node: rootNode,
      x: centreX,
      y: centreY,
      level: 0,
    });
  }

  [1, 2].forEach((level) => {
    const nodes =
      groupedNodes.get(level) ?? [];

    nodes.sort(
      (left, right) =>
        left.nodeType.localeCompare(
          right.nodeType,
          'en-IN',
        ) ||
        left.label.localeCompare(
          right.label,
          'en-IN',
        ),
    );

    if (nodes.length === 0) {
      return;
    }

    const radius =
      level === 1
        ? 190
        : 305;

    nodes.forEach((node, index) => {
      const angle =
        -Math.PI / 2 +
        (
          index /
          nodes.length
        ) *
          Math.PI *
          2;

      positioned.push({
        node,
        x:
          centreX +
          Math.cos(angle) *
            radius,
        y:
          centreY +
          Math.sin(angle) *
            radius,
        level,
      });
    });
  });

  return positioned;
}

function getOtherNodeId(
  edge: InvestigationGraphEdge,
  nodeId: string,
): string {
  return edge.sourceNodeId === nodeId
    ? edge.targetNodeId
    : edge.sourceNodeId;
}

function parseNumericNodeId(
  nodeId: string,
  expectedType: 'CASE' | 'PERSON',
): number | null {
  const prefix =
    `${expectedType}:`;

  if (!nodeId.startsWith(prefix)) {
    return null;
  }

  const rawId =
    nodeId.slice(prefix.length);

  if (!/^\d+$/.test(rawId)) {
    return null;
  }

  const parsed = Number(rawId);

  if (
    !Number.isSafeInteger(parsed) ||
    parsed < 1
  ) {
    return null;
  }

  return parsed;
}

function EmptyState({
  children,
}: {
  children: string;
}) {
  return (
    <div className="investigation-graph__empty">
      {children}
    </div>
  );
}

export function InvestigationGraphWorkspace({
  rootNodeId,
  title,
  onOpenEntity,
  onClose,
}: InvestigationGraphWorkspaceProps) {
  const [
    graph,
    setGraph,
  ] =
    useState<
      InvestigationGraphResponse | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    depth,
    setDepth,
  ] = useState<1 | 2>(1);

  const [
    nodeLimit,
    setNodeLimit,
  ] = useState(60);

  const [
    selectedRelationships,
    setSelectedRelationships,
  ] = useState<
    InvestigationGraphRelationshipType[]
  >([...RELATIONSHIP_TYPES]);

  const [
    activeRootNodeId,
    setActiveRootNodeId,
  ] = useState(rootNodeId);

  const [
    activeTitle,
    setActiveTitle,
  ] = useState(title);

  const [
    selectedNodeId,
    setSelectedNodeId,
  ] = useState(rootNodeId);

  useEffect(() => {
    setActiveRootNodeId(rootNodeId);
    setActiveTitle(title);
    setSelectedNodeId(rootNodeId);
  }, [
    rootNodeId,
    title,
  ]);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    const relationshipTypes =
      selectedRelationships.length ===
      RELATIONSHIP_TYPES.length
        ? undefined
        : selectedRelationships;

    window.kavach.graph
      .getNeighborhood({
        rootNodeId:
          activeRootNodeId,

        depth,
        nodeLimit,
        relationshipTypes,
      })
      .then((result) => {
        if (!active) {
          return;
        }

        setGraph(result);

        setSelectedNodeId(
          (currentNodeId) =>
            result.nodes.some(
              (node) =>
                node.nodeId ===
                currentNodeId,
            )
              ? currentNodeId
              : result.rootNodeId,
        );
      })
      .catch((reason: unknown) => {
        if (!active) {
          return;
        }

        setGraph(null);

        setError(
          reason instanceof Error
            ? reason.message
            : 'The investigation graph could not be loaded.',
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    activeRootNodeId,
    depth,
    nodeLimit,
    selectedRelationships,
  ]);

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      'hidden';

    window.addEventListener(
      'keydown',
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        'keydown',
        handleKeyDown,
      );
    };
  }, [onClose]);

  const positionedNodes =
    useMemo(
      () =>
        graph
          ? createGraphLayout(graph)
          : [],
      [graph],
    );

  const positionedById =
    useMemo(
      () =>
        new Map(
          positionedNodes.map(
            (positionedNode) => [
              positionedNode.node.nodeId,
              positionedNode,
            ],
          ),
        ),
      [positionedNodes],
    );

  const nodesById =
    useMemo(
      () =>
        new Map(
          (graph?.nodes ?? []).map(
            (node) => [
              node.nodeId,
              node,
            ],
          ),
        ),
      [graph],
    );

  const selectedNode =
    graph?.nodes.find(
      (node) =>
        node.nodeId === selectedNodeId,
    ) ?? null;

  const selectedPersonId =
    selectedNode?.nodeType === 'PERSON'
      ? parseNumericNodeId(
          selectedNode.nodeId,
          'PERSON',
        )
      : null;

  const selectedCaseId =
    selectedNode?.nodeType === 'CASE'
      ? parseNumericNodeId(
          selectedNode.nodeId,
          'CASE',
        )
      : null;

  const canRecenterSelectedNode =
    selectedNode !== null &&
    (
      selectedCaseId !== null ||
      selectedPersonId !== null
    ) &&
    selectedNode.nodeId !==
      activeRootNodeId;

  const recenterOnSelectedNode = () => {
    if (
      !selectedNode ||
      (
        selectedNode.nodeType !== 'CASE' &&
        selectedNode.nodeType !== 'PERSON'
      )
    ) {
      return;
    }

    setActiveRootNodeId(
      selectedNode.nodeId,
    );

    setActiveTitle(
      selectedNode.nodeType === 'CASE'
        ? `Case graph · ${selectedNode.label}`
        : `Entity graph · ${selectedNode.label}`,
    );

    setSelectedNodeId(
      selectedNode.nodeId,
    );
  };

  const returnToStartingRoot = () => {
    setActiveRootNodeId(rootNodeId);
    setActiveTitle(title);
    setSelectedNodeId(rootNodeId);
  };

  const selectedEdges =
    useMemo(
      () =>
        (graph?.edges ?? []).filter(
          (edge) =>
            edge.sourceNodeId ===
              selectedNodeId ||
            edge.targetNodeId ===
              selectedNodeId,
        ),
      [
        graph,
        selectedNodeId,
      ],
    );

  const toggleRelationship = (
    relationshipType:
      InvestigationGraphRelationshipType,
  ) => {
    setSelectedRelationships(
      (current) => {
        if (
          current.includes(
            relationshipType,
          )
        ) {
          /*
           * Keep at least one relationship
           * selected. An empty API filter means
           * "all relationships".
           */
          if (current.length === 1) {
            return current;
          }

          return current.filter(
            (value) =>
              value !==
              relationshipType,
          );
        }

        return [
          ...current,
          relationshipType,
        ];
      },
    );
  };

  const selectAllRelationships = () => {
    setSelectedRelationships([
      ...RELATIONSHIP_TYPES,
    ]);
  };

  return createPortal(
    <div
      className="investigation-graph"
      role="dialog"
      aria-modal="true"
      aria-label="Investigation graph"
    >
      <button
        type="button"
        className="investigation-graph__backdrop"
        aria-label="Close investigation graph"
        onClick={onClose}
      />

      <section className="investigation-graph__panel">
        <header className="investigation-graph__topbar">
          <div>
            <span>
              EVIDENCE-BACKED NETWORK ANALYSIS
            </span>

            <strong>
              {activeTitle}
            </strong>

            <small>
              Root node: {activeRootNodeId}
            </small>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close investigation graph"
          >
            ×
          </button>
        </header>

        <div className="investigation-graph__controls">
          <label>
            <span>Traversal depth</span>

            <select
              value={depth}
              onChange={(event) =>
                setDepth(
                  Number(
                    event.target.value,
                  ) as 1 | 2,
                )
              }
            >
              <option value={1}>
                1 hop
              </option>

              <option value={2}>
                2 hops
              </option>
            </select>
          </label>

          <label>
            <span>Maximum nodes</span>

            <select
              value={nodeLimit}
              onChange={(event) =>
                setNodeLimit(
                  Number(
                    event.target.value,
                  ),
                )
              }
            >
              {NODE_LIMIT_OPTIONS.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                ),
              )}
            </select>
          </label>

          <div className="investigation-graph__relationship-control">
            <div>
              <span>
                Relationship filters
              </span>

              <button
                type="button"
                onClick={
                  selectAllRelationships
                }
              >
                Select all
              </button>
            </div>

            <div className="investigation-graph__relationship-options">
              {RELATIONSHIP_TYPES.map(
                (relationshipType) => (
                  <label
                    key={relationshipType}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedRelationships.includes(
                          relationshipType,
                        )
                      }
                      onChange={() =>
                        toggleRelationship(
                          relationshipType,
                        )
                      }
                    />

                    <span>
                      {formatRelationship(
                        relationshipType,
                      )}
                    </span>
                  </label>
                ),
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="investigation-graph__state">
            <div className="investigation-graph__loader" />

            <strong>
              Building graph neighborhood
            </strong>

            <span>
              Resolving connected nodes and
              evidence-backed edges…
            </span>
          </div>
        )}

        {!loading && error && (
          <div className="investigation-graph__state investigation-graph__state--error">
            <strong>
              Graph unavailable
            </strong>

            <span>{error}</span>

            <button
              type="button"
              onClick={onClose}
            >
              Return to case
            </button>
          </div>
        )}

        {!loading && graph && (
          <>
            <div className="investigation-graph__summary">
              <div>
                <span>Nodes</span>
                <strong>
                  {graph.nodes.length}
                </strong>
              </div>

              <div>
                <span>Edges</span>
                <strong>
                  {graph.edges.length}
                </strong>
              </div>

              <div>
                <span>Depth</span>
                <strong>
                  {graph.depth}
                </strong>
              </div>

              <div>
                <span>Node cap</span>
                <strong>
                  {graph.nodeLimit}
                </strong>
              </div>
            </div>

            {graph.truncated && (
              <div className="investigation-graph__warning">
                <strong>
                  Neighborhood truncated
                </strong>

                <span>
                  More connected nodes exist.
                  Increase the node cap or narrow
                  the relationship filters.
                </span>
              </div>
            )}

            <div className="investigation-graph__workspace">
              <main className="investigation-graph__canvas">
                {graph.nodes.length === 0 ? (
                  <EmptyState>
                    No graph nodes matched the
                    selected filters.
                  </EmptyState>
                ) : (
                  <svg
                    viewBox={
                      `0 0 ${GRAPH_WIDTH} ` +
                      GRAPH_HEIGHT
                    }
                    role="img"
                    aria-label="Case investigation network"
                  >
                    <g className="investigation-graph__edges">
                      {graph.edges.map(
                        (edge) => {
                          const source =
                            positionedById.get(
                              edge.sourceNodeId,
                            );

                          const target =
                            positionedById.get(
                              edge.targetNodeId,
                            );

                          if (
                            !source ||
                            !target
                          ) {
                            return null;
                          }

                          const highlighted =
                            edge.sourceNodeId ===
                              selectedNodeId ||
                            edge.targetNodeId ===
                              selectedNodeId;

                          return (
                            <line
                              key={edge.edgeId}
                              x1={source.x}
                              y1={source.y}
                              x2={target.x}
                              y2={target.y}
                              className={
                                highlighted
                                  ? 'investigation-graph__edge investigation-graph__edge--highlighted'
                                  : 'investigation-graph__edge'
                              }
                            >
                              <title>
                                {formatRelationship(
                                  edge.relationshipType,
                                )}
                                {' · '}
                                {formatConfidence(
                                  edge.confidence,
                                )}
                                {' · '}
                                {
                                  edge.evidenceBasis
                                }
                              </title>
                            </line>
                          );
                        },
                      )}
                    </g>

                    <g>
                      {positionedNodes.map(
                        ({
                          node,
                          x,
                          y,
                        }) => {
                          const selected =
                            node.nodeId ===
                            selectedNodeId;

                          const root =
                            node.nodeId ===
                            graph.rootNodeId;

                          return (
                            <g
                              key={node.nodeId}
                              transform={
                                `translate(${x} ${y})`
                              }
                              className={nodeClassName(
                                node,
                                selected,
                                graph.rootNodeId,
                              )}
                              role="button"
                              tabIndex={0}
                              onClick={() =>
                                setSelectedNodeId(
                                  node.nodeId,
                                )
                              }
                              onKeyDown={(
                                event,
                              ) => {
                                if (
                                  event.key ===
                                    'Enter' ||
                                  event.key ===
                                    ' '
                                ) {
                                  event.preventDefault();

                                  setSelectedNodeId(
                                    node.nodeId,
                                  );
                                }
                              }}
                            >
                              {root && (
                                <circle
                                  className="investigation-graph__root-ring"
                                  r={31}
                                />
                              )}

                              <circle
                                className="investigation-graph__node-circle"
                                r={
                                  root
                                    ? 22
                                    : 15
                                }
                              />

                              <text
                                className="investigation-graph__node-type"
                                textAnchor="middle"
                                y={
                                  root
                                    ? 4
                                    : 3
                                }
                              >
                                {node.nodeType.slice(
                                  0,
                                  3,
                                )}
                              </text>

                              <text
                                className="investigation-graph__node-label"
                                textAnchor="middle"
                                y={
                                  root
                                    ? 43
                                    : 34
                                }
                              >
                                {shortenLabel(
                                  node.label,
                                )}
                              </text>

                              <title>
                                {node.label}
                                {' · '}
                                {node.nodeId}
                              </title>
                            </g>
                          );
                        },
                      )}
                    </g>
                  </svg>
                )}
              </main>

              <aside className="investigation-graph__inspector">
                {!selectedNode ? (
                  <EmptyState>
                    Select a graph node to inspect
                    its connections.
                  </EmptyState>
                ) : (
                  <>
                    <header>
                      <span>
                        SELECTED NODE
                      </span>

                      <h3>
                        {selectedNode.label}
                      </h3>

                      <small>
                        {selectedNode.nodeId}
                      </small>
                    </header>

                    <div className="investigation-graph__node-facts">
                      <div>
                        <span>Type</span>
                        <strong>
                          {
                            selectedNode
                              .nodeType
                          }
                        </strong>
                      </div>

                      <div>
                        <span>Category</span>
                        <strong>
                          {selectedNode
                            .category ??
                            'Unavailable'}
                        </strong>
                      </div>

                      <div>
                        <span>District ID</span>
                        <strong>
                          {selectedNode
                            .districtId ??
                            'Unavailable'}
                        </strong>
                      </div>

                      <div>
                        <span>Location ID</span>
                        <strong>
                          {selectedNode
                            .locationId ??
                            'Unavailable'}
                        </strong>
                      </div>
                    </div>

                    <div className="investigation-graph__node-actions">
                      {canRecenterSelectedNode && (
                        <button
                          type="button"
                          onClick={recenterOnSelectedNode}
                        >
                          <span>
                            Recenter network
                          </span>

                          <strong>
                            Explore from this{' '}
                            {selectedNode?.nodeType ===
                            'CASE'
                              ? 'case'
                              : 'person'}
                            {' '}→
                          </strong>
                        </button>
                      )}

                      {selectedPersonId !== null && (
                        <button
                          type="button"
                          onClick={() =>
                            onOpenEntity(
                              selectedPersonId,
                            )
                          }
                        >
                          <span>
                            Canonical person
                          </span>

                          <strong>
                            Open entity profile →
                          </strong>
                        </button>
                      )}

                      {activeRootNodeId !== rootNodeId && (
                        <button
                          type="button"
                          className="investigation-graph__node-action--secondary"
                          onClick={returnToStartingRoot}
                        >
                          <span>
                            Starting point
                          </span>

                          <strong>
                            Return to original root
                          </strong>
                        </button>
                      )}
                    </div>

                    <section className="investigation-graph__connections">
                      <header>
                        <h4>
                          Connected evidence
                        </h4>

                        <span>
                          {selectedEdges.length}
                        </span>
                      </header>

                      {selectedEdges.length ===
                      0 ? (
                        <EmptyState>
                          No edges connect to this
                          node in the current view.
                        </EmptyState>
                      ) : (
                        <div>
                          {selectedEdges.map(
                            (edge) => {
                              const otherNodeId =
                                getOtherNodeId(
                                  edge,
                                  selectedNodeId,
                                );

                              const otherNode =
                                nodesById.get(
                                  otherNodeId,
                                );

                              return (
                                <article
                                  key={
                                    edge.edgeId
                                  }
                                >
                                  <header>
                                    <strong>
                                      {formatRelationship(
                                        edge.relationshipType,
                                      )}
                                    </strong>

                                    <span>
                                      {formatConfidence(
                                        edge.confidence,
                                      )}
                                    </span>
                                  </header>

                                  <p>
                                    {otherNode
                                      ?.label ??
                                      otherNodeId}
                                  </p>

                                  <small>
                                    {
                                      edge.evidenceBasis
                                    }
                                  </small>

                                  <footer>
                                    <span>
                                      {
                                        edge.edgeId
                                      }
                                    </span>

                                    <span>
                                      Case{' '}
                                      {edge.caseId ??
                                        'N/A'}
                                    </span>
                                  </footer>
                                </article>
                              );
                            },
                          )}
                        </div>
                      )}
                    </section>
                  </>
                )}
              </aside>
            </div>

            <div className="investigation-graph__legend">
              {[
                'CASE',
                'PERSON',
                'IDENTIFIER',
                'ACCOUNT',
                'LOCATION',
                'GANG',
              ].map((nodeType) => (
                <span key={nodeType}>
                  <i
                    className={
                      `investigation-graph__legend-dot ` +
                      `investigation-graph__legend-dot--${nodeType.toLowerCase()}`
                    }
                  />

                  {nodeType}
                </span>
              ))}
            </div>
          </>
        )}
      </section>
    </div>,
    document.body,
  );
}
