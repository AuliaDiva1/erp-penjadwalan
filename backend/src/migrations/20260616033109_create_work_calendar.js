export const up = async (knex) => {
  await knex.schema.createTable('work_calendar', (t) => {
    t.increments('id');
    t.time('work_start').notNullable().defaultTo('08:00:00');
    t.time('work_end').notNullable().defaultTo('17:00:00');
    t.boolean('overtime_enabled').defaultTo(false);
    t.time('overtime_end').nullable();
    t.timestamps(true, true);
  });

  await knex('work_calendar').insert({
    work_start:       '08:00:00',
    work_end:         '17:00:00',
    overtime_enabled: false,
    overtime_end:     null,
  });
};

export const down = (knex) =>
  knex.schema.dropTableIfExists('work_calendar');