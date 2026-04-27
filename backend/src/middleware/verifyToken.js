import { verifyTokenUtil } from '../utils/jwt.js';
import { isTokenBlacklisted } from '../models/authModel.js';
import { error } from '../utils/response.js';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(res, 'Token tidak ditemukan', 401);
    }

    const token = authHeader.split(' ')[1];

    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return error(res, 'Token sudah tidak berlaku', 401);
    }

    const decoded = verifyTokenUtil(token);
    req.user  = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Token sudah kadaluarsa', 401);
    }
    return error(res, 'Token tidak valid', 401);
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return error(res, 'Akses ditolak, role tidak sesuai', 403);
    }
    next();
  };
};