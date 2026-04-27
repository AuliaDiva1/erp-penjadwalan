export async function up(knex) {
  return knex.schema.createTable('blacklist_tokens', (table) => {
    table.increments('id').primary();
    table.text('token').notNullable();
    table.timestamp('expired_at').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('blacklist_tokens');
}