export async function up(knex) {
  return knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('username', 50).unique().notNullable();
    table.string('full_name', 100).notNullable();
    table.string('email', 100).unique().notNullable();
    table.string('password', 255).notNullable();
    table.enu('role', ['ADMIN', 'MANAJER_PRODUKSI', 'STAFF_GUDANG']).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('users');
}