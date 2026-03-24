import type { Knex } from 'knex';
import path from 'path';

const config: Record<string, Knex.Config> = {
  development: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || path.join(__dirname, 'dev.sqlite3'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
      extension: 'ts',
    },
  },
  test: {
    client: 'better-sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
      extension: 'ts',
    },
  },
  production: {
    client: 'better-sqlite3',
    connection: {
      filename: process.env.DB_PATH || path.join(__dirname, 'prod.sqlite3'),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, 'src', 'migrations'),
      extension: 'ts',
    },
  },
};

export default config;
