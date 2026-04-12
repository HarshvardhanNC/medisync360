import { Request, Response } from 'express';
import { addReportToBlockchain, getReportsFromBlockchain } from '../services/blockchainService';
import crypto from 'crypto';

// In a real application, the file would be uploaded to AWS S3/Firebase
// and the file hash would be calculated from the file buffer.
export const uploadReport = async (req: Request, res: Response) => {
  try {
    const { patientId, fileData } = req.body;
    
    if (!patientId || !fileData) {
      return res.status(400).json({ error: 'Patient ID and File Data are required' });
    }

    // Hash the file data (Simulating SHA-256 generation for MedicalVault)
    const fileHash = crypto.createHash('sha256').update(fileData).digest('hex');

    // Send hash to Blockchain
    const txHash = await addReportToBlockchain(patientId, fileHash);

    res.status(201).json({
      message: 'Report uploaded securely and verified on blockchain',
      fileHash,
      blockchainTxHash: txHash
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during report upload' });
  }
};

export const getReports = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;

    if (!patientId || typeof patientId !== 'string') {
      return res.status(400).json({ error: 'Patient ID is required and must be a string' });
    }

    const reports = await getReportsFromBlockchain(patientId as string);

    res.status(200).json({ reports });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error retrieving reports' });
  }
};
