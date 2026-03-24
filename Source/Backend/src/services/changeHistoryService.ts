import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import { ChangeEntry } from '../models/types';
import { logger } from '../config/logger';

export class ChangeHistoryService {
  /**
   * Record a single field change for a work item.
   * Verifies: FR-WF-002 — auto-records field changes
   */
  async recordChange(
    workItemId: string,
    field: string,
    oldValue: string | null,
    newValue: string,
    changedBy: string
  ): Promise<ChangeEntry> {
    const db = getDb();
    const entry: ChangeEntry = {
      id: uuidv4(),
      work_item_id: workItemId,
      field,
      old_value: oldValue,
      new_value: newValue,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
    };

    await db('change_history').insert(entry);

    logger.info(
      { workItemId, field, changedBy },
      'Change history entry recorded'
    );

    return entry;
  }

  /**
   * Record changes for multiple fields at once.
   * Compares old and new values and only records actual changes.
   */
  async recordChanges(
    workItemId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    changedBy: string
  ): Promise<ChangeEntry[]> {
    const entries: ChangeEntry[] = [];

    for (const [field, newVal] of Object.entries(newValues)) {
      const oldVal = oldValues[field];
      const oldStr = oldVal != null ? String(oldVal) : null;
      const newStr = newVal != null ? String(newVal) : '';

      if (oldStr !== newStr) {
        const entry = await this.recordChange(
          workItemId,
          field,
          oldStr,
          newStr,
          changedBy
        );
        entries.push(entry);
      }
    }

    return entries;
  }

  /**
   * Get all change history for a work item.
   * Returns entries ordered by changed_at descending.
   */
  async getByWorkItemId(workItemId: string): Promise<ChangeEntry[]> {
    const db = getDb();
    return db('change_history')
      .where({ work_item_id: workItemId })
      .orderBy('changed_at', 'desc');
  }
}

export const changeHistoryService = new ChangeHistoryService();
