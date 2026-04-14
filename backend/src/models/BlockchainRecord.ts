import mongoose, { Document, Schema } from 'mongoose';

/**
 * Append-only blockchain record.
 * Once a hash is stored here it is NEVER updated — this is the immutability guarantee.
 * No update or delete operations are performed on this collection.
 */
export interface IBlockchainRecord extends Document {
  reportId: mongoose.Types.ObjectId;
  fileHash: string;
  blockId: string;
  timestamp: Date;
}

const BlockchainRecordSchema: Schema = new Schema(
  {
    reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'MedicalReport', required: true },
    fileHash: { type: String, required: true },
    blockId: { type: String, required: true, unique: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    // Disable updates from Mongoose level — records are write-once
    timestamps: false,
  }
);

export default mongoose.model<IBlockchainRecord>('BlockchainRecord', BlockchainRecordSchema);
