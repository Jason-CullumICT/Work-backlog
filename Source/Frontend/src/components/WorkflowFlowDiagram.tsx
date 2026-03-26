// Verifies: FR-WFD-008 — Visual SVG flow diagram rendering pipeline stages

import type { FlowNode, FlowEdge } from '../hooks/useWorkflows';

interface WorkflowFlowDiagramProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

// Verifies: FR-WFD-008 — Color scheme: neutral/professional colors
const NODE_COLORS: Record<FlowNode['type'], { fill: string; stroke: string; text: string }> = {
  'input': { fill: '#f0f9ff', stroke: '#0284c7', text: '#0c4a6e' },
  'queue': { fill: '#fefce8', stroke: '#ca8a04', text: '#713f12' },
  'router': { fill: '#fef2f2', stroke: '#dc2626', text: '#7f1d1d' },
  'assessment-pod': { fill: '#f0fdf4', stroke: '#16a34a', text: '#14532d' },
  'assessment-role': { fill: '#ecfdf5', stroke: '#059669', text: '#064e3b' },
  'worklist': { fill: '#fffbeb', stroke: '#d97706', text: '#78350f' },
  'dispatch': { fill: '#faf5ff', stroke: '#9333ea', text: '#581c87' },
  'team': { fill: '#f8fafc', stroke: '#475569', text: '#1e293b' },
};

// Verifies: FR-WFD-008 — Render each node shape based on type
function renderNode(node: FlowNode): JSX.Element {
  const colors = NODE_COLORS[node.type];
  const key = `node-${node.id}`;

  switch (node.type) {
    // Verifies: FR-WFD-008 — Input sources as rounded rectangles on left
    case 'input':
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type="input">
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={node.height / 2}
            ry={node.height / 2}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
          />
          <text
            x={node.x + node.width / 2}
            y={node.y + node.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={11}
            fontWeight={500}
          >
            {node.label}
          </text>
        </g>
      );

    // Verifies: FR-WFD-008 — Queue node as rectangle
    case 'queue':
    case 'worklist':
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type={node.type}>
          <rect
            x={node.x}
            y={node.y}
            width={node.width}
            height={node.height}
            rx={4}
            ry={4}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
          />
          <text
            x={node.x + node.width / 2}
            y={node.y + node.height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={12}
            fontWeight={600}
          >
            {node.label}
          </text>
        </g>
      );

    // Verifies: FR-WFD-008 — Router and dispatch as diamond shapes
    case 'router':
    case 'dispatch': {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const hw = node.width / 2;
      const hh = node.height / 2;
      const points = `${cx},${cy - hh} ${cx + hw},${cy} ${cx},${cy + hh} ${cx - hw},${cy}`;
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type={node.type}>
          <polygon
            points={points}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={11}
            fontWeight={600}
          >
            {node.label}
          </text>
        </g>
      );
    }

    // Verifies: FR-WFD-008 — Assessment pod as large circle containing role nodes
    case 'assessment-pod': {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const r = Math.min(node.width, node.height) / 2;
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type="assessment-pod">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={2}
          />
          <text
            x={cx}
            y={node.y + 16}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={11}
            fontWeight={600}
          >
            {node.label}
          </text>
        </g>
      );
    }

    // Verifies: FR-WFD-008 — Assessment roles as small circles inside the pod
    case 'assessment-role': {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const r = Math.min(node.width, node.height) / 2;
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type="assessment-role">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={9}
            fontWeight={500}
          >
            {node.label}
          </text>
        </g>
      );
    }

    // Verifies: FR-WFD-008 — Team nodes as circles
    case 'team': {
      const cx = node.x + node.width / 2;
      const cy = node.y + node.height / 2;
      const r = Math.min(node.width, node.height) / 2;
      return (
        <g key={key} data-testid={`node-${node.id}`} data-node-type="team">
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={colors.fill}
            stroke={colors.stroke}
            strokeWidth={1.5}
          />
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="central"
            fill={colors.text}
            fontSize={11}
            fontWeight={600}
          >
            {node.label}
          </text>
        </g>
      );
    }
  }
}

// Verifies: FR-WFD-008 — Edges: SVG path elements. Dashed for fast-track, solid for full-review
function renderEdge(edge: FlowEdge, nodesById: Map<string, FlowNode>): JSX.Element | null {
  const source = nodesById.get(edge.source);
  const target = nodesById.get(edge.target);
  if (!source || !target) return null;

  const sx = source.x + source.width;
  const sy = source.y + source.height / 2;
  const tx = target.x;
  const ty = target.y + target.height / 2;

  // For diamond nodes (router/dispatch), connect from the right point
  let startX = sx;
  let startY = sy;
  if (source.type === 'router' || source.type === 'dispatch') {
    startX = source.x + source.width / 2 + source.width / 2;
    startY = source.y + source.height / 2;
  }

  // For diamond targets, connect to the left point
  let endX = tx;
  let endY = ty;
  if (target.type === 'router' || target.type === 'dispatch') {
    endX = target.x + target.width / 2 - target.width / 2;
    endY = target.y + target.height / 2;
  }

  // For circle targets (team, assessment-pod), connect to the left edge
  if (target.type === 'team' || target.type === 'assessment-pod') {
    endX = target.x;
    endY = target.y + target.height / 2;
  }

  const isDashed = edge.style === 'dashed';
  const midX = (startX + endX) / 2;

  // Smooth cubic bezier path
  const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;

  return (
    <g key={`edge-${edge.id}`} data-testid={`edge-${edge.id}`}>
      <path
        d={path}
        fill="none"
        stroke="#94a3b8"
        strokeWidth={1.5}
        strokeDasharray={isDashed ? '6,4' : undefined}
        markerEnd="url(#arrowhead)"
      />
      {edge.label && (
        <text
          x={midX}
          y={(startY + endY) / 2 - 8}
          textAnchor="middle"
          fill="#64748b"
          fontSize={10}
          fontStyle="italic"
        >
          {edge.label}
        </text>
      )}
    </g>
  );
}

// Verifies: FR-WFD-008 — Responsive SVG flow diagram with viewBox
export const WorkflowFlowDiagram: React.FC<WorkflowFlowDiagramProps> = ({ nodes, edges }) => {
  if (nodes.length === 0) {
    return (
      <div data-testid="flow-diagram-empty" style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>
        No flow data available.
      </div>
    );
  }

  // Calculate viewBox from node positions
  const maxX = Math.max(...nodes.map((n) => n.x + n.width)) + 40;
  const maxY = Math.max(...nodes.map((n) => n.y + n.height)) + 40;
  const minX = Math.min(...nodes.map((n) => n.x)) - 20;
  const minY = Math.min(...nodes.map((n) => n.y)) - 20;

  const nodesById = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div data-testid="flow-diagram" style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        width="100%"
        style={{ minHeight: '300px', maxHeight: '500px' }}
        role="img"
        aria-label="Workflow flow diagram"
      >
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>

        {/* Render edges first (below nodes) */}
        {edges.map((edge) => renderEdge(edge, nodesById))}

        {/* Render nodes on top */}
        {nodes.map((node) => renderNode(node))}
      </svg>
    </div>
  );
};
