// Verifies: FR-WF-010 (Work Item list page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkItemListPage } from '../src/pages/WorkItemListPage';

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

// Verifies: FR-WF-010 — test fixtures
const mockWorkItems = [
  {
    id: 'id-001',
    docId: 'WI-001',
    title: 'Add login feature',
    description: 'Implement login',
    type: 'feature',
    status: 'backlog',
    priority: 'high',
    source: 'browser',
    assignedTeam: 'TheATeam',
    changeHistory: [],
    assessments: [],
    createdAt: '2026-03-20T10:00:00Z',
    updatedAt: '2026-03-25T14:30:00Z',
  },
  {
    id: 'id-002',
    docId: 'WI-002',
    title: 'Fix crash on submit',
    description: 'App crashes',
    type: 'bug',
    status: 'in-progress',
    priority: 'critical',
    source: 'zendesk',
    assignedTeam: 'TheFixer',
    changeHistory: [],
    assessments: [],
    createdAt: '2026-03-21T08:00:00Z',
    updatedAt: '2026-03-26T09:00:00Z',
  },
];

const mockListResponse = {
  data: mockWorkItems,
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
};

function renderListPage() {
  return render(
    <MemoryRouter>
      <WorkItemListPage />
    </MemoryRouter>,
  );
}

describe('WorkItemListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(mockListResponse);
  });

  // Verifies: FR-WF-010 — Loading state shown
  it('shows loading indicator initially', () => {
    renderListPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Page heading
  it('renders page heading', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Work Items' })).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-010 — Filter controls present with labels
  it('renders filter controls with status, type, and priority dropdowns', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by type')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Table renders with correct headers
  it('renders work items table with correct column headers', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-items-table')).toBeInTheDocument();
    });
    expect(screen.getByText('Doc ID')).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByText('Team')).toBeInTheDocument();
    expect(screen.getByText('Updated')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Table rows display item data
  it('renders work item rows with data', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByText('WI-001')).toBeInTheDocument();
    });
    expect(screen.getByText('Add login feature')).toBeInTheDocument();
    expect(screen.getByText('WI-002')).toBeInTheDocument();
    expect(screen.getByText('Fix crash on submit')).toBeInTheDocument();
    expect(screen.getByTestId('work-item-row-id-001')).toBeInTheDocument();
    expect(screen.getByTestId('work-item-row-id-002')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Pagination controls rendered
  it('renders pagination controls with page info', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Page size')).toBeInTheDocument();
    expect(screen.getByText('Previous')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText(/Showing 2 of 2 items/)).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Row click navigates to detail page
  it('navigates to detail page when a row is clicked', async () => {
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-id-001')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('work-item-row-id-001'));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/id-001');
  });

  // Verifies: FR-WF-010 — Filter by status triggers API call with filter params
  it('filters by status and resets to page 1', async () => {
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByLabelText('Filter by status')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Filter by status'), 'backlog');
    await waitFor(() => {
      expect(workItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'backlog', page: 1 }),
      );
    });
  });

  // Verifies: FR-WF-010 — Filter by type
  it('filters by type', async () => {
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-items-table')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Filter by type'), 'feature');
    await waitFor(() => {
      expect(workItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'feature' }),
      );
    });
  });

  // Verifies: FR-WF-010 — Page size change
  it('changes page size and resets to page 1', async () => {
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });
    await user.selectOptions(screen.getByLabelText('Page size'), '50');
    await waitFor(() => {
      expect(workItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 1 }),
      );
    });
  });

  // Verifies: FR-WF-010 — Refresh button reloads data
  it('refreshes data when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('work-items-table')).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await waitFor(() => {
      expect(workItemsApi.list).toHaveBeenCalledTimes(2);
    });
  });

  // Verifies: FR-WF-010 — Error display
  it('shows error when API call fails', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network failure'));
    renderListPage();
    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Network failure')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 — Empty state
  it('shows empty state when no items match', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    renderListPage();
    await waitFor(() => {
      expect(screen.getByText('No work items found')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-010 — Previous button disabled on page 1
  it('disables Previous button on first page', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });
    expect(screen.getByText('Previous')).toBeDisabled();
  });

  // Verifies: FR-WF-010 — Next button disabled on last page
  it('disables Next button on last page', async () => {
    renderListPage();
    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });
    expect(screen.getByText('Next')).toBeDisabled();
  });

  // Verifies: FR-WF-010 — Pagination navigation works
  it('enables Next button and navigates when multiple pages exist', async () => {
    (workItemsApi.list as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockListResponse,
      total: 50,
      totalPages: 3,
    });
    const user = userEvent.setup();
    renderListPage();
    await waitFor(() => {
      expect(screen.getByText('Next')).not.toBeDisabled();
    });
    await user.click(screen.getByText('Next'));
    await waitFor(() => {
      expect(workItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
      );
    });
  });
});
