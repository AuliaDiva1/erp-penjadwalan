import { db } from '../core/config/knex.js';

export const getAllUsers = async () =>
  db('users')
    .select('id', 'username', 'full_name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
    .orderBy('created_at', 'desc');

export const getUserById = async (id) =>
  db('users')
    .where({ id })
    .select('id', 'username', 'full_name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
    .first();

export const getUserByEmail = async (email) =>
  db('users').where({ email }).first();

export const getUserByUsername = async (username) =>
  db('users').where({ username }).first();

export const addUser = async ({ username, full_name, email, password, role }) => {
  const [id] = await db('users').insert({ username, full_name, email, password, role });
  return getUserById(id);
};

export const updateUser = async (id, data) => {
  await db('users').where({ id }).update({ ...data, updated_at: db.fn.now() });
  return getUserById(id);
};

export const deleteUser = async (id) =>
  db('users').where({ id }).del();

export const getUsersByRole = async (role) =>
  db('users')
    .where({ role })
    .select('id', 'username', 'full_name', 'email', 'role', 'is_active', 'created_at', 'updated_at');

export const toggleUserStatus = async (id, is_active) =>
  db('users').where({ id }).update({ is_active, updated_at: db.fn.now() });

export const countByRole = async (role) => {
  const result = await db('users').where({ role }).count('id as total');
  return Number(result[0].total);
};