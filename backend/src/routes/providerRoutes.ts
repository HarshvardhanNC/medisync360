import { Router } from 'express';
import { protect, isDoctor } from '../middleware/authMiddleware';
import {
  addAvailabilitySlot,
  getProviderWorkspace,
  requestReportAccess,
} from '../controllers/providerController';

const router = Router();

router.use(protect, isDoctor);
router.get('/workspace', getProviderWorkspace);
router.post('/availability', addAvailabilitySlot);
router.post('/request-report-access', requestReportAccess);

export default router;
