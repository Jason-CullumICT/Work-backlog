import type {
  WorkItem,
  DashboardSummary,
  BoardData,
  ChangeEntry,
  Proposal,
  Review,
  DataResponse,
} from '../types';

const BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await request<DataResponse<DashboardSummary>>('/dashboard/summary');
  return res.data;
}

export async function fetchBoardData(): Promise<BoardData> {
  const res = await request<DataResponse<BoardData>>('/dashboard/board');
  return res.data;
}

export async function transitionWorkItem(
  id: string,
  target: string,
  changedBy?: string,
): Promise<WorkItem> {
  return request<WorkItem>(`/work-items/${id}/transition`, {
    method: 'POST',
    body: JSON.stringify({ target, changedBy }),
  });
}

export async function fetchWorkItems(
  filters?: Record<string, string>,
): Promise<WorkItem[]> {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  const res = await request<DataResponse<WorkItem[]>>(`/work-items${params}`);
  return res.data;
}

export async function fetchWorkItem(id: string): Promise<WorkItem> {
  return request<WorkItem>(`/work-items/${id}`);
}

export async function createWorkItem(
  data: Partial<WorkItem>,
): Promise<WorkItem> {
  return request<WorkItem>('/work-items', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkItem(
  id: string,
  data: Partial<WorkItem>,
): Promise<WorkItem> {
  return request<WorkItem>(`/work-items/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteWorkItem(id: string): Promise<void> {
  await request<void>(`/work-items/${id}`, { method: 'DELETE' });
}

export async function proposeWorkItem(
  id: string,
  data: { requirements: string; prototypeUrl?: string; createdBy?: string },
): Promise<Proposal> {
  return request<Proposal>(`/work-items/${id}/propose`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function reviewWorkItem(
  id: string,
  data: { decision: 'approved' | 'rejected'; feedback?: string; reviewedBy?: string },
): Promise<Review> {
  return request<Review>(`/work-items/${id}/review`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchWorkItemHistory(id: string): Promise<ChangeEntry[]> {
  const res = await request<DataResponse<ChangeEntry[]>>(`/work-items/${id}/history`);
  return res.data;
}
