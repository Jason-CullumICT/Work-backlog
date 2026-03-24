import { createDb, setDb, runMigrations } from '../src/config/database';
import type { Knex } from 'knex';

let testDb: Knex;

beforeEach(async () => {
  testDb = createDb({
    connection: { filename: ':memory:' },
  });
  setDb(testDb);
  await runMigrations(testDb);
});

afterEach(async () => {
  if (testDb) {
    await testDb.destroy();
  }
});
