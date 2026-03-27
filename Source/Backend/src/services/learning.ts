// Verifies: FR-CB-019 — Learning service layer (no direct store access from routes)
import {
  Learning,
  CreateLearningRequest,
  LearningFilters,
  PaginationParams,
} from '../../../Shared/types/workflow';
import * as learningStore from '../store/learningStore';
import { learningsCreatedCounter } from '../metrics';
import logger from '../logger';

// Verifies: FR-CB-008 — Create a single learning
export function createLearning(data: CreateLearningRequest): Learning {
  const learning = learningStore.createLearning(data);
  // Verifies: FR-CB-015 — Increment learnings counter
  learningsCreatedCounter.inc({ team: data.team, role: data.role });
  logger.info({ msg: 'Learning created via service', learningId: learning.id, team: data.team, role: data.role });
  return learning;
}

// Verifies: FR-CB-009 — Batch create learnings
export function batchCreateLearnings(items: CreateLearningRequest[]): Learning[] {
  const learnings = learningStore.batchCreate(items);
  logger.info({ msg: 'Learnings batch created via service', count: learnings.length });
  return learnings;
}

// Verifies: FR-CB-010 — List learnings with filters and pagination
export function listLearnings(
  filters: LearningFilters = {},
  pagination: PaginationParams = {}
): { data: Learning[]; total: number; page: number; limit: number; totalPages: number } {
  return learningStore.findAll(filters, pagination);
}
