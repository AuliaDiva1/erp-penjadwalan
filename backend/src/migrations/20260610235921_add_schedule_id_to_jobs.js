// migrations/YYYYMMDDHHMMSS_add_schedule_id_to_jobs.js

export const up = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.integer('schedule_id').unsigned().nullable()
         .references('id').inTable('schedules').onDelete('SET NULL');
  });

export const down = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.dropForeign('schedule_id');
    table.dropColumn('schedule_id');
  });