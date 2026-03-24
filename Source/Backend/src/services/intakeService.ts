import { getDb } from '../config/database';
import { workItemService } from './workItemService';
import { WorkItem, CreateWorkItemInput, Priority } from '../models/types';
import { logger } from '../config/logger';

/**
 * IntakeService — processes incoming webhook payloads and creates work items with dedup.
 * Verifies: FR-WF-007 — Intake webhooks with dedup
 */
export class IntakeService {
  /**
   * Find an existing work item by source + external_id.
   * Returns null if no match found.
   */
  async findBySourceAndExternalId(
    source: string,
    externalId: string
  ): Promise<WorkItem | null> {
    const db = getDb();
    const item = await db('work_items')
      .where({ source, external_id: externalId })
      .first();
    return item || null;
  }

  /**
   * Process a Zendesk webhook payload.
   * Dedup by source="zendesk" + external_id=ticket_id.
   * Verifies: FR-WF-007
   */
  async processZendesk(payload: {
    ticket_id: string;
    subject: string;
    description?: string;
    priority?: string;
  }): Promise<{ item: WorkItem; created: boolean }> {
    const externalId = String(payload.ticket_id);

    // Dedup check
    const existing = await this.findBySourceAndExternalId('zendesk', externalId);
    if (existing) {
      logger.info(
        { source: 'zendesk', externalId },
        'Intake dedup: returning existing work item'
      );
      return { item: existing, created: false };
    }

    // Map Zendesk priority to our priority
    const priorityMap: Record<string, Priority> = {
      urgent: 'critical',
      high: 'high',
      normal: 'medium',
      low: 'low',
    };

    const input: CreateWorkItemInput = {
      title: payload.subject,
      description: payload.description,
      source: 'zendesk',
      external_id: externalId,
      type: 'task',
      priority: priorityMap[payload.priority || 'normal'] || 'medium',
    };

    const item = await workItemService.create(input);

    logger.info(
      { source: 'zendesk', externalId, workItemId: item.id },
      'Intake: created work item from Zendesk webhook'
    );

    return { item, created: true };
  }

  /**
   * Process a generic integration webhook payload.
   * Dedup by source + external_id.
   * Verifies: FR-WF-007
   */
  async processIntegration(payload: {
    external_id: string;
    title: string;
    description?: string;
    type?: string;
    priority?: string;
    source?: string;
  }): Promise<{ item: WorkItem; created: boolean }> {
    const source = payload.source || 'integration';
    const externalId = String(payload.external_id);

    // Dedup check
    const existing = await this.findBySourceAndExternalId(source, externalId);
    if (existing) {
      logger.info(
        { source, externalId },
        'Intake dedup: returning existing work item'
      );
      return { item: existing, created: false };
    }

    const input: CreateWorkItemInput = {
      title: payload.title,
      description: payload.description,
      source: source as CreateWorkItemInput['source'],
      external_id: externalId,
      type: (payload.type as CreateWorkItemInput['type']) || 'task',
      priority: (payload.priority as CreateWorkItemInput['priority']) || 'medium',
    };

    const item = await workItemService.create(input);

    logger.info(
      { source, externalId, workItemId: item.id },
      'Intake: created work item from integration webhook'
    );

    return { item, created: true };
  }
}

export const intakeService = new IntakeService();
