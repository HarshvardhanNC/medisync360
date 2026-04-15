import { Request, Response } from 'express';
import User from '../models/User';

export const getProviders = async (_req: Request, res: Response) => {
  try {
    const doctors = await User.find({ role: 'doctor' }).select('-password');
    res.json(doctors);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching doctors' });
  }
};

export const toggleProviderVerification = async (req: Request, res: Response) => {
  try {
    const doctor = await User.findById(req.params.id);

    if (!doctor) {
      res.status(404).json({ error: 'Doctor not found' });
      return;
    }

    if (doctor.role !== 'doctor') {
      res.status(400).json({ error: 'User is not a doctor' });
      return;
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    res.json({
      message: `Doctor approval status updated to ${doctor.isApproved}`,
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        isApproved: doctor.isApproved,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error updating doctor approval' });
  }
};
