import { ethers } from 'ethers';

// This is a placeholder for the actual compiled ABI of the MedicalVault
// Once compiled in the blockchain folder, copy the MedicalVault.json ABI here.
const MedicalVaultABI = [
  "function addReport(string _patientId, string _fileHash) public",
  "function getReports(string _patientId) public view returns (tuple(string fileHash, uint256 timestamp, address uploader)[])"
];

// Configuration for local Hardhat node or Polygon Mumbai
const RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Default Hardhat account #0
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Default locally deployed address

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
