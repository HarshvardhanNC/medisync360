import { Response } from 'express';
import crypto from 'crypto';
import MedicalReport from '../models/MedicalReport';
import {
  uploadToCloudinary,
  fetchFileBufferFromCloudinary,
  getSignedCloudinaryDownloadUrl,
} from '../services/cloudinaryService';
import { mockStoreHash, mockVerifyHash } from '../services/blockchainService';
import { AuthRequest } from '../middleware/authMiddleware';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/upload
// Multer memoryStorage puts the file in req.file.buffer
// Flow: hash → Cloudinary upload → MongoDB save → mock blockchain store
// ─────────────────────────────────────────────────────────────────────────────
export const uploadReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { buffer, originalname, mimetype } = req.file;

    // Step 1: Generate SHA-256 hash from the raw buffer (before any upload)
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Step 2: Upload file to Cloudinary (stream from buffer, no disk write)
    const { url: cloudinaryURL, publicId: cloudinaryPublicId } = await uploadToCloudinary(
      buffer,
      originalname,
      mimetype
    );

    // Step 3: Save metadata to MongoDB
    const report = await MedicalReport.create({
      userId,
      fileName: originalname,
      fileType: mimetype,
      cloudinaryURL,
      cloudinaryPublicId,
      fileHash,
      blockchainHashReference: 'pending',
      verificationStatus: 'unchecked',
    });

    // Step 4: Store hash on mock blockchain (append-only)
    const blockId = await mockStoreHash(report._id as any, fileHash);

    // Step 5: Update report with the blockchain reference
    report.blockchainHashReference = blockId;
    await report.save();

    res.status(201).json({
      message: 'Report uploaded and secured on blockchain',
      report: {
        _id: report._id,
        fileName: report.fileName,
        fileType: report.fileType,
        cloudinaryURL: report.cloudinaryURL,
        uploadDate: report.uploadDate,
        fileHash: report.fileHash,
        blockchainHashReference: report.blockchainHashReference,
        verificationStatus: report.verificationStatus,
      },
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Server error during report upload' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports
// Returns all reports belonging to the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
export const getAllReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const reports = await MedicalReport.find({ userId }).sort({ uploadDate: -1 }).lean();

    res.status(200).json({ reports });
  } catch (error: any) {
    console.error('Fetch reports error:', error);
    res.status(500).json({ error: 'Server error retrieving reports' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/:id
// Returns a single report (must belong to the authenticated user)
// ─────────────────────────────────────────────────────────────────────────────
export const getReportById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const report = await MedicalReport.findOne({ _id: id, userId }).lean();

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    res.status(200).json({ report });
  } catch (error: any) {
    console.error('Fetch report error:', error);
    res.status(500).json({ error: 'Server error retrieving report' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/:id/download-link
// Returns a short-lived signed Cloudinary URL for secure browser download
// ─────────────────────────────────────────────────────────────────────────────
export const getReportDownloadLink = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const report = await MedicalReport.findOne({ _id: id, userId }).lean();

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    const downloadUrl = getSignedCloudinaryDownloadUrl(report.cloudinaryURL, {
      publicId: report.cloudinaryPublicId,
      mimeType: report.fileType,
      fileName: report.fileName,
      expiresInSeconds: 180,
    });

    res.status(200).json({ downloadUrl });
  } catch (error: any) {
    console.error('Download link error:', error);
    res.status(500).json({ error: error.message || 'Server error creating download link' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/verify/:id
// Integrity verification flow:
//   1. Fetch report metadata from MongoDB
//   2. Download file bytes from the Cloudinary URL
//   3. Recompute SHA-256 hash
//   4. Compare against both MongoDB hash and blockchain record
//   5. Update verificationStatus in DB
//   *** File download is NEVER blocked regardless of result ***
// ─────────────────────────────────────────────────────────────────────────────
export const verifyReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    const report = await MedicalReport.findOne({ _id: id, userId });

    if (!report) {
      res.status(404).json({ error: 'Report not found' });
      return;
    }

    // Step 1: Fetch the actual file from Cloudinary and recompute hash
    const fileBuffer = await fetchFileBufferFromCloudinary(report.cloudinaryURL, {
      publicId: report.cloudinaryPublicId,
      mimeType: report.fileType,
    });
    const recomputedHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Step 2: Compare against DB hash
    const dbHashMatch = recomputedHash === report.fileHash;

    // Step 3: Compare against blockchain record (mock)
    let blockchainMatch = false;
    let blockchainInfo: any = null;

    try {
      const blockchainResult = await mockVerifyHash(report._id as any, recomputedHash);
      blockchainMatch = blockchainResult.matches;
      blockchainInfo = blockchainResult;
    } catch (blockErr) {
      console.warn('Blockchain verification warning:', blockErr);
      // Fall back to DB-only verification if blockchain record missing
      blockchainMatch = dbHashMatch;
    }

    // Both must agree for a "Verified" status
    const isVerified = dbHashMatch && blockchainMatch;
    const newStatus = isVerified ? 'verified' : 'tampered';

    // Step 4: Persist the updated verification status
    report.verificationStatus = newStatus;
    await report.save();

    res.status(200).json({
      verified: isVerified,
      status: isVerified ? 'Verified' : 'Tampered',
      details: {
        recomputedHash,
        storedHash: report.fileHash,
        dbHashMatch,
        blockchainMatch,
        blockId: blockchainInfo?.blockId || report.blockchainHashReference,
      },
    });
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(500).json({ error: error.message || 'Server error during verification' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/reports/:id/share
// Allows a Patient to share their report with a Provider
// ─────────────────────────────────────────────────────────────────────────────
export const shareReport = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const reportId = req.params.id;
    const { doctorId } = req.body;

    if (!doctorId) {
      res.status(400).json({ error: 'Doctor ID is required' });
      return;
    }

    const report = await MedicalReport.findOne({ _id: reportId, userId });
    
    if (!report) {
      res.status(404).json({ error: 'Report not found or unauthorized' });
      return;
    }

    if (report.sharedWith.includes(doctorId)) {
      res.status(400).json({ error: 'Report is already shared with this doctor' });
      return;
    }

    report.sharedWith.push(doctorId);
    await report.save();

    res.json({ message: 'Successfully securely shared report with doctor', report });
  } catch (error: any) {
    res.status(500).json({ error: 'Server error tracking shared permissions' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/shared-with-me
// Providers use this to pull all reports explicitly shared with them by patients.
// ─────────────────────────────────────────────────────────────────────────────
export const getSharedReports = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctorId = req.user?._id;
    
    if (req.user?.role !== 'doctor') {
      res.status(403).json({ error: 'Endpoint restricted to doctors' });
      return;
    }

    const reports = await MedicalReport.find({ sharedWith: doctorId })
      .populate('userId', 'name email bloodGroup') // pull patient info
      .sort({ uploadDate: -1 });
      
    res.json({ reports });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to access remote shared reports' });
  }
};
