export async function up(knex) {
  return knex.schema.createTable('login_history', (table) => {
    table.increments('id').primary();
    table
      .integer('user_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('users')
      .onDelete('CASCADE');
    table.enu('action', ['LOGIN', 'LOGOUT']).notNullable();
    table.enu('status', ['SUCCESS', 'FAILED']).notNullable().defaultTo('SUCCESS');
    table.string('ip_address', 50).nullable();
    table.text('user_agent').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  return knex.schema.dropTableIfExists('login_history');
}