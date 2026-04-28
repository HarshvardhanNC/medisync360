import { Schema, model } from 'mongoose';

export interface IAppointment {
  patientId?: string;
  patientName: string;
  doctorId: string;
  providerName: string;
  date?: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

const appointmentSchema = new Schema<IAppointment>(
  {
    patientId: {
      type: String,
      default: undefined,
    },
    patientName: {
      type: String,
      required: true,
      trim: true,
    },
    doctorId: {
      type: String,
      required: true,
      index: true,
    },
    providerName: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: String,
      default: '',
      trim: true,
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled'],
      default: 'scheduled',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const Appointment = model<IAppointment>('Appointment', appointmentSchema);
export default Appointment;
