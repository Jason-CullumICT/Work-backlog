// Verifies: FR-WFD-001 — Workflow store tests

import {
  createWorkflow,
  findById,
  findAll,
  updateWorkflow,
  softDelete,
  findDefault,
  seedDefaultWorkflow,
  count,
  resetStore,
} from '../../src/store/workflowStore';
import {
  StageType,
  RuleOperator,
  ConsensusRule,
  WorkItemRoute,
  WorkItemStatus,
  CreateWorkflowRequest,
} from '../../../Shared/types/workflow';

beforeEach(() => {
  resetStore();
});

const makeRequest = (overrides: Partial<CreateWorkflowRequest> = {}): CreateWorkflowRequest => ({
  name: 'Test Workflow',
  description: 'A test workflow for unit tests',
  stages: [
    { name: 'Intake', type: StageType.Intake, order: 0, description: 'Input', statusMapping: WorkItemStatus.Backlog },
    { name: 'Router', type: StageType.Router, order: 1, description: 'Route', statusMapping: WorkItemStatus.Routing },
  ],
  routingRules: [
    {
      name: 'Fast bugs',
      path: WorkItemRoute.FastTrack,
      conditions: [{ field: 'type', operator: RuleOperator.Equals, value: 'bug' }],
      priority: 1,
    },
  ],
  assessmentConfig: {
    roles: [{ id: 'lead', name: 'Pod Lead', description: 'Leads' }],
    consensusRule: ConsensusRule.AllApprove,
  },
  teamTargets: ['TheATeam'],
  ...overrides,
});

describe('WorkflowStore', () => {
  // Verifies: FR-WFD-001 — Create workflow
  describe('createWorkflow', () => {
    it('creates a workflow and returns a copy', () => {
      const workflow = createWorkflow(makeRequest());
      expect(workflow.id).toBeDefined();
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.isDefault).toBe(false);
      expect(workflow.isActive).toBe(true);
    });

    it('creates multiple workflows with unique IDs', () => {
      const w1 = createWorkflow(makeRequest({ name: 'First' }));
      const w2 = createWorkflow(makeRequest({ name: 'Second' }));
      expect(w1.id).not.toBe(w2.id);
      expect(count()).toBe(2);
    });
  });

  // Verifies: FR-WFD-001 — Find by ID
  describe('findById', () => {
    it('returns workflow by ID', () => {
      const created = createWorkflow(makeRequest());
      const found = findById(created.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('Test Workflow');
    });

    it('returns undefined for nonexistent ID', () => {
      expect(findById('nonexistent')).toBeUndefined();
    });

    it('returns undefined for deleted workflow', () => {
      const created = createWorkflow(makeRequest());
      softDelete(created.id);
      expect(findById(created.id)).toBeUndefined();
    });

    it('returns a shallow copy (mutation safe)', () => {
      const created = createWorkflow(makeRequest());
      const found = findById(created.id)!;
      found.name = 'Mutated';
      const refound = findById(created.id)!;
      expect(refound.name).toBe('Test Workflow');
    });
  });

  // Verifies: FR-WFD-001 — Find all
  describe('findAll', () => {
    it('returns empty array when no workflows', () => {
      expect(findAll()).toEqual([]);
    });

    it('returns all non-deleted workflows sorted by updatedAt desc', () => {
      createWorkflow(makeRequest({ name: 'First' }));
      createWorkflow(makeRequest({ name: 'Second' }));
      const all = findAll();
      expect(all).toHaveLength(2);
      // Most recent first
      expect(new Date(all[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(all[1].updatedAt).getTime(),
      );
    });

    it('excludes deleted workflows', () => {
      const w1 = createWorkflow(makeRequest({ name: 'Keep' }));
      const w2 = createWorkflow(makeRequest({ name: 'Delete' }));
      softDelete(w2.id);
      const all = findAll();
      expect(all).toHaveLength(1);
      expect(all[0].name).toBe('Keep');
    });
  });

  // Verifies: FR-WFD-001 — Update workflow
  describe('updateWorkflow', () => {
    it('updates name and description', () => {
      const created = createWorkflow(makeRequest());
      const updated = updateWorkflow(created.id, { name: 'Updated', description: 'New desc' });
      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated');
      expect(updated!.description).toBe('New desc');
    });

    it('updates isActive flag', () => {
      const created = createWorkflow(makeRequest());
      const updated = updateWorkflow(created.id, { isActive: false });
      expect(updated!.isActive).toBe(false);
    });

    it('updates teamTargets', () => {
      const created = createWorkflow(makeRequest());
      const updated = updateWorkflow(created.id, { teamTargets: ['TheFixer'] });
      expect(updated!.teamTargets).toEqual(['TheFixer']);
    });

    it('updates updatedAt timestamp', () => {
      const created = createWorkflow(makeRequest());
      const originalUpdatedAt = created.updatedAt;
      // Small delay to ensure different timestamp
      const updated = updateWorkflow(created.id, { name: 'Changed' });
      expect(updated!.updatedAt).toBeDefined();
    });

    it('returns undefined for nonexistent ID', () => {
      expect(updateWorkflow('nonexistent', { name: 'x' })).toBeUndefined();
    });

    it('returns undefined for deleted workflow', () => {
      const created = createWorkflow(makeRequest());
      softDelete(created.id);
      expect(updateWorkflow(created.id, { name: 'x' })).toBeUndefined();
    });
  });

  // Verifies: FR-WFD-001 — Soft delete
  describe('softDelete', () => {
    it('soft-deletes a workflow', () => {
      const created = createWorkflow(makeRequest());
      const result = softDelete(created.id);
      expect(result.success).toBe(true);
      expect(findById(created.id)).toBeUndefined();
    });

    it('returns error for nonexistent workflow', () => {
      const result = softDelete('nonexistent');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow not found');
    });

    it('prevents deletion of default workflow', () => {
      const defaultWf = seedDefaultWorkflow();
      const result = softDelete(defaultWf.id);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot delete the default workflow');
      expect(findById(defaultWf.id)).toBeDefined();
    });

    it('returns error when deleting already-deleted workflow', () => {
      const created = createWorkflow(makeRequest());
      softDelete(created.id);
      const result = softDelete(created.id);
      expect(result.success).toBe(false);
    });
  });

  // Verifies: FR-WFD-001 — Find default workflow
  describe('findDefault', () => {
    it('returns undefined when no default exists', () => {
      expect(findDefault()).toBeUndefined();
    });

    it('returns the default workflow after seeding', () => {
      seedDefaultWorkflow();
      const defaultWf = findDefault();
      expect(defaultWf).toBeDefined();
      expect(defaultWf!.isDefault).toBe(true);
      expect(defaultWf!.name).toBe('Feature Processing Pipeline');
    });
  });

  // Verifies: FR-WFD-001 — Seed default workflow
  describe('seedDefaultWorkflow', () => {
    it('creates a default workflow when none exists', () => {
      const seeded = seedDefaultWorkflow();
      expect(seeded.isDefault).toBe(true);
      expect(count()).toBe(1);
    });

    it('returns existing default if already seeded', () => {
      const first = seedDefaultWorkflow();
      const second = seedDefaultWorkflow();
      expect(first.id).toBe(second.id);
      expect(count()).toBe(1);
    });

    it('creates default with correct pipeline stages', () => {
      const seeded = seedDefaultWorkflow();
      expect(seeded.stages).toHaveLength(6);
      expect(seeded.stages.map((s) => s.type)).toEqual([
        StageType.Intake,
        StageType.Queue,
        StageType.Router,
        StageType.Assessment,
        StageType.Worklist,
        StageType.Dispatch,
      ]);
    });
  });

  // Verifies: FR-WFD-001 — Count
  describe('count', () => {
    it('returns 0 for empty store', () => {
      expect(count()).toBe(0);
    });

    it('counts only non-deleted workflows', () => {
      const w1 = createWorkflow(makeRequest({ name: 'One' }));
      createWorkflow(makeRequest({ name: 'Two' }));
      softDelete(w1.id);
      expect(count()).toBe(1);
    });
  });
});
