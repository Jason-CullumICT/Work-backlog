import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../config/database';
import {
  WorkItem,
  WorkItemWithHistory,
  CreateWorkItemInput,
  UpdateWorkItemInput,
  WorkItemFilters,
  VALID_TYPES,
  VALID_PRIORITIES,
  VALID_SOURCES,
} from '../models/types';
import { changeHistoryService } from './changeHistoryService';
import { logger } from '../config/logger';

export class WorkItemService {
  /**
   * Create a new work item. Always enforces status=backlog.
   * Verifies: FR-WF-001 — enforced backlog creation
   */
  async create(input: CreateWorkItemInput): Promise<WorkItem> {
    const db = getDb();

    if (!input.title || input.title.trim() === '') {
      throw new ValidationError('Title is required');
    }

    if (input.type && !VALID_TYPES.includes(input.type)) {
      throw new ValidationError(`Invalid type: ${input.type}`);
    }

    if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
      throw new ValidationError(`Invalid priority: ${input.priority}`);
    }

    if (input.source && !VALID_SOURCES.includes(input.source)) {
      throw new ValidationError(`Invalid source: ${input.source}`);
    }

    const now = new Date().toISOString();
    const workItem: WorkItem = {
      id: uuidv4(),
      title: input.title.trim(),
      description: input.description || null,
      type: input.type || 'task',
      status: 'backlog', // Always enforced
      queue: input.queue || null,
      priority: input.priority || 'medium',
      source: input.source || 'browser',
      external_id: input.external_id || null,
      created_at: now,
      updated_at: now,
    };

    await db('work_items').insert(workItem);

    logger.info({ workItemId: workItem.id, title: workItem.title }, 'Work item created');

    return workItem;
  }

  /**
   * List work items with optional filters.
   * Returns {data: WorkItem[]} wrapper.
   * Verifies: FR-WF-001 — filtered list
   */
  async list(filters: WorkItemFilters = {}): Promise<WorkItem[]> {
    const db = getDb();
    let query = db('work_items');

    if (filters.status) {
      query = query.where('status', filters.status);
    }
    if (filters.type) {
      query = query.where('type', filters.type);
    }
    if (filters.queue) {
      query = query.where('queue', filters.queue);
    }
    if (filters.priority) {
      query = query.where('priority', filters.priority);
    }
    if (filters.source) {
      query = query.where('source', filters.source);
    }

    return query.orderBy('created_at', 'desc');
  }

  /**
   * Get a single work item by ID, including change history.
   * Verifies: FR-WF-001 — get by ID with history
   */
  async getById(id: string): Promise<WorkItemWithHistory | null> {
    const db = getDb();
    const item = await db('work_items').where({ id }).first();

    if (!item) {
      return null;
    }

    const changeHistory = await changeHistoryService.getByWorkItemId(id);

    return {
      ...item,
      changeHistory,
    };
  }

  /**
   * Update a work item (PATCH semantics).
   * Records change history for each changed field.
   * Verifies: FR-WF-001, FR-WF-002
   */
  async update(
    id: string,
    input: UpdateWorkItemInput
  ): Promise<WorkItem | null> {
    const db = getDb();
    const existing = await db('work_items').where({ id }).first();

    if (!existing) {
      return null;
    }

    if (input.title !== undefined && input.title.trim() === '') {
      throw new ValidationError('Title cannot be empty');
    }

    if (input.type && !VALID_TYPES.includes(input.type)) {
      throw new ValidationError(`Invalid type: ${input.type}`);
    }

    if (input.priority && !VALID_PRIORITIES.includes(input.priority)) {
      throw new ValidationError(`Invalid priority: ${input.priority}`);
    }

    const changedBy = input.changed_by || 'system';
    const updateFields: Record<string, unknown> = {};

    // Build update fields, excluding changed_by which is metadata
    for (const [key, value] of Object.entries(input)) {
      if (key === 'changed_by') continue;
      if (value !== undefined) {
        updateFields[key] = value;
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return existing;
    }

    // Record change history for each changed field
    await changeHistoryService.recordChanges(
      id,
      existing,
      updateFields,
      changedBy
    );

    updateFields.updated_at = new Date().toISOString();

    await db('work_items').where({ id }).update(updateFields);

    const updated = await db('work_items').where({ id }).first();

    logger.info(
      { workItemId: id, fields: Object.keys(updateFields) },
      'Work item updated'
    );

    return updated;
  }

  /**
   * Delete a work item. Returns true if deleted, false if not found.
   * Verifies: FR-WF-001 — delete
   */
  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const count = await db('work_items').where({ id }).del();

    if (count > 0) {
      logger.info({ workItemId: id }, 'Work item deleted');
      return true;
    }

    return false;
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export const workItemService = new WorkItemService();
