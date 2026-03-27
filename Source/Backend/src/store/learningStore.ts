// Verifies: FR-CB-018 — In-memory Map store for Learning entities (same pattern as workItemStore)
import crypto from 'crypto';
import {
  Learning,
  CreateLearningRequest,
  LearningFilters,
  PaginationParams,
} from '../../../Shared/types/workflow';
import { logger } from '../utils/logger';

let items: Map<string, Learning> = new Map();

// Verifies: FR-CB-008 — Create a single learning
export function createLearning(params: CreateLearningRequest): Learning {
  const learning: Learning = {
    id: crypto.randomUUID(),
    cycleId: params.cycleId,
    team: params.team,
    role: params.role,
    content: params.content,
    category: params.category,
    createdAt: new Date().toISOString(),
  };
  items.set(learning.id, learning);
  logger.info('Learning created', { id: learning.id, team: learning.team, role: learning.role });
  return learning;
}

// Verifies: FR-CB-009 — Batch create learnings
export function batchCreate(learnings: CreateLearningRequest[]): Learning[] {
  return learnings.map((params) => createLearning(params));
}

// Verifies: FR-CB-010 — Find learning by ID
export function findById(id: string): Learning | undefined {
  return items.get(id);
}

// Verifies: FR-CB-010 — Find all learnings with pagination and filtering
export function findAll(
  filters: LearningFilters = {},
  pagination: PaginationParams = {}
): { data: Learning[]; total: number; page: number; limit: number; totalPages: number } {
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;

  let result = Array.from(items.values());

  if (filters.cycleId) {
    result = result.filter((item) => item.cycleId === filters.cycleId);
  }
  if (filters.team) {
    result = result.filter((item) => item.team === filters.team);
  }
  if (filters.role) {
    result = result.filter((item) => item.role === filters.role);
  }

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
