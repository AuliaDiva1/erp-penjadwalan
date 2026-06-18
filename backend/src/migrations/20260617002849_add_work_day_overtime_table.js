export const up = (knex) =>
  knex.schema.createTable('work_day_overtime', (table) => {
    table.increments('id');
    table.integer('work_day_id').unsigned().notNullable()
      .references('id').inTable('work_days').onDelete('CASCADE');
    table.integer('work_calendar_id').unsigned().notNullable()
      .references('id').inTable('work_calendar').onDelete('CASCADE');
    table.boolean('overtime_enabled').notNullable().defaultTo(false);
    table.time('overtime_end').nullable();
    table.timestamps(true, true);

    table.unique(['work_day_id', 'work_calendar_id']);
  });

export const down = (knex) =>
  knex.schema.dropTableIfExists('work_day_overtime');