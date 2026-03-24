import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ItemDetail from '../ItemDetail';
import * as client from '../../api/client';
import { WorkItemStatus, WorkItemType, Priority, Source } from '../../types';
import type { WorkItem, ChangeEntry } from '../../types';

vi.mock('../../api/client');

const mockItem: WorkItem = {
  id: 'item-1',
  title: 'Test Item',
  description: 'A test description',
  type: WorkItemType.BUG,
  status: WorkItemStatus.BACKLOG,
  queue: 'default',
  priority: Priority.HIGH,
  source: Source.BROWSER,
  external_id: null,
  created_at: '2026-03-20T10:00:00Z',
  updated_at: '2026-03-20T12:00:00Z',
};

const mockHistory: ChangeEntry[] = [
  {
    id: 'change-1',
    work_item_id: 'item-1',
    field: 'status',
    old_value: null,
    new_value: 'backlog',
    changed_by: 'system',
    changed_at: '2026-03-20T10:00:00Z',
  },
  {
    id: 'change-2',
    work_item_id: 'item-1',
    field: 'priority',
    old_value: 'medium',
    new_value: 'high',
    changed_by: 'admin',
    changed_at: '2026-03-20T11:00:00Z',
  },
];

function renderWithRouter(id = 'item-1') {
  return render(
    <MemoryRouter initialEntries={[`/items/${id}`]}>
      <Routes>
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/backlog" element={<div>Backlog</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ItemDetail', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Verifies: FR-WF-014
  it('renders item fields', async () => {
    vi.mocked(client.fetchWorkItem).mockResolvedValue(mockItem);
    vi.mocked(client.fetchWorkItemHistory).mockResolvedValue(mockHistory);

    renderWithRouter();

    expect(await screen.findByText('Test Item')).toBeInTheDocument();
    expect(screen.getByText('A test description')).toBeInTheDocument();
    expect(screen.getByText('bug')).toBeInTheDocument();
    expect(screen.getAllByText('high').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('backlog').length).toBeGreaterThanOrEqual(1);
  });

  // Verifies: FR-WF-014
  it('shows change history', async () => {
    vi.mocked(client.fetchWorkItem).mockResolvedValue(mockItem);
    vi.mocked(client.fetchWorkItemHistory).mockResolvedValue(mockHistory);

    renderWithRouter();

    expect(await screen.findByTestId('change-history')).toBeInTheDocument();
    expect(screen.getByTestId('history-entry-change-1')).toBeInTheDocument();
    expect(screen.getByTestId('history-entry-change-2')).toBeInTheDocument();
  });

  // Verifies: FR-WF-014
  it('shows valid transition buttons for backlog items', async () => {
    vi.mocked(client.fetchWorkItem).mockResolvedValue(mockItem);
    vi.mocked(client.fetchWorkItemHistory).mockResolvedValue([]);

    renderWithRouter();

    expect(await screen.findByTestId('transitions')).toBeInTheDocument();
    expect(screen.getByTestId('transition-proposed')).toBeInTheDocument();
    expect(screen.getByTestId('transition-under_review')).toBeInTheDocument();
  });

  // Verifies: FR-WF-014
  it('shows proposal section for backlog items', async () => {
    vi.mocked(client.fetchWorkItem).mockResolvedValue(mockItem);
    vi.mocked(client.fetchWorkItemHistory).mockResolvedValue([]);

    renderWithRouter();

    expect(await screen.findByTestId('proposal-section')).toBeInTheDocument();
    expect(screen.getByText('Propose')).toBeInTheDocument();
  });

  // Verifies: FR-WF-014
  it('shows review section for under_review items', async () => {
    const underReviewItem = { ...mockItem, status: WorkItemStatus.UNDER_REVIEW };
    vi.mocked(client.fetchWorkItem).mockResolvedValue(underReviewItem);
    vi.mocked(client.fetchWorkItemHistory).mockResolvedValue([]);

    renderWithRouter();

    expect(await screen.findByTestId('review-section')).toBeInTheDocument();
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
  });

  // Verifies: FR-WF-014
  it('shows loading state', () => {
    vi.mocked(client.fetchWorkItem).mockReturnValue(new Promise(() => {}));
    vi.mocked(client.fetchWorkItemHistory).mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });
});
