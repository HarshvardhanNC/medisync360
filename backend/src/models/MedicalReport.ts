import mongoose, { Document, Schema } from 'mongoose';

export interface IMedicalReport extends Document {
  userId: mongoose.Types.ObjectId;
  fileName: string;
  fileType: string;
  cloudinaryURL: string;
  cloudinaryPublicId: string;
  uploadDate: Date;
  fileHash: string;
  blockchainHashReference: string;
  verificationStatus: 'verified' | 'tampered' | 'unchecked';
  sharedWith: mongoose.Types.ObjectId[];
}

const MedicalReportSchema: Schema = new Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    fileName: { type: String, required: true },
    fileType: { type: String, required: true },
    cloudinaryURL: { type: String, required: true },
    cloudinaryPublicId: { type: String, required: true },
    uploadDate: { type: Date, default: Date.now },
    fileHash: { type: String, required: true },
    blockchainHashReference: { type: String, default: 'pending' },
    verificationStatus: {
      type: String,
      enum: ['verified', 'tampered', 'unchecked'],
      default: 'unchecked',
    },
    // Array of Provider IDs this report is securely shared with
    sharedWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

export default mongoose.model<IMedicalReport>('MedicalReport', MedicalReportSchema);
