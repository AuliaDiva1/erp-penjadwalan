// migrations/YYYYMMDDHHMMSS_alter_jobs_operation.js
export const up = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.dropColumn('operation_type');
    table.integer('operation_id').unsigned()
      .references('id').inTable('operation_types').after('material_id');
  });

export const down = (knex) =>
  knex.schema.alterTable('jobs', (table) => {
    table.dropColumn('operation_id');
    table.enu('operation_type', ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling'])
      .notNullable().after('material_id');
  });