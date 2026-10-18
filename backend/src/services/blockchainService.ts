import { ethers } from 'ethers';
import { env } from '../config/env';

const MedicalReportRegistryABI = [
  'function anchorReport(string reportId, string fileHash) external',
  'function getReport(string reportId) external view returns (tuple(string reportId, string fileHash, address uploader, uint256 timestamp, bool exists))',
];

export interface BlockchainAnchor {
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  network: string;
}

export interface BlockchainReport {
  reportId: string;
  fileHash: string;
  uploader: string;
  timestamp: number;
  exists: boolean;
}

function getContract(withSigner: boolean): ethers.Contract {
  if (!env.blockchainContractAddress) {
    throw new Error(
      'Blockchain contract is not configured. Set CONTRACT_ADDRESS after deploying the local contract.'
    );
  }

  const provider = new ethers.JsonRpcProvider(env.blockchainRpcUrl);

  if (withSigner) {
    if (!env.blockchainPrivateKey) {
      throw new Error('Blockchain wallet is not configured. Set PRIVATE_KEY in backend/.env.');
    }

    const wallet = new ethers.Wallet(env.blockchainPrivateKey, provider);
    return new ethers.Contract(env.blockchainContractAddress, MedicalReportRegistryABI, wallet);
  }

  return new ethers.Contract(env.blockchainContractAddress, MedicalReportRegistryABI, provider);
}

export const anchorReportHash = async (
  reportId: string,
  fileHash: string
): Promise<BlockchainAnchor> => {
  try {
    const contract = getContract(true);
    const transaction = await contract.anchorReport(reportId, fileHash);
    const receipt = await transaction.wait();

    if (!receipt?.blockNumber) {
      throw new Error('Blockchain transaction was not mined');
    }

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      contractAddress: env.blockchainContractAddress,
      network: env.blockchainNetwork,
    };
  } catch (error: any) {
    console.error('Blockchain anchoring error:', error);
    throw new Error(
      error?.shortMessage || error?.reason || error?.message || 'Blockchain anchoring failed'
    );
  }
};

export const getAnchoredReport = async (reportId: string): Promise<BlockchainReport> => {
  try {
    const contract = getContract(false);
    const report = await contract.getReport(reportId);

    return {
      reportId: report.reportId,
      fileHash: report.fileHash,
      uploader: report.uploader,
      timestamp: Number(report.timestamp),
      exists: report.exists,
    };
  } catch (error: any) {
    console.error('Blockchain read error:', error);
    throw new Error(
      error?.shortMessage || error?.reason || error?.message || 'Blockchain read failed'
    );
  }
};
