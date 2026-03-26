// Verifies: FR-WF-001 — In-memory Work Item store with CRUD operations
import {
  WorkItem,
  WorkItemFilters,
  PaginationParams,
  CreateWorkItemRequest,
} from '../../../Shared/types/workflow';
import { createWorkItem as buildWorkItem, buildChangeEntry } from '../models/WorkItem';
import { setDocIdCounter } from '../utils/id';
import { logger } from '../utils/logger';

let items: Map<string, WorkItem> = new Map();

// Verifies: FR-WF-001 — Create a new work item
export function createWorkItem(params: CreateWorkItemRequest): WorkItem {
  const item = buildWorkItem(params);
  items.set(item.id, item);
  logger.info('Work item created', { id: item.id, docId: item.docId, type: item.type });
  return item;
}

// Verifies: FR-WF-001 — Find work item by ID
export function findById(id: string): WorkItem | undefined {
  const item = items.get(id);
  if (item && item.deleted) return undefined;
  return item;
}

// Verifies: FR-WF-001 — Find all work items with pagination and filtering
export function findAll(
  filters: WorkItemFilters = {},
  pagination: PaginationParams = {}
): { data: WorkItem[]; total: number; page: number; limit: number; totalPages: number } {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;

  let result = Array.from(items.values()).filter((item) => !item.deleted);

  if (filters.status) {
    result = result.filter((item) => item.status === filters.status);
  }
  if (filters.type) {
    result = result.filter((item) => item.type === filters.type);
  }
  if (filters.priority) {
    result = result.filter((item) => item.priority === filters.priority);
  }
  if (filters.source) {
    result = result.filter((item) => item.source === filters.source);
  }
  if (filters.assignedTeam) {
    result = result.filter((item) => item.assignedTeam === filters.assignedTeam);
  }

  // Sort by updatedAt descending
  result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = result.slice(offset, offset + limit);

  return { data, total, page, limit, totalPages };
}

// Verifies: FR-WF-001 — Update a work item with change tracking
export function updateWorkItem(id: string, updates: Partial<WorkItem>): WorkItem | undefined {
  const item = items.get(id);
  if (!item || item.deleted) return undefined;

  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  items.set(id, item);
  logger.info('Work item updated', { id, fields: Object.keys(updates) });
  return item;
}

// Verifies: FR-WF-001 — Soft delete a work item
export function softDelete(id: string): boolean {
  const item = items.get(id);
  if (!item || item.deleted) return false;
  item.deleted = true;
  item.updatedAt = new Date().toISOString();
  item.changeHistory.push(
    buildChangeEntry('deleted', false, true, 'system', 'Soft deleted'),
  );
  items.set(id, item);
  logger.info('Work item soft-deleted', { id });
  return true;
}

// Verifies: FR-WF-001 — Get all non-deleted items (for dashboard)
export function getAllItems(): WorkItem[] {
  return Array.from(items.values()).filter((item) => !item.deleted);
}

// Reset store (for testing)
export function resetStore(): void {
  items = new Map();
  setDocIdCounter(0);
}
