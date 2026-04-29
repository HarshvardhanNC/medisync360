import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import {
  cancelProviderAppointment,
  getPatientAppointmentOptions,
  rescheduleProviderAppointment,
} from '../services/providerWorkspaceService';

const parseCsvList = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const buildEmergencyPayload = (user: any) => ({
  id: String(user._id),
  name: user.name,
  phoneNumber: user.phoneNumber ?? '',
  bloodGroup: user.bloodGroup ?? '',
  allergies: Array.isArray(user.allergies) ? user.allergies : [],
  chronicDiseases: Array.isArray(user.chronicDiseases) ? user.chronicDiseases : [],
  currentMedications: Array.isArray(user.currentMedications) ? user.currentMedications : [],
  emergencyContactName: user.emergencyContactName ?? '',
  emergencyContactPhone: user.emergencyContactPhone ?? '',
  insuranceProvider: user.insuranceProvider ?? '',
  insurancePolicyNumber: user.insurancePolicyNumber ?? '',
  emergencyConsent: Boolean(user.emergencyConsent),
});

export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id).select('-password');

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
};

export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?._id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (req.body.name) {
      user.name = req.body.name;
    }

    if (req.body.email) {
      user.email = req.body.email;
    }

    if (req.body.password) {
      user.password = req.body.password;
    }

    if (req.body.specialization) {
      user.specialization = req.body.specialization;
    }

    if (req.body.experienceYears !== undefined) {
      user.experienceYears = req.body.experienceYears;
    }

    if (req.body.consultationFee !== undefined) {
      user.consultationFee = req.body.consultationFee;
    }

    if (req.body.location) {
      user.location = req.body.location;
    }

    if (req.body.phoneNumber !== undefined) {
      user.phoneNumber = req.body.phoneNumber || undefined;
    }

    if (req.body.bloodGroup !== undefined) {
      user.bloodGroup = req.body.bloodGroup || undefined;
    }

    if (req.body.allergies !== undefined) {
      user.allergies = parseCsvList(req.body.allergies);
    }

    if (req.body.chronicDiseases !== undefined) {
      user.chronicDiseases = parseCsvList(req.body.chronicDiseases);
    }

    if (req.body.currentMedications !== undefined) {
      user.currentMedications = parseCsvList(req.body.currentMedications);
    }

    if (req.body.emergencyContactName !== undefined) {
      user.emergencyContactName = req.body.emergencyContactName || undefined;
    }

    if (req.body.emergencyContactPhone !== undefined) {
      user.emergencyContactPhone = req.body.emergencyContactPhone || undefined;
    }

    if (req.body.insuranceProvider !== undefined) {
      user.insuranceProvider = req.body.insuranceProvider || undefined;
    }

    if (req.body.insurancePolicyNumber !== undefined) {
      user.insurancePolicyNumber = req.body.insurancePolicyNumber || undefined;
    }

    if (req.body.emergencyConsent !== undefined) {
      user.emergencyConsent = Boolean(req.body.emergencyConsent);
    }

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
      phoneNumber: updatedUser.phoneNumber,
      specialization: updatedUser.specialization,
      experienceYears: updatedUser.experienceYears,
      consultationFee: updatedUser.consultationFee,
      location: updatedUser.location,
      bloodGroup: updatedUser.bloodGroup,
      allergies: updatedUser.allergies,
      chronicDiseases: updatedUser.chronicDiseases,
      currentMedications: updatedUser.currentMedications,
      emergencyContactName: updatedUser.emergencyContactName,
      emergencyContactPhone: updatedUser.emergencyContactPhone,
      insuranceProvider: updatedUser.insuranceProvider,
      insurancePolicyNumber: updatedUser.insurancePolicyNumber,
      emergencyConsent: updatedUser.emergencyConsent,
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

export const getMyAppointments = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = String(req.user?._id);
    const { appointments, availabilityByDoctorId } = await getPatientAppointmentOptions(patientId);

    const doctorIds = Array.from(new Set(appointments.map((appointment) => appointment.doctorId).filter(Boolean)));
    const doctors = await User.find({ _id: { $in: doctorIds } }).select('name email specialization').lean();
    const doctorMap = new Map(doctors.map((doctor) => [String(doctor._id), doctor]));

    res.json({
      appointments: appointments.map((appointment) => {
        const doctor = doctorMap.get(appointment.doctorId);

        return {
          id: String(appointment._id),
          providerName: appointment.providerName,
          doctorName: doctor?.name || 'Assigned Provider',
          doctorEmail: doctor?.email || '',
          specialization: doctor?.specialization?.[0] || '',
          date: appointment.date || '',
          time: appointment.time,
          reason: appointment.reason,
          status: appointment.status,
          availableSlots: (availabilityByDoctorId.get(appointment.doctorId) ?? []).map((slot) => ({
            id: slot.id,
            date: slot.date,
            time: slot.time,
            isBooked: slot.isBooked,
          })),
        };
      }),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving appointments' });
  }
};

export const cancelMyAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = String(req.user?._id);
    const id = String(req.params.id);
    const appointment = await cancelProviderAppointment(id, patientId);

    res.json({
      message: 'Appointment cancelled successfully',
      appointment: {
        id: String(appointment._id),
        date: appointment.date || '',
        time: appointment.time,
        status: appointment.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to cancel appointment' });
  }
};

export const rescheduleMyAppointment = async (req: AuthRequest, res: Response) => {
  try {
    const patientId = String(req.user?._id);
    const id = String(req.params.id);
    const { date, time } = req.body as { date?: string; time?: string };

    if (!date || !time) {
      res.status(400).json({ error: 'date and time are required' });
      return;
    }

    const appointment = await rescheduleProviderAppointment(id, patientId, date, time);

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment: {
        id: String(appointment._id),
        date: appointment.date || '',
        time: appointment.time,
        status: appointment.status,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to reschedule appointment' });
  }
};

export const getEmergencyData = async (req: AuthRequest, res: Response) => {
  try {
    const id = String(req.params.id);
    const requester = req.user;

    if (!requester || requester.role !== 'doctor') {
      res.status(403).json({ error: 'Doctor access required' });
      return;
    }

    if (!requester.isApproved) {
      res.status(403).json({ error: 'Only verified doctors can access emergency data' });
      return;
    }

    const user = await User.findById(id).select(
      'name phoneNumber bloodGroup allergies chronicDiseases currentMedications emergencyContactName emergencyContactPhone insuranceProvider insurancePolicyNumber emergencyConsent',
    );

    if (!user || user.role !== 'patient' || !user.emergencyConsent) {
      res.status(404).json({ error: 'Emergency record not found or not shared publicly' });
      return;
    }

    res.json(buildEmergencyPayload(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving emergency data' });
  }
};

export const getPublicEmergencyData = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const user = await User.findById(id).select(
      'name phoneNumber bloodGroup allergies chronicDiseases currentMedications emergencyContactName emergencyContactPhone insuranceProvider insurancePolicyNumber emergencyConsent',
    );

    if (!user || user.role !== 'patient' || !user.emergencyConsent) {
      res.status(404).json({ error: 'Emergency record not found or not shared publicly' });
      return;
    }

    res.json(buildEmergencyPayload(user));
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving public emergency data' });
  }
};

export const searchEmergencyPatients = async (req: AuthRequest, res: Response) => {
  try {
    const requester = req.user;
    if (!requester || requester.role !== 'doctor') {
      res.status(403).json({ error: 'Doctor access required' });
      return;
    }

    if (!requester.isApproved) {
      res.status(403).json({ error: 'Only verified doctors can search emergency records' });
      return;
    }

    const query = String(req.query.q || '').trim();
    if (!query) {
      res.json({ results: [] });
      return;
    }

    const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const users = await User.find({
      role: 'patient',
      emergencyConsent: true,
      $or: [{ name: regex }, { email: regex }, { phoneNumber: regex }],
    })
      .select(
        'name email phoneNumber bloodGroup allergies chronicDiseases currentMedications emergencyContactName emergencyContactPhone insuranceProvider insurancePolicyNumber emergencyConsent',
      )
      .limit(15)
      .lean();

    res.json({
      results: users.map((user) => ({
        ...buildEmergencyPayload(user),
        email: user.email,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error searching emergency records' });
  }
};
