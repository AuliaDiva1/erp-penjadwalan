export const up = (knex) => {
  return knex.schema.createTable('schedules', (table) => {
    table.increments('id').primary();
    table.string('schedule_code', 30).unique();
    table.float('makespan').notNullable();
    table.integer('total_jobs').notNullable();
    table.integer('total_machines').notNullable();
    table.enu('status_jadwal', ['draft', 'final', 'revised']).defaultTo('draft');
    table.boolean('is_final').defaultTo(false);
    table.integer('validated_by').unsigned().references('id').inTable('users');
    table.datetime('validated_at');
    table.text('revision_note');
    table.integer('revision_count').defaultTo(0);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('schedules');
};