// Verifies: FR-CB-005, FR-CB-006, FR-CB-007, FR-CB-018 — In-memory Feature store
import {
  Feature,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { logger } from '../utils/logger';

let items: Map<string, Feature> = new Map();

// Verifies: FR-CB-005 — Create a new feature
export function create(feature: Feature): Feature {
  items.set(feature.id, feature);
  logger.info('Feature created', { id: feature.id, workItemId: feature.workItemId });
  return { ...feature };
}

// Verifies: FR-CB-007 — Find feature by ID
export function findById(id: string): Feature | undefined {
  const item = items.get(id);
  return item ? { ...item } : undefined;
}

// Verifies: FR-CB-006 — Find all features with pagination
export function findAll(
  pagination: PaginationParams = {}
): { data: Feature[]; total: number; page: number; limit: number; totalPages: number } {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;

  let result = Array.from(items.values());

  // Sort by createdAt descending
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const offset = (page - 1) * limit;
  const data = result.slice(offset, offset + limit);

  return { data, total, page, limit, totalPages };
}

// Reset store (for testing)
export function resetStore(): void {
  items = new Map();
}
