import { verifyTokenUtil } from '../utils/jwt.js';
import { isTokenBlacklisted } from '../models/authModel.js';

/**
 * Middleware opsional — attach req.user jika token ada dan valid,
 * tapi tidak reject request kalau tidak ada token.
 * Dipakai di route register supaya ADMIN pertama bisa daftar tanpa token.
 */
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
    req.user  = decoded;
    req.token = token;
  } catch (_) {
    // Token tidak valid, lanjut tanpa user
  }
  next();
};