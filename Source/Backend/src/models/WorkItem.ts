// Verifies: FR-WF-001 — WorkItem model with factory and change-history helpers

import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  ChangeHistoryEntry,
  CreateWorkItemRequest,
} from '@shared/types/workflow';
import { generateId, generateDocId } from '../utils/id';

/**
 * Create a new WorkItem from a creation request.
 * Always enters with status=backlog per spec.
 */
// Verifies: FR-WF-001
export function createWorkItem(request: CreateWorkItemRequest): WorkItem {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    docId: generateDocId(),
    title: request.title,
    description: request.description,
    type: request.type,
    status: WorkItemStatus.Backlog,
    priority: request.priority,
    source: request.source,
    complexity: request.complexity,
    changeHistory: [
      {
        timestamp: now,
        agent: 'system',
        field: 'status',
        oldValue: null,
        newValue: WorkItemStatus.Backlog,
        reason: 'Work item created',
      },
    ],
    assessments: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build a ChangeHistoryEntry for a field mutation.
 */
// Verifies: FR-WF-003
export function buildChangeEntry(
  field: string,
  oldValue: unknown,
  newValue: unknown,
  agent: string = 'system',
  reason?: string,
): ChangeHistoryEntry {
  return {
    timestamp: new Date().toISOString(),
    agent,
    field,
    oldValue,
    newValue,
    ...(reason ? { reason } : {}),
  };
}
