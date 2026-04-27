// src/controllers/userController.js
import {
  getUserById as findUserById,
  getUserByEmail as findUserByEmail,
  getUserByUsername as findUserByUsername,
  addUser as createUser,
  getAllUsers,
  toggleUserStatus as updateUserStatus,
  updateUser as updateUserModel,
  deleteUser as deleteUserModel,
} from '../models/userModel.js';
import { hashPassword } from '../utils/hash.js';
import { success, error } from '../utils/response.js';

export const getUsers = async (req, res) => {
  try {
    const users = await getAllUsers();
    return success(res, 'Berhasil mengambil data users', users);
  } catch (err) {
    console.error('getUsers error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await findUserById(req.params.id);
    if (!user) return error(res, 'User tidak ditemukan', 404);
    return success(res, 'Berhasil mengambil data user', user);
  } catch (err) {
    console.error('getUserById error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};

export const createUserByAdmin = async (req, res) => {
  try {
    const { username, full_name, email, password, role } = req.body;

    if (!username || !full_name || !email || !password || !role) {
      return error(res, 'Semua field wajib diisi', 400);
    }

    const allowedRoles = ['MANAJER_PRODUKSI', 'STAFF_GUDANG'];
    if (!allowedRoles.includes(role)) {
      return error(res, 'Role tidak valid, hanya MANAJER_PRODUKSI atau STAFF_GUDANG', 400);
    }

    const emailExists = await findUserByEmail(email);
    if (emailExists) return error(res, 'Email sudah terdaftar', 400);

    const usernameExists = await findUserByUsername(username);
    if (usernameExists) return error(res, 'Username sudah digunakan', 400);

    const hashed = await hashPassword(password);
    const user = await createUser({ username, full_name, email, password: hashed, role });

    return success(res, 'User berhasil dibuat', {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    }, 201);
  } catch (err) {
    console.error('createUserByAdmin error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { username, full_name, email, password, role } = req.body;

    const user = await findUserById(id);
    if (!user) return error(res, 'User tidak ditemukan', 404);

    const updateData = {};
    if (username) updateData.username = username;
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.password = await hashPassword(password);

    await updateUserModel(id, updateData);
    return success(res, 'User berhasil diupdate');
  } catch (err) {
    console.error('updateUser error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (Number(id) === req.user.userId) {
      return error(res, 'Tidak dapat menghapus akun sendiri', 400);
    }

    const user = await findUserById(id);
    if (!user) return error(res, 'User tidak ditemukan', 404);

    await deleteUserModel(id);
    return success(res, 'User berhasil dihapus');
  } catch (err) {
    console.error('deleteUser error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return error(res, 'is_active harus boolean', 400);
    }

    if (Number(id) === req.user.userId) {
      return error(res, 'Tidak dapat mengubah status akun sendiri', 400);
    }

    const user = await findUserById(id);
    if (!user) return error(res, 'User tidak ditemukan', 404);

    await updateUserStatus(id, is_active);
    return success(res, `User berhasil ${is_active ? 'diaktifkan' : 'dinonaktifkan'}`);
  } catch (err) {
    console.error('toggleStatus error:', err);
    return error(res, 'Terjadi kesalahan server');
  }
};