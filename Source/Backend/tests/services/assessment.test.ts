// Verifies: FR-WF-005 — Tests for Assessment Pod service

import {
  WorkItem,
  WorkItemStatus,
  WorkItemType,
  WorkItemPriority,
  WorkItemSource,
  WorkItemComplexity,
  AssessmentVerdict,
} from '@shared/types/workflow';
import { runAssessmentPod, assessWorkItem } from '../../src/services/assessment';
import * as store from '../../src/store/workItemStore';

function makeWorkItem(overrides: Partial<WorkItem> = {}): WorkItem {
  return {
    id: 'test-id-1',
    docId: 'WI-001',
    title: 'Test work item title',
    description: 'A sufficiently detailed test description for the assessment pod to evaluate',
    type: WorkItemType.Feature,
    status: WorkItemStatus.Proposed,
    priority: WorkItemPriority.Medium,
    source: WorkItemSource.Browser,
    complexity: WorkItemComplexity.Medium,
    changeHistory: [],
    assessments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Assessment Pod Service', () => {
  beforeEach(() => {
    store.resetStore();
  });

  describe('runAssessmentPod', () => {
    // Verifies: FR-WF-005 — All approve = approved
    it('should approve a well-formed work item', () => {
      const item = makeWorkItem();
      const result = runAssessmentPod(item);

      expect(result.verdict).toBe(AssessmentVerdict.Approve);
      expect(result.targetStatus).toBe(WorkItemStatus.Approved);
      expect(result.assessments).toHaveLength(4); // 3 members + pod-lead
    });

    // Verifies: FR-WF-005 — 4 pod roles present
    it('should produce assessments from all 4 roles', () => {
      const item = makeWorkItem();
      const result = runAssessmentPod(item);

      const roles = result.assessments.map((a) => a.role);
      expect(roles).toContain('requirements-reviewer');
      expect(roles).toContain('domain-expert');
      expect(roles).toContain('work-definer');
      expect(roles).toContain('pod-lead');
    });

    // Verifies: FR-WF-005 — Any reject = rejected with synthesized feedback
    it('should reject a work item with insufficient description', () => {
      const item = makeWorkItem({ description: 'Too short' });
      const result = runAssessmentPod(item);

      expect(result.verdict).toBe(AssessmentVerdict.Reject);
      expect(result.targetStatus).toBe(WorkItemStatus.Rejected);

      const podLead = result.assessments.find((a) => a.role === 'pod-lead');
      expect(podLead?.notes).toContain('rejected');
    });

    // Verifies: FR-WF-005 — Reject with short title
    it('should reject a work item with a too-short title', () => {
      const item = makeWorkItem({ title: 'Hi' });
      const result = runAssessmentPod(item);

      expect(result.verdict).toBe(AssessmentVerdict.Reject);
      expect(result.targetStatus).toBe(WorkItemStatus.Rejected);
    });

    // Verifies: FR-WF-005 — Domain expert flags missing complexity
    it('should flag needs-clarification when complexity is missing', () => {
      const item = makeWorkItem({ complexity: undefined });
      const result = runAssessmentPod(item);

      const domainExpert = result.assessments.find((a) => a.role === 'domain-expert');
      expect(domainExpert?.verdict).toBe(AssessmentVerdict.NeedsClarification);
    });

    // Verifies: FR-WF-005 — Work definer provides suggestions
    it('should provide implementation suggestions from work-definer', () => {
      const item = makeWorkItem();
      const result = runAssessmentPod(item);

      const definer = result.assessments.find((a) => a.role === 'work-definer');
      expect(definer?.suggestedChanges.length).toBeGreaterThan(0);
    });

    // Verifies: FR-WF-005 — Pod-lead aggregates all suggestions
    it('should aggregate suggestions in pod-lead assessment', () => {
      const item = makeWorkItem();
      const result = runAssessmentPod(item);

      const podLead = result.assessments.find((a) => a.role === 'pod-lead');
      expect(podLead?.suggestedChanges.length).toBeGreaterThan(0);
    });
  });

  describe('assessWorkItem', () => {
    // Verifies: FR-WF-005 — Assess transitions proposed → approved
    it('should transition proposed item to approved on successful assessment', () => {
      const created = store.createWorkItem({
        title: 'Well-formed feature request',
        description: 'A detailed description of the feature with clear acceptance criteria and scope',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Browser,
      });
      store.updateWorkItem(created.id, {
        status: WorkItemStatus.Proposed,
        complexity: WorkItemComplexity.Medium,
      });

      const result = assessWorkItem(created.id);
      expect(result.status).toBe(WorkItemStatus.Approved);
      expect(result.assessments.length).toBe(4);
      expect(result.changeHistory.length).toBeGreaterThan(1);
    });

    // Verifies: FR-WF-005 — Assess transitions proposed → rejected
    it('should reject an item with poor description', () => {
      const created = store.createWorkItem({
        title: 'Vague request',
        description: 'Fix it',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Browser,
      });
      store.updateWorkItem(created.id, { status: WorkItemStatus.Proposed });

      const result = assessWorkItem(created.id);
      expect(result.status).toBe(WorkItemStatus.Rejected);
    });

    // Verifies: FR-WF-006 — Reject invalid status transitions
    it('should throw when assessing an item not in proposed/reviewing status', () => {
      const created = store.createWorkItem({
        title: 'Backlog item',
        description: 'Still in backlog',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.Medium,
        source: WorkItemSource.Browser,
      });

      expect(() => assessWorkItem(created.id)).toThrow(/Cannot assess/);
    });

    it('should throw for non-existent item', () => {
      expect(() => assessWorkItem('non-existent')).toThrow(/not found/);
    });

    // Verifies: FR-WF-005 — Assessments are appended, not replaced
    it('should accumulate assessments on re-assessment', () => {
      const created = store.createWorkItem({
        title: 'Feature needing multiple reviews',
        description: 'A detailed description of the feature with clear acceptance criteria',
        type: WorkItemType.Feature,
        priority: WorkItemPriority.High,
        source: WorkItemSource.Browser,
      });
      store.updateWorkItem(created.id, {
        status: WorkItemStatus.Proposed,
        complexity: WorkItemComplexity.Medium,
      });

      const first = assessWorkItem(created.id);
      // After approval, put it back to reviewing for a second assessment
      store.updateWorkItem(created.id, { status: WorkItemStatus.Reviewing });

      const second = assessWorkItem(created.id);
      expect(second.assessments.length).toBe(8); // 4 from first + 4 from second
    });
  });
});
