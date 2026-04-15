import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';
import {
  getAllReports,
  getReportById,
  getReportDownloadLink,
  getSharedReports,
  shareReport,
  uploadReport,
  verifyReport,
} from '../controllers/reportController';

const router = Router();

router.post('/upload', protect, upload.single('file'), uploadReport);
router.get('/', protect, getAllReports);
router.get('/shared-with-me', protect, getSharedReports);
router.get('/:id/download-link', protect, getReportDownloadLink);
router.get('/:id', protect, getReportById);
router.post('/verify/:id', protect, verifyReport);
router.post('/:id/share', protect, shareReport);

export default router;
