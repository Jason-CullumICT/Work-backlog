import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // work_items table
  await knex.schema.createTable('work_items', (table) => {
    table.uuid('id').primary();
    table.string('title', 255).notNullable();
    table.text('description').nullable();
    table
      .enum('type', ['feature', 'bug', 'task', 'improvement'])
      .notNullable()
      .defaultTo('task');
    table
      .enum('status', [
        'backlog',
        'proposed',
        'under_review',
        'approved',
        'rejected',
        'in_dev',
        'done',
      ])
      .notNullable()
      .defaultTo('backlog');
    table.string('queue', 100).nullable();
    table
      .enum('priority', ['critical', 'high', 'medium', 'low'])
      .notNullable()
      .defaultTo('medium');
    table
      .enum('source', ['browser', 'zendesk', 'manual_bookmark', 'integration'])
      .notNullable()
      .defaultTo('browser');
    table.string('external_id', 255).nullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });

  // change_history table
  await knex.schema.createTable('change_history', (table) => {
    table.uuid('id').primary();
    table.uuid('work_item_id').notNullable();
    table.string('field', 100).notNullable();
    table.text('old_value').nullable();
    table.text('new_value').notNullable();
    table.string('changed_by', 100).notNullable();
    table.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('work_item_id')
      .references('id')
      .inTable('work_items')
      .onDelete('CASCADE');
  });

  // proposals table
  await knex.schema.createTable('proposals', (table) => {
    table.uuid('id').primary();
    table.uuid('work_item_id').notNullable();
    table.text('requirements').notNullable();
    table.string('prototype_url', 500).nullable();
    table.string('created_by', 100).notNullable();
    table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('work_item_id')
      .references('id')
      .inTable('work_items')
      .onDelete('CASCADE');
  });

  // reviews table
  await knex.schema.createTable('reviews', (table) => {
    table.uuid('id').primary();
    table.uuid('work_item_id').notNullable();
    table.enum('decision', ['approved', 'rejected']).notNullable();
    table.text('feedback').nullable();
    table.string('reviewed_by', 100).notNullable();
    table.timestamp('reviewed_at').notNullable().defaultTo(knex.fn.now());

    table
      .foreign('work_item_id')
      .references('id')
      .inTable('work_items')
      .onDelete('CASCADE');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('reviews');
  await knex.schema.dropTableIfExists('proposals');
  await knex.schema.dropTableIfExists('change_history');
  await knex.schema.dropTableIfExists('work_items');
}
