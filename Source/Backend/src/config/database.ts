import knex, { Knex } from 'knex';
import path from 'path';
import { config } from './index';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    db = createDb();
  }
  return db;
}

export function createDb(overrides?: Partial<Knex.Config>): Knex {
  const instance = knex({
    client: 'better-sqlite3',
    connection: {
      filename: config.nodeEnv === 'test' ? ':memory:' : config.dbPath,
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, '..', 'migrations'),
      extension: 'ts',
    },
    ...overrides,
  });
  return instance;
}

export function setDb(instance: Knex): void {
  db = instance;
}

export async function runMigrations(instance?: Knex): Promise<void> {
  const target = instance || getDb();
  await target.migrate.latest();
}
