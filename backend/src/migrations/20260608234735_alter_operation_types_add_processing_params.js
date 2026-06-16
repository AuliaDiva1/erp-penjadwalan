export const up = (knex) =>
  knex.schema.alterTable('operation_types', (table) => {
    table.float('base_time').defaultTo(20).after('max_processing_time');
    table.float('time_per_unit').defaultTo(15).after('base_time');
  });

export const down = (knex) =>
  knex.schema.alterTable('operation_types', (table) => {
    table.dropColumn('base_time');
    table.dropColumn('time_per_unit');
  });