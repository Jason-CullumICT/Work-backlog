// Verifies: FR-CB-005, FR-CB-006, FR-CB-007, FR-CB-019 — Feature service layer
import crypto from 'crypto';
import {
  Feature,
  CreateFeatureRequest,
  WorkItemStatus,
  PaginationParams,
} from '../../../Shared/types/workflow';
import * as featureStore from '../store/featureStore';
import * as workItemStore from '../store/workItemStore';
import { featuresCreatedCounter } from '../metrics';
import logger from '../logger';

// Verifies: FR-CB-005 — Create a feature and transition WorkItem to completed
export function createFeature(data: CreateFeatureRequest): Feature {
  const now = new Date().toISOString();
  const feature: Feature = {
    id: crypto.randomUUID(),
    workItemId: data.workItemId,
    cycleId: data.cycleId,
    title: data.title,
    description: data.description,
    branch: data.branch,
    mergedAt: data.mergedAt,
    createdAt: now,
  };

  const created = featureStore.create(feature);

  // Transition WorkItem to completed if currently in-progress
  const workItem = workItemStore.findById(data.workItemId);
  if (workItem && workItem.status === WorkItemStatus.InProgress) {
    workItemStore.updateWorkItem(data.workItemId, { status: WorkItemStatus.Completed });
    logger.info({ msg: 'WorkItem transitioned to completed', workItemId: data.workItemId });
  }

  // Verifies: FR-CB-015 — Metric: features created
  featuresCreatedCounter.inc();
  logger.info({ msg: 'Feature created via service', featureId: created.id, workItemId: data.workItemId });

  return created;
}

// Verifies: FR-CB-006 — List features with pagination
export function listFeatures(
  pagination: PaginationParams = {}
): { data: Feature[]; total: number; page: number; limit: number; totalPages: number } {
  return featureStore.findAll(pagination);
}

// Verifies: FR-CB-007 — Get feature by ID
export function getFeatureById(id: string): Feature | undefined {
  return featureStore.findById(id);
}
