// Verifies: FR-CB-012 — Data fetching hook for features list

import { useState, useEffect, useCallback } from 'react';
import type {
  Feature,
  PaginatedFeaturesResponse,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { featuresApi } from '../api/client';

interface UseFeaturesResult {
  data: Feature[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useFeatures(params: PaginationParams): UseFeaturesResult {
  const [result, setResult] = useState<PaginatedFeaturesResponse>({
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

    featuresApi
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
  }, [params.page, params.limit, refreshKey]);

  return { ...result, loading, error, refresh };
}
