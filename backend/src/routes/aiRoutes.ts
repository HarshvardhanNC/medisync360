import { Router } from 'express';
import { analyzeSymptoms, analyzeInsurance, compareHospitals } from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Protect AI routes if needed, or leave public. Using protect for secure access.
router.post('/symptoms', protect, analyzeSymptoms);
router.post('/insurance', protect, analyzeInsurance);
router.post('/hospitals', protect, compareHospitals);

export default router;
