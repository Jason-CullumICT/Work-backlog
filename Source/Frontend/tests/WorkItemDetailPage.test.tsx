// Verifies: FR-WF-011 (Work Item detail page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkItemDetailPage } from '../src/pages/WorkItemDetailPage';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../src/api/client', () => ({
  workItemsApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    route: vi.fn(),
    assess: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    dispatch: vi.fn(),
  },
  dashboardApi: {
    summary: vi.fn(),
    activity: vi.fn(),
    queue: vi.fn(),
  },
}));

import { workItemsApi } from '../src/api/client';

// Verifies: FR-WF-011 — test fixture: backlog item
const mockBacklogItem = {
  id: 'id-001',
  docId: 'WI-001',
  title: 'Implement user auth',
  description: 'Full authentication flow with OAuth2 support',
  type: 'feature',
  status: 'backlog',
  priority: 'high',
  source: 'browser',
  complexity: undefined,
  route: undefined,
  assignedTeam: undefined,
  changeHistory: [
    {
      timestamp: '2026-03-20T10:00:00Z',
      agent: 'system',
      field: 'status',
      oldValue: null,
      newValue: 'backlog',
      reason: 'Auto-routed on creation',
    },
  ],
  assessments: [],
  createdAt: '2026-03-20T10:00:00Z',
  updatedAt: '2026-03-20T10:00:00Z',
};

// Verifies: FR-WF-011 — test fixture: proposed item with assessments
const mockProposedItem = {
  ...mockBacklogItem,
  id: 'id-002',
  docId: 'WI-002',
  status: 'proposed',
  complexity: 'large',
  route: 'full-review',
  assessments: [
    {
      role: 'pod-lead',
      verdict: 'approve',
      notes: 'Looks good to proceed',
      suggestedChanges: ['Add rate limiting'],
      timestamp: '2026-03-21T12:00:00Z',
    },
    {
      role: 'domain-expert',
      verdict: 'reject',
      notes: 'Missing edge case handling',
      suggestedChanges: [],
      timestamp: '2026-03-21T12:05:00Z',
    },
  ],
};

// Verifies: FR-WF-011 — test fixture: approved item
const mockApprovedItem = {
  ...mockBacklogItem,
  id: 'id-003',
  docId: 'WI-003',
  status: 'approved',
  complexity: 'small',
  route: 'fast-track',
};

function renderDetailPage(id: string = 'id-001') {
  return render(
    <MemoryRouter initialEntries={[`/work-items/${id}`]}>
      <Routes>
        <Route path="/work-items/:id" element={<WorkItemDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkItemDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockBacklogItem);
  });

  // Verifies: FR-WF-011 — Loading state
  it('shows loading indicator initially', () => {
    renderDetailPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Header with docId, title, status badge, priority badge
  it('renders header with docId, title, and badges', async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText('WI-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Implement user auth')).toBeInTheDocument();
    // Status and priority badges (use getAllByText since 'backlog' also appears in history)
    expect(screen.getAllByText('backlog').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Detail section shows description and metadata
  it('renders detail section with description and fields', async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.getByText('Full authentication flow with OAuth2 support')).toBeInTheDocument();
    expect(screen.getByText('feature')).toBeInTheDocument();
    expect(screen.getByText('browser')).toBeInTheDocument();
    expect(screen.getByText('Not assessed')).toBeInTheDocument();
    expect(screen.getByText('Not routed')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Back button navigates to list
  it('navigates back to list when back button is clicked', async () => {
    const user = userEvent.setup();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByText(/Back to list/)).toBeInTheDocument();
    });
    await user.click(screen.getByText(/Back to list/));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items');
  });

  // Verifies: FR-WF-011 — Route button shown when status=backlog
  it('shows Route button when status is backlog', async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });
    expect(screen.getByTestId('actions-section')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Route action calls API
  it('calls route API when Route button is clicked', async () => {
    (workItemsApi.route as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockBacklogItem,
      status: 'routing',
    });
    const user = userEvent.setup();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('action-route'));
    await waitFor(() => {
      expect(workItemsApi.route).toHaveBeenCalledWith('id-001');
    });
  });

  // Verifies: FR-WF-011 — Approve/Reject buttons shown when status=proposed
  it('shows Approve and Reject buttons when status is proposed', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-reject')).toBeInTheDocument();
    expect(screen.getByTestId('reject-reason')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Approve action calls API
  it('calls approve API when Approve button is clicked', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    (workItemsApi.approve as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockProposedItem,
      status: 'approved',
    });
    const user = userEvent.setup();
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('action-approve'));
    await waitFor(() => {
      expect(workItemsApi.approve).toHaveBeenCalledWith('id-002');
    });
  });

  // Verifies: FR-WF-011 — Reject requires reason
  it('disables Reject button when reason is empty', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('action-reject')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-reject')).toBeDisabled();
  });

  // Verifies: FR-WF-011 — Reject action calls API with reason
  it('calls reject API with reason when Reject button is clicked', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    (workItemsApi.reject as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockProposedItem,
      status: 'rejected',
    });
    const user = userEvent.setup();
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('reject-reason')).toBeInTheDocument();
    });
    await user.type(screen.getByTestId('reject-reason'), 'Incomplete requirements');
    await user.click(screen.getByTestId('action-reject'));
    await waitFor(() => {
      expect(workItemsApi.reject).toHaveBeenCalledWith('id-002', {
        reason: 'Incomplete requirements',
      });
    });
  });

  // Verifies: FR-WF-011 — Dispatch button with team selector when status=approved
  it('shows Dispatch button with team selector when status is approved', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockApprovedItem);
    renderDetailPage('id-003');
    await waitFor(() => {
      expect(screen.getByTestId('action-dispatch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('dispatch-team-select')).toBeInTheDocument();
    expect(screen.getByLabelText('Select team')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Dispatch calls API with selected team
  it('calls dispatch API with selected team', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockApprovedItem);
    (workItemsApi.dispatch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockApprovedItem,
      status: 'in-progress',
      assignedTeam: 'TheFixer',
    });
    const user = userEvent.setup();
    renderDetailPage('id-003');
    await waitFor(() => {
      expect(screen.getByTestId('dispatch-team-select')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByTestId('dispatch-team-select'), 'TheFixer');
    await user.click(screen.getByTestId('action-dispatch'));
    await waitFor(() => {
      expect(workItemsApi.dispatch).toHaveBeenCalledWith('id-003', { team: 'TheFixer' });
    });
  });

  // Verifies: FR-WF-011 — Assessment records rendered
  it('renders assessment cards when assessments exist', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('assessments-section')).toBeInTheDocument();
    });
    const cards = screen.getAllByTestId('assessment-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('pod-lead')).toBeInTheDocument();
    expect(screen.getByText('domain-expert')).toBeInTheDocument();
    expect(screen.getByText('Looks good to proceed')).toBeInTheDocument();
    expect(screen.getByText('Missing edge case handling')).toBeInTheDocument();
    expect(screen.getByText('Add rate limiting')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Verdict badges displayed
  it('renders verdict badges on assessment cards', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProposedItem);
    renderDetailPage('id-002');
    await waitFor(() => {
      expect(screen.getByTestId('assessments-section')).toBeInTheDocument();
    });
    const badges = screen.getAllByTestId('verdict-badge');
    expect(badges).toHaveLength(2);
    expect(badges[0]).toHaveTextContent('approve');
    expect(badges[1]).toHaveTextContent('reject');
  });

  // Verifies: FR-WF-011 — Change history timeline
  it('renders change history entries', async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('history-section')).toBeInTheDocument();
    });
    const entries = screen.getAllByTestId('history-entry');
    expect(entries).toHaveLength(1);
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('status')).toBeInTheDocument();
    // Use getAllByText since 'backlog' appears in both the status badge and history entry
    expect(screen.getAllByText('backlog').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Auto-routed/)).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — No assessments section when empty
  it('hides assessments section when no assessments exist', async () => {
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('history-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('assessments-section')).not.toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — No actions for completed items
  it('hides actions section for completed items', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockBacklogItem,
      status: 'completed',
    });
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('actions-section')).not.toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Error state
  it('shows error when API call fails', async () => {
    (workItemsApi.getById as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Item not found'),
    );
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Item not found')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 — Action error displayed
  it('shows action error when workflow action fails', async () => {
    (workItemsApi.route as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Invalid transition'),
    );
    const user = userEvent.setup();
    renderDetailPage();
    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('action-route'));
    await waitFor(() => {
      expect(screen.getByText('Invalid transition')).toBeInTheDocument();
    });
  });
});
