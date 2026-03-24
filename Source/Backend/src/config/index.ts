import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', '..', 'dev.sqlite3'),
  nodeEnv: process.env.NODE_ENV || 'development',
};
