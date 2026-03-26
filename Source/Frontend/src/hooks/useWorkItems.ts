// Verifies: FR-WF-010 (data fetching for work item list)
// Verifies: FR-WF-011 (data fetching for work item detail)

import { useState, useEffect, useCallback } from 'react';
import type {
  WorkItem,
  PaginatedWorkItemsResponse,
  WorkItemFilters,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { workItemsApi } from '../api/client';

interface UseWorkItemsResult {
  data: WorkItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkItems(
  filters: WorkItemFilters & PaginationParams,
): UseWorkItemsResult {
  const [result, setResult] = useState<PaginatedWorkItemsResponse>({
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

    workItemsApi
      .list(filters)
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
  }, [
    filters.status,
    filters.type,
    filters.priority,
    filters.source,
    filters.page,
    filters.limit,
    refreshKey,
  ]);

  return { ...result, loading, error, refresh };
}

interface UseWorkItemResult {
  item: WorkItem | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkItem(id: string): UseWorkItemResult {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    workItemsApi
      .getById(id)
      .then((res) => {
        if (!cancelled) {
          setItem(res);
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
  }, [id, refreshKey]);

  return { item, loading, error, refresh };
}
