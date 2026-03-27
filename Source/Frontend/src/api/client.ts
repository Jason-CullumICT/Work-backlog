// Verifies: FR-WF-010, FR-WF-011 (API client for work item operations)

import type {
  WorkItem,
  PaginatedWorkItemsResponse,
  WorkItemFilters,
  PaginationParams,
  DashboardSummaryResponse,
  DashboardActivityResponse,
  DashboardQueueResponse,
  ActiveCyclesResponse,
  CreateWorkItemRequest,
  RejectWorkItemRequest,
  DispatchWorkItemRequest,
  PaginatedFeaturesResponse,
  Feature,
  PaginatedLearningsResponse,
  LearningFilters,
  PaginatedCyclesResponse,
  Cycle,
} from '../../../Shared/types/workflow';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const workItemsApi = {
  list(filters: WorkItemFilters & PaginationParams = {}): Promise<PaginatedWorkItemsResponse> {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return request(`/work-items${qs ? `?${qs}` : ''}`);
  },

  getById(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}`);
  },

  create(data: CreateWorkItemRequest): Promise<WorkItem> {
    return request('/work-items', { method: 'POST', body: JSON.stringify(data) });
  },

  route(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/route`, { method: 'POST' });
  },

  assess(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/assess`, { method: 'POST' });
  },

  approve(id: string): Promise<WorkItem> {
    return request(`/work-items/${id}/approve`, { method: 'POST' });
  },

  reject(id: string, data: RejectWorkItemRequest): Promise<WorkItem> {
    return request(`/work-items/${id}/reject`, { method: 'POST', body: JSON.stringify(data) });
  },

  dispatch(id: string, data: DispatchWorkItemRequest): Promise<WorkItem> {
    return request(`/work-items/${id}/dispatch`, { method: 'POST', body: JSON.stringify(data) });
  },
};

export const dashboardApi = {
  summary(): Promise<DashboardSummaryResponse> {
    return request('/dashboard/summary');
  },

  activity(): Promise<DashboardActivityResponse> {
    return request('/dashboard/activity');
  },

  queue(): Promise<DashboardQueueResponse> {
    return request('/dashboard/queue');
  },

  // Verifies: FR-CB-014 — Fetch active (non-terminal) cycles for dashboard
  activeCycles(): Promise<ActiveCyclesResponse> {
    return request('/dashboard/active-cycles');
  },
};

// Verifies: FR-CB-012, FR-CB-017 — Features API client
export const featuresApi = {
  list(params: PaginationParams = {}): Promise<PaginatedFeaturesResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value));
    }
    const query = qs.toString();
    return request(`/features${query ? `?${query}` : ''}`);
  },

  getById(id: string): Promise<Feature> {
    return request(`/features/${id}`);
  },
};

// Verifies: FR-CB-013, FR-CB-017 — Learnings API client
export const learningsApi = {
  list(params: LearningFilters & PaginationParams = {}): Promise<PaginatedLearningsResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') qs.set(key, String(value));
    }
    const query = qs.toString();
    return request(`/learnings${query ? `?${query}` : ''}`);
  },
};

// Verifies: FR-CB-003, FR-CB-004 — Cycles API client
export const cyclesApi = {
  list(params: PaginationParams = {}): Promise<PaginatedCyclesResponse> {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) qs.set(key, String(value));
    }
    const query = qs.toString();
    return request(`/cycles${query ? `?${query}` : ''}`);
  },

  getById(id: string): Promise<Cycle> {
    return request(`/cycles/${id}`);
  },
};
