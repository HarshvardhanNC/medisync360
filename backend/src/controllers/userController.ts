import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import User from '../models/User';

// Get current user profile
// GET /api/users/profile
export const getUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving profile' });
  }
};

// Update user profile (including Emergency Data)
// PUT /api/users/profile
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.name = req.body.name || user.name;
      user.bloodGroup = req.body.bloodGroup || user.bloodGroup;
      user.allergies = req.body.allergies || user.allergies;
      user.chronicDiseases = req.body.chronicDiseases || user.chronicDiseases;
      user.currentMedications = req.body.currentMedications || user.currentMedications;
      user.emergencyContact = req.body.emergencyContact || user.emergencyContact;

      if (req.body.password) {
        // We wouldn't update password hash directly like this without pre-save hook,
        // but for MVP it's simplified or ignored here to avoid complexity.
        // Left unimplemented here for safety.
      }

      const updatedUser = await user.save();
      
      res.json(updatedUser);
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error updating profile' });
  }
};

// Get emergency data for a specific patient by ID (Used by Doctors)
// GET /api/users/emergency/:id
export const getEmergencyData = async (req: AuthRequest, res: Response) => {
  try {
    const patient = await User.findById(req.params.id).select('name bloodGroup allergies chronicDiseases currentMedications emergencyContact');
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving emergency data' });
  }
};

// Get public emergency data by patient ID — NO authentication required
// Used by first responders who scan the patient's SOS QR code
// GET /api/users/emergency-public/:id
export const getPublicEmergencyData = async (req: Request, res: Response) => {
  try {
    const patient = await User.findById(req.params.id).select(
      'name bloodGroup allergies chronicDiseases currentMedications emergencyContact -_id'
    );
    if (patient) {
      res.json(patient);
    } else {
      res.status(404).json({ error: 'Patient not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Server error retrieving emergency data' });
  }
};
