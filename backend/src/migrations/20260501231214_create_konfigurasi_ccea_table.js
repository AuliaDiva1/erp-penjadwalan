export const up = async (knex) => {
  await knex.schema.createTable('konfigurasi_ccea', (table) => {
    table.increments('id').primary();
    table.integer('jumlah_populasi').notNullable().defaultTo(50);
    table.integer('jumlah_iterasi').notNullable().defaultTo(100);
    table.string('dekomposisi', 50).notNullable().defaultTo('random');
    table.float('crossover_rate').notNullable().defaultTo(0.8);
    table.float('mutation_rate').notNullable().defaultTo(0.1);
    table.boolean('is_active').defaultTo(true);
    table.integer('user_id').unsigned().references('id').inTable('users').nullable();
    table.string('versi', 20).nullable();
    table.timestamps(true, true);
  });
};

export const down = async (knex) => {
  await knex.schema.dropTableIfExists('konfigurasi_ccea');
};