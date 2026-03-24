import app from './app';
import { config } from './config';
import { runMigrations } from './config/database';
import { logger } from './config/logger';

async function start(): Promise<void> {
  try {
    // Run migrations on startup
    await runMigrations();
    logger.info('Database migrations completed');

    app.listen(config.port, () => {
      logger.info({ port: config.port }, `Server listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
