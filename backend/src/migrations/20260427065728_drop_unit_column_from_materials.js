export const up = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table.dropColumn('unit');
  });
};

export const down = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table.string('unit', 20).notNullable().defaultTo('');
  });
};