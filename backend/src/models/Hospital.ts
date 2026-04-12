import mongoose, { Document, Schema } from 'mongoose';

export interface IHospital extends Document {
  name: string;
  location: string;
  treatmentCostRange: string;
  rating: number;
  doctorExperienceAvgYears: number;
  insuranceCompatibility: string[];
  specialties: string[];
}

const HospitalSchema: Schema = new Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  treatmentCostRange: { type: String, required: true }, // e.g. "$100 - $500" or "Low-Medium"
  rating: { type: Number, required: true, min: 0, max: 5 },
  doctorExperienceAvgYears: { type: Number, required: true },
  insuranceCompatibility: [{ type: String }],
  specialties: [{ type: String }] // e.g., ["Cardiology", "Neurology"]
}, { timestamps: true });

export default mongoose.model<IHospital>('Hospital', HospitalSchema);
