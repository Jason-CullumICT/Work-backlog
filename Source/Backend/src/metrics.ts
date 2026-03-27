// Verifies: FR-WF-013 — Prometheus metrics for domain operations
// Verifies: FR-WF-013 — Auto-collect route latency via middleware
import { Registry, Counter, Histogram, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

// Verifies: FR-WF-013 — HTTP request duration histogram for route latency
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_created_total
export const itemsCreatedCounter = new Counter({
  name: 'workflow_items_created_total',
  help: 'Total number of work items created',
  labelNames: ['source', 'type'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_routed_total
export const itemsRoutedCounter = new Counter({
  name: 'workflow_items_routed_total',
  help: 'Total number of work items routed',
  labelNames: ['route'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_assessed_total
export const itemsAssessedCounter = new Counter({
  name: 'workflow_items_assessed_total',
  help: 'Total number of work items assessed',
  labelNames: ['verdict'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_dispatched_total
export const itemsDispatchedCounter = new Counter({
  name: 'workflow_items_dispatched_total',
  help: 'Total number of work items dispatched',
  labelNames: ['team'] as const,
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_completed_total
export const itemsCompletedCounter = new Counter({
  name: 'workflow_items_completed_total',
  help: 'Total number of work items completed',
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_failed_total
export const itemsFailedCounter = new Counter({
  name: 'workflow_items_failed_total',
  help: 'Total number of work items that failed',
  registers: [registry],
});

// Verifies: FR-WF-013 — workflow_items_requeued_total
export const itemsRequeuedCounter = new Counter({
  name: 'workflow_items_requeued_total',
  help: 'Total number of work items requeued from rejected/failed',
  labelNames: ['from_status'] as const,
  registers: [registry],
});
