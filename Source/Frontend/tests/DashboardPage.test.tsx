// Verifies: FR-WF-009 (Dashboard page tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { DashboardPage } from '../src/pages/DashboardPage';

// Verifies: FR-WF-009 — Mock dashboard API
vi.mock('../src/api/client', () => ({
  dashboardApi: {
    summary: vi.fn(),
    activity: vi.fn(),
    queue: vi.fn(),
  },
  workItemsApi: {
    list: vi.fn(),
    create: vi.fn(),
  },
}));

import { dashboardApi } from '../src/api/client';

const mockSummary = {
  statusCounts: { backlog: 5, 'in-progress': 3, completed: 2, approved: 1 },
  teamCounts: { TheATeam: 4, TheFixer: 2 },
  priorityCounts: { critical: 1, high: 3, medium: 4, low: 2 },
};

const mockActivity = {
  data: [
    {
      timestamp: '2026-03-25T10:00:00Z',
      agent: 'system',
      field: 'status',
      oldValue: 'backlog',
      newValue: 'routing',
      workItemId: '123',
      workItemDocId: 'WI-001',
    },
  ],
};

const mockQueue = {
  data: [
    { status: 'backlog' as const, count: 5, items: [] },
    { status: 'in-progress' as const, count: 3, items: [] },
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dashboardApi.summary as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummary);
    (dashboardApi.activity as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);
    (dashboardApi.queue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);
  });

  // Verifies: FR-WF-009 — Loading state
  it('shows loading state initially', () => {
    renderDashboard();
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Summary cards render
  it('renders summary cards after loading', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
    });
    expect(screen.getByText('11')).toBeInTheDocument(); // total = 5+3+2+1
  });

  // Verifies: FR-WF-009 — Team workload section
  it('renders team workload section', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('team-workload')).toBeInTheDocument();
    });
    expect(screen.getByText('TheATeam')).toBeInTheDocument();
    expect(screen.getByText('TheFixer')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Priority distribution
  it('renders priority distribution', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('priority-distribution')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-009 — Queue breakdown table
  it('renders queue breakdown table', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('queue-breakdown')).toBeInTheDocument();
    });
  });

  // Verifies: FR-WF-009 — Activity feed
  it('renders activity feed with entries', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('activity-feed')).toBeInTheDocument();
    });
    expect(screen.getByText('system')).toBeInTheDocument();
    expect(screen.getByText('WI-001')).toBeInTheDocument();
  });

  // Verifies: FR-WF-009 — Refresh button
  it('calls refresh when refresh button is clicked', async () => {
    const user = userEvent.setup();
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('refresh-button')).toBeInTheDocument();
    });
    await user.click(screen.getByTestId('refresh-button'));
    // Called once on load, once on refresh
    await waitFor(() => {
      expect(dashboardApi.summary).toHaveBeenCalledTimes(2);
    });
  });

  // Verifies: FR-WF-009 — Error state
  it('displays error when API fails', async () => {
    (dashboardApi.summary as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-error')).toBeInTheDocument();
    });
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });
});
