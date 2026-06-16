export const up = async (knex) => {
  await knex.schema.createTable('work_days', (t) => {
    t.increments('id');
    t.string('day_name', 20).notNullable();
    t.string('day_name_id', 20).notNullable(); // Senin, Selasa, dst
    t.integer('day_order').notNullable();
    t.boolean('is_workday').defaultTo(false);
    t.timestamps(true, true);
  });

  await knex('work_days').insert([
    { day_name: 'Monday',    day_name_id: 'Senin',  day_order: 1, is_workday: true  },
    { day_name: 'Tuesday',   day_name_id: 'Selasa', day_order: 2, is_workday: true  },
    { day_name: 'Wednesday', day_name_id: 'Rabu',   day_order: 3, is_workday: true  },
    { day_name: 'Thursday',  day_name_id: 'Kamis',  day_order: 4, is_workday: true  },
    { day_name: 'Friday',    day_name_id: 'Jumat',  day_order: 5, is_workday: true  },
    { day_name: 'Saturday',  day_name_id: 'Sabtu',  day_order: 6, is_workday: false },
    { day_name: 'Sunday',    day_name_id: 'Minggu', day_order: 7, is_workday: false },
  ]);
};

export const down = (knex) =>
  knex.schema.dropTableIfExists('work_days');