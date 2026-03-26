// Verifies: FR-WFD-002, FR-WFD-003, FR-WFD-011 — Workflow service tests

import {
  Workflow,
  StageType,
  WorkItemRoute,
  WorkItemStatus,
  ConsensusRule,
  CreateWorkflowRequest,
  WorkItemSource,
} from '@shared/types/workflow';
import * as workflowService from '../../src/services/workflowService';
import * as workflowStore from '../../src/store/workflowStore';

function makeValidRequest(overrides: Partial<CreateWorkflowRequest> = {}): CreateWorkflowRequest {
  return {
    name: 'Test Workflow',
    description: 'A test workflow for unit tests',
    stages: [
      { name: 'Intake', type: StageType.Intake, order: 0, description: 'Input', statusMapping: WorkItemStatus.Backlog },
      { name: 'Queue', type: StageType.Queue, order: 1, description: 'Queued', statusMapping: WorkItemStatus.Backlog },
      { name: 'Router', type: StageType.Router, order: 2, description: 'Route', statusMapping: WorkItemStatus.Routing },
    ],
    routingRules: [
      {
        name: 'Test Rule',
        path: WorkItemRoute.FastTrack,
        conditions: [{ field: 'type', operator: 'equals' as never, value: 'bug' }],
        priority: 1,
      },
    ],
    assessmentConfig: {
      roles: [{ id: 'role-lead', name: 'Lead', description: 'Pod lead' }],
      consensusRule: ConsensusRule.AllApprove,
    },
    teamTargets: ['TheATeam'],
    ...overrides,
  };
}

beforeEach(() => {
  workflowStore.resetStore();
});

describe('workflowService', () => {
  describe('createWorkflow', () => {
    // Verifies: FR-WFD-002 — Create workflow with validation
    it('creates a workflow with valid data', () => {
      const result = workflowService.createWorkflow(makeValidRequest());
      expect(result.errors).toBeUndefined();
      expect(result.workflow).toBeDefined();
      expect(result.workflow!.name).toBe('Test Workflow');
      expect(result.workflow!.isActive).toBe(true);
      expect(result.workflow!.isDefault).toBe(false);
    });

    // Verifies: FR-WFD-002 — Validate required fields
    it('rejects missing name', () => {
      const result = workflowService.createWorkflow(makeValidRequest({ name: '' }));
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('Name'))).toBe(true);
    });

    it('rejects missing description', () => {
      const result = workflowService.createWorkflow(makeValidRequest({ description: '' }));
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('Description'))).toBe(true);
    });

    it('rejects empty team targets', () => {
      const result = workflowService.createWorkflow(makeValidRequest({ teamTargets: [] }));
      expect(result.errors).toBeDefined();
      expect(result.errors!.some((e) => e.includes('team target'))).toBe(true);
    });

    it('rejects empty stages', () => {
      const result = workflowService.createWorkflow(makeValidRequest({ stages: [] }));
      expect(result.errors).toBeDefined();
    });
  });

  describe('findById', () => {
    // Verifies: FR-WFD-002 — Find by ID
    it('returns workflow by ID', () => {
      const { workflow } = workflowService.createWorkflow(makeValidRequest());
      const found = workflowService.findById(workflow!.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(workflow!.id);
    });

    it('returns undefined for non-existent ID', () => {
      expect(workflowService.findById('nonexistent')).toBeUndefined();
    });
  });

  describe('findAll', () => {
    // Verifies: FR-WFD-002 — List all workflows
    it('returns all workflows', () => {
      workflowService.createWorkflow(makeValidRequest());
      workflowService.createWorkflow(makeValidRequest({ name: 'Second' }));
      const all = workflowService.findAll();
      expect(all.length).toBe(2);
    });
  });

  describe('updateWorkflow', () => {
    // Verifies: FR-WFD-002 — Update workflow
    it('updates name and description', () => {
      const { workflow } = workflowService.createWorkflow(makeValidRequest());
      const result = workflowService.updateWorkflow(workflow!.id, { name: 'Updated', description: 'New desc' });
      expect(result.workflow).toBeDefined();
      expect(result.workflow!.name).toBe('Updated');
      expect(result.workflow!.description).toBe('New desc');
    });

    it('returns error for non-existent workflow', () => {
      const result = workflowService.updateWorkflow('nonexistent', { name: 'Test' });
      expect(result.errors).toBeDefined();
    });
  });

  describe('deleteWorkflow', () => {
    // Verifies: FR-WFD-002 — Delete workflow (cannot delete default)
    it('soft deletes a workflow', () => {
      const { workflow } = workflowService.createWorkflow(makeValidRequest());
      const result = workflowService.deleteWorkflow(workflow!.id);
      expect(result.success).toBe(true);
      expect(workflowService.findById(workflow!.id)).toBeUndefined();
    });

    it('cannot delete the default workflow', () => {
      const defaultWf = workflowService.seedDefaultWorkflow();
      const result = workflowService.deleteWorkflow(defaultWf.id);
      expect(result.success).toBe(false);
      expect(result.error).toContain('default');
    });
  });

  describe('seedDefaultWorkflow', () => {
    // Verifies: FR-WFD-001 — Seed default
    it('creates default workflow if none exists', () => {
      const wf = workflowService.seedDefaultWorkflow();
      expect(wf.isDefault).toBe(true);
      expect(wf.name).toBe('Feature Processing Pipeline');
    });

    it('returns existing default on subsequent calls', () => {
      const first = workflowService.seedDefaultWorkflow();
      const second = workflowService.seedDefaultWorkflow();
      expect(first.id).toBe(second.id);
    });
  });

  describe('generateFlowGraph', () => {
    // Verifies: FR-WFD-003 — Flow graph generation
    it('generates nodes and edges for a workflow', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);

      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('includes input source nodes', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      const inputNodes = graph.nodes.filter((n) => n.type === 'input');
      expect(inputNodes.length).toBe(4);
    });

    it('includes router, queue, worklist, dispatch nodes', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      expect(graph.nodes.some((n) => n.type === 'router')).toBe(true);
      expect(graph.nodes.some((n) => n.type === 'queue')).toBe(true);
      expect(graph.nodes.some((n) => n.type === 'worklist')).toBe(true);
      expect(graph.nodes.some((n) => n.type === 'dispatch')).toBe(true);
    });

    it('includes assessment pod and role nodes', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      expect(graph.nodes.some((n) => n.type === 'assessment-pod')).toBe(true);
      const roleNodes = graph.nodes.filter((n) => n.type === 'assessment-role');
      expect(roleNodes.length).toBe(4); // 4 roles in default workflow
    });

    it('includes team target nodes', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      const teamNodes = graph.nodes.filter((n) => n.type === 'team');
      expect(teamNodes.length).toBe(2); // TheATeam, TheFixer
    });

    it('includes fast-track dashed edge', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      const fastTrackEdge = graph.edges.find((e) => e.label === 'fast-track');
      expect(fastTrackEdge).toBeDefined();
      expect(fastTrackEdge!.style).toBe('dashed');
    });

    it('includes full-review solid edge', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);
      const fullReviewEdge = graph.edges.find((e) => e.label === 'full-review');
      expect(fullReviewEdge).toBeDefined();
      expect(fullReviewEdge!.style).toBe('solid');
    });

    it('positions nodes in left-to-right columns', () => {
      const wf = workflowService.seedDefaultWorkflow();
      const graph = workflowService.generateFlowGraph(wf);

      const inputNode = graph.nodes.find((n) => n.type === 'input')!;
      const queueNode = graph.nodes.find((n) => n.type === 'queue')!;
      const routerNode = graph.nodes.find((n) => n.type === 'router')!;
      const assessNode = graph.nodes.find((n) => n.type === 'assessment-pod')!;

      expect(inputNode.x).toBeLessThan(queueNode.x);
      expect(queueNode.x).toBeLessThan(routerNode.x);
      expect(routerNode.x).toBeLessThan(assessNode.x);
    });
  });
});
