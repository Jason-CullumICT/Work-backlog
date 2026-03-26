// Verifies: FR-WFD-007 (tests for Workflow list page)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkflowListPage } from '../../src/pages/WorkflowListPage';
import type { Workflow } from '../../src/hooks/useWorkflows';
import { StageType, WorkItemStatus, ConsensusRule } from '../../../Shared/types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseWorkflows = vi.fn();
vi.mock('../../src/hooks/useWorkflows', () => ({
  useWorkflows: (...args: unknown[]) => mockUseWorkflows(...args),
}));

function makeWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return {
    id: 'wf-001',
    name: 'Feature Processing Pipeline',
    description: 'Main pipeline for processing features and bugs',
    stages: [
      { id: 'intake', name: 'Input Sources', type: StageType.Intake, order: 0, description: 'Entry point', statusMapping: WorkItemStatus.Backlog },
      { id: 'queue', name: 'Work Backlog', type: StageType.Queue, order: 1, description: 'Queue', statusMapping: WorkItemStatus.Backlog },
      { id: 'router', name: 'Work Router', type: StageType.Router, order: 2, description: 'Routes items', statusMapping: WorkItemStatus.Routing },
    ],
    routingRules: [],
    assessmentConfig: { roles: [], consensusRule: ConsensusRule.AllApprove },
    teamTargets: ['TheATeam', 'TheFixer'],
    isDefault: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-03-20T00:00:00Z',
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkflowListPage />
    </MemoryRouter>,
  );
}

describe('WorkflowListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWorkflows.mockReturnValue({ workflows: [], loading: false, error: null, refresh: vi.fn() });
  });

  // Verifies: FR-WFD-007 — Shows loading state
  it('shows loading indicator while fetching', () => {
    mockUseWorkflows.mockReturnValue({ workflows: [], loading: true, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-007 — Shows empty state when no workflows
  it('shows empty state when no workflows exist', () => {
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No workflows defined yet/)).toBeInTheDocument();
  });

  // Verifies: FR-WFD-007 — Shows error state
  it('shows error message when API call fails', () => {
    mockUseWorkflows.mockReturnValue({ workflows: [], loading: false, error: 'Network error', refresh: vi.fn() });
    renderPage();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  // Verifies: FR-WFD-007 — Renders workflow table with name, description, stage count, badges
  it('renders workflows in a table with name, description, stage count, status', async () => {
    const wf = makeWorkflow();
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();

    expect(screen.getByTestId('workflows-table')).toBeInTheDocument();
    expect(screen.getByText('Feature Processing Pipeline')).toBeInTheDocument();
    expect(screen.getByText(/Main pipeline for processing/)).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument(); // stage count
  });

  // Verifies: FR-WFD-007 — Shows default badge for default workflow
  it('shows Default badge for default workflow', () => {
    const wf = makeWorkflow({ isDefault: true });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('default-badge-wf-001')).toHaveTextContent('Default');
  });

  // Verifies: FR-WFD-007 — Does not show default badge for non-default workflow
  it('does not show Default badge for non-default workflow', () => {
    const wf = makeWorkflow({ id: 'wf-002', isDefault: false });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.queryByTestId('default-badge-wf-002')).not.toBeInTheDocument();
  });

  // Verifies: FR-WFD-007 — Shows Active/Inactive status indicator
  it('shows Active status for active workflow', () => {
    const wf = makeWorkflow({ isActive: true });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('status-badge-wf-001')).toHaveTextContent('Active');
  });

  it('shows Inactive status for inactive workflow', () => {
    const wf = makeWorkflow({ id: 'wf-003', isActive: false });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByTestId('status-badge-wf-003')).toHaveTextContent('Inactive');
  });

  // Verifies: FR-WFD-007 — Truncates long descriptions
  it('truncates long descriptions to 80 characters', () => {
    const longDesc = 'A'.repeat(100);
    const wf = makeWorkflow({ description: longDesc });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByText(`${'A'.repeat(80)}...`)).toBeInTheDocument();
  });

  // Verifies: FR-WFD-007 — Click row navigates to detail page
  it('navigates to detail page when row is clicked', async () => {
    const wf = makeWorkflow({ id: 'wf-abc' });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();

    await userEvent.click(screen.getByTestId('workflow-row-wf-abc'));
    expect(mockNavigate).toHaveBeenCalledWith('/workflows/wf-abc');
  });

  // Verifies: FR-WFD-007 — Create Workflow button navigates to /workflows/new
  it('navigates to create page when Create Workflow button is clicked', async () => {
    renderPage();
    await userEvent.click(screen.getByTestId('create-workflow-button'));
    expect(mockNavigate).toHaveBeenCalledWith('/workflows/new');
  });

  // Verifies: FR-WFD-007 — Refresh button calls refresh function
  it('calls refresh when Refresh button is clicked', async () => {
    const mockRefresh = vi.fn();
    mockUseWorkflows.mockReturnValue({ workflows: [], loading: false, error: null, refresh: mockRefresh });
    renderPage();
    await userEvent.click(screen.getByText('Refresh'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  // Verifies: FR-WFD-007 — Shows updated timestamp
  it('displays the updated timestamp', () => {
    const wf = makeWorkflow({ updatedAt: '2026-03-20T00:00:00Z' });
    mockUseWorkflows.mockReturnValue({ workflows: [wf], loading: false, error: null, refresh: vi.fn() });
    renderPage();
    expect(screen.getByText(new Date('2026-03-20T00:00:00Z').toLocaleDateString())).toBeInTheDocument();
  });
});
