// Verifies: FR-CB-012 (Features Browser Page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { FeaturesPage } from '../src/pages/FeaturesPage';

// Verifies: FR-CB-012 — Mock features API
vi.mock('../src/api/client', () => ({
  featuresApi: {
    list: vi.fn(),
  },
  learningsApi: {
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

import { featuresApi } from '../src/api/client';

const mockFeaturesResponse = {
  data: [
    {
      id: 'feat-1',
      workItemId: 'wi-1',
      cycleId: 'cycle-1',
      title: 'User Authentication',
      description: 'Implemented login and registration flows with JWT tokens and refresh token rotation for enhanced security across the entire platform',
      branch: 'feature/auth',
      mergedAt: '2026-03-25T14:00:00Z',
      createdAt: '2026-03-25T12:00:00Z',
    },
    {
      id: 'feat-2',
      workItemId: 'wi-2',
      cycleId: 'cycle-2',
      title: 'Dashboard Widgets',
      description: 'Short desc',
      branch: 'feature/dashboard-widgets',
      mergedAt: undefined,
      createdAt: '2026-03-26T08:00:00Z',
    },
  ],
  page: 1,
  limit: 20,
  total: 2,
  totalPages: 1,
};

function renderFeaturesPage() {
  return render(
    <MemoryRouter>
      <FeaturesPage />
    </MemoryRouter>,
  );
}

describe('FeaturesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-CB-012 — Shows loading state
  it('shows loading indicator while fetching', () => {
    vi.mocked(featuresApi.list).mockReturnValue(new Promise(() => {}));
    renderFeaturesPage();
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  // Verifies: FR-CB-012 — Renders paginated features table
  it('renders features table with data', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('features-table')).toBeInTheDocument();
    });

    expect(screen.getByText('User Authentication')).toBeInTheDocument();
    expect(screen.getByText('Dashboard Widgets')).toBeInTheDocument();
    expect(screen.getByText('feature/auth')).toBeInTheDocument();
    expect(screen.getByText('feature/dashboard-widgets')).toBeInTheDocument();
  });

  // Verifies: FR-CB-012 — Description is truncated to 100 chars
  it('truncates long descriptions to 100 characters', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('features-table')).toBeInTheDocument();
    });

    // The first feature description is >100 chars, so it should be truncated
    expect(screen.getByText(/Implemented login and registration/)).toBeInTheDocument();
    expect(screen.queryByText(mockFeaturesResponse.data[0].description)).not.toBeInTheDocument();
  });

  // Verifies: FR-CB-012 — Each row links to /work-items/{workItemId}
  it('renders work item links for each feature', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('features-table')).toBeInTheDocument();
    });

    const viewLinks = screen.getAllByText('View');
    expect(viewLinks).toHaveLength(2);
    expect(viewLinks[0].closest('a')).toHaveAttribute('href', '/work-items/wi-1');
    expect(viewLinks[1].closest('a')).toHaveAttribute('href', '/work-items/wi-2');
  });

  // Verifies: FR-CB-012 — Shows empty state
  it('shows empty state when no features', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue({
      data: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
    });
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByText('No features found')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-012 — Shows error state
  it('shows error message on API failure', async () => {
    vi.mocked(featuresApi.list).mockRejectedValue(new Error('Network error'));
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-012 — Pagination controls
  it('renders pagination controls', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    });

    expect(screen.getByText(/Showing 2 of 2 features/)).toBeInTheDocument();
    expect(screen.getByLabelText('Page size')).toBeInTheDocument();
  });

  // Verifies: FR-CB-012 — Page size change resets to page 1
  it('changes page size and resets to page 1', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('features-table')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.selectOptions(screen.getByLabelText('Page size'), '10');

    expect(featuresApi.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
  });

  // Verifies: FR-CB-012 — Merged date display
  it('shows merged date or dash when not merged', async () => {
    vi.mocked(featuresApi.list).mockResolvedValue(mockFeaturesResponse);
    renderFeaturesPage();

    await waitFor(() => {
      expect(screen.getByTestId('features-table')).toBeInTheDocument();
    });

    // Second feature has no mergedAt, should show dash
    const rows = screen.getAllByRole('row');
    const lastRow = rows[rows.length - 1];
    expect(lastRow).toHaveTextContent('-');
  });
});
