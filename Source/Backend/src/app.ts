// Verifies: FR-WF-002, FR-WF-006, FR-WF-007, FR-WF-008, FR-WF-013 — Express app setup
import express from 'express';
import workItemsRouter from './routes/workItems';
import workflowRouter from './routes/workflow';
import dashboardRouter from './routes/dashboard';
import intakeRouter from './routes/intake';
import { errorHandler } from './middleware/errorHandler';
import { registry } from './metrics';
import logger from './logger';

const app = express();

app.use(express.json());

// Verifies: FR-WF-013 — Request logging middleware
app.use((req, _res, next) => {
  logger.debug({ msg: 'Incoming request', method: req.method, url: req.url });
  next();
});

// Verifies: FR-WF-002 — Work Items CRUD routes
app.use('/api/work-items', workItemsRouter);

// Verifies: FR-WF-006 — Workflow action routes (route/assess/approve/reject/dispatch)
app.use('/api/work-items', workflowRouter);

// Verifies: FR-WF-007 — Dashboard routes
app.use('/api/dashboard', dashboardRouter);

// Verifies: FR-WF-008 — Intake webhook routes
app.use('/api/intake', intakeRouter);

// Verifies: FR-WF-013 — Prometheus metrics endpoint
app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info({ msg: 'Workflow engine backend started', port: PORT });
  });
}

export default app;
