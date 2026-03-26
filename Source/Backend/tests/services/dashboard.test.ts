// Verifies: FR-WF-007 — Dashboard service tests
import { getSummary, getActivity, getQueue } from '../../src/services/dashboard';
import { createWorkItem, resetStore, updateWorkItem } from '../../src/store/workItemStore';
import {
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemStatus,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
});

const defaultParams = {
  title: 'Test',
  description: 'Desc',
  type: WorkItemType.Feature,
  priority: WorkItemPriority.Medium,
  source: WorkItemSource.Browser,
};

describe('DashboardService', () => {
  // Verifies: FR-WF-007 — Summary counts
  describe('getSummary', () => {
    it('returns counts by status, team, and priority', () => {
      createWorkItem(defaultParams);
      createWorkItem({ ...defaultParams, priority: WorkItemPriority.High });
      const item3 = createWorkItem(defaultParams);
      updateWorkItem(item3.id, { assignedTeam: 'TheATeam', status: WorkItemStatus.InProgress });

      const summary = getSummary();
      expect(summary.statusCounts[WorkItemStatus.Backlog]).toBe(2);
      expect(summary.statusCounts[WorkItemStatus.InProgress]).toBe(1);
      expect(summary.teamCounts['TheATeam']).toBe(1);
      expect(summary.priorityCounts[WorkItemPriority.Medium]).toBe(2);
      expect(summary.priorityCounts[WorkItemPriority.High]).toBe(1);
    });

    it('returns empty counts when no items exist', () => {
      const summary = getSummary();
      expect(summary.statusCounts).toEqual({});
      expect(summary.teamCounts).toEqual({});
      expect(summary.priorityCounts).toEqual({});
    });
  });

  // Verifies: FR-WF-007 — Activity feed
  describe('getActivity', () => {
    it('returns change history entries across items', () => {
      createWorkItem(defaultParams);
      createWorkItem(defaultParams);
      const activity = getActivity();
      // Each item has 1 creation entry
      expect(activity.data.length).toBe(2);
      expect(activity.data[0].workItemDocId).toBeDefined();
    });

    it('paginates results', () => {
      for (let i = 0; i < 5; i++) {
        createWorkItem(defaultParams);
      }
      const page1 = getActivity(1, 2);
      expect(page1.data.length).toBe(2);
    });
  });

  // Verifies: FR-WF-007 — Queue grouping
  describe('getQueue', () => {
    it('groups items by status', () => {
      createWorkItem(defaultParams);
      createWorkItem(defaultParams);
      const queue = getQueue();

      const backlogGroup = queue.data.find((g) => g.status === WorkItemStatus.Backlog);
      expect(backlogGroup?.count).toBe(2);
      expect(backlogGroup?.items).toHaveLength(2);
    });

    it('includes all statuses even if empty', () => {
      const queue = getQueue();
      expect(queue.data.length).toBe(Object.values(WorkItemStatus).length);
    });
  });
});
