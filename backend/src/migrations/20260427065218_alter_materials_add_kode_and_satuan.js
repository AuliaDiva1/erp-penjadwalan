export const up = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table.string('kode_bahan_baku', 10).unique().notNullable().defaultTo('').after('id');
    table.integer('satuan_id').unsigned().references('id').inTable('satuan').after('material_name');
  });
};

export const down = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table.dropColumn('kode_bahan_baku');
    table.dropColumn('satuan_id');
  });
};