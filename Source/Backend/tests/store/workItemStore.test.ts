// Verifies: FR-WF-001 — Work Item store tests
import * as fs from 'fs';
import {
  createWorkItem,
  findById,
  findAll,
  updateWorkItem,
  softDelete,
  resetStore,
  loadFromFile,
  getPersistencePath,
} from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
  // Clean up persistence file between tests
  const persistPath = getPersistencePath();
  if (fs.existsSync(persistPath)) {
    fs.unlinkSync(persistPath);
  }
});

describe('WorkItemStore', () => {
  const defaultParams = {
    title: 'Test item',
    description: 'Test description',
    type: WorkItemType.Feature,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
  };

  // Verifies: FR-WF-001 — Create work item
  describe('createWorkItem', () => {
    it('creates a work item with correct defaults', () => {
      const item = createWorkItem(defaultParams);
      expect(item.id).toBeDefined();
      expect(item.docId).toBe('WI-001');
      expect(item.title).toBe('Test item');
      expect(item.status).toBe(WorkItemStatus.Backlog);
      expect(item.changeHistory).toHaveLength(1);
      expect(item.changeHistory[0].field).toBe('status');
    });

    it('auto-increments docId', () => {
      const item1 = createWorkItem(defaultParams);
      const item2 = createWorkItem(defaultParams);
      expect(item1.docId).toBe('WI-001');
      expect(item2.docId).toBe('WI-002');
    });
  });

  // Verifies: FR-WF-001 — Find by ID
  describe('findById', () => {
    it('finds an existing item', () => {
      const created = createWorkItem(defaultParams);
      const found = findById(created.id);
      expect(found).toEqual(created);
    });

    it('returns undefined for non-existent item', () => {
      expect(findById('non-existent')).toBeUndefined();
    });

    it('returns undefined for soft-deleted item', () => {
      const created = createWorkItem(defaultParams);
      softDelete(created.id);
      expect(findById(created.id)).toBeUndefined();
    });
  });

  // Verifies: FR-WF-001 — Find all with filters
  describe('findAll', () => {
    it('returns paginated results', () => {
      for (let i = 0; i < 5; i++) {
        createWorkItem(defaultParams);
      }
      const result = findAll({}, { page: 1, limit: 2 });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('filters by status', () => {
      createWorkItem(defaultParams);
      createWorkItem({ ...defaultParams, type: WorkItemType.Bug });
      const result = findAll({ type: WorkItemType.Bug });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].type).toBe(WorkItemType.Bug);
    });

    it('excludes soft-deleted items', () => {
      const item = createWorkItem(defaultParams);
      createWorkItem(defaultParams);
      softDelete(item.id);
      const result = findAll();
      expect(result.total).toBe(1);
    });
  });

  // Verifies: FR-WF-001 — Input validation
  describe('input validation', () => {
    it('rejects empty title', () => {
      expect(() => createWorkItem({ ...defaultParams, title: '' })).toThrow('title is required');
    });

    it('rejects whitespace-only title', () => {
      expect(() => createWorkItem({ ...defaultParams, title: '   ' })).toThrow('title is required');
    });

    it('rejects empty description', () => {
      expect(() => createWorkItem({ ...defaultParams, description: '' })).toThrow('description is required');
    });
  });

  // Verifies: FR-WF-001 — Update work item with change tracking
  describe('updateWorkItem', () => {
    it('updates fields', () => {
      const item = createWorkItem(defaultParams);
      const updated = updateWorkItem(item.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    // Verifies: FR-WF-003 — Change history on update
    it('tracks field changes in changeHistory', () => {
      const item = createWorkItem(defaultParams);
      const historyBefore = item.changeHistory.length;
      const updated = updateWorkItem(item.id, { title: 'New Title', priority: WorkItemPriority.High });
      expect(updated!.changeHistory.length).toBe(historyBefore + 2);
      const titleChange = updated!.changeHistory.find(
        (e) => e.field === 'title' && e.newValue === 'New Title',
      );
      expect(titleChange).toBeDefined();
      expect(titleChange!.oldValue).toBe('Test item');
    });

    it('does not add history entry when value is unchanged', () => {
      const item = createWorkItem(defaultParams);
      const historyBefore = item.changeHistory.length;
      const updated = updateWorkItem(item.id, { title: item.title });
      expect(updated!.changeHistory.length).toBe(historyBefore);
    });

    it('returns undefined for non-existent item', () => {
      expect(updateWorkItem('fake', { title: 'x' })).toBeUndefined();
    });
  });

  // Verifies: FR-WF-001 — Soft delete
  describe('softDelete', () => {
    it('marks item as deleted', () => {
      const item = createWorkItem(defaultParams);
      expect(softDelete(item.id)).toBe(true);
      expect(findById(item.id)).toBeUndefined();
    });

    it('returns false for non-existent item', () => {
      expect(softDelete('fake')).toBe(false);
    });
  });

  // Verifies: FR-WF-001 — File persistence
  describe('file persistence', () => {
    it('persists items to file on create', () => {
      createWorkItem(defaultParams);
      const persistPath = getPersistencePath();
      expect(fs.existsSync(persistPath)).toBe(true);
      const raw = JSON.parse(fs.readFileSync(persistPath, 'utf-8'));
      expect(raw.items).toHaveLength(1);
      expect(raw.docIdCounter).toBe(1);
    });

    it('loads items from file after reset', () => {
      const item = createWorkItem(defaultParams);
      const id = item.id;
      resetStore();
      expect(findById(id)).toBeUndefined();
      const loaded = loadFromFile();
      expect(loaded).toBe(true);
      expect(findById(id)).toBeDefined();
      expect(findById(id)!.title).toBe('Test item');
    });

    it('returns false when no persistence file exists', () => {
      expect(loadFromFile()).toBe(false);
    });

    it('preserves docId counter across load', () => {
      createWorkItem(defaultParams);
      createWorkItem(defaultParams);
      resetStore();
      loadFromFile();
      const next = createWorkItem(defaultParams);
      expect(next.docId).toBe('WI-003');
    });
  });
});
