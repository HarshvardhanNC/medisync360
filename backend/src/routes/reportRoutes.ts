import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import upload from '../middleware/uploadMiddleware';
import {
  uploadReport,
  getAllReports,
  getReportById,
  getReportDownloadLink,
  verifyReport,
} from '../controllers/reportController';

const router = Router();

// POST /api/reports/upload — multer processes file, then auth, then upload handler
router.post('/upload', protect, upload.single('file'), uploadReport);

// GET /api/reports — get all reports for the authenticated user
router.get('/', protect, getAllReports);

// GET /api/reports/:id/download-link — return a short-lived signed download URL
router.get('/:id/download-link', protect, getReportDownloadLink);

// GET /api/reports/:id — get a single report by ID
router.get('/:id', protect, getReportById);

// POST /api/reports/verify/:id — recompute hash and compare with stored + blockchain hash
router.post('/verify/:id', protect, verifyReport);

export default router;
