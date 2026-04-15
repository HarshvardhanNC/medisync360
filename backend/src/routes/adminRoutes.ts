import express from 'express';
import { getProviders, toggleProviderVerification } from '../controllers/adminController';
import { protect, isAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// All routes here require Admin privileges
router.use(protect, isAdmin);

// Doctor Management
router.get('/doctors', getProviders);
router.put('/doctors/:id/approval', toggleProviderVerification);

export default router;
