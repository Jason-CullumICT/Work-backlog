import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import BacklogView from '../BacklogView';
import * as client from '../../api/client';
import type { WorkItem } from '../../types';
import { WorkItemStatus, WorkItemType, Priority, Source } from '../../types';

vi.mock('../../api/client');

const mockItems: WorkItem[] = [
  {
    id: '1',
    title: 'Fix login bug',
    description: 'Login fails on mobile',
    type: WorkItemType.BUG,
    status: WorkItemStatus.BACKLOG,
    queue: 'default',
    priority: Priority.HIGH,
    source: Source.BROWSER,
    external_id: null,
    created_at: '2026-03-20T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
  },
  {
    id: '2',
    title: 'Add dark mode',
    description: 'Support dark theme',
    type: WorkItemType.FEATURE,
    status: WorkItemStatus.BACKLOG,
    queue: 'default',
    priority: Priority.MEDIUM,
    source: Source.MANUAL_BOOKMARK,
    external_id: null,
    created_at: '2026-03-21T10:00:00Z',
    updated_at: '2026-03-21T10:00:00Z',
  },
];

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <BacklogView />
    </MemoryRouter>,
  );
}

describe('BacklogView', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Verifies: FR-WF-012
  it('renders work items in a table', async () => {
    vi.mocked(client.fetchWorkItems).mockResolvedValue(mockItems);

    renderWithRouter();

    expect(await screen.findByText('Fix login bug')).toBeInTheDocument();
    expect(screen.getByText('Add dark mode')).toBeInTheDocument();
    expect(screen.getByTestId('items-table')).toBeInTheDocument();
  });

  // Verifies: FR-WF-012
  it('renders filter controls', async () => {
    vi.mocked(client.fetchWorkItems).mockResolvedValue([]);

    renderWithRouter();

    expect(await screen.findByLabelText('Filter by status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by type')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by priority')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by source')).toBeInTheDocument();
  });

  // Verifies: FR-WF-012
  it('shows loading state', () => {
    vi.mocked(client.fetchWorkItems).mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  // Verifies: FR-WF-012
  it('shows New Item button', async () => {
    vi.mocked(client.fetchWorkItems).mockResolvedValue([]);

    renderWithRouter();

    expect(await screen.findByText('New Item')).toBeInTheDocument();
  });
});
