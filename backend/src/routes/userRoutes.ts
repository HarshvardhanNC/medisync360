import { Router } from 'express';
import { getUserProfile, updateUserProfile, getEmergencyData, getPublicEmergencyData } from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/emergency/:id', protect, getEmergencyData);
router.get('/emergency-public/:id', getPublicEmergencyData); // Public — no auth needed

export default router;
