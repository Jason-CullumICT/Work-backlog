// Verifies: FR-CB-014 (data fetching for active cycles dashboard section)

import { useState, useEffect, useCallback } from 'react';
import type { Cycle } from '../../../Shared/types/workflow';
import { dashboardApi } from '../api/client';

interface UseActiveCyclesResult {
  cycles: Cycle[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// Verifies: FR-CB-014 — Hook to fetch active (non-terminal) cycles for dashboard display
export function useActiveCycles(): UseActiveCyclesResult {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    dashboardApi.activeCycles()
      .then((res) => {
        if (!cancelled) {
          setCycles(res.data);
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

  return { cycles, loading, error, refresh };
}
