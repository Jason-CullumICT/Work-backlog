// Verifies: FR-WFD-002, FR-WFD-003, FR-WFD-011 — Workflow service: CRUD, flow graph, observability

import {
  Workflow,
  WorkflowFlowResponse,
  FlowNode,
  FlowEdge,
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
  WorkItemSource,
} from '@shared/types/workflow';
import * as workflowStore from '../store/workflowStore';
import { validateStages, validateRoutingRules, validateAssessmentConfig } from '../models/Workflow';
import { workflowDefinitionsCreatedCounter, workflowDefinitionsActiveGauge } from '../metrics';
import logger from '../logger';

// Verifies: FR-WFD-002 — Create a new workflow with validation
export function createWorkflow(data: CreateWorkflowRequest): { workflow?: Workflow; errors?: string[] } {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('Name is required');
  }
  if (!data.description || data.description.trim().length === 0) {
    errors.push('Description is required');
  }
  if (!data.teamTargets || data.teamTargets.length === 0) {
    errors.push('At least one team target is required');
  }

  if (data.stages) {
    errors.push(...validateStages(data.stages));
  } else {
    errors.push('Stages are required');
  }

  if (data.routingRules) {
    errors.push(...validateRoutingRules(data.routingRules));
  }

  if (data.assessmentConfig) {
    errors.push(...validateAssessmentConfig(data.assessmentConfig));
  } else {
    errors.push('Assessment config is required');
  }

  if (errors.length > 0) {
    return { errors };
  }

  const workflow = workflowStore.createWorkflow(data);

  // Verifies: FR-WFD-011 — Prometheus metrics
  workflowDefinitionsCreatedCounter.inc();
  updateActiveGauge();

  logger.info({ msg: 'Workflow created', workflowId: workflow.id, name: workflow.name });

  return { workflow };
}

// Verifies: FR-WFD-002 — Find workflow by ID
export function findById(id: string): Workflow | undefined {
  return workflowStore.findById(id);
}

// Verifies: FR-WFD-002 — List all workflows
export function findAll(): Workflow[] {
  return workflowStore.findAll();
}

// Verifies: FR-WFD-002 — Update workflow
export function updateWorkflow(id: string, updates: UpdateWorkflowRequest): { workflow?: Workflow; errors?: string[] } {
  const existing = workflowStore.findById(id);
  if (!existing) {
    return { errors: ['Workflow not found'] };
  }

  const errors: string[] = [];
  if (updates.stages) {
    errors.push(...validateStages(updates.stages));
  }
  if (updates.routingRules) {
    errors.push(...validateRoutingRules(updates.routingRules));
  }
  if (updates.assessmentConfig) {
    errors.push(...validateAssessmentConfig(updates.assessmentConfig));
  }

  if (errors.length > 0) {
    return { errors };
  }

  const workflow = workflowStore.updateWorkflow(id, updates);
  if (!workflow) {
    return { errors: ['Failed to update workflow'] };
  }

  updateActiveGauge();
  logger.info({ msg: 'Workflow updated', workflowId: id, fields: Object.keys(updates) });

  return { workflow };
}

// Verifies: FR-WFD-002 — Soft delete workflow
export function deleteWorkflow(id: string): { success: boolean; error?: string } {
  const result = workflowStore.softDelete(id);
  if (result.success) {
    updateActiveGauge();
    logger.info({ msg: 'Workflow deleted', workflowId: id });
  }
  return result;
}

// Verifies: FR-WFD-002 — Find default workflow
export function findDefault(): Workflow | undefined {
  return workflowStore.findDefault();
}

// Verifies: FR-WFD-001 — Seed default workflow on startup
export function seedDefaultWorkflow(): Workflow {
  const workflow = workflowStore.seedDefaultWorkflow();
  updateActiveGauge();
  return workflow;
}

// Verifies: FR-WFD-011 — Update active gauge to current count
function updateActiveGauge(): void {
  const allWorkflows = workflowStore.findAll();
  const activeCount = allWorkflows.filter((w) => w.isActive).length;
  workflowDefinitionsActiveGauge.set(activeCount);
}

// Verifies: FR-WFD-003 — Generate flow graph for visualization
export function generateFlowGraph(workflow: Workflow): WorkflowFlowResponse {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  const colWidth = 200;
  const nodeH = 50;
  const nodeW = 150;

  // Column 0: Input source nodes
  const inputSources = [
    WorkItemSource.Browser,
    WorkItemSource.Zendesk,
    WorkItemSource.Manual,
    WorkItemSource.Automated,
  ];
  const inputLabels: Record<string, string> = {
    [WorkItemSource.Browser]: 'Browser',
    [WorkItemSource.Zendesk]: 'Zendesk',
    [WorkItemSource.Manual]: 'Manual / Backfield',
    [WorkItemSource.Automated]: 'Automated / Events',
  };

  inputSources.forEach((source, i) => {
    nodes.push({
      id: `input-${source}`,
      type: 'input',
      label: inputLabels[source],
      x: 0,
      y: i * 80,
      width: nodeW,
      height: nodeH,
    });
  });

  // Column 1: Work Backlog (queue)
  const queueStage = workflow.stages.find((s) => s.type === 'queue');
  const queueNodeId = queueStage ? `stage-${queueStage.id}` : 'stage-queue';
  nodes.push({
    id: queueNodeId,
    type: 'queue',
    label: queueStage?.name || 'Work Backlog',
    x: colWidth,
    y: 120,
    width: nodeW,
    height: nodeH,
  });

  // Edges: inputs → queue
  inputSources.forEach((source) => {
    edges.push({
      id: `edge-input-${source}-to-queue`,
      source: `input-${source}`,
      target: queueNodeId,
      style: 'solid',
    });
  });

  // Column 2: Router (diamond)
  const routerStage = workflow.stages.find((s) => s.type === 'router');
  const routerNodeId = routerStage ? `stage-${routerStage.id}` : 'stage-router';
  nodes.push({
    id: routerNodeId,
    type: 'router',
    label: routerStage?.name || 'Work Router',
    x: colWidth * 2,
    y: 120,
    width: nodeW,
    height: nodeH,
  });

  // Edge: queue → router
  edges.push({
    id: 'edge-queue-to-router',
    source: queueNodeId,
    target: routerNodeId,
    style: 'solid',
  });

  // Column 3: Assessment Pod (circle with child roles)
  const assessmentStage = workflow.stages.find((s) => s.type === 'assessment');
  const assessPodId = assessmentStage ? `stage-${assessmentStage.id}` : 'stage-assessment';
  nodes.push({
    id: assessPodId,
    type: 'assessment-pod',
    label: assessmentStage?.name || 'Assessment Pod',
    x: colWidth * 3,
    y: 80,
    width: 180,
    height: 180,
    metadata: { roleCount: workflow.assessmentConfig.roles.length },
  });

  // Assessment role child nodes inside the pod
  workflow.assessmentConfig.roles.forEach((role, i) => {
    nodes.push({
      id: `role-${role.id}`,
      type: 'assessment-role',
      label: role.name,
      x: colWidth * 3 + 20,
      y: 100 + i * 40,
      width: 140,
      height: 30,
      metadata: { parentPod: assessPodId, description: role.description },
    });
  });

  // Edge: router → assessment (full-review, solid)
  edges.push({
    id: 'edge-router-to-assessment',
    source: routerNodeId,
    target: assessPodId,
    label: 'full-review',
    style: 'solid',
  });

  // Column 4: Worklist (approved work)
  const worklistStage = workflow.stages.find((s) => s.type === 'worklist');
  const worklistNodeId = worklistStage ? `stage-${worklistStage.id}` : 'stage-worklist';
  nodes.push({
    id: worklistNodeId,
    type: 'worklist',
    label: worklistStage?.name || 'Approved Work',
    x: colWidth * 4,
    y: 120,
    width: nodeW,
    height: nodeH,
  });

  // Edge: assessment → worklist
  edges.push({
    id: 'edge-assessment-to-worklist',
    source: assessPodId,
    target: worklistNodeId,
    label: 'approved',
    style: 'solid',
  });

  // Edge: router → worklist (fast-track, dashed bypass)
  edges.push({
    id: 'edge-router-to-worklist-fasttrack',
    source: routerNodeId,
    target: worklistNodeId,
    label: 'fast-track',
    style: 'dashed',
  });

  // Column 5: Team Dispatch (diamond)
  const dispatchStage = workflow.stages.find((s) => s.type === 'dispatch');
  const dispatchNodeId = dispatchStage ? `stage-${dispatchStage.id}` : 'stage-dispatch';
  nodes.push({
    id: dispatchNodeId,
    type: 'dispatch',
    label: dispatchStage?.name || 'Team Dispatch',
    x: colWidth * 5,
    y: 120,
    width: nodeW,
    height: nodeH,
  });

  // Edge: worklist → dispatch
  edges.push({
    id: 'edge-worklist-to-dispatch',
    source: worklistNodeId,
    target: dispatchNodeId,
    style: 'solid',
  });

  // Column 6: Team target nodes
  workflow.teamTargets.forEach((team, i) => {
    const teamNodeId = `team-${team.toLowerCase()}`;
    nodes.push({
      id: teamNodeId,
      type: 'team',
      label: team,
      x: colWidth * 6,
      y: 80 + i * 100,
      width: nodeW,
      height: nodeH,
    });

    edges.push({
      id: `edge-dispatch-to-${teamNodeId}`,
      source: dispatchNodeId,
      target: teamNodeId,
      style: 'solid',
    });
  });

  return { nodes, edges };
}
