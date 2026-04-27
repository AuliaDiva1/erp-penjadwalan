export const up = (knex) => {
  return knex.schema.alterTable('login_history', (table) => {
    table.integer('user_id').unsigned().nullable().alter();
  });
};

export const down = (knex) => {
  return knex.schema.alterTable('login_history', (table) => {
    table.integer('user_id').unsigned().notNullable().alter();
  });
};