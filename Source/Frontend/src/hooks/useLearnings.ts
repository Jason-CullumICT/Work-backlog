// Verifies: FR-CB-013 — Data fetching hook for learnings list with filters

import { useState, useEffect, useCallback } from 'react';
import type {
  Learning,
  PaginatedLearningsResponse,
  LearningFilters,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { learningsApi } from '../api/client';

interface UseLearningsResult {
  data: Learning[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useLearnings(
  params: LearningFilters & PaginationParams,
): UseLearningsResult {
  const [result, setResult] = useState<PaginatedLearningsResponse>({
    data: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    learningsApi
      .list(params)
      .then((res) => {
        if (!cancelled) {
          setResult(res);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.team, params.role, params.cycleId, params.page, params.limit, refreshKey]);

  return { ...result, loading, error, refresh };
}
