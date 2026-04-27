import { db } from '../core/config/knex.js';

export const findUserByEmail = async (email) => {
  return db('users').where({ email }).first();
};

export const findUserByUsername = async (username) => {
  return db('users').where({ username }).first();
};

export const findUserById = async (id) => {
  return db('users')
    .where({ id })
    .select('id', 'username', 'full_name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
    .first();
};

export const createUser = async (data) => {
  const [id] = await db('users').insert(data);
  return findUserById(id);
};

export const countByRole = async (role) => {
  const result = await db('users').where({ role }).count('id as total');
  return Number(result[0].total);
};

export const addLoginHistory = async ({ userId, action, status, ip, userAgent }) => {
  return db('login_history').insert({
    user_id    : userId,
    action,
    status,
    ip_address : ip,
    user_agent : userAgent,
  });
};

export const blacklistToken = async (token, expiredAt) => {
  return db('blacklist_tokens').insert({ token, expired_at: expiredAt });
};

export const isTokenBlacklisted = async (token) => {
  const found = await db('blacklist_tokens').where({ token }).first();
  return !!found;
};

export const updatePassword = async (id, hashedPassword) => {
  return db('users').where({ id }).update({
    password   : hashedPassword,
    updated_at : db.fn.now(),
  });
};

export const getAllUsers = async () => {
  return db('users')
    .select('id', 'username', 'full_name', 'email', 'role', 'is_active', 'created_at', 'updated_at')
    .orderBy('created_at', 'desc');
};

export const updateUserStatus = async (id, is_active) => {
  return db('users').where({ id }).update({ is_active, updated_at: db.fn.now() });
};