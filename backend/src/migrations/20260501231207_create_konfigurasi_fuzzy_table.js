export const up = async (knex) => {
  await knex.schema.createTable('konfigurasi_fuzzy', (table) => {
    table.increments('id').primary();
    table.json('fuzzy_rules').notNullable();
    table.json('bobot_operation_type').notNullable();
    table.json('membership_functions').notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('user_id').unsigned().references('id').inTable('users').nullable();
    table.string('versi', 20).nullable();
    table.timestamps(true, true);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('konfigurasi_fuzzy');
};