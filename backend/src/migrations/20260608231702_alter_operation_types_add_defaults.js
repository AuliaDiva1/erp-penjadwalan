export const up = (knex) =>
  knex.schema.alterTable('operation_types', (table) => {
    table.float('default_machine_availability').nullable().after('energy_rate_default');
  });

export const down = (knex) =>
  knex.schema.alterTable('operation_types', (table) => {
    table.dropColumn('default_machine_availability');
  });