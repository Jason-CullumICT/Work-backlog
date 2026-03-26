// Verifies: FR-WF-013 — Prometheus metrics for domain operations
import { Registry, Counter, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

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
