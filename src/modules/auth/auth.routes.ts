import { Router } from 'express';
import { registerUser } from './auth.controller';
import { authenticate, requireRole } from '../../middleware';

const router = Router();

// POST /auth/users - admin-only create user in Firebase Auth
router.post('/users', authenticate, requireRole('admin'), registerUser);

export default router;
