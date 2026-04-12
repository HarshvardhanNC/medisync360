import { Request, Response } from 'express';
import { predictDiseaseFromSymptoms, analyzeInsurancePolicy, findRealHospitals } from '../services/aiService';

export const analyzeSymptoms = async (req: Request, res: Response) => {
  try {
    const { symptoms } = req.body;
    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    const prediction = await predictDiseaseFromSymptoms(symptoms);
    res.json(prediction);
  } catch (error: any) {
    console.error("Controller Error (Symptoms):", error);
    res.status(500).json({ error: error.message && error.message.includes('Quota') ? 'AI Quota Exceeded: Please wait a moment before trying again.' : 'Server error processing symptoms. The AI might be temporarily unavailable.' });
  }
};

export const analyzeInsurance = async (req: Request, res: Response) => {
  try {
    const { policyText, costQuotation } = req.body;

    if (!policyText || costQuotation === undefined) {
      return res.status(400).json({ error: 'Policy text and cost quotation are required' });
    }

    const analysis = await analyzeInsurancePolicy(policyText, Number(costQuotation));
    res.json(analysis);
  } catch (error: any) {
    console.error("Controller Error (Insurance):", error);
    res.status(500).json({ error: error.message && error.message.includes('Quota') ? 'AI Quota Exceeded: Please wait a moment before trying again.' : 'Server error processing insurance policy.' });
  }
};

export const compareHospitals = async (req: Request, res: Response) => {
  try {
    const { specialist, location } = req.body;

    if (!specialist || !location) {
      return res.status(400).json({ error: 'Specialist and location are required' });
    }

    const hospitals = await findRealHospitals(specialist, location);
    res.json({ hospitals });
  } catch (error: any) {
    console.error("Controller Error (Hospitals):", error);
    res.status(500).json({ error: error.message && error.message.includes('Quota') ? 'AI Quota Exceeded: Please wait a moment before trying again.' : 'Server error locating hospitals.' });
  }
};
