import { verifyTokenUtil } from '../utils/jwt.js';
import { isTokenBlacklisted } from '../models/authModel.js';

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) return next();

    const decoded = verifyTokenUtil(token);
    req.user  = { ...decoded, role: decoded.role?.toLowerCase() };
    req.token = token;
  } catch (_) {
    // Token tidak valid, lanjut tanpa user
  }
  next();
};

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token tidak ditemukan' });
    }

    const token = authHeader.split(' ')[1];
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return res.status(401).json({ status: 'error', message: 'Token sudah tidak valid, silakan login ulang' });
    }

    const decoded = verifyTokenUtil(token);
    req.user  = { ...decoded, role: decoded.role?.toLowerCase() };
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ status: 'error', message: 'Token tidak valid atau sudah expired' });
  }
};

export const authorizeAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak, hanya admin yang diizinkan' });
  }
  next();
};

export const authorizeManajer = (req, res, next) => {
  if (req.user?.role !== 'manajer_produksi') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak, hanya manajer produksi yang diizinkan' });
  }
  next();
};

export const authorizeStaffGudang = (req, res, next) => {
  if (req.user?.role !== 'staff_gudang') {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak, hanya staff gudang yang diizinkan' });
  }
  next();
};

export const authorizeAdminOrManajer = (req, res, next) => {
  const allowed = ['admin', 'manajer_produksi'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak' });
  }
  next();
};

export const authorizeAdminOrStaff = (req, res, next) => {
  const allowed = ['admin', 'staff_gudang'];
  if (!allowed.includes(req.user?.role)) {
    return res.status(403).json({ status: 'error', message: 'Akses ditolak' });
  }
  next();
};