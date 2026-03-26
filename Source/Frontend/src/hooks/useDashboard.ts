// Verifies: FR-WF-009 (data fetching for dashboard page)

import { useState, useEffect, useCallback } from 'react';
import type {
  DashboardSummaryResponse,
  DashboardActivityResponse,
  DashboardQueueResponse,
} from '../../../Shared/types/workflow';
import { dashboardApi } from '../api/client';

interface UseDashboardResult {
  summary: DashboardSummaryResponse | null;
  activity: DashboardActivityResponse | null;
  queue: DashboardQueueResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDashboard(): UseDashboardResult {
  const [summary, setSummary] = useState<DashboardSummaryResponse | null>(null);
  const [activity, setActivity] = useState<DashboardActivityResponse | null>(null);
  const [queue, setQueue] = useState<DashboardQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      dashboardApi.summary(),
      dashboardApi.activity(),
      dashboardApi.queue(),
    ])
      .then(([summaryRes, activityRes, queueRes]) => {
        if (!cancelled) {
          setSummary(summaryRes);
          setActivity(activityRes);
          setQueue(queueRes);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { summary, activity, queue, loading, error, refresh };
}
