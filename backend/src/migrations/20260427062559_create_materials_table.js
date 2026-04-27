export const up = (knex) => {
  return knex.schema.createTable('materials', (table) => {
    table.increments('id').primary();
    table.string('material_name', 100).notNullable();
    table.string('unit', 20).notNullable();
    table.integer('current_stock').defaultTo(0);
    table.integer('min_stock_level').defaultTo(10);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('materials');
};