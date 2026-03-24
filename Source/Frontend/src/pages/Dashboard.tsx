import { useEffect, useState, useCallback } from 'react';
import { fetchDashboardSummary } from '../api/client';
import type { DashboardSummary } from '../types';

const STATUS_DISPLAY: Record<string, { label: string; color: string }> = {
  backlog: { label: 'Backlog', color: 'bg-gray-500' },
  proposed: { label: 'Proposed', color: 'bg-purple-500' },
  under_review: { label: 'Under Review', color: 'bg-yellow-500' },
  approved: { label: 'Approved', color: 'bg-emerald-500' },
  rejected: { label: 'Rejected', color: 'bg-red-500' },
  in_dev: { label: 'In Dev', color: 'bg-blue-500' },
  done: { label: 'Done', color: 'bg-green-500' },
};

const REFRESH_INTERVAL = 30_000;

export function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchDashboardSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div data-testid="dashboard-loading" className="flex items-center justify-center py-20">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="dashboard-error" className="rounded-md bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  const statusEntries = Object.entries(STATUS_DISPLAY);

  return (
    <div data-testid="dashboard-page">
      <h2 className="mb-6 text-2xl font-bold text-gray-900">Dashboard</h2>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="metric-total" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Total Items</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{summary.totalItems}</div>
        </div>
        <div data-testid="metric-throughput" className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">Throughput</div>
          <div className="mt-1 text-3xl font-bold text-gray-900">{summary.throughput}</div>
          <div className="text-xs text-gray-400">items completed</div>
        </div>
      </div>

      <h3 className="mb-4 text-lg font-semibold text-gray-800">Pipeline Stages</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {statusEntries.map(([status, display]) => {
          const count = summary.statusCounts[status] ?? 0;
          return (
            <div
              key={status}
              data-testid={`metric-${status}`}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${display.color}`} />
                <span className="text-sm font-medium text-gray-500">{display.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
