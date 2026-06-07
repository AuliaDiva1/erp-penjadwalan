export const up = (knex) => {
  return knex.schema.createTable('operation_materials', (table) => {
    table.increments('id').primary();
    table.integer('operation_type_id').unsigned().notNullable()
      .references('id').inTable('operation_types').onDelete('CASCADE');
    table.string('material_name', 150).notNullable();
    table.string('jurnal_sumber', 255).nullable();
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('operation_materials');
};