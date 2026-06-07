export const up = (knex) => {
  return knex.schema.createTable('operation_types', (table) => {
    table.increments('id').primary();
    table.string('kode_operasi', 20).unique().notNullable();
    table.string('nama_operasi', 100).notNullable();
    table.text('deskripsi').nullable();
    table.float('energy_rate_default').nullable();
    table.integer('min_processing_time').defaultTo(20);
    table.integer('max_processing_time').defaultTo(120);
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('operation_types');
};
