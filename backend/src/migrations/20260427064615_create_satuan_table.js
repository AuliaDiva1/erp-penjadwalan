export const up = (knex) => {
  return knex.schema.createTable('satuan', (table) => {
    table.increments('id').primary();
    table.string('kode_satuan', 10).unique().notNullable();
    table.string('nama_satuan', 50).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('satuan');
};