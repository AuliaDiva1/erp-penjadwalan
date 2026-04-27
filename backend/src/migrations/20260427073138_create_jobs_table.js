export const up = (knex) => {
  return knex.schema.createTable('jobs', (table) => {
    table.increments('id').primary();
    table.string('job_id', 20).unique().notNullable();
    table.integer('user_id').unsigned().references('id').inTable('users');
    table.string('machine_id', 10).references('machine_id').inTable('machines');
    table.integer('material_id').unsigned().references('id').inTable('materials');
    table.enu('operation_type', ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling']).notNullable();
    table.integer('processing_time').notNullable();
    table.float('energy_consumption').notNullable();
    table.integer('machine_availability').notNullable();
    table.float('material_used').nullable();
    table.datetime('deadline').nullable();
    table.float('fuzzy_score').nullable();
    table.float('priority_score').nullable();
    table.enu('optimization_category', ['Low Efficiency', 'Moderate Efficiency', 'High Efficiency', 'Optimal Efficiency']).nullable();
    table.datetime('scheduled_start').nullable();
    table.datetime('scheduled_end').nullable();
    table.datetime('actual_start').nullable();
    table.datetime('actual_end').nullable();
    table.enu('job_status', ['Pending', 'Scheduled', 'In Progress', 'Completed', 'Delayed', 'Failed']).defaultTo('Pending');
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('jobs');
};