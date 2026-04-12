import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'patient' | 'doctor';
  bloodGroup?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  emergencyContact?: string;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['patient', 'doctor'], default: 'patient' },
  // Emergency Data
  bloodGroup: { type: String },
  allergies: [{ type: String }],
  chronicDiseases: [{ type: String }],
  currentMedications: [{ type: String }],
  emergencyContact: { type: String },
}, { timestamps: true });

export default mongoose.model<IUser>('User', UserSchema);
