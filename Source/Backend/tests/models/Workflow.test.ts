// Verifies: FR-WFD-001 — Workflow model tests

import {
  buildWorkflow,
  buildDefaultWorkflow,
  validateStages,
  validateRoutingRules,
  validateAssessmentConfig,
} from '../../src/models/Workflow';
import {
  StageType,
  RuleOperator,
  ConsensusRule,
  WorkItemRoute,
  WorkItemStatus,
  CreateWorkflowRequest,
} from '../../../Shared/types/workflow';

describe('Workflow Model', () => {
  const validRequest: CreateWorkflowRequest = {
    name: 'Test Workflow',
    description: 'A test workflow',
    stages: [
      { name: 'Intake', type: StageType.Intake, order: 0, description: 'Input stage', statusMapping: WorkItemStatus.Backlog },
      { name: 'Router', type: StageType.Router, order: 1, description: 'Routing stage', statusMapping: WorkItemStatus.Routing },
    ],
    routingRules: [
      {
        name: 'Fast-track bugs',
        path: WorkItemRoute.FastTrack,
        conditions: [{ field: 'type', operator: RuleOperator.Equals, value: 'bug' }],
        priority: 1,
      },
    ],
    assessmentConfig: {
      roles: [{ id: 'role-lead', name: 'Pod Lead', description: 'Leads assessment' }],
      consensusRule: ConsensusRule.AllApprove,
    },
    teamTargets: ['TheATeam'],
  };

  // Verifies: FR-WFD-001 — buildWorkflow creates a valid Workflow entity
  describe('buildWorkflow', () => {
    it('creates a workflow with UUID, timestamps, and isDefault=false', () => {
      const workflow = buildWorkflow(validRequest);
      expect(workflow.id).toBeDefined();
      expect(workflow.id.length).toBeGreaterThan(0);
      expect(workflow.name).toBe('Test Workflow');
      expect(workflow.description).toBe('A test workflow');
      expect(workflow.isDefault).toBe(false);
      expect(workflow.isActive).toBe(true);
      expect(workflow.createdAt).toBeDefined();
      expect(workflow.updatedAt).toBeDefined();
      expect(workflow.deleted).toBeUndefined();
    });

    it('assigns IDs to stages', () => {
      const workflow = buildWorkflow(validRequest);
      expect(workflow.stages).toHaveLength(2);
      workflow.stages.forEach((stage) => {
        expect(stage.id).toBeDefined();
        expect(stage.id.length).toBeGreaterThan(0);
      });
      expect(workflow.stages[0].name).toBe('Intake');
      expect(workflow.stages[1].name).toBe('Router');
    });

    it('assigns IDs to routing rules', () => {
      const workflow = buildWorkflow(validRequest);
      expect(workflow.routingRules).toHaveLength(1);
      expect(workflow.routingRules[0].id).toBeDefined();
      expect(workflow.routingRules[0].name).toBe('Fast-track bugs');
    });

    it('preserves assessment config and team targets', () => {
      const workflow = buildWorkflow(validRequest);
      expect(workflow.assessmentConfig.roles).toHaveLength(1);
      expect(workflow.assessmentConfig.consensusRule).toBe(ConsensusRule.AllApprove);
      expect(workflow.teamTargets).toEqual(['TheATeam']);
    });
  });

  // Verifies: FR-WFD-001 — buildDefaultWorkflow creates the reference image pipeline
  describe('buildDefaultWorkflow', () => {
    it('creates a default workflow with isDefault=true', () => {
      const workflow = buildDefaultWorkflow();
      expect(workflow.isDefault).toBe(true);
      expect(workflow.isActive).toBe(true);
      expect(workflow.name).toBe('Feature Processing Pipeline');
    });

    it('has 6 ordered stages matching the reference pipeline', () => {
      const workflow = buildDefaultWorkflow();
      expect(workflow.stages).toHaveLength(6);
      expect(workflow.stages[0].type).toBe(StageType.Intake);
      expect(workflow.stages[1].type).toBe(StageType.Queue);
      expect(workflow.stages[2].type).toBe(StageType.Router);
      expect(workflow.stages[3].type).toBe(StageType.Assessment);
      expect(workflow.stages[4].type).toBe(StageType.Worklist);
      expect(workflow.stages[5].type).toBe(StageType.Dispatch);
    });

    it('has routing rules for fast-track and full-review', () => {
      const workflow = buildDefaultWorkflow();
      expect(workflow.routingRules.length).toBeGreaterThanOrEqual(4);
      const fastTrackRules = workflow.routingRules.filter((r) => r.path === WorkItemRoute.FastTrack);
      const fullReviewRules = workflow.routingRules.filter((r) => r.path === WorkItemRoute.FullReview);
      expect(fastTrackRules.length).toBeGreaterThanOrEqual(2);
      expect(fullReviewRules.length).toBeGreaterThanOrEqual(2);
    });

    it('has 4 assessment roles with all-approve consensus', () => {
      const workflow = buildDefaultWorkflow();
      expect(workflow.assessmentConfig.roles).toHaveLength(4);
      expect(workflow.assessmentConfig.consensusRule).toBe(ConsensusRule.AllApprove);
      const roleNames = workflow.assessmentConfig.roles.map((r) => r.name);
      expect(roleNames).toContain('Pod Lead');
      expect(roleNames).toContain('Requirements Reviewer');
      expect(roleNames).toContain('Domain Expert');
      expect(roleNames).toContain('Work Definer');
    });

    it('targets TheATeam and TheFixer', () => {
      const workflow = buildDefaultWorkflow();
      expect(workflow.teamTargets).toEqual(['TheATeam', 'TheFixer']);
    });
  });

  // Verifies: FR-WFD-001 — Stage validation
  describe('validateStages', () => {
    it('returns no errors for valid stages', () => {
      const errors = validateStages(validRequest.stages);
      expect(errors).toHaveLength(0);
    });

    it('returns error for empty stages array', () => {
      const errors = validateStages([]);
      expect(errors).toContain('At least one stage is required');
    });

    it('returns error for invalid stage type', () => {
      const errors = validateStages([
        { name: 'Bad', type: 'invalid' as StageType, order: 0, description: 'Bad', statusMapping: WorkItemStatus.Backlog },
      ]);
      expect(errors.some((e) => e.includes('invalid type'))).toBe(true);
    });

    it('returns error for missing stage name', () => {
      const errors = validateStages([
        { name: '', type: StageType.Intake, order: 0, description: 'Test', statusMapping: WorkItemStatus.Backlog },
      ]);
      expect(errors.some((e) => e.includes('name is required'))).toBe(true);
    });
  });

  // Verifies: FR-WFD-001 — Routing rule validation
  describe('validateRoutingRules', () => {
    it('returns no errors for valid rules', () => {
      const errors = validateRoutingRules(validRequest.routingRules);
      expect(errors).toHaveLength(0);
    });

    it('returns error for invalid path', () => {
      const errors = validateRoutingRules([
        { name: 'Bad', path: 'invalid' as WorkItemRoute, conditions: [], priority: 1 },
      ]);
      expect(errors.some((e) => e.includes('invalid path'))).toBe(true);
    });

    it('returns error for invalid operator in condition', () => {
      const errors = validateRoutingRules([
        {
          name: 'Bad op',
          path: WorkItemRoute.FastTrack,
          conditions: [{ field: 'type', operator: 'bad' as RuleOperator, value: 'bug' }],
          priority: 1,
        },
      ]);
      expect(errors.some((e) => e.includes('invalid operator'))).toBe(true);
    });

    it('returns error for missing rule name', () => {
      const errors = validateRoutingRules([
        { name: '', path: WorkItemRoute.FastTrack, conditions: [], priority: 1 },
      ]);
      expect(errors.some((e) => e.includes('name is required'))).toBe(true);
    });
  });

  // Verifies: FR-WFD-001 — Assessment config validation
  describe('validateAssessmentConfig', () => {
    it('returns no errors for valid config', () => {
      const errors = validateAssessmentConfig(validRequest.assessmentConfig);
      expect(errors).toHaveLength(0);
    });

    it('returns error for invalid consensus rule', () => {
      const errors = validateAssessmentConfig({
        roles: [{ id: 'r1', name: 'Lead', description: 'test' }],
        consensusRule: 'invalid' as ConsensusRule,
      });
      expect(errors.some((e) => e.includes('Invalid consensus rule'))).toBe(true);
    });

    it('returns error for empty roles', () => {
      const errors = validateAssessmentConfig({
        roles: [],
        consensusRule: ConsensusRule.AllApprove,
      });
      expect(errors.some((e) => e.includes('At least one assessment role'))).toBe(true);
    });
  });
});
