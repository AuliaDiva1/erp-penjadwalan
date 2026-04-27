import { Router } from 'express';
import * as AuthController from '../controllers/authController.js';
import { verifyToken, authorizeRoles } from '../middleware/verifyToken.js';
import { optionalAuth } from '../middleware/optionalAuth.js';

const router = Router();

// Register — publik jika ADMIN belum ada, protected setelahnya
router.post('/register', optionalAuth, AuthController.register);

// Login — publik
router.post('/login', AuthController.login);

// Protected
router.post('/logout',          verifyToken, AuthController.logout);
router.get('/profile',          verifyToken, AuthController.getProfile);
router.patch('/change-password', verifyToken, AuthController.changePassword);

// Hanya ADMIN
router.get('/users',                    verifyToken, authorizeRoles('ADMIN'), AuthController.getUsers);
router.patch('/users/:id/status',       verifyToken, authorizeRoles('ADMIN'), AuthController.toggleUserStatus);

export default router;