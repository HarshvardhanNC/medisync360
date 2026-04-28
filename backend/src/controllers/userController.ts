import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import {
  cancelProviderAppointment,
  getPatientAppointmentOptions,
  rescheduleProviderAppointment,
} from '../services/providerWorkspaceService';

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

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
      specialization: updatedUser.specialization,
      experienceYears: updatedUser.experienceYears,
      consultationFee: updatedUser.consultationFee,
      location: updatedUser.location,
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

export const getEmergencyData = async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Emergency medical access is not implemented yet' });
};

export const getPublicEmergencyData = async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Emergency medical access is not implemented yet' });
};
