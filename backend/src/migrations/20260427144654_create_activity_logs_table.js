export const up = (knex) => {
  return knex.schema.createTable('activity_logs', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().references('id').inTable('users').nullable();
    table.string('action', 100).notNullable();
    table.string('module', 50).notNullable();
    table.text('description').nullable();
    table.string('ip_address', 50).nullable();
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('activity_logs');
};