import express from 'express';
import { requestLogger } from './middleware/requestLogger';
import { metricsMiddleware, metricsHandler } from './middleware/metrics';
import { errorHandler } from './middleware/errorHandler';
import workItemsRouter from './routes/workItems';
import intakeRouter from './routes/intake';
import dashboardRouter from './routes/dashboard';

const app = express();

// Body parsing
app.use(express.json());

// Observability middleware (FR-WF-015)
app.use(requestLogger);
app.use(metricsMiddleware);

// Prometheus metrics endpoint (FR-WF-015)
app.get('/metrics', metricsHandler);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/work-items', workItemsRouter);
app.use('/api/intake', intakeRouter);
app.use('/api/dashboard', dashboardRouter);

// Error handler (must be last)
app.use(errorHandler);

export default app;
