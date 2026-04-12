import { Router } from 'express';
import { getUserProfile, updateUserProfile, getEmergencyData } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/emergency/:id', protect, getEmergencyData);

export default router;
