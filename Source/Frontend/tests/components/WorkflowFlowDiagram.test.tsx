// Verifies: FR-WFD-008 — Tests for WorkflowFlowDiagram SVG component

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowFlowDiagram } from '../../src/components/WorkflowFlowDiagram';
import type { FlowNode, FlowEdge } from '../../src/hooks/useWorkflows';

const sampleNodes: FlowNode[] = [
  { id: 'input-browser', type: 'input', label: 'Browser', x: 0, y: 20, width: 100, height: 30 },
  { id: 'input-zendesk', type: 'input', label: 'Zendesk', x: 0, y: 60, width: 100, height: 30 },
  { id: 'queue-backlog', type: 'queue', label: 'Work Backlog', x: 150, y: 40, width: 120, height: 40 },
  { id: 'router', type: 'router', label: 'Work Router', x: 320, y: 30, width: 80, height: 80 },
  { id: 'assessment-pod', type: 'assessment-pod', label: 'Assessment Pod', x: 450, y: 0, width: 160, height: 160 },
  { id: 'role-lead', type: 'assessment-role', label: 'Pod Lead', x: 490, y: 40, width: 60, height: 30 },
  { id: 'role-reviewer', type: 'assessment-role', label: 'Reviewer', x: 490, y: 90, width: 60, height: 30 },
  { id: 'worklist', type: 'worklist', label: 'Approved Work', x: 660, y: 40, width: 120, height: 40 },
  { id: 'dispatch', type: 'dispatch', label: 'Team Dispatch', x: 830, y: 30, width: 80, height: 80 },
  { id: 'team-a', type: 'team', label: 'TheATeam', x: 960, y: 20, width: 70, height: 70 },
  { id: 'team-b', type: 'team', label: 'TheFixer', x: 960, y: 100, width: 70, height: 70 },
];

const sampleEdges: FlowEdge[] = [
  { id: 'e1', source: 'input-browser', target: 'queue-backlog', style: 'solid' },
  { id: 'e2', source: 'input-zendesk', target: 'queue-backlog', style: 'solid' },
  { id: 'e3', source: 'queue-backlog', target: 'router', style: 'solid' },
  { id: 'e4', source: 'router', target: 'worklist', label: 'fast-track', style: 'dashed' },
  { id: 'e5', source: 'router', target: 'assessment-pod', label: 'full-review', style: 'solid' },
  { id: 'e6', source: 'assessment-pod', target: 'worklist', style: 'solid' },
  { id: 'e7', source: 'worklist', target: 'dispatch', style: 'solid' },
  { id: 'e8', source: 'dispatch', target: 'team-a', style: 'solid' },
  { id: 'e9', source: 'dispatch', target: 'team-b', style: 'solid' },
];

describe('WorkflowFlowDiagram', () => {
  // Verifies: FR-WFD-008 — Renders empty state when no nodes
  it('renders empty state when nodes array is empty', () => {
    render(<WorkflowFlowDiagram nodes={[]} edges={[]} />);
    expect(screen.getByTestId('flow-diagram-empty')).toBeInTheDocument();
    expect(screen.getByText('No flow data available.')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders SVG container
  it('renders flow diagram container with nodes', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    expect(screen.getByTestId('flow-diagram')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Workflow flow diagram' })).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders input nodes as rounded rectangles
  it('renders input nodes', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    expect(screen.getByTestId('node-input-browser')).toBeInTheDocument();
    expect(screen.getByTestId('node-input-zendesk')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('Zendesk')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders queue node
  it('renders queue node', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    expect(screen.getByTestId('node-queue-backlog')).toBeInTheDocument();
    expect(screen.getByText('Work Backlog')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders router as diamond
  it('renders router diamond node', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const routerNode = screen.getByTestId('node-router');
    expect(routerNode).toBeInTheDocument();
    expect(routerNode.getAttribute('data-node-type')).toBe('router');
    expect(routerNode.querySelector('polygon')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders assessment pod as circle with role nodes
  it('renders assessment pod with roles', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const podNode = screen.getByTestId('node-assessment-pod');
    expect(podNode).toBeInTheDocument();
    expect(podNode.getAttribute('data-node-type')).toBe('assessment-pod');
    expect(podNode.querySelector('circle')).toBeInTheDocument();

    expect(screen.getByTestId('node-role-lead')).toBeInTheDocument();
    expect(screen.getByTestId('node-role-reviewer')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders worklist node
  it('renders worklist node', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    expect(screen.getByTestId('node-worklist')).toBeInTheDocument();
    expect(screen.getByText('Approved Work')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders dispatch diamond and team circles
  it('renders dispatch diamond and team nodes', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const dispatchNode = screen.getByTestId('node-dispatch');
    expect(dispatchNode).toBeInTheDocument();
    expect(dispatchNode.querySelector('polygon')).toBeInTheDocument();

    expect(screen.getByTestId('node-team-a')).toBeInTheDocument();
    expect(screen.getByTestId('node-team-b')).toBeInTheDocument();
    expect(screen.getByText('TheATeam')).toBeInTheDocument();
    expect(screen.getByText('TheFixer')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Renders edges including dashed fast-track
  it('renders edges with labels', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    expect(screen.getByTestId('edge-e4')).toBeInTheDocument();
    expect(screen.getByText('fast-track')).toBeInTheDocument();
    expect(screen.getByText('full-review')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Fast-track edge uses dashed stroke
  it('renders fast-track edge as dashed', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const fastTrackEdge = screen.getByTestId('edge-e4');
    const path = fastTrackEdge.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('stroke-dasharray')).toBe('6,4');
  });

  // Verifies: FR-WFD-008 — Full-review edge uses solid stroke
  it('renders full-review edge as solid', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const fullReviewEdge = screen.getByTestId('edge-e5');
    const path = fullReviewEdge.querySelector('path');
    expect(path).toBeInTheDocument();
    expect(path?.getAttribute('stroke-dasharray')).toBeNull();
  });

  // Verifies: FR-WFD-008 — Responsive: uses viewBox
  it('SVG uses viewBox for responsive scaling', () => {
    render(<WorkflowFlowDiagram nodes={sampleNodes} edges={sampleEdges} />);
    const svg = screen.getByRole('img', { name: 'Workflow flow diagram' });
    expect(svg.getAttribute('viewBox')).toBeTruthy();
    expect(svg.getAttribute('width')).toBe('100%');
  });
});
