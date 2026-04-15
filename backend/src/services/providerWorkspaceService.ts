import Appointment from '../models/Appointment';

export type AvailabilitySlot = {
  id: string;
  time: string;
  isBooked: boolean;
};

export type ProviderAppointment = {
  id: string;
  patientName: string;
  reason: string;
  time: string;
  status: 'scheduled' | 'completed';
};

export type ReportAccessRequest = {
  id: string;
  patientIdentifier: string;
  note: string;
  status: 'pending';
  createdAt: string;
};

const availabilityByDoctor = new Map<string, AvailabilitySlot[]>();
const reportAccessRequestsByDoctor = new Map<string, ReportAccessRequest[]>();

const createId = (prefix: string): string => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const getProviderAvailability = (doctorId: string): AvailabilitySlot[] => {
  return availabilityByDoctor.get(doctorId) ?? [];
};

export const addProviderAvailabilitySlot = (doctorId: string, time: string): AvailabilitySlot => {
  const current = availabilityByDoctor.get(doctorId) ?? [];

  if (current.some((slot) => slot.time === time)) {
    throw new Error('Availability slot already exists');
  }

  const slot: AvailabilitySlot = {
    id: createId('slot'),
    time,
    isBooked: false,
  };

  current.push(slot);
  availabilityByDoctor.set(doctorId, current);
  return slot;
};

export const getProviderAppointments = async (doctorId: string): Promise<ProviderAppointment[]> => {
  const appointments = await Appointment.find({ doctorId }).sort({ createdAt: -1 }).lean();
  return appointments.map((appointment) => ({
    id: String(appointment._id),
    patientName: appointment.patientName,
    reason: appointment.reason,
    time: appointment.time,
    status: appointment.status,
  }));
};

export const markProviderAvailabilityBooked = (doctorId: string, time: string): void => {
  const current = availabilityByDoctor.get(doctorId) ?? [];
  const slot = current.find((item) => item.time === time);

  if (!slot) {
    return;
  }

  slot.isBooked = true;
  availabilityByDoctor.set(doctorId, current);
};

export const createProviderAppointment = async (
  doctorId: string,
  payload: { patientId?: string; patientName: string; providerName: string; reason: string; time: string },
): Promise<ProviderAppointment> => {
  const appointment = await Appointment.create({
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId,
    providerName: payload.providerName,
    reason: payload.reason,
    time: payload.time,
    status: 'scheduled',
  });

  return {
    id: String(appointment._id),
    patientName: appointment.patientName,
    reason: appointment.reason,
    time: appointment.time,
    status: appointment.status,
  };
};

export const getReportAccessRequests = (doctorId: string): ReportAccessRequest[] => {
  return reportAccessRequestsByDoctor.get(doctorId) ?? [];
};

export const createReportAccessRequest = (
  doctorId: string,
  patientIdentifier: string,
  note: string,
): ReportAccessRequest => {
  const current = reportAccessRequestsByDoctor.get(doctorId) ?? [];
  const request: ReportAccessRequest = {
    id: createId('request'),
    patientIdentifier,
    note,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  current.unshift(request);
  reportAccessRequestsByDoctor.set(doctorId, current);
  return request;
};
