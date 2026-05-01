export const up = async (knex) => {
  await knex.schema.alterTable('jobs', (table) => {
    // DEADLINE
    table.datetime('deadline_customer').nullable().after('deadline');
    table.datetime('deadline_predicted').nullable().after('deadline_customer');
    table.boolean('deadline_is_manual').defaultTo(false).after('deadline_predicted');
    table.boolean('deadline_warning').defaultTo(false).after('deadline_is_manual');

    // CCEA
    table.integer('assigned_machine_id').unsigned()
      .references('id').inTable('machines')
      .nullable()
      .after('scheduled_end');
    table.float('makespan').nullable().after('assigned_machine_id');

    // DYNAMIC RESCHEDULING
    table.boolean('is_urgent').defaultTo(false).after('job_status');
    table.boolean('priority_override').defaultTo(false).after('is_urgent');
    table.integer('reschedule_count').defaultTo(0).after('priority_override');
  });
};

export const down = async (knex) => {
  await knex.schema.alterTable('jobs', (table) => {
    table.dropColumn('deadline_customer');
    table.dropColumn('deadline_predicted');
    table.dropColumn('deadline_is_manual');
    table.dropColumn('deadline_warning');
    table.dropColumn('assigned_machine_id');
    table.dropColumn('makespan');
    table.dropColumn('is_urgent');
    table.dropColumn('priority_override');
    table.dropColumn('reschedule_count');
  });
};