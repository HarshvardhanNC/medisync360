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

    const updatedUser = await user.save();
    res.json({
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isApproved: updatedUser.isApproved,
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
