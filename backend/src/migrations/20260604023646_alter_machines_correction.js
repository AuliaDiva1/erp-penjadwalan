// migrations/xxxx_alter_machines_correction.js

export const up = async (knex) => {
  await knex.schema.alterTable('machines', (table) => {
    table.float('machine_availability').defaultTo(100).alter();
    table.string('status', 20).defaultTo('active').alter();
    table.dropColumn('is_active');
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable('machines', (table) => {
    table.integer('machine_availability').defaultTo(100).alter();
    table.string('status', 50).defaultTo('active').alter();
    table.boolean('is_active').defaultTo(true);
  });
};