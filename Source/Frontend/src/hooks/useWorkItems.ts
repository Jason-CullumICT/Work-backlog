// Verifies: FR-WF-010 (data fetching for work item list)
// Verifies: FR-WF-011 (data fetching for work item detail)

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WorkItem,
  PaginatedWorkItemsResponse,
  WorkItemFilters,
  PaginationParams,
} from '@shared/types/workflow';
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
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    // Verifies: FR-WF-010 — Abort in-flight requests on filter/page change to avoid wasted resources
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    workItemsApi
      .list(filters)
      .then((res) => {
        if (!controller.signal.aborted) {
          setResult(res);
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
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    // Verifies: FR-WF-011 — Abort in-flight requests on id change
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    workItemsApi
      .getById(id)
      .then((res) => {
        if (!controller.signal.aborted) {
          setItem(res);
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
  }, [id, refreshKey]);

  return { item, loading, error, refresh };
}
