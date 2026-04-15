import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';

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

export const getEmergencyData = async (_req: AuthRequest, res: Response) => {
  res.status(501).json({ error: 'Emergency medical access is not implemented yet' });
};

export const getPublicEmergencyData = async (_req: Request, res: Response) => {
  res.status(501).json({ error: 'Emergency medical access is not implemented yet' });
};
