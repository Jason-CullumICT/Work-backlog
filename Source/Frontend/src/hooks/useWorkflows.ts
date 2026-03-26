// Verifies: FR-WFD-008, FR-WFD-010 — Data fetching hooks for workflow definitions

import { useState, useEffect, useCallback } from 'react';
import type {
  Workflow,
  WorkflowFlowResponse,
  FlowNode,
  FlowEdge,
  CreateWorkflowRequest,
  AssessmentRole,
  AssessmentConfig,
  RuleCondition,
  RoutingRule,
  WorkflowStage,
} from '../../../Shared/types/workflow';

// Re-export shared types for consumers
export type {
  Workflow,
  WorkflowFlowResponse,
  FlowNode,
  FlowEdge,
  CreateWorkflowRequest,
  AssessmentRole,
  AssessmentConfig,
  RuleCondition,
  RoutingRule,
  WorkflowStage,
};

// --- API client for workflows ---

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

export const workflowsApi = {
  list(): Promise<{ data: Workflow[] }> {
    return request('/workflows');
  },
  getById(id: string): Promise<Workflow> {
    return request(`/workflows/${id}`);
  },
  getFlow(id: string): Promise<WorkflowFlowResponse> {
    return request(`/workflows/${id}/flow`);
  },
  create(data: CreateWorkflowRequest): Promise<Workflow> {
    return request('/workflows', { method: 'POST', body: JSON.stringify(data) });
  },
  update(id: string, data: Partial<CreateWorkflowRequest>): Promise<Workflow> {
    return request(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },
  remove(id: string): Promise<void> {
    return request(`/workflows/${id}`, { method: 'DELETE' });
  },
};

// --- Hooks ---

// Verifies: FR-WFD-008 — Fetch all workflows
interface UseWorkflowsResult {
  workflows: Workflow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflows(): UseWorkflowsResult {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    workflowsApi
      .list()
      .then((res) => {
        if (!cancelled) {
          setWorkflows(res.data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [refreshKey]);

  return { workflows, loading, error, refresh };
}

// Verifies: FR-WFD-008 — Fetch single workflow
interface UseWorkflowResult {
  workflow: Workflow | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflow(id: string): UseWorkflowResult {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    workflowsApi
      .getById(id)
      .then((res) => {
        if (!cancelled) {
          setWorkflow(res);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id, refreshKey]);

  return { workflow, loading, error, refresh };
}

// Verifies: FR-WFD-008 — Fetch flow graph for visualization
interface UseWorkflowFlowResult {
  flow: WorkflowFlowResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useWorkflowFlow(id: string): UseWorkflowFlowResult {
  const [flow, setFlow] = useState<WorkflowFlowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    workflowsApi
      .getFlow(id)
      .then((res) => {
        if (!cancelled) {
          setFlow(res);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [id, refreshKey]);

  return { flow, loading, error, refresh };
}

// Verifies: FR-WFD-008 — Mutation hook for creating workflows
interface UseCreateWorkflowResult {
  create: (data: CreateWorkflowRequest) => Promise<Workflow>;
  loading: boolean;
  error: string | null;
}

export function useCreateWorkflow(): UseCreateWorkflowResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (data: CreateWorkflowRequest): Promise<Workflow> => {
    setLoading(true);
    setError(null);
    try {
      const result = await workflowsApi.create(data);
      setLoading(false);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setLoading(false);
      throw err;
    }
  }, []);

  return { create, loading, error };
}
