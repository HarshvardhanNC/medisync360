import { Router } from 'express';
import { uploadReport, getReports } from '../controllers/reportController';

const router = Router();

// Route to handle medical report uploads and blockchain hash registration
router.post('/upload', uploadReport);

// Route to get a patient's blockchain verified reports
router.get('/:patientId', getReports);

export default router;
