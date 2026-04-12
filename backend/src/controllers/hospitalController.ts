import { Request, Response } from 'express';
import Hospital from '../models/Hospital';

// Create a new Hospital record
export const createHospital = async (req: Request, res: Response) => {
  try {
    const hospital = await Hospital.create(req.body);
    res.status(201).json(hospital);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create hospital record' });
  }
};

// Get all Hospitals (could use query parameters to filter for comparison)
export const getHospitals = async (req: Request, res: Response) => {
  try {
    // Optional filter by specialty or location
    const filter: any = {};
    if (req.query.specialty) filter.specialties = { $in: [req.query.specialty] };
    if (req.query.location) filter.location = new RegExp(req.query.location as string, 'i');

    const hospitals = await Hospital.find(filter).sort({ rating: -1 });
    res.status(200).json(hospitals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve hospitals' });
  }
};
