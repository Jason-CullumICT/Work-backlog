// Verifies: FR-WF-004 — Tests for Work Router service

import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemComplexity,
  WorkItemRoute,
} from '@shared/types/workflow';
import { classifyRoute, routeWorkItem, assignTeam } from '../../src/services/router';
import * as store from '../../src/store/workItemStore';

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-id-1',
    docId: 'WI-001',
    title: 'Test work item',
    description: 'A test description that is long enough',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Backlog,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    changeHistory: [],
    assessments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Router Service', () => {
  beforeEach(() => {
    store.resetStore();
  });

  describe('classifyRoute', () => {
    // Verifies: FR-WF-004 — Fast-track: bug + trivial complexity
    it('should fast-track a trivial bug', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Trivial });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FastTrack);
      expect(result.targetStatus).toBe(WorkItemStatus.Approved);
    });

    // Verifies: FR-WF-004 — Fast-track: bug + small complexity
    it('should fast-track a small bug', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Small });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FastTrack);
      expect(result.targetStatus).toBe(WorkItemStatus.Approved);
    });

    // Verifies: FR-WF-004 — Fast-track: improvement + small complexity
    it('should fast-track a small improvement', () => {
      const item = makeWorkItem({ type: WorkItemType.Improvement, complexity: WorkItemComplexity.Small });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FastTrack);
      expect(result.targetStatus).toBe(WorkItemStatus.Approved);
    });

    // Verifies: FR-WF-004 — Full-review: all features
    it('should full-review all features', () => {
      const item = makeWorkItem({ type: WorkItemType.Feature });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FullReview);
      expect(result.targetStatus).toBe(WorkItemStatus.Proposed);
    });

    // Verifies: FR-WF-004 — Full-review: bugs with medium+ complexity
    it('should full-review a medium complexity bug', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Medium });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FullReview);
      expect(result.targetStatus).toBe(WorkItemStatus.Proposed);
    });

    // Verifies: FR-WF-004 — Full-review: all issues
    it('should full-review all issues', () => {
      const item = makeWorkItem({ type: WorkItemType.Issue });
      const result = classifyRoute(item);
      expect(result.route).toBe(WorkItemRoute.FullReview);
      expect(result.targetStatus).toBe(WorkItemStatus.Proposed);
    });

    // Verifies: FR-WF-004 — Override route
    it('should respect override route to fast-track', () => {
      const item = makeWorkItem({ type: WorkItemType.Feature });
      const result = classifyRoute(item, WorkItemRoute.FastTrack);
      expect(result.route).toBe(WorkItemRoute.FastTrack);
      expect(result.targetStatus).toBe(WorkItemStatus.Approved);
    });

    it('should respect override route to full-review', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Trivial });
      const result = classifyRoute(item, WorkItemRoute.FullReview);
      expect(result.route).toBe(WorkItemRoute.FullReview);
      expect(result.targetStatus).toBe(WorkItemStatus.Proposed);
    });
  });

  describe('routeWorkItem', () => {
    // Verifies: FR-WF-004 — Route transitions backlog → approved (fast-track)
    it('should route a fast-track bug from backlog to approved', () => {
      const created = store.createWorkItem({
        title: 'Fix typo',
        description: 'Small typo fix',
        type: WorkItemType.Bug,
        priority: WorkItemPriority.Low,
        source: WorkItemSource.Browser,
      });
      // Set complexity to make it fast-track
      store.updateWorkItem(created.id, { complexity: WorkItemComplexity.Trivial });

      const result = routeWorkItem(created.id);
      expect(result.status).toBe(WorkItemStatus.Approved);
      expect(result.route).toBe(WorkItemRoute.FastTrack);
      expect(result.changeHistory.length).toBeGreaterThan(1);
    });

    // Verifies: FR-WF-004 — Route transitions backlog → proposed (full-review)
    it('should route a feature from backlog to proposed', () => {
      const created = store.createWorkItem({
        title: 'New feature',
        description: 'A new feature that needs review',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Browser,
      });

      const result = routeWorkItem(created.id);
      expect(result.status).toBe(WorkItemStatus.Proposed);
      expect(result.route).toBe(WorkItemRoute.FullReview);
    });

    // Verifies: FR-WF-006 — Reject invalid status transitions
    it('should throw when routing an item not in backlog', () => {
      const created = store.createWorkItem({
        title: 'Already routed',
        description: 'Already been through routing',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });
      store.updateWorkItem(created.id, { status: WorkItemStatus.Approved });

      expect(() => routeWorkItem(created.id)).toThrow(/Cannot route/);
    });

    it('should throw for non-existent item', () => {
      expect(() => routeWorkItem('non-existent')).toThrow(/not found/);
    });
  });

  describe('assignTeam', () => {
    // Verifies: FR-WF-004 — TheATeam for features
    it('should assign TheATeam for features', () => {
      const item = makeWorkItem({ type: WorkItemType.Feature });
      expect(assignTeam(item)).toBe('TheATeam');
    });

    // Verifies: FR-WF-004 — TheATeam for complex work
    it('should assign TheATeam for complex work', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Complex });
      expect(assignTeam(item)).toBe('TheATeam');
    });

    // Verifies: FR-WF-004 — TheFixer for bugs
    it('should assign TheFixer for bugs', () => {
      const item = makeWorkItem({ type: WorkItemType.Bug, complexity: WorkItemComplexity.Small });
      expect(assignTeam(item)).toBe('TheFixer');
    });

    // Verifies: FR-WF-004 — TheFixer for improvements
    it('should assign TheFixer for improvements', () => {
      const item = makeWorkItem({ type: WorkItemType.Improvement });
      expect(assignTeam(item)).toBe('TheFixer');
    });
  });
});
