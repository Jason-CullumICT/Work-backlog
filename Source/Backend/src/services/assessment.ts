// Verifies: FR-WF-005 — Assessment Pod service (4 roles: pod-lead, requirements-reviewer, domain-expert, work-definer)

import {
  WorkItem,
  WorkItemStatus,
  AssessmentRecord,
  AssessmentVerdict,
} from '../../../Shared/types/workflow';
import * as store from '../store/workItemStore';
import { buildChangeEntry } from '../models/WorkItem';
import { itemsAssessedCounter } from '../metrics';
import logger from '../logger';

// Verifies: FR-WF-005 — Pod role definitions
const POD_ROLES = ['pod-lead', 'requirements-reviewer', 'domain-expert', 'work-definer'] as const;
type PodRole = typeof POD_ROLES[number];

// Verifies: FR-WF-005 — Individual role assessment logic
function assessAsRequirementsReviewer(item: WorkItem): AssessmentRecord {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!item.title || item.title.trim().length < 5) {
    issues.push('Title is too short or missing — must clearly describe the work');
    suggestions.push('Provide a descriptive title of at least 5 characters');
  }

  if (!item.description || item.description.trim().length < 20) {
    issues.push('Description lacks sufficient detail for implementation');
    suggestions.push('Expand description to include expected behavior, context, and scope');
  }

  const verdict = issues.length > 0 ? AssessmentVerdict.Reject : AssessmentVerdict.Approve;

  return {
    role: 'requirements-reviewer',
    verdict,
    notes: issues.length > 0
      ? `Requirements review failed: ${issues.join('; ')}`
      : 'Requirements are complete and testable',
    suggestedChanges: suggestions,
    timestamp: new Date().toISOString(),
  };
}

// Verifies: FR-WF-005 — Domain expert checks domain correctness and edge cases
function assessAsDomainExpert(item: WorkItem): AssessmentRecord {
  const suggestions: string[] = [];
  let verdict = AssessmentVerdict.Approve;
  let notes = 'Domain analysis passed — no concerns identified';

  if (!item.complexity) {
    suggestions.push('Set complexity to help with routing and estimation');
    verdict = AssessmentVerdict.NeedsClarification;
    notes = 'Complexity is not set — cannot assess scope and edge cases accurately';
  }

  if (!item.priority) {
    suggestions.push('Set priority level for proper scheduling');
    verdict = AssessmentVerdict.NeedsClarification;
    notes = 'Priority is not set — cannot assess urgency';
  }

  return {
    role: 'domain-expert',
    verdict,
    notes,
    suggestedChanges: suggestions,
    timestamp: new Date().toISOString(),
  };
}

// Verifies: FR-WF-005 — Work definer enriches with acceptance criteria and scope boundaries
function assessAsWorkDefiner(item: WorkItem): AssessmentRecord {
  const suggestions: string[] = [];

  // Suggest acceptance criteria based on type
  switch (item.type) {
    case 'feature':
      suggestions.push('Define user story acceptance criteria');
      suggestions.push('Identify affected components and integration points');
      break;
    case 'bug':
      suggestions.push('Document reproduction steps');
      suggestions.push('Define expected vs actual behavior');
      break;
    case 'issue':
      suggestions.push('Clarify scope boundaries and affected areas');
      break;
    case 'improvement':
      suggestions.push('Define measurable improvement metrics');
      break;
  }

  return {
    role: 'work-definer',
    verdict: AssessmentVerdict.Approve,
    notes: 'Work item enriched with implementation guidance',
    suggestedChanges: suggestions,
    timestamp: new Date().toISOString(),
  };
}

// Verifies: FR-WF-005 — Pod Lead coordinates and makes final verdict
function assessAsPodLead(
  item: WorkItem,
  memberAssessments: AssessmentRecord[],
): AssessmentRecord {
  const rejections = memberAssessments.filter((a) => a.verdict === AssessmentVerdict.Reject);
  const clarifications = memberAssessments.filter((a) => a.verdict === AssessmentVerdict.NeedsClarification);

  let verdict: AssessmentVerdict;
  let notes: string;

  if (rejections.length > 0) {
    // Verifies: FR-WF-005 — Any reject = rejected with synthesized feedback
    verdict = AssessmentVerdict.Reject;
    const feedback = rejections.map((r) => `[${r.role}]: ${r.notes}`).join('; ');
    notes = `Assessment rejected by pod. Feedback: ${feedback}`;
  } else if (clarifications.length > 0) {
    verdict = AssessmentVerdict.NeedsClarification;
    const feedback = clarifications.map((c) => `[${c.role}]: ${c.notes}`).join('; ');
    notes = `Clarification needed. Feedback: ${feedback}`;
  } else {
    // Verifies: FR-WF-005 — All approve = approved
    verdict = AssessmentVerdict.Approve;
    notes = 'All pod members approve. Work item is ready for implementation.';
  }

  const allSuggestions = memberAssessments.flatMap((a) => a.suggestedChanges);

  return {
    role: 'pod-lead',
    verdict,
    notes,
    suggestedChanges: allSuggestions,
    timestamp: new Date().toISOString(),
  };
}

export interface AssessmentResult {
  verdict: AssessmentVerdict;
  assessments: AssessmentRecord[];
  targetStatus: WorkItemStatus;
}

// Verifies: FR-WF-005 — Run full assessment pod on a work item
export function runAssessmentPod(item: WorkItem): AssessmentResult {
  // Step 1-2: All pod members assess (synchronous sequential per design doc)
  const reviewerAssessment = assessAsRequirementsReviewer(item);
  const domainAssessment = assessAsDomainExpert(item);
  const definerAssessment = assessAsWorkDefiner(item);

  const memberAssessments = [reviewerAssessment, domainAssessment, definerAssessment];

  // Step 3-5: Pod Lead aggregates
  const podLeadAssessment = assessAsPodLead(item, memberAssessments);

  const allAssessments = [...memberAssessments, podLeadAssessment];

  // Determine target status based on pod-lead verdict
  let targetStatus: WorkItemStatus;
  if (podLeadAssessment.verdict === AssessmentVerdict.Approve) {
    targetStatus = WorkItemStatus.Approved;
  } else {
    targetStatus = WorkItemStatus.Rejected;
  }

  return {
    verdict: podLeadAssessment.verdict,
    assessments: allAssessments,
    targetStatus,
  };
}

// Verifies: FR-WF-005 — Assess a work item: proposed → reviewing → (approved | rejected)
export function assessWorkItem(itemId: string): WorkItem {
  const item = store.findById(itemId);
  if (!item) {
    throw new Error(`Work item ${itemId} not found`);
  }

  if (item.status !== WorkItemStatus.Proposed && item.status !== WorkItemStatus.Reviewing) {
    throw new Error(
      `Cannot assess work item in status '${item.status}'. Must be in 'proposed' or 'reviewing' status.`,
    );
  }

  // Transition to reviewing
  const reviewingEntry = buildChangeEntry(
    'status', item.status, WorkItemStatus.Reviewing, 'assessment-pod', 'Assessment pod started',
  );
  item.changeHistory.push(reviewingEntry);

  // Run assessment pod
  const result = runAssessmentPod(item);

  // Record status transition
  const statusEntry = buildChangeEntry(
    'status', WorkItemStatus.Reviewing, result.targetStatus, 'assessment-pod',
    result.verdict === AssessmentVerdict.Approve
      ? 'Assessment pod approved'
      : `Assessment pod ${result.verdict}: ${result.assessments.find(a => a.role === 'pod-lead')?.notes}`,
  );
  item.changeHistory.push(statusEntry);

  // Merge new assessments with existing
  const allAssessments = [...item.assessments, ...result.assessments];

  const updated = store.updateWorkItem(itemId, {
    status: result.targetStatus,
    assessments: allAssessments,
    changeHistory: item.changeHistory,
  });

  if (!updated) {
    throw new Error(`Failed to update work item ${itemId}`);
  }

  // Verifies: FR-WF-013 — Prometheus metric
  itemsAssessedCounter.inc({ verdict: result.verdict });

  logger.info({
    msg: 'Work item assessed',
    workItemId: itemId,
    docId: updated.docId,
    verdict: result.verdict,
    targetStatus: result.targetStatus,
    assessmentCount: result.assessments.length,
  });

  return updated;
}
