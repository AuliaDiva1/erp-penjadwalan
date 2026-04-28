export const up = (knex) => {
  return knex.schema.createTable('procurements', (table) => {
    table.increments('id').primary();
    table.integer('material_id').unsigned().references('id').inTable('materials').notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users').nullable();
    table.integer('required_qty').notNullable();
    table.integer('current_stock_at_trigger').notNullable();
    table.enu('status', ['pending', 'in_progress', 'completed']).defaultTo('pending');
    table.text('notes').nullable();
    table.boolean('is_auto').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('procurements');
};