// Verifies: FR-CB-001, FR-CB-002, FR-CB-003, FR-CB-004, FR-CB-018 — In-memory Cycle store
import {
  Cycle,
  CycleStatus,
  CycleFilters,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { logger } from '../utils/logger';

let items: Map<string, Cycle> = new Map();

// Verifies: FR-CB-001 — Create a new cycle
export function create(cycle: Cycle): Cycle {
  items.set(cycle.id, cycle);
  logger.info('Cycle created', { id: cycle.id, workItemId: cycle.workItemId, team: cycle.team });
  return { ...cycle };
}

// Verifies: FR-CB-004 — Find cycle by ID
export function findById(id: string): Cycle | undefined {
  const item = items.get(id);
  return item ? { ...item, phases: [...item.phases] } : undefined;
}

// Verifies: FR-CB-003 — Find all cycles with pagination and filtering
export function findAll(
  filters: CycleFilters = {},
  pagination: PaginationParams = {}
): { data: Cycle[]; total: number; page: number; limit: number; totalPages: number } {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;

  let result = Array.from(items.values());

  if (filters.workItemId) {
    result = result.filter((c) => c.workItemId === filters.workItemId);
  }
  if (filters.status) {
    result = result.filter((c) => c.status === filters.status);
  }

  // Sort by startedAt descending
  result.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = result.slice(offset, offset + limit);

  return { data, total, page, limit, totalPages };
}

// Verifies: FR-CB-002 — Update a cycle
export function update(id: string, updates: Partial<Cycle>): Cycle | undefined {
  const item = items.get(id);
  if (!item) return undefined;

  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  items.set(id, item);
  logger.info('Cycle updated', { id, status: item.status });
  return { ...item, phases: [...item.phases] };
}

// Verifies: FR-CB-011 — Get active (non-terminal) cycles
export function getActiveCycles(): Cycle[] {
  const terminalStatuses = [CycleStatus.Completed, CycleStatus.Failed];
  return Array.from(items.values())
    .filter((c) => !terminalStatuses.includes(c.status))
    .map((c) => ({ ...c, phases: [...c.phases] }));
}

// Reset store (for testing)
export function resetStore(): void {
  items = new Map();
}
