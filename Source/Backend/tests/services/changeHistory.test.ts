// Verifies: FR-WF-003 — Change history service tests
import { trackFieldChange, trackUpdates } from '../../src/services/changeHistory';
import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
} from '../../../Shared/types/workflow';

function makeItem(): WorkItem {
  return {
    id: 'test-id',
    docId: 'WI-001',
    title: 'Test',
    description: 'Test desc',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Backlog,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('ChangeHistoryService', () => {
  // Verifies: FR-WF-003 — Track single field change
  describe('trackFieldChange', () => {
    it('appends a change entry to the item', () => {
      const item = makeItem();
      const entry = trackFieldChange(item, 'status', 'backlog', 'routing', 'system', 'Routing started');

      expect(item.changeHistory).toHaveLength(1);
      expect(entry.field).toBe('status');
      expect(entry.oldValue).toBe('backlog');
      expect(entry.newValue).toBe('routing');
      expect(entry.agent).toBe('system');
      expect(entry.reason).toBe('Routing started');
    });
  });

  // Verifies: FR-WF-003 — Track multiple field changes
  describe('trackUpdates', () => {
    it('tracks only changed fields', () => {
      const item = makeItem();
      const entries = trackUpdates(item, {
        title: 'New title',
        priority: WorkItemPriority.High,
      }, 'user');

      expect(entries).toHaveLength(2);
      expect(entries[0].field).toBe('title');
      expect(entries[1].field).toBe('priority');
    });

    it('skips fields with same value', () => {
      const item = makeItem();
      const entries = trackUpdates(item, { title: 'Test' }, 'user');
      expect(entries).toHaveLength(0);
    });

    it('ignores non-trackable fields', () => {
      const item = makeItem();
      const entries = trackUpdates(item, { id: 'new-id' } as Record<string, unknown>, 'user');
      expect(entries).toHaveLength(0);
    });
  });
});
