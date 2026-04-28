import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';
import {
  addProviderAvailabilitySlot,
  createReportAccessRequest,
  getProviderAppointments,
  getProviderAvailability,
  getReportAccessRequests,
  removeProviderAvailabilitySlot,
} from '../services/providerWorkspaceService';

export const getProviderWorkspace = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = String(req.user?._id);
    const doctor = await User.findById(doctorId).select('-password');

    if (!doctor || doctor.role !== 'doctor') {
      res.status(403).json({ error: 'Doctor access required' });
      return;
    }

    res.json({
      profile: doctor,
      availability: getProviderAvailability(doctorId),
      appointments: await getProviderAppointments(doctorId),
      reportAccessRequests: getReportAccessRequests(doctorId),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load provider workspace' });
  }
};

export const addAvailabilitySlot = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = String(req.user?._id);
    const { date, time } = req.body as { date?: string; time?: string };

    if (!date || !time) {
      res.status(400).json({ error: 'date and time are required' });
      return;
    }

    const slot = addProviderAvailabilitySlot(doctorId, date, time);
    res.status(201).json({ slot });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to add availability slot' });
  }
};

export const removeAvailabilitySlot = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = String(req.user?._id);
    const slotId = String(req.params.slotId);

    removeProviderAvailabilitySlot(doctorId, slotId);
    res.json({ message: 'Availability slot removed successfully' });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to remove availability slot' });
  }
};

export const requestReportAccess = async (req: AuthRequest, res: Response) => {
  try {
    const doctorId = String(req.user?._id);
    const { patientIdentifier, note } = req.body as {
      patientIdentifier?: string;
      note?: string;
    };

    if (!patientIdentifier) {
      res.status(400).json({ error: 'patientIdentifier is required' });
      return;
    }

    const request = createReportAccessRequest(doctorId, patientIdentifier, note ?? '');
    res.status(201).json({ request });
  } catch (error: any) {
    res.status(400).json({ error: error.message || 'Failed to create report access request' });
  }
};
