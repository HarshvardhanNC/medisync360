import { Router } from 'express';
import { analyzeSymptoms, analyzeInsurance, compareHospitals } from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Make symptom analysis public for testing, protect others
router.post('/symptoms', analyzeSymptoms);
router.post('/insurance', protect, analyzeInsurance);
router.post('/hospitals', compareHospitals);

export default router;
