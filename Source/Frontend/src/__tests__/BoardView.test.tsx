// Verifies: FR-WF-011
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BoardView } from '../pages/BoardView';
import type { BoardData } from '../types';

vi.mock('../api/client', () => ({
  fetchBoardData: vi.fn(),
  transitionWorkItem: vi.fn(),
}));

import { fetchBoardData } from '../api/client';

const mockBoard: BoardData = {
  columns: [
    {
      status: 'backlog',
      items: [
        {
          id: '1',
          title: 'Test Item 1',
          description: 'desc',
          type: 'feature',
          status: 'backlog',
          queue: 'default',
          priority: 'medium',
          source: 'browser',
          external_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    },
    {
      status: 'in_dev',
      items: [
        {
          id: '2',
          title: 'Test Item 2',
          description: 'desc',
          type: 'bug',
          status: 'in_dev',
          queue: 'default',
          priority: 'high',
          source: 'zendesk',
          external_id: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    },
    { status: 'done', items: [] },
    { status: 'proposed', items: [] },
    { status: 'under_review', items: [] },
    { status: 'approved', items: [] },
    { status: 'rejected', items: [] },
  ],
};

describe('BoardView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-WF-011
  it('renders loading state initially', () => {
    vi.mocked(fetchBoardData).mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <BoardView />
      </BrowserRouter>,
    );
    expect(screen.getByTestId('board-loading')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011
  it('renders columns for each status', async () => {
    vi.mocked(fetchBoardData).mockResolvedValue(mockBoard);
    render(
      <BrowserRouter>
        <BoardView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('board-column-backlog')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-in_dev')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-done')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-proposed')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-under_review')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-approved')).toBeInTheDocument();
    expect(screen.getByTestId('board-column-rejected')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011
  it('renders work item cards in columns', async () => {
    vi.mocked(fetchBoardData).mockResolvedValue(mockBoard);
    render(
      <BrowserRouter>
        <BoardView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('Test Item 2')).toBeInTheDocument();
  });

  // Verifies: FR-WF-011
  it('shows column item counts', async () => {
    vi.mocked(fetchBoardData).mockResolvedValue(mockBoard);
    render(
      <BrowserRouter>
        <BoardView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('board-page')).toBeInTheDocument();
    });

    const backlogCol = screen.getByTestId('board-column-backlog');
    expect(backlogCol).toHaveTextContent('1');

    const doneCol = screen.getByTestId('board-column-done');
    expect(doneCol).toHaveTextContent('0');
  });

  // Verifies: FR-WF-011
  it('renders error state on fetch failure', async () => {
    vi.mocked(fetchBoardData).mockRejectedValue(new Error('Board error'));
    render(
      <BrowserRouter>
        <BoardView />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('board-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('board-error')).toHaveTextContent('Board error');
  });
});
