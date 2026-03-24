// Verifies: FR-WF-010
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';

vi.mock('../api/client', () => ({
  fetchDashboardSummary: vi.fn(),
}));

import { fetchDashboardSummary } from '../api/client';

const mockSummary = {
  statusCounts: {
    backlog: 5,
    proposed: 3,
    under_review: 2,
    approved: 1,
    rejected: 0,
    in_dev: 4,
    done: 10,
  },
  totalItems: 25,
  throughput: 10,
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Verifies: FR-WF-010
  it('renders loading state initially', () => {
    vi.mocked(fetchDashboardSummary).mockReturnValue(new Promise(() => {}));
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  // Verifies: FR-WF-010
  it('renders metrics cards after loading', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary);
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    expect(screen.getByTestId('metric-total')).toHaveTextContent('25');
    expect(screen.getByTestId('metric-throughput')).toHaveTextContent('10');
    expect(screen.getByTestId('metric-backlog')).toHaveTextContent('5');
    expect(screen.getByTestId('metric-in_dev')).toHaveTextContent('4');
    expect(screen.getByTestId('metric-done')).toHaveTextContent('10');
  });

  // Verifies: FR-WF-010
  it('renders all pipeline stage cards', async () => {
    vi.mocked(fetchDashboardSummary).mockResolvedValue(mockSummary);
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-page')).toBeInTheDocument();
    });

    const stages = ['backlog', 'proposed', 'under_review', 'approved', 'rejected', 'in_dev', 'done'];
    for (const stage of stages) {
      expect(screen.getByTestId(`metric-${stage}`)).toBeInTheDocument();
    }
  });

  // Verifies: FR-WF-010
  it('renders error state on fetch failure', async () => {
    vi.mocked(fetchDashboardSummary).mockRejectedValue(new Error('Network error'));
    render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    });
    expect(screen.getByTestId('dashboard-error')).toHaveTextContent('Network error');
  });
});
