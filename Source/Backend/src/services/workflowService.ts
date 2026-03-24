import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import { WorkItem, WorkItemStatus, Proposal, Review, ReviewDecision } from '../models/types';
import { changeHistoryService } from './changeHistoryService';
import { validateTransition } from './stateMachine';
import { ValidationError } from './workItemService';
import { logger } from '../config/logger';

export class WorkflowService {
  /**
   * Transition a work item to a new status.
   * Validates the transition against the state machine.
   * Records status change in change_history.
   * Verifies: FR-WF-003
   */
  async transition(
    workItemId: string,
    targetStatus: WorkItemStatus,
    changedBy: string = 'system'
  ): Promise<WorkItem> {
    const db = getDb();
    const item = await db('work_items').where({ id: workItemId }).first();

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    const result = validateTransition(item.status as WorkItemStatus, targetStatus);
    if (!result.valid) {
      throw new ValidationError(result.error);
    }

    const now = new Date().toISOString();

    await changeHistoryService.recordChange(
      workItemId,
      'status',
      item.status,
      targetStatus,
      changedBy
    );

    await db('work_items')
      .where({ id: workItemId })
      .update({ status: targetStatus, updated_at: now });

    const updated = await db('work_items').where({ id: workItemId }).first();

    logger.info(
      { workItemId, from: item.status, to: targetStatus, changedBy },
      'Work item transitioned'
    );

    return updated;
  }

  /**
   * Create a proposal for a work item.
   * Item must be in backlog status.
   * Transitions item to "proposed" and creates proposal record.
   * Verifies: FR-WF-004
   */
  async propose(
    workItemId: string,
    requirements: string,
    prototypeUrl?: string,
    createdBy: string = 'system'
  ): Promise<Proposal> {
    const db = getDb();
    const item = await db('work_items').where({ id: workItemId }).first();

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (item.status !== 'backlog') {
      throw new ValidationError(
        `Cannot propose: item is in "${item.status}" status, must be in "backlog"`
      );
    }

    if (!requirements || requirements.trim() === '') {
      throw new ValidationError('Requirements are required');
    }

    const now = new Date().toISOString();
    const proposal: Proposal = {
      id: uuidv4(),
      work_item_id: workItemId,
      requirements: requirements.trim(),
      prototype_url: prototypeUrl || null,
      created_by: createdBy,
      created_at: now,
    };

    await db('proposals').insert(proposal);

    // Transition status to proposed
    await changeHistoryService.recordChange(
      workItemId,
      'status',
      item.status,
      'proposed',
      createdBy
    );

    await db('work_items')
      .where({ id: workItemId })
      .update({ status: 'proposed', updated_at: now });

    logger.info(
      { workItemId, proposalId: proposal.id, createdBy },
      'Proposal created and item moved to proposed'
    );

    return proposal;
  }

  /**
   * Submit a review decision for a work item.
   * Item must be in under_review status.
   * Transitions item to "approved" or "rejected" based on decision.
   * Verifies: FR-WF-005
   */
  async review(
    workItemId: string,
    decision: ReviewDecision,
    feedback?: string,
    reviewedBy: string = 'system'
  ): Promise<Review> {
    const db = getDb();
    const item = await db('work_items').where({ id: workItemId }).first();

    if (!item) {
      throw new NotFoundError('Work item not found');
    }

    if (item.status !== 'under_review') {
      throw new ValidationError(
        `Cannot review: item is in "${item.status}" status, must be in "under_review"`
      );
    }

    if (!decision || !['approved', 'rejected'].includes(decision)) {
      throw new ValidationError('Decision must be "approved" or "rejected"');
    }

    const now = new Date().toISOString();
    const review: Review = {
      id: uuidv4(),
      work_item_id: workItemId,
      decision,
      feedback: feedback || null,
      reviewed_by: reviewedBy,
      reviewed_at: now,
    };

    await db('reviews').insert(review);

    // Transition status based on decision
    const targetStatus: WorkItemStatus = decision === 'approved' ? 'approved' : 'rejected';

    await changeHistoryService.recordChange(
      workItemId,
      'status',
      item.status,
      targetStatus,
      reviewedBy
    );

    await db('work_items')
      .where({ id: workItemId })
      .update({ status: targetStatus, updated_at: now });

    logger.info(
      { workItemId, reviewId: review.id, decision, reviewedBy },
      'Review submitted and item status updated'
    );

    return review;
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export const workflowService = new WorkflowService();
