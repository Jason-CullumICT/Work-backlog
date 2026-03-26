// Verifies: FR-WFD-001 — In-memory Workflow store with CRUD operations

import {
  Workflow,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from '@shared/types/workflow';
import { buildWorkflow, buildDefaultWorkflow } from '../models/Workflow';
import { logger } from '../utils/logger';

let workflows: Map<string, Workflow> = new Map();

// Verifies: FR-WFD-001 — Create a new workflow
export function createWorkflow(params: CreateWorkflowRequest): Workflow {
  const workflow = buildWorkflow(params);
  workflows.set(workflow.id, workflow);
  logger.info('Workflow created', { id: workflow.id, name: workflow.name });
  return { ...workflow };
}

// Verifies: FR-WFD-001 — Find workflow by ID
export function findById(id: string): Workflow | undefined {
  const workflow = workflows.get(id);
  if (!workflow || workflow.deleted) return undefined;
  return { ...workflow };
}

// Verifies: FR-WFD-001 — Find all non-deleted workflows
export function findAll(): Workflow[] {
  return Array.from(workflows.values())
    .filter((w) => !w.deleted)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

// Verifies: FR-WFD-001 — Update a workflow
export function updateWorkflow(id: string, updates: UpdateWorkflowRequest): Workflow | undefined {
  const workflow = workflows.get(id);
  if (!workflow || workflow.deleted) return undefined;

  if (updates.name !== undefined) workflow.name = updates.name;
  if (updates.description !== undefined) workflow.description = updates.description;
  if (updates.isActive !== undefined) workflow.isActive = updates.isActive;
  if (updates.teamTargets !== undefined) workflow.teamTargets = updates.teamTargets;
  if (updates.assessmentConfig !== undefined) workflow.assessmentConfig = updates.assessmentConfig;
  if (updates.stages !== undefined) {
    const { generateId } = require('../utils/id');
    workflow.stages = updates.stages.map((s: Omit<typeof workflow.stages[0], 'id'>) => ({ ...s, id: generateId() }));
  }
  if (updates.routingRules !== undefined) {
    const { generateId } = require('../utils/id');
    workflow.routingRules = updates.routingRules.map((r: Omit<typeof workflow.routingRules[0], 'id'>) => ({ ...r, id: generateId() }));
  }

  workflow.updatedAt = new Date().toISOString();
  workflows.set(id, workflow);
  logger.info('Workflow updated', { id, fields: Object.keys(updates) });
  return { ...workflow };
}

// Verifies: FR-WFD-001 — Soft delete a workflow (cannot delete default)
export function softDelete(id: string): { success: boolean; error?: string } {
  const workflow = workflows.get(id);
  if (!workflow || workflow.deleted) return { success: false, error: 'Workflow not found' };
  if (workflow.isDefault) return { success: false, error: 'Cannot delete the default workflow' };

  workflow.deleted = true;
  workflow.updatedAt = new Date().toISOString();
  workflows.set(id, workflow);
  logger.info('Workflow soft-deleted', { id });
  return { success: true };
}

// Verifies: FR-WFD-001 — Find the default workflow
export function findDefault(): Workflow | undefined {
  const defaultWorkflow = Array.from(workflows.values()).find(
    (w) => w.isDefault && !w.deleted,
  );
  return defaultWorkflow ? { ...defaultWorkflow } : undefined;
}

// Verifies: FR-WFD-001 — Seed the default workflow if none exists
export function seedDefaultWorkflow(): Workflow {
  const existing = findDefault();
  if (existing) {
    logger.info('Default workflow already exists', { id: existing.id });
    return existing;
  }

  const defaultWorkflow = buildDefaultWorkflow();
  workflows.set(defaultWorkflow.id, defaultWorkflow);
  logger.info('Default workflow seeded', { id: defaultWorkflow.id, name: defaultWorkflow.name });
  return { ...defaultWorkflow };
}

// Verifies: FR-WFD-001 — Count non-deleted workflows
export function count(): number {
  return Array.from(workflows.values()).filter((w) => !w.deleted).length;
}

// Reset store (for testing)
export function resetStore(): void {
  workflows = new Map();
}
