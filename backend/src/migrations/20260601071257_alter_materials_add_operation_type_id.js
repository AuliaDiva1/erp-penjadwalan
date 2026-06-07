export const up = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table
      .integer('operation_type_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('operation_types')
      .onDelete('SET NULL')
      .after('kode_bahan_baku');
  });
};

export const down = (knex) => {
  return knex.schema.alterTable('materials', (table) => {
    table.dropForeign('operation_type_id');
    table.dropColumn('operation_type_id');
  });
};