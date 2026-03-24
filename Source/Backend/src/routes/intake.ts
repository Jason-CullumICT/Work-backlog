import { Router, Request, Response, NextFunction } from 'express';
import { intakeService } from '../services/intakeService';

const router = Router();

/**
 * POST /api/intake/zendesk — Process a Zendesk webhook.
 * Verifies: FR-WF-007
 */
router.post('/zendesk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ticket_id, subject, description, priority } = req.body;

    if (!ticket_id || !subject) {
      res.status(400).json({ error: 'ticket_id and subject are required' });
      return;
    }

    const { item, created } = await intakeService.processZendesk({
      ticket_id: String(ticket_id),
      subject,
      description,
      priority,
    });

    res.status(created ? 201 : 200).json(item);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/intake/integration — Process a generic integration webhook.
 * Verifies: FR-WF-007
 */
router.post('/integration', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { external_id, title, description, type, priority, source } = req.body;

    if (!external_id || !title) {
      res.status(400).json({ error: 'external_id and title are required' });
      return;
    }

    const { item, created } = await intakeService.processIntegration({
      external_id: String(external_id),
      title,
      description,
      type,
      priority,
      source,
    });

    res.status(created ? 201 : 200).json(item);
  } catch (err) {
    next(err);
  }
});

export default router;
