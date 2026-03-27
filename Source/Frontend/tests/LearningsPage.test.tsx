// Verifies: FR-CB-013 (Learnings Page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { LearningsPage } from '../src/pages/LearningsPage';

// Verifies: FR-CB-013 — Mock learnings API
vi.mock('../src/api/client', () => ({
  learningsApi: {
    list: vi.fn(),
  },
  featuresApi: {
    list: vi.fn(),
  },
  cyclesApi: {
    list: vi.fn(),
    getById: vi.fn(),
  },
  dashboardApi: {
    summary: vi.fn(),
    activity: vi.fn(),
    queue: vi.fn(),
    activeCycles: vi.fn(),
  },
  workItemsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

import { learningsApi } from '../src/api/client';

const mockLearningsResponse = {
  data: [
    {
      id: 'learn-1',
      cycleId: 'cycle-1',
      team: 'TheATeam',
      role: 'backend-coder',
      content: 'Always validate input before passing to the service layer',
      category: 'validation',
      createdAt: '2026-03-25T14:00:00Z',
    },
    {
      id: 'learn-2',
      cycleId: 'cycle-1',
      team: 'TheFixer',
      role: 'frontend-coder',
      content: 'Use data-testid for elements that may have duplicate text content',
      category: undefined,
      createdAt: '2026-03-26T08:00:00Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
};

function renderLearningsPage() {
  return render(
    <MemoryRouter>
      <LearningsPage />
    </MemoryRouter>,
  );
}

describe('LearningsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-CB-013 — Shows loading state
  it('shows loading indicator while fetching', () => {
    vi.mocked(learningsApi.list).mockReturnValue(new Promise(() => {}));
    renderLearningsPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-CB-013 — Renders learnings list with content, team, role, category, date
  it('renders learnings cards with all details', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('learnings-list')).toBeInTheDocument();
    });

    expect(screen.getByText('Always validate input before passing to the service layer')).toBeInTheDocument();
    expect(screen.getByText('Use data-testid for elements that may have duplicate text content')).toBeInTheDocument();
    // Team/role names appear in both filter dropdowns and badges — use getAllByText
    expect(screen.getAllByText('TheATeam').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('TheFixer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('backend-coder').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('frontend-coder').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('validation')).toBeInTheDocument();
  });

  // Verifies: FR-CB-013 — Shows empty state
  it('shows empty state when no learnings', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByText('No learnings found')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-013 — Shows error state
  it('shows error message on API failure', async () => {
    vi.mocked(learningsApi.list).mockRejectedValue(new Error('Server error'));
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-013 — Filter bar: team dropdown
  it('filters by team', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('learnings-list')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Filter by team'), 'TheATeam');

    expect(learningsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ team: 'TheATeam', page: 1 }),
    );
  });

  // Verifies: FR-CB-013 — Filter bar: role dropdown
  it('filters by role', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('learnings-list')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Filter by role'), 'backend-coder');

    expect(learningsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'backend-coder', page: 1 }),
    );
  });

  // Verifies: FR-CB-013 — Pagination controls
  it('renders pagination controls', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });

    expect(screen.getByText(/Showing 2 of 2 learnings/)).toBeInTheDocument();
  });

  // Verifies: FR-CB-013 — Page size change resets to page 1
  it('changes page size', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('learnings-list')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Page size'), '10');

    expect(learningsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  // Verifies: FR-CB-013 — Learning card without category does not show category badge
  it('hides category badge when category is null', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('learnings-list')).toBeInTheDocument();
    });

    // Second learning has no category
    const secondCard = screen.getByTestId('learning-card-learn-2');
    expect(secondCard).not.toHaveTextContent('validation');
  });

  // Verifies: FR-CB-013 — Filter controls are present
  it('renders team and role filter dropdowns', async () => {
    vi.mocked(learningsApi.list).mockResolvedValue(mockLearningsResponse);
    renderLearningsPage();

    await waitFor(() => {
      expect(screen.getByTestId('filter-controls')).toBeInTheDocument();
    });

    expect(screen.getByLabelText('Filter by team')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by role')).toBeInTheDocument();
  });
});
