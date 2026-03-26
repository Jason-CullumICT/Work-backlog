// Verifies: FR-WFD-002, FR-WFD-003 — Workflow CRUD and flow graph REST endpoints

import { Router, Request, Response } from 'express';
import {
  CreateWorkflowRequest,
  UpdateWorkflowRequest,
} from '../../../Shared/types/workflow';
import * as workflowService from '../services/workflowService';
import logger from '../logger';

const router = Router();

// Verifies: FR-WFD-002 — POST /api/workflows — Create a new workflow
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateWorkflowRequest;

  const result = workflowService.createWorkflow(body);
  if (result.errors) {
    res.status(400).json({ error: result.errors.join('; ') });
    return;
  }

  logger.info({ msg: 'Workflow created via API', workflowId: result.workflow!.id });
  res.status(201).json(result.workflow);
});

// Verifies: FR-WFD-002 — GET /api/workflows — List all workflows
router.get('/', (_req: Request, res: Response) => {
  const workflows = workflowService.findAll();
  res.json({ data: workflows });
});

// Verifies: FR-WFD-002 — GET /api/workflows/:id — Get single workflow
router.get('/:id', (req: Request, res: Response) => {
  const workflow = workflowService.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }
  res.json(workflow);
});

// Verifies: FR-WFD-002 — PATCH /api/workflows/:id — Update workflow
router.patch('/:id', (req: Request, res: Response) => {
  const workflow = workflowService.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  const body = req.body as UpdateWorkflowRequest;
  const result = workflowService.updateWorkflow(req.params.id, body);

  if (result.errors) {
    res.status(400).json({ error: result.errors.join('; ') });
    return;
  }

  logger.info({ msg: 'Workflow updated via API', workflowId: req.params.id });
  res.json(result.workflow);
});

// Verifies: FR-WFD-002 — DELETE /api/workflows/:id — Soft delete
router.delete('/:id', (req: Request, res: Response) => {
  const result = workflowService.deleteWorkflow(req.params.id);
  if (!result.success) {
    if (result.error === 'Workflow not found') {
      res.status(404).json({ error: result.error });
    } else {
      res.status(400).json({ error: result.error });
    }
    return;
  }

  logger.info({ msg: 'Workflow deleted via API', workflowId: req.params.id });
  res.status(204).send();
});

// Verifies: FR-WFD-003 — GET /api/workflows/:id/flow — Flow graph for visualization
router.get('/:id/flow', (req: Request, res: Response) => {
  const workflow = workflowService.findById(req.params.id);
  if (!workflow) {
    res.status(404).json({ error: 'Workflow not found' });
    return;
  }

  const flowGraph = workflowService.generateFlowGraph(workflow);
  res.json(flowGraph);
});

export default router;
