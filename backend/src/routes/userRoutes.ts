import { Router } from 'express';
import {
  cancelMyAppointment,
  getEmergencyData,
  getMyAppointments,
  getPublicEmergencyData,
  getUserProfile,
  rescheduleMyAppointment,
  updateUserProfile,
} from '../controllers/userController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.get('/profile', protect, getUserProfile);
router.get('/appointments', protect, getMyAppointments);
router.post('/appointments/:id/cancel', protect, cancelMyAppointment);
router.post('/appointments/:id/reschedule', protect, rescheduleMyAppointment);
router.put('/profile', protect, updateUserProfile);
router.get('/emergency/:id', protect, getEmergencyData);
router.get('/emergency-public/:id', getPublicEmergencyData);

export default router;
