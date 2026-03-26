// Verifies: FR-WF-003 — Change history tracking service
import { WorkItem, ChangeHistoryEntry } from '../../../Shared/types/workflow';
import logger from '../logger';

// Verifies: FR-WF-003 — Track a single field change
export function trackFieldChange(
  item: WorkItem,
  field: string,
  oldValue: unknown,
  newValue: unknown,
  agent: string = 'system',
  reason?: string
): ChangeHistoryEntry {
  const entry: ChangeHistoryEntry = {
    timestamp: new Date().toISOString(),
    agent,
    field,
    oldValue,
    newValue,
    reason,
  };
  item.changeHistory.push(entry);
  item.updatedAt = new Date().toISOString();

  logger.info({ msg: 'Field change tracked', workItemId: item.id, docId: item.docId, field, oldValue, newValue, agent });

  return entry;
}

// Verifies: FR-WF-003 — Track multiple field changes from an update request
export function trackUpdates(
  item: WorkItem,
  updates: Record<string, unknown>,
  agent: string = 'system',
  reason?: string
): ChangeHistoryEntry[] {
  const entries: ChangeHistoryEntry[] = [];
  const trackableFields = ['title', 'description', 'type', 'priority', 'complexity', 'status', 'route', 'assignedTeam'];

  for (const field of trackableFields) {
    if (field in updates && updates[field] !== undefined) {
      const oldValue = (item as unknown as Record<string, unknown>)[field];
      const newValue = updates[field];
      if (oldValue !== newValue) {
        entries.push(trackFieldChange(item, field, oldValue, newValue, agent, reason));
      }
    }
  }

  return entries;
}
