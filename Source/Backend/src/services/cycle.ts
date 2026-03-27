// Verifies: FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004, FR-CB-011, FR-CB-019 — Cycle service layer
import crypto from 'crypto';
import {
  Cycle,
  CycleStatus,
  CycleResult,
  CyclePhase,
  CycleFilters,
  CreateCycleRequest,
  UpdateCycleRequest,
  WorkItemStatus,
  PaginationParams,
} from '../../../Shared/types/workflow';
import * as cycleStore from '../store/cycleStore';
import * as workItemStore from '../store/workItemStore';
import {
  cyclesCreatedCounter,
  cyclesCompletedCounter,
} from '../metrics';
import logger from '../logger';

// Verifies: FR-CB-001 — Create a new cycle and transition WorkItem to in-progress
export function createCycle(data: CreateCycleRequest): Cycle {
  const now = new Date().toISOString();
  const cycle: Cycle = {
    id: crypto.randomUUID(),
    workItemId: data.workItemId,
    team: data.team,
    status: CycleStatus.Started,
    branch: data.branch,
    startedAt: now,
    updatedAt: now,
    phases: [{ name: CycleStatus.Started, startedAt: now }],
  };

  const created = cycleStore.create(cycle);

  // Transition WorkItem to in-progress if currently approved
  const workItem = workItemStore.findById(data.workItemId);
  if (workItem && workItem.status === WorkItemStatus.Approved) {
    workItemStore.updateWorkItem(data.workItemId, { status: WorkItemStatus.InProgress });
    logger.info({ msg: 'WorkItem transitioned to in-progress', workItemId: data.workItemId });
  }

  // Verifies: FR-CB-015 — Metric: cycles created
  cyclesCreatedCounter.inc({ team: data.team });
  logger.info({ msg: 'Cycle created via service', cycleId: created.id, workItemId: data.workItemId });

  return created;
}

// Verifies: FR-CB-002 — Update cycle phase/status
export function updateCyclePhase(id: string, data: UpdateCycleRequest): Cycle | undefined {
  const cycle = cycleStore.findById(id);
  if (!cycle) return undefined;

  const now = new Date().toISOString();

  // Close the current phase
  const currentPhase = cycle.phases[cycle.phases.length - 1];
  if (currentPhase && !currentPhase.completedAt) {
    currentPhase.completedAt = now;
  }

  // Append new phase
  const newPhase: CyclePhase = { name: data.status, startedAt: now };
  cycle.phases.push(newPhase);

  const updates: Partial<Cycle> = {
    status: data.status,
    phases: cycle.phases,
  };

  // Handle terminal states
  if (data.status === CycleStatus.Completed) {
    updates.completedAt = now;
    updates.result = CycleResult.Passed;
    cyclesCompletedCounter.inc({ team: cycle.team, result: 'passed' });
  } else if (data.status === CycleStatus.Failed) {
    updates.completedAt = now;
    updates.result = CycleResult.Failed;
    updates.error = data.error;
    cyclesCompletedCounter.inc({ team: cycle.team, result: 'failed' });
  }

  const updated = cycleStore.update(id, updates);
  logger.info({ msg: 'Cycle phase updated', cycleId: id, status: data.status });
  return updated;
}

// Verifies: FR-CB-003 — List cycles with filters and pagination
export function listCycles(
  filters: CycleFilters = {},
  pagination: PaginationParams = {}
): { data: Cycle[]; total: number; page: number; limit: number; totalPages: number } {
  return cycleStore.findAll(filters, pagination);
}

// Verifies: FR-CB-004 — Get cycle by ID
export function getCycleById(id: string): Cycle | undefined {
  return cycleStore.findById(id);
}

// Verifies: FR-CB-011 — Get active (non-terminal) cycles
export function getActiveCycles(): Cycle[] {
  return cycleStore.getActiveCycles();
}
