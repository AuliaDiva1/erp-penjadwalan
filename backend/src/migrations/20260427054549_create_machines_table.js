export const up = (knex) => {
  return knex.schema.createTable('machines', (table) => {
    table.increments('id').primary();
    table.string('machine_id', 10).unique().notNullable();
    table.string('machine_name', 100).notNullable();
    table.integer('capacity_per_hour');
    table.float('energy_rate');
    table.enu('operation_type', ['Grinding', 'Additive', 'Lathe', 'Milling', 'Drilling']);
    table.integer('machine_availability').defaultTo(95);
    table.enu('status', ['active', 'inactive', 'maintenance']).defaultTo('active');
    table.boolean('is_active').defaultTo(true);
    table.timestamps(true, true);
  });
};

export const down = (knex) => {
  return knex.schema.dropTableIfExists('machines');
};