export const up = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.integer('processing_time').nullable().alter();
  });

export const down = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.integer('processing_time').notNullable().alter();
  });