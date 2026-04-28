import Appointment from '../models/Appointment';

export type AvailabilitySlot = {
  id: string;
  date: string;
  time: string;
  isBooked: boolean;
};

export type ProviderAppointment = {
  id: string;
  patientName: string;
  reason: string;
  date: string;
  time: string;
  status: 'scheduled' | 'completed' | 'cancelled';
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
const createSlotKey = (date: string, time: string): string => `${date}::${time}`;

export const getProviderAvailability = (doctorId: string): AvailabilitySlot[] => {
  return availabilityByDoctor.get(doctorId) ?? [];
};

export const addProviderAvailabilitySlot = (doctorId: string, date: string, time: string): AvailabilitySlot => {
  const current = availabilityByDoctor.get(doctorId) ?? [];

  if (current.some((slot) => createSlotKey(slot.date, slot.time) === createSlotKey(date, time))) {
    throw new Error('Availability slot already exists');
  }

  const slot: AvailabilitySlot = {
    id: createId('slot'),
    date,
    time,
    isBooked: false,
  };

  current.push(slot);
  current.sort((a, b) => createSlotKey(a.date, a.time).localeCompare(createSlotKey(b.date, b.time)));
  availabilityByDoctor.set(doctorId, current);
  return slot;
};

export const removeProviderAvailabilitySlot = (doctorId: string, slotId: string): void => {
  const current = availabilityByDoctor.get(doctorId) ?? [];
  const slot = current.find((item) => item.id === slotId);

  if (!slot) {
    throw new Error('Availability slot not found');
  }

  if (slot.isBooked) {
    throw new Error('Booked slot cannot be removed');
  }

  availabilityByDoctor.set(
    doctorId,
    current.filter((item) => item.id !== slotId),
  );
};

export const getProviderAppointments = async (doctorId: string): Promise<ProviderAppointment[]> => {
  const appointments = await Appointment.find({ doctorId }).sort({ createdAt: -1 }).lean();
  return appointments.map((appointment) => ({
    id: String(appointment._id),
    patientName: appointment.patientName,
    reason: appointment.reason,
    date: appointment.date || '',
    time: appointment.time,
    status: appointment.status,
  }));
};

export const markProviderAvailabilityBooked = (doctorId: string, date: string, time: string): void => {
  const current = availabilityByDoctor.get(doctorId) ?? [];
  const slot = current.find((item) => item.date === date && item.time === time);

  if (!slot) {
    return;
  }

  slot.isBooked = true;
  availabilityByDoctor.set(doctorId, current);
};

export const markProviderAvailabilityOpen = (doctorId: string, date: string, time: string): void => {
  const current = availabilityByDoctor.get(doctorId) ?? [];
  const slot = current.find((item) => item.date === date && item.time === time);

  if (!slot) {
    return;
  }

  slot.isBooked = false;
  availabilityByDoctor.set(doctorId, current);
};

export const createProviderAppointment = async (
  doctorId: string,
  payload: { patientId?: string; patientName: string; providerName: string; reason: string; date: string; time: string },
): Promise<ProviderAppointment> => {
  const appointment = await Appointment.create({
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId,
    providerName: payload.providerName,
    reason: payload.reason,
    date: payload.date,
    time: payload.time,
    status: 'scheduled',
  });

  return {
    id: String(appointment._id),
    patientName: appointment.patientName,
    reason: appointment.reason,
    date: appointment.date || '',
    time: appointment.time,
    status: appointment.status,
  };
};

export const getPatientAppointmentOptions = async (patientId: string) => {
  const appointments = await Appointment.find({ patientId }).sort({ createdAt: -1 }).lean();
  const doctorIds = Array.from(new Set(appointments.map((appointment) => appointment.doctorId)));

  return {
    appointments,
    availabilityByDoctorId: new Map(
      doctorIds.map((doctorId) => [
        doctorId,
        (availabilityByDoctor.get(doctorId) ?? []).filter((slot) => !slot.isBooked),
      ]),
    ),
  };
};

export const cancelProviderAppointment = async (appointmentId: string, patientId: string) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, patientId });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    throw new Error('Appointment is already cancelled');
  }

  appointment.status = 'cancelled';
  await appointment.save();
  markProviderAvailabilityOpen(appointment.doctorId, appointment.date || '', appointment.time);

  return appointment;
};

export const rescheduleProviderAppointment = async (
  appointmentId: string,
  patientId: string,
  nextDate: string,
  nextTime: string,
) => {
  const appointment = await Appointment.findOne({ _id: appointmentId, patientId });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  if (appointment.status === 'cancelled') {
    throw new Error('Cancelled appointment cannot be rescheduled');
  }

  const availability = availabilityByDoctor.get(appointment.doctorId) ?? [];
  const targetSlot = availability.find((slot) => slot.date === nextDate && slot.time === nextTime);

  if (!targetSlot) {
    throw new Error('Requested slot is not available');
  }

  if (targetSlot.isBooked) {
    throw new Error('Requested slot is already booked');
  }

  markProviderAvailabilityOpen(appointment.doctorId, appointment.date || '', appointment.time);
  markProviderAvailabilityBooked(appointment.doctorId, nextDate, nextTime);
  appointment.date = nextDate;
  appointment.time = nextTime;
  appointment.status = 'scheduled';
  await appointment.save();

  return appointment;
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
