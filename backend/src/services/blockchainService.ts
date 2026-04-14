import { ethers } from 'ethers';
import crypto from 'crypto';
import mongoose from 'mongoose';
import BlockchainRecord from '../models/BlockchainRecord';

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1: ORIGINAL ETHERS.JS / SMART CONTRACT INTEGRATION
// Preserved from original implementation. Requires a running Hardhat node.
// Currently NOT called by the active routes — mock blockchain is used instead.
// ─────────────────────────────────────────────────────────────────────────────

const MedicalVaultABI = [
  "function addReport(string _patientId, string _fileHash) public",
  "function getReports(string _patientId) public view returns (tuple(string fileHash, uint256 timestamp, address uploader)[])"
];

const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const addReportToBlockchain = async (patientId: string, fileHash: string) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalVaultABI, wallet);

    const tx = await contract.addReport(patientId, fileHash);
    const receipt = await tx.wait();

    return receipt.hash;
  } catch (error) {
    console.error("Error interacting with smart contract:", error);
    throw new Error('Blockchain transaction failed');
  }
};

export const getReportsFromBlockchain = async (patientId: string) => {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, MedicalVaultABI, provider);

    const reports = await contract.getReports(patientId);
    return reports.map((report: any) => ({
      fileHash: report.fileHash,
      timestamp: Number(report.timestamp),
      uploader: report.uploader
    }));
  } catch (error) {
    console.error("Error retrieving from smart contract:", error);
    throw new Error('Blockchain retrieval failed');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2: MOCK BLOCKCHAIN (Active — MongoDB-backed append-only chain)
//
// Design principles:
//  - Hashes are stored ONCE in MongoDB and NEVER updated (immutability)
//  - Each entry receives a unique blockId derived from chaining previous block
//    hashes (mimics a real blockchain hash chain)
//  - storeHash() is the write path (called once on upload)
//  - verifyHash() is the read path (called on integrity check)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stores a file hash in the mock blockchain.
 * Returns a block ID that represents the "transaction hash" in our mock chain.
 * This function must only be called once per report.
 */
export const mockStoreHash = async (
  reportId: mongoose.Types.ObjectId,
  fileHash: string
): Promise<string> => {
  // Find the last block to chain from (like a blockchain's previous hash)
  const lastBlock = await BlockchainRecord.findOne().sort({ timestamp: -1 }).lean();
  const previousBlockId = lastBlock?.blockId || '0000000000000000';

  // Generate a chained block ID: hash of (previousBlockId + fileHash + timestamp)
  const blockId = crypto
    .createHash('sha256')
    .update(`${previousBlockId}:${fileHash}:${Date.now()}`)
    .digest('hex');

  await BlockchainRecord.create({
    reportId,
    fileHash,
    blockId,
    timestamp: new Date(),
  });

  return blockId;
};

/**
 * Retrieves the stored hash from the mock blockchain and compares with provided hash.
 * Returns true if hashes match (file is intact), false if tampered.
 */
export const mockVerifyHash = async (
  reportId: mongoose.Types.ObjectId,
  computedHash: string
): Promise<{ matches: boolean; storedHash: string; blockId: string }> => {
  const record = await BlockchainRecord.findOne({ reportId }).lean();

  if (!record) {
    throw new Error('No blockchain record found for this report');
  }

  return {
    matches: record.fileHash === computedHash,
    storedHash: record.fileHash,
    blockId: record.blockId,
  };
};
