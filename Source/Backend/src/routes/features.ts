// Verifies: FR-CB-005, FR-CB-006, FR-CB-007 — Features API routes
import { Router, Request, Response } from 'express';
import {
  CreateFeatureRequest,
} from '../../../Shared/types/workflow';
import * as featureService from '../services/feature';
import logger from '../logger';

const router = Router();

// Verifies: FR-CB-005 — POST /api/features — Create a new feature
router.post('/', (req: Request, res: Response) => {
  const body = req.body as CreateFeatureRequest;

  // Verifies: FR-CB-016 — Validate required fields
  if (!body.workItemId || !body.cycleId || !body.title || !body.description || !body.branch) {
    logger.warn({ msg: 'Feature creation failed: missing required fields', body: { workItemId: !!body.workItemId, cycleId: !!body.cycleId, title: !!body.title, description: !!body.description, branch: !!body.branch } });
    res.status(400).json({ error: 'workItemId, cycleId, title, description, and branch are required' });
    return;
  }

  const feature = featureService.createFeature(body);
  // Verifies: FR-CB-016 — Structured logging for successful operation
  logger.info({ msg: 'Feature created', featureId: feature.id, action: 'create' });

  res.status(201).json(feature);
});

// Verifies: FR-CB-006 — GET /api/features — List with pagination
router.get('/', (req: Request, res: Response) => {
  const pagination = {
    page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
  };

  const result = featureService.listFeatures(pagination);
  // Verifies: FR-CB-017 — Paginated response format
  res.json(result);
});

// Verifies: FR-CB-007 — GET /api/features/:id — Get single feature
router.get('/:id', (req: Request, res: Response) => {
  const feature = featureService.getFeatureById(req.params.id);
  if (!feature) {
    res.status(404).json({ error: 'Feature not found' });
    return;
  }
  res.json(feature);
});

export default router;
