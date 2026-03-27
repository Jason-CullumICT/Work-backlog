// Verifies: FR-WF-009 (data fetching for dashboard page with auto-refresh)

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DashboardSummaryResponse,
  DashboardActivityResponse,
  DashboardQueueResponse,
} from '@shared/types/workflow';
import { dashboardApi } from '../api/client';

// Verifies: FR-WF-009 — Auto-refresh interval (30 seconds)
const AUTO_REFRESH_INTERVAL_MS = 30_000;

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
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    // Verifies: FR-WF-009 — Abort in-flight requests on re-fetch to avoid wasted network resources
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    Promise.all([
      dashboardApi.summary(),
      dashboardApi.activity(),
      dashboardApi.queue(),
    ])
      .then(([summaryRes, activityRes, queueRes]) => {
        if (!controller.signal.aborted) {
          setSummary(summaryRes);
          setActivity(activityRes);
          setQueue(queueRes);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [refreshKey]);

  // Verifies: FR-WF-009 — Auto-refresh interval for dashboard data
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey((k) => k + 1);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  return { summary, activity, queue, loading, error, refresh };
}
