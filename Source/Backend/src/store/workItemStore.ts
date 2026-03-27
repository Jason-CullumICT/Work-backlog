// Verifies: FR-WF-001 — In-memory Work Item store with file persistence and CRUD operations
import * as fs from 'fs';
import * as path from 'path';
import {
  WorkItem,
  WorkItemFilters,
  PaginationParams,
  CreateWorkItemRequest,
} from '../../../Shared/types/workflow';
import { createWorkItem as buildWorkItem, buildChangeEntry } from '../models/WorkItem';
import { setDocIdCounter, getDocIdCounter } from '../utils/id';
import { logger } from '../utils/logger';

let items: Map<string, WorkItem> = new Map();

// Verifies: FR-WF-001 — File persistence path (configurable via env)
const PERSISTENCE_PATH = process.env.WORK_ITEMS_FILE || path.join(process.cwd(), 'data', 'work-items.json');

// Verifies: FR-WF-001 — Persist store to JSON file
function persistToFile(): void {
  try {
    const dir = path.dirname(PERSISTENCE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const payload = {
      docIdCounter: getDocIdCounter(),
      items: Array.from(items.entries()),
    };
    fs.writeFileSync(PERSISTENCE_PATH, JSON.stringify(payload, null, 2), 'utf-8');
  } catch (err) {
    logger.error('Failed to persist work items to file', { path: PERSISTENCE_PATH, error: String(err) });
  }
}

// Verifies: FR-WF-001 — Load store from JSON file on startup
export function loadFromFile(): boolean {
  try {
    if (!fs.existsSync(PERSISTENCE_PATH)) return false;
    const raw = fs.readFileSync(PERSISTENCE_PATH, 'utf-8');
    const payload = JSON.parse(raw) as { docIdCounter: number; items: [string, WorkItem][] };
    items = new Map(payload.items);
    setDocIdCounter(payload.docIdCounter);
    logger.info('Work items loaded from file', { count: items.size, path: PERSISTENCE_PATH });
    return true;
  } catch (err) {
    logger.error('Failed to load work items from file', { path: PERSISTENCE_PATH, error: String(err) });
    return false;
  }
}

// Verifies: FR-WF-001 — Create a new work item with validation
export function createWorkItem(params: CreateWorkItemRequest): WorkItem {
  if (!params.title || !params.title.trim()) {
    throw new Error('title is required');
  }
  if (!params.description || !params.description.trim()) {
    throw new Error('description is required');
  }
  const item = buildWorkItem(params);
  items.set(item.id, item);
  persistToFile();
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

// Verifies: FR-WF-001 — Update a work item with per-field change history tracking
export function updateWorkItem(
  id: string,
  updates: Partial<WorkItem>,
  agent: string = 'system',
): WorkItem | undefined {
  const item = items.get(id);
  if (!item || item.deleted) return undefined;

  // Verifies: FR-WF-003 — Track each field change in changeHistory
  const trackableFields = ['title', 'description', 'type', 'status', 'priority', 'source', 'complexity', 'route', 'assignedTeam'] as const;
  for (const field of trackableFields) {
    if (field in updates && updates[field as keyof WorkItem] !== item[field as keyof WorkItem]) {
      item.changeHistory.push(
        buildChangeEntry(field, item[field as keyof WorkItem], updates[field as keyof WorkItem], agent),
      );
    }
  }

  Object.assign(item, updates, { updatedAt: new Date().toISOString() });
  items.set(id, item);
  persistToFile();
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
  persistToFile();
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

// Verifies: FR-WF-001 — Export persistence path for testing
export function getPersistencePath(): string {
  return PERSISTENCE_PATH;
}
