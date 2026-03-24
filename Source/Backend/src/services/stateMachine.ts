import { WorkItemStatus } from '../models/types';

/**
 * Pipeline state machine with valid transitions.
 * Verifies: FR-WF-003 — state machine enforcement
 */

// Map of current status -> array of valid target statuses
export const TRANSITION_MAP: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['proposed', 'under_review'],
  proposed: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['in_dev'],
  in_dev: ['done'],
  rejected: ['backlog'],
  done: [],
};

/**
 * Validates whether a transition from `currentStatus` to `targetStatus` is allowed.
 * Returns { valid: true } or { valid: false, error: string }.
 */
export function validateTransition(
  currentStatus: WorkItemStatus,
  targetStatus: WorkItemStatus
): { valid: true } | { valid: false; error: string } {
  const validTargets = TRANSITION_MAP[currentStatus];

  if (!validTargets) {
    return {
      valid: false,
      error: `Unknown current status: ${currentStatus}`,
    };
  }

  if (!validTargets.includes(targetStatus)) {
    const allowed = validTargets.length > 0
      ? validTargets.join(', ')
      : 'none (terminal state)';
    return {
      valid: false,
      error: `Invalid transition from "${currentStatus}" to "${targetStatus}". Valid targets: ${allowed}`,
    };
  }

  return { valid: true };
}
