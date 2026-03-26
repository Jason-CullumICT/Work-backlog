// Verifies: FR-WF-010 (tests for Work Item list page)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WorkItemListPage } from '../../src/pages/WorkItemListPage';
import {
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';
import type { WorkItem, PaginatedWorkItemsResponse } from '../../../Shared/types/workflow';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('../../src/api/client', () => ({
  workItemsApi: {
    list: vi.fn(),
  },
}));

import { workItemsApi } from '../../src/api/client';
const mockList = vi.mocked(workItemsApi.list);

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-uuid-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description',
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

function makePaginatedResponse(
  items: WorkItem[] = [],
  page = 1,
  total?: number,
): PaginatedWorkItemsResponse {
  return {
    data: items,
    page,
    limit: 20,
    total: total ?? items.length,
    totalPages: Math.ceil((total ?? items.length) / 20) || 1,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WorkItemListPage />
    </MemoryRouter>,
  );
}

describe('WorkItemListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue(makePaginatedResponse());
  });

  // Verifies: FR-WF-010 (renders loading state)
  it('shows loading indicator while fetching', () => {
    mockList.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 (renders empty state)
  it('shows empty state when no items returned', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No work items found')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-010 (renders work items table with all columns)
  it('renders work items in a table with docId, title, type, status, priority, team, updated', async () => {
    const item = makeWorkItem({
      docId: 'WI-042',
      title: 'Fix login bug',
      type: WorkItemType.Bug,
      status: WorkItemStatus.InProgress,
      priority: WorkItemPriority.High,
      assignedTeam: 'TheFixer',
    });
    mockList.mockResolvedValue(makePaginatedResponse([item]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('WI-042')).toBeInTheDocument();
    });
    expect(screen.getByText('Fix login bug')).toBeInTheDocument();
    // Use testid to avoid ambiguity with filter dropdown options
    const row = screen.getByTestId('work-item-row-test-uuid-1');
    expect(within(row).getByTestId('type-badge')).toHaveTextContent('bug');
    expect(within(row).getByTestId('status-badge')).toHaveTextContent('in-progress');
    expect(within(row).getByTestId('priority-badge')).toHaveTextContent('high');
    expect(screen.getByText('TheFixer')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 (click row navigates to detail page)
  it('navigates to detail page when row is clicked', async () => {
    const item = makeWorkItem({ id: 'uuid-abc' });
    mockList.mockResolvedValue(makePaginatedResponse([item]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('work-item-row-uuid-abc')).toBeInTheDocument();
    });

    await userEvent.click(screen.getByTestId('work-item-row-uuid-abc'));
    expect(mockNavigate).toHaveBeenCalledWith('/work-items/uuid-abc');
  });

  // Verifies: FR-WF-010 (filter controls trigger API call with query params)
  it('applies status filter and resets to page 1', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    mockList.mockClear();

    const statusSelect = screen.getByLabelText('Filter by status');
    await userEvent.selectOptions(statusSelect, WorkItemStatus.Approved);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: WorkItemStatus.Approved, page: 1 }),
      );
    });
  });

  // Verifies: FR-WF-010 (type filter)
  it('applies type filter', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    mockList.mockClear();

    const typeSelect = screen.getByLabelText('Filter by type');
    await userEvent.selectOptions(typeSelect, WorkItemType.Bug);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ type: WorkItemType.Bug }),
      );
    });
  });

  // Verifies: FR-WF-010 (priority filter)
  it('applies priority filter', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    mockList.mockClear();

    const prioritySelect = screen.getByLabelText('Filter by priority');
    await userEvent.selectOptions(prioritySelect, WorkItemPriority.Critical);

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ priority: WorkItemPriority.Critical }),
      );
    });
  });

  // Verifies: FR-WF-010 (pagination controls)
  it('shows pagination info and disables prev on first page', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([makeWorkItem()], 1, 1));
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });

    const prevBtn = screen.getByText('Previous');
    expect(prevBtn).toBeDisabled();
  });

  // Verifies: FR-WF-010 (page size selector)
  it('changes page size and resets to page 1', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
    mockList.mockClear();

    const pageSizeSelect = screen.getByLabelText('Page size');
    await userEvent.selectOptions(pageSizeSelect, '50');

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 1 }),
      );
    });
  });

  // Verifies: FR-WF-010 (error handling)
  it('shows error message when API call fails', async () => {
    mockList.mockRejectedValue(new Error('Network error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010 (refresh button)
  it('refresh button refetches data', async () => {
    mockList.mockResolvedValue(makePaginatedResponse([]));
    renderPage();

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    await userEvent.click(screen.getByText('Refresh'));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });

  // Verifies: FR-WF-010 (unassigned team shows dash)
  it('shows dash for unassigned team', async () => {
    const item = makeWorkItem({ assignedTeam: undefined });
    mockList.mockResolvedValue(makePaginatedResponse([item]));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });
});
