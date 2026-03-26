// Verifies: FR-WFD-008 — Tests for WorkflowDetailPage

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { WorkflowDetailPage } from '../../src/pages/WorkflowDetailPage';
import type { Workflow, WorkflowFlowResponse } from '../../src/hooks/useWorkflows';
import { StageType, WorkItemStatus, WorkItemRoute, RuleOperator, ConsensusRule } from '../../../Shared/types/workflow';

// Mock the hooks
const mockUseWorkflow = vi.fn();
const mockUseWorkflowFlow = vi.fn();

vi.mock('../../src/hooks/useWorkflows', () => ({
  useWorkflow: (...args: unknown[]) => mockUseWorkflow(...args),
  useWorkflowFlow: (...args: unknown[]) => mockUseWorkflowFlow(...args),
}));

// Mock the flow diagram to isolate page tests
vi.mock('../../src/components/WorkflowFlowDiagram', () => ({
  WorkflowFlowDiagram: ({ nodes, edges }: { nodes: unknown[]; edges: unknown[] }) => (
    <div data-testid="flow-diagram">
      Flow diagram: {nodes.length} nodes, {edges.length} edges
    </div>
  ),
}));

const sampleWorkflow: Workflow = {
  id: 'wf-1',
  name: 'Feature Processing Pipeline',
  description: 'Default workflow for feature processing',
  stages: [
    { id: 'intake', name: 'Input Sources', type: StageType.Intake, order: 0, description: 'Inputs', statusMapping: WorkItemStatus.Backlog },
    { id: 'queue', name: 'Work Backlog', type: StageType.Queue, order: 1, description: 'Queue', statusMapping: WorkItemStatus.Backlog },
    { id: 'router', name: 'Work Router', type: StageType.Router, order: 2, description: 'Router', statusMapping: WorkItemStatus.Routing },
    { id: 'assessment', name: 'Assessment Pod', type: StageType.Assessment, order: 3, description: 'Assessment', statusMapping: WorkItemStatus.Reviewing },
    { id: 'worklist', name: 'Approved Work', type: StageType.Worklist, order: 4, description: 'Worklist', statusMapping: WorkItemStatus.Approved },
    { id: 'dispatch', name: 'Team Dispatch', type: StageType.Dispatch, order: 5, description: 'Dispatch', statusMapping: WorkItemStatus.InProgress },
  ],
  routingRules: [
    {
      id: 'rule-1',
      name: 'Fast-track trivial bugs',
      path: WorkItemRoute.FastTrack,
      conditions: [
        { field: 'type', operator: RuleOperator.Equals, value: 'bug' },
        { field: 'complexity', operator: RuleOperator.In, value: ['trivial', 'small'] },
      ],
      priority: 1,
    },
    {
      id: 'rule-2',
      name: 'Full review for features',
      path: WorkItemRoute.FullReview,
      conditions: [{ field: 'type', operator: RuleOperator.Equals, value: 'feature' }],
      priority: 2,
    },
  ],
  assessmentConfig: {
    roles: [
      { id: 'pod-lead', name: 'Pod Lead', description: 'Leads assessment' },
      { id: 'req-reviewer', name: 'Requirements Reviewer', description: 'Reviews requirements' },
      { id: 'domain-expert', name: 'Domain Expert', description: 'Domain knowledge' },
      { id: 'work-definer', name: 'Work Definer', description: 'Defines work details' },
    ],
    consensusRule: ConsensusRule.AllApprove,
  },
  teamTargets: ['TheATeam', 'TheFixer'],
  isDefault: true,
  isActive: true,
  createdAt: '2026-03-26T00:00:00.000Z',
  updatedAt: '2026-03-26T00:00:00.000Z',
};

const sampleFlow: WorkflowFlowResponse = {
  nodes: [
    { id: 'n1', type: 'input', label: 'Browser', x: 0, y: 0, width: 100, height: 30 },
    { id: 'n2', type: 'queue', label: 'Backlog', x: 150, y: 0, width: 120, height: 40 },
  ],
  edges: [
    { id: 'e1', source: 'n1', target: 'n2', style: 'solid' },
  ],
};

function renderPage(path = '/workflows/wf-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/workflows/:id" element={<WorkflowDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkflowDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-WFD-008 — Loading state
  it('shows loading state', () => {
    mockUseWorkflow.mockReturnValue({ workflow: null, loading: true, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: null, loading: true, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('workflow-detail-loading')).toBeInTheDocument();
    expect(screen.getByText('Loading workflow...')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Error state
  it('shows error state', () => {
    mockUseWorkflow.mockReturnValue({ workflow: null, loading: false, error: 'Not found', refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: null, loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('workflow-detail-error')).toBeInTheDocument();
    expect(screen.getByText(/Not found/)).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Not found state
  it('shows not found when workflow is null', () => {
    mockUseWorkflow.mockReturnValue({ workflow: null, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: null, loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('workflow-not-found')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Header with name, description, badges
  it('renders workflow header with name, description, and badges', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('workflow-detail-page')).toBeInTheDocument();
    expect(screen.getByText('Feature Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Default workflow for feature processing')).toBeInTheDocument();
    expect(screen.getByTestId('default-badge')).toHaveTextContent('Default');
    expect(screen.getByTestId('active-badge')).toHaveTextContent('Active');
  });

  // Verifies: FR-WFD-008 — Inactive badge when workflow is inactive
  it('shows Inactive badge for inactive workflow', () => {
    const inactive = { ...sampleWorkflow, isActive: false, isDefault: false };
    mockUseWorkflow.mockReturnValue({ workflow: inactive, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('active-badge')).toHaveTextContent('Inactive');
    expect(screen.queryByTestId('default-badge')).not.toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Flow diagram component receives data
  it('renders flow diagram with node and edge data', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    const diagram = screen.getByTestId('flow-diagram');
    expect(diagram).toBeInTheDocument();
    expect(diagram).toHaveTextContent('2 nodes');
    expect(diagram).toHaveTextContent('1 edges');
  });

  // Verifies: FR-WFD-008 — Routing rules panel
  it('renders routing rules table', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('routing-rules-panel')).toBeInTheDocument();
    expect(screen.getByText('Fast-track trivial bugs')).toBeInTheDocument();
    expect(screen.getByText('Full review for features')).toBeInTheDocument();
    expect(screen.getByText('fast-track')).toBeInTheDocument();
    expect(screen.getByText('full-review')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Assessment config panel with roles and consensus rule
  it('renders assessment configuration', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('assessment-config-panel')).toBeInTheDocument();
    expect(screen.getByTestId('consensus-rule')).toHaveTextContent('all-approve');
    expect(screen.getByText('Pod Lead')).toBeInTheDocument();
    expect(screen.getByText('Requirements Reviewer')).toBeInTheDocument();
    expect(screen.getByText('Domain Expert')).toBeInTheDocument();
    expect(screen.getByText('Work Definer')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Team targets panel
  it('renders team targets', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('team-targets-panel')).toBeInTheDocument();
    expect(screen.getByText('TheATeam')).toBeInTheDocument();
    expect(screen.getByText('TheFixer')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-008 — Back link to workflows list
  it('renders back link to workflows list', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage();

    const backLink = screen.getByText('← Workflows');
    expect(backLink).toBeInTheDocument();
    expect(backLink.closest('a')).toHaveAttribute('href', '/workflows');
  });

  // Verifies: FR-WFD-008 — Passes correct id to hooks
  it('passes route param id to hooks', () => {
    mockUseWorkflow.mockReturnValue({ workflow: sampleWorkflow, loading: false, error: null, refresh: vi.fn() });
    mockUseWorkflowFlow.mockReturnValue({ flow: sampleFlow, loading: false, error: null, refresh: vi.fn() });
    renderPage('/workflows/my-workflow-id');

    expect(mockUseWorkflow).toHaveBeenCalledWith('my-workflow-id');
    expect(mockUseWorkflowFlow).toHaveBeenCalledWith('my-workflow-id');
  });
});
