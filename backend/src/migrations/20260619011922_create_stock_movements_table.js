export const up = (knex) =>
  knex.schema.createTable('stock_movements', (table) => {
    table.increments('id').primary();

    table
      .integer('material_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('materials')
      .onDelete('CASCADE');

    table.enu('movement_type', ['in', 'out']).notNullable();

    table.enu('source_type', ['procurement', 'production', 'adjustment']).notNullable();

    table.integer('source_id').unsigned().nullable();

    table.decimal('quantity', 12, 2).notNullable();

    table.decimal('stock_before', 12, 2).notNullable();
    table.decimal('stock_after', 12, 2).notNullable();

    table.string('notes', 255).nullable();

    table.integer('created_by').unsigned().nullable();

    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.index(['material_id', 'created_at']);
    table.index(['source_type', 'source_id']);
  });

export const down = (knex) => knex.schema.dropTable('stock_movements');