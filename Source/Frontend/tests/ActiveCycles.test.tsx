// Verifies: FR-CB-014 (Active Cycles dashboard section tests)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { DashboardPage } from '../src/pages/DashboardPage';
import { CycleStatus } from '../../Shared/types/workflow';

// Verifies: FR-CB-014 — Mock both dashboard and active cycles APIs
vi.mock('../src/api/client', () => ({
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
  featuresApi: { list: vi.fn() },
  learningsApi: { list: vi.fn() },
  cyclesApi: { list: vi.fn(), getById: vi.fn() },
}));

import { dashboardApi } from '../src/api/client';

const mockSummary = {
  statusCounts: { backlog: 3, 'in-progress': 1 },
  teamCounts: { TheATeam: 2 },
  priorityCounts: { high: 2, medium: 2 },
};

const mockActivity = { data: [] };
const mockQueue = { data: [] };

const mockActiveCycles = {
  data: [
    {
      id: 'cycle-1',
      workItemId: 'wi-100',
      team: 'TheATeam',
      status: CycleStatus.Implementation,
      branch: 'cycle/run-123',
      startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      updatedAt: new Date().toISOString(),
      phases: [
        { name: 'started', startedAt: new Date(Date.now() - 3600000).toISOString(), completedAt: new Date(Date.now() - 3000000).toISOString() },
        { name: 'implementation', startedAt: new Date(Date.now() - 3000000).toISOString() },
      ],
    },
    {
      id: 'cycle-2',
      workItemId: 'wi-200',
      team: 'TheFixer',
      status: CycleStatus.Review,
      branch: 'cycle/run-456',
      startedAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      updatedAt: new Date().toISOString(),
      phases: [
        { name: 'started', startedAt: new Date(Date.now() - 7200000).toISOString(), completedAt: new Date(Date.now() - 6000000).toISOString() },
        { name: 'review', startedAt: new Date(Date.now() - 6000000).toISOString() },
      ],
    },
  ],
};

function renderDashboard() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

describe('ActiveCycles section on DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (dashboardApi.summary as ReturnType<typeof vi.fn>).mockResolvedValue(mockSummary);
    (dashboardApi.activity as ReturnType<typeof vi.fn>).mockResolvedValue(mockActivity);
    (dashboardApi.queue as ReturnType<typeof vi.fn>).mockResolvedValue(mockQueue);
    (dashboardApi.activeCycles as ReturnType<typeof vi.fn>).mockResolvedValue(mockActiveCycles);
  });

  // Verifies: FR-CB-014 — Active cycles section renders
  it('renders active cycles section', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('active-cycles')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-014 — Cycle cards display team, status, branch, elapsed time
  it('displays cycle cards with team, status, branch, and elapsed time', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('cycle-card-cycle-1')).toBeInTheDocument();
    });
    expect(screen.getByTestId('cycle-card-cycle-2')).toBeInTheDocument();

    // Scope queries to cycle cards to avoid collisions with summary section
    const card1 = within(screen.getByTestId('cycle-card-cycle-1'));
    const card2 = within(screen.getByTestId('cycle-card-cycle-2'));

    // Check team names within cards
    expect(card1.getByText('TheATeam')).toBeInTheDocument();
    expect(card2.getByText('TheFixer')).toBeInTheDocument();

    // Check statuses
    expect(card1.getByText('implementation')).toBeInTheDocument();
    expect(card2.getByText('review')).toBeInTheDocument();

    // Check branch names
    expect(card1.getByText('cycle/run-123')).toBeInTheDocument();
    expect(card2.getByText('cycle/run-456')).toBeInTheDocument();
  });

  // Verifies: FR-CB-014 — Cycle cards link to source work item
  it('links cycle cards to the source work item', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('cycle-card-cycle-1')).toBeInTheDocument();
    });

    const links = screen.getAllByRole('link');
    const cycleLinks = links.filter(
      (l) => l.getAttribute('href') === '/work-items/wi-100' || l.getAttribute('href') === '/work-items/wi-200',
    );
    expect(cycleLinks).toHaveLength(2);
  });

  // Verifies: FR-CB-014 — Shows elapsed time
  it('shows elapsed time for each cycle', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('cycle-card-cycle-1')).toBeInTheDocument();
    });

    // cycle-1 started 1 hour ago → should show "1h 0m"
    expect(screen.getByTestId('cycle-card-cycle-1').textContent).toMatch(/1h 0m/);
    // cycle-2 started 2 hours ago → should show "2h 0m"
    expect(screen.getByTestId('cycle-card-cycle-2').textContent).toMatch(/2h 0m/);
  });

  // Verifies: FR-CB-014 — Empty state when no active cycles
  it('shows empty state when no active cycles', async () => {
    (dashboardApi.activeCycles as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('No active cycles.')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-014 — Error state when API fails
  it('shows error message when active cycles API fails', async () => {
    (dashboardApi.activeCycles as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByText('Failed to load active cycles.')).toBeInTheDocument();
    });
  });

  // Verifies: FR-CB-014 — Active cycles section is above Summary
  it('renders active cycles section above summary section', async () => {
    renderDashboard();
    await waitFor(() => {
      expect(screen.getByTestId('active-cycles')).toBeInTheDocument();
      expect(screen.getByTestId('summary-cards')).toBeInTheDocument();
    });

    const activeCyclesSection = screen.getByTestId('active-cycles');
    const summarySection = screen.getByTestId('summary-cards');
    // active-cycles should appear before summary-cards in DOM
    expect(activeCyclesSection.compareDocumentPosition(summarySection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
