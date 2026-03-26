// Verifies: FR-WF-011 (tests for Work Item detail page)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkItemDetailPage } from '../../src/pages/WorkItemDetailPage';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  AssessmentVerdict,
} from '../../../Shared/types/workflow';
import type { WorkItem } from '../../../Shared/types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/api/client', () => ({
  workItemsApi: {
    getById: vi.fn(),
    route: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    dispatch: vi.fn(),
  },
}));

import { workItemsApi } from '../../src/api/client';
const mockGetById = vi.mocked(workItemsApi.getById);
const mockRoute = vi.mocked(workItemsApi.route);
const mockReject = vi.mocked(workItemsApi.reject);
const mockDispatch = vi.mocked(workItemsApi.dispatch);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-uuid-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description for the work item',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Backlog,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function renderPage(id = 'test-uuid-1') {
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
  });

  // Verifies: FR-WF-011 (loading state)
  it('shows loading indicator while fetching', () => {
    mockGetById.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (error state)
  it('shows error when API fails', async () => {
    mockGetById.mockRejectedValue(new Error('Not found'));
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (header: docId, title, status badge, priority badge)
  it('renders header with docId, title, status and priority badges', async () => {
    const item = makeWorkItem({
      docId: 'WI-042',
      title: 'Add dark mode',
      status: WorkItemStatus.Approved,
      priority: WorkItemPriority.High,
    });
    mockGetById.mockResolvedValue(item);
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('WI-042')).toBeInTheDocument();
    });
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    expect(screen.getByText('approved')).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (detail section: description, type, source, complexity, route, assignedTeam)
  it('renders detail section with all fields', async () => {
    const item = makeWorkItem({
      description: 'Full description here',
      type: WorkItemType.Bug,
      source: WorkItemSource.Zendesk,
      complexity: 'large' as WorkItem['complexity'],
      route: 'fast-track' as WorkItem['route'],
      assignedTeam: 'TheFixer',
    });
    mockGetById.mockResolvedValue(item);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    const detail = within(screen.getByTestId('detail-section'));
    expect(detail.getByText('Full description here')).toBeInTheDocument();
    expect(detail.getByText('bug')).toBeInTheDocument();
    expect(detail.getByText('zendesk')).toBeInTheDocument();
    expect(detail.getByText('large')).toBeInTheDocument();
    expect(detail.getByText('fast-track')).toBeInTheDocument();
    expect(detail.getByText('TheFixer')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 ("Route" button shown when status=backlog)
  it('shows Route button when status is backlog', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Backlog }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-011 (Route action calls API and refreshes)
  it('calls route API when Route button clicked', async () => {
    const item = makeWorkItem({ status: WorkItemStatus.Backlog });
    mockGetById.mockResolvedValue(item);
    mockRoute.mockResolvedValue({ ...item, status: WorkItemStatus.Routing });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('action-route'));

    await waitFor(() => {
      expect(mockRoute).toHaveBeenCalledWith('test-uuid-1');
    });
  });

  // Verifies: FR-WF-011 ("Approve" and "Reject" buttons shown when status=proposed)
  it('shows Approve and Reject buttons when status is proposed', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Proposed }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-reject')).toBeInTheDocument();
    expect(screen.getByTestId('reject-reason')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (Approve/Reject also shown when status=reviewing)
  it('shows Approve and Reject buttons when status is reviewing', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Reviewing }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-approve')).toBeInTheDocument();
    });
    expect(screen.getByTestId('action-reject')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (Reject requires reason)
  it('disables reject button when reason is empty', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Proposed }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-reject')).toBeDisabled();
    });
  });

  // Verifies: FR-WF-011 (Reject with reason calls API)
  it('calls reject API with reason', async () => {
    const item = makeWorkItem({ status: WorkItemStatus.Proposed });
    mockGetById.mockResolvedValue(item);
    mockReject.mockResolvedValue({ ...item, status: WorkItemStatus.Rejected });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('reject-reason')).toBeInTheDocument();
    });

    await userEvent.type(screen.getByTestId('reject-reason'), 'Needs more detail');
    await userEvent.click(screen.getByTestId('action-reject'));

    await waitFor(() => {
      expect(mockReject).toHaveBeenCalledWith('test-uuid-1', { reason: 'Needs more detail' });
    });
  });

  // Verifies: FR-WF-011 ("Dispatch" button shown when status=approved, with team selection)
  it('shows Dispatch button with team selector when status is approved', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Approved }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-dispatch')).toBeInTheDocument();
    });
    expect(screen.getByTestId('dispatch-team-select')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (Dispatch calls API with selected team)
  it('calls dispatch API with selected team', async () => {
    const item = makeWorkItem({ status: WorkItemStatus.Approved });
    mockGetById.mockResolvedValue(item);
    mockDispatch.mockResolvedValue({ ...item, status: WorkItemStatus.InProgress, assignedTeam: 'TheFixer' });
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('dispatch-team-select')).toBeInTheDocument();
    });

    await userEvent.selectOptions(screen.getByTestId('dispatch-team-select'), 'TheFixer');
    await userEvent.click(screen.getByTestId('action-dispatch'));

    await waitFor(() => {
      expect(mockDispatch).toHaveBeenCalledWith('test-uuid-1', { team: 'TheFixer' });
    });
  });

  // Verifies: FR-WF-011 (no action buttons when status doesn't match any condition)
  it('shows no action buttons when status is completed', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ status: WorkItemStatus.Completed }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('actions-section')).not.toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (change history timeline)
  it('renders change history timeline', async () => {
    const item = makeWorkItem({
      changeHistory: [
        {
          timestamp: '2026-01-01T00:00:00Z',
          agent: 'system',
          field: 'status',
          oldValue: 'backlog',
          newValue: 'routing',
          reason: 'Auto-routed',
        },
        {
          timestamp: '2026-01-01T01:00:00Z',
          agent: 'pod-lead',
          field: 'status',
          oldValue: 'routing',
          newValue: 'approved',
        },
      ],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('history-section')).toBeInTheDocument();
    });
    const entries = screen.getAllByTestId('history-entry');
    expect(entries).toHaveLength(2);
    expect(screen.getByText(/Auto-routed/)).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (assessment records display)
  it('renders assessment cards with role, verdict, notes, and suggested changes', async () => {
    const item = makeWorkItem({
      assessments: [
        {
          role: 'requirements-reviewer',
          verdict: AssessmentVerdict.Approve,
          notes: 'Requirements are clear and testable',
          suggestedChanges: ['Add edge case for empty input'],
          timestamp: '2026-01-01T02:00:00Z',
        },
        {
          role: 'domain-expert',
          verdict: AssessmentVerdict.Reject,
          notes: 'Missing domain validation',
          suggestedChanges: [],
          timestamp: '2026-01-01T02:30:00Z',
        },
      ],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('assessments-section')).toBeInTheDocument();
    });
    const cards = screen.getAllByTestId('assessment-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('requirements-reviewer')).toBeInTheDocument();
    expect(screen.getByText('Requirements are clear and testable')).toBeInTheDocument();
    expect(screen.getByText('Add edge case for empty input')).toBeInTheDocument();
    expect(screen.getByText('Missing domain validation')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (verdict badges)
  it('renders verdict badges with correct text', async () => {
    const item = makeWorkItem({
      assessments: [
        {
          role: 'pod-lead',
          verdict: AssessmentVerdict.Approve,
          notes: 'Looks good',
          suggestedChanges: [],
          timestamp: '2026-01-01T02:00:00Z',
        },
      ],
    });
    mockGetById.mockResolvedValue(item);
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('verdict-badge')).toBeInTheDocument();
    });
    expect(screen.getByTestId('verdict-badge')).toHaveTextContent('approve');
  });

  // Verifies: FR-WF-011 (back to list navigation)
  it('navigates back to list when back button clicked', async () => {
    mockGetById.mockResolvedValue(makeWorkItem());
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/Back to list/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText(/Back to list/));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items');
  });

  // Verifies: FR-WF-011 (action error display)
  it('shows action error when API action fails', async () => {
    const item = makeWorkItem({ status: WorkItemStatus.Backlog });
    mockGetById.mockResolvedValue(item);
    mockRoute.mockRejectedValue(new Error('Invalid transition'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('action-route')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('action-route'));

    await waitFor(() => {
      expect(screen.getByText('Invalid transition')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-011 (empty assessments section not shown)
  it('does not render assessments section when there are none', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ assessments: [] }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('detail-section')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('assessments-section')).not.toBeInTheDocument();
  });

  // Verifies: FR-WF-011 (empty history shows message)
  it('shows empty history message when no entries', async () => {
    mockGetById.mockResolvedValue(makeWorkItem({ changeHistory: [] }));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No history entries')).toBeInTheDocument();
    });
  });
});
