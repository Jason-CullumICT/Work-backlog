// Verifies: FR-WFD-001 — Workflow model with factory and validation helpers

import {
  Workflow,
  WorkflowStage,
  RoutingRule,
  AssessmentConfig,
  CreateWorkflowRequest,
  StageType,
  RuleOperator,
  ConsensusRule,
  WorkItemStatus,
  WorkItemRoute,
} from '@shared/types/workflow';
import { generateId } from '../utils/id';

// Verifies: FR-WFD-001 — Build a Workflow entity from a creation request
export function buildWorkflow(data: CreateWorkflowRequest): Workflow {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: data.name,
    description: data.description,
    stages: data.stages.map((s) => ({ ...s, id: generateId() })),
    routingRules: data.routingRules.map((r) => ({ ...r, id: generateId() })),
    assessmentConfig: data.assessmentConfig,
    teamTargets: data.teamTargets,
    isDefault: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

// Verifies: FR-WFD-001 — Validate workflow stages are ordered and have valid types
export function validateStages(stages: Omit<WorkflowStage, 'id'>[]): string[] {
  const errors: string[] = [];
  if (stages.length === 0) {
    errors.push('At least one stage is required');
    return errors;
  }
  const validTypes = Object.values(StageType);
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (!validTypes.includes(stage.type)) {
      errors.push(`Stage ${i}: invalid type "${stage.type}"`);
    }
    if (!stage.name || stage.name.trim().length === 0) {
      errors.push(`Stage ${i}: name is required`);
    }
  }
  return errors;
}

// Verifies: FR-WFD-001 — Validate routing rules have valid operators and paths
export function validateRoutingRules(rules: Omit<RoutingRule, 'id'>[]): string[] {
  const errors: string[] = [];
  const validOperators = Object.values(RuleOperator);
  const validPaths = Object.values(WorkItemRoute);
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    if (!rule.name || rule.name.trim().length === 0) {
      errors.push(`Rule ${i}: name is required`);
    }
    if (!validPaths.includes(rule.path)) {
      errors.push(`Rule ${i}: invalid path "${rule.path}"`);
    }
    for (let j = 0; j < rule.conditions.length; j++) {
      const cond = rule.conditions[j];
      if (!validOperators.includes(cond.operator)) {
        errors.push(`Rule ${i}, condition ${j}: invalid operator "${cond.operator}"`);
      }
    }
  }
  return errors;
}

// Verifies: FR-WFD-001 — Validate assessment config
export function validateAssessmentConfig(config: AssessmentConfig): string[] {
  const errors: string[] = [];
  const validConsensus = Object.values(ConsensusRule);
  if (!validConsensus.includes(config.consensusRule)) {
    errors.push(`Invalid consensus rule "${config.consensusRule}"`);
  }
  if (config.roles.length === 0) {
    errors.push('At least one assessment role is required');
  }
  return errors;
}

// Verifies: FR-WFD-001 — Build the default workflow matching the reference image pipeline
export function buildDefaultWorkflow(): Workflow {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name: 'Feature Processing Pipeline',
    description: 'Default workflow pipeline: intake → routing → assessment → dispatch. Matches the reference image pattern with fast-track for trivial bugs/improvements and full-review for features and complex work.',
    stages: [
      {
        id: 'stage-intake',
        name: 'Input Sources',
        type: StageType.Intake,
        order: 0,
        description: 'Work items enter from Browser, Zendesk, Manual, or Automated sources',
        statusMapping: WorkItemStatus.Backlog,
      },
      {
        id: 'stage-queue',
        name: 'Work Backlog',
        type: StageType.Queue,
        order: 1,
        description: 'Items queued with docID, title, description, type, and change history',
        statusMapping: WorkItemStatus.Backlog,
      },
      {
        id: 'stage-router',
        name: 'Work Router',
        type: StageType.Router,
        order: 2,
        description: 'Routes items to fast-track or full-review based on type and complexity',
        statusMapping: WorkItemStatus.Routing,
      },
      {
        id: 'stage-assessment',
        name: 'Assessment Pod',
        type: StageType.Assessment,
        order: 3,
        description: 'Pod of agents reviews proposed work: pod-lead, requirements-reviewer, domain-expert, work-definer',
        statusMapping: WorkItemStatus.Reviewing,
      },
      {
        id: 'stage-worklist',
        name: 'Approved Work',
        type: StageType.Worklist,
        order: 4,
        description: 'Approved items ready for team dispatch',
        statusMapping: WorkItemStatus.Approved,
      },
      {
        id: 'stage-dispatch',
        name: 'Team Dispatch',
        type: StageType.Dispatch,
        order: 5,
        description: 'Dispatches approved work to TheATeam or TheFixer',
        statusMapping: WorkItemStatus.InProgress,
      },
    ],
    routingRules: [
      {
        id: 'rule-bug-trivial',
        name: 'Fast-track trivial bugs',
        path: WorkItemRoute.FastTrack,
        conditions: [
          { field: 'type', operator: RuleOperator.Equals, value: 'bug' },
          { field: 'complexity', operator: RuleOperator.In, value: ['trivial', 'small'] },
        ],
        priority: 1,
      },
      {
        id: 'rule-improvement-trivial',
        name: 'Fast-track small improvements',
        path: WorkItemRoute.FastTrack,
        conditions: [
          { field: 'type', operator: RuleOperator.Equals, value: 'improvement' },
          { field: 'complexity', operator: RuleOperator.In, value: ['trivial', 'small'] },
        ],
        priority: 2,
      },
      {
        id: 'rule-feature-review',
        name: 'Full review for features',
        path: WorkItemRoute.FullReview,
        conditions: [
          { field: 'type', operator: RuleOperator.Equals, value: 'feature' },
        ],
        priority: 3,
      },
      {
        id: 'rule-issue-review',
        name: 'Full review for issues',
        path: WorkItemRoute.FullReview,
        conditions: [
          { field: 'type', operator: RuleOperator.Equals, value: 'issue' },
        ],
        priority: 4,
      },
    ],
    assessmentConfig: {
      roles: [
        { id: 'role-pod-lead', name: 'Pod Lead', description: 'Aggregates assessments and makes final verdict' },
        { id: 'role-req-reviewer', name: 'Requirements Reviewer', description: 'Validates completeness of requirements' },
        { id: 'role-domain-expert', name: 'Domain Expert', description: 'Checks domain correctness and edge cases' },
        { id: 'role-work-definer', name: 'Work Definer', description: 'Enriches work item with implementation guidance' },
      ],
      consensusRule: ConsensusRule.AllApprove,
    },
    teamTargets: ['TheATeam', 'TheFixer'],
    isDefault: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
