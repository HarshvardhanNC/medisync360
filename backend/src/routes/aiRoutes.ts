import { Router } from 'express';
import {
  analyzeSymptoms,
  analyzeInsurance,
  bookGeneratedProviderSlot,
  compareHospitals,
  predictAndRecommendDoctors,
} from '../controllers/aiController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

// Make symptom analysis public for testing, protect others
router.post('/symptoms', analyzeSymptoms);
router.post('/recommend', predictAndRecommendDoctors);
router.post('/insurance', protect, analyzeInsurance);
router.post('/hospitals', compareHospitals);
router.post('/book-generated-slot', protect, bookGeneratedProviderSlot);

export default router;
