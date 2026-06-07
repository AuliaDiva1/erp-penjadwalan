export const up = (knex) => {
  return knex.schema.alterTable('machines', (table) => {
    table.dropColumn('operation_type');
  });
};

export const down = (knex) => {
  return knex.schema.alterTable('machines', (table) => {
    table.string('operation_type', 100).nullable();
  });
};