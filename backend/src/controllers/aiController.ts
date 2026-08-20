import http from 'http';
import { Request, Response } from 'express';
import { predictDiseaseFromSymptoms, analyzeInsurancePolicy, TriageContext } from '../services/aiService';
import { extractTopDisease, getSpecialistForDisease } from '../utils/doctorRecommendation';
import { getProvidersForSpecialist, bookProviderSlot } from '../services/providerCatalogService';
import { rankDoctorsFromProviders, summarizeProvidersForCards } from '../utils/providerRanking';
import { AuthRequest } from '../middleware/authMiddleware';
import { normalizeSpecialist } from '../utils/specialistAliases';

export const analyzeSymptoms = async (req: Request, res: Response) => {
  try {
    const { symptoms, triageContext } = req.body as {
      symptoms?: string;
      triageContext?: TriageContext;
    };
    if (!symptoms) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    const prediction = await predictDiseaseFromSymptoms(symptoms, triageContext);
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

export const predictAndRecommendDoctors = async (req: Request, res: Response) => {
  try {
    const { symptoms, userLocation } = req.body as {
      symptoms?: string;
      userLocation?: string;
    };

    if (!symptoms || symptoms.trim().length === 0) {
      return res.status(400).json({ error: 'Symptoms are required' });
    }

    const prediction = await predictDiseaseFromSymptoms(symptoms);
    const disease = extractTopDisease(prediction);

    if (!disease) {
      return res.status(500).json({ error: 'Unable to determine top disease from prediction result' });
    }

    const specialist =
      getSpecialistForDisease(disease) ??
      (typeof prediction.recommendedSpecialist === 'string' ? prediction.recommendedSpecialist : null);

    if (!specialist) {
      return res.status(404).json({ error: `No specialist mapping found for disease: ${disease}` });
    }

    const normalizedSpecialist = normalizeSpecialist(specialist) ?? specialist;
    const providers = await getProvidersForSpecialist(normalizedSpecialist, userLocation ?? 'Mumbai');
    const rankedDoctors = rankDoctorsFromProviders(providers, normalizedSpecialist, userLocation);

    if (rankedDoctors.length === 0) {
      return res.status(404).json({ error: `No doctors found for specialist: ${specialist}` });
    }

    return res.status(200).json({
      disease,
      specialist: normalizedSpecialist,
      doctors: rankedDoctors,
    });
  } catch (error: any) {
    console.error('Controller Error (Doctor Recommendation):', error);
    return res.status(500).json({
      error: error.message || 'Server error processing doctor recommendations.',
    });
  }
};

export const compareHospitals = async (req: Request, res: Response) => {
  try {
    const { specialist, location } = req.body;

    if (!specialist || !location) {
      return res.status(400).json({ error: 'Specialist and location are required' });
    }

    const normalizedSpecialist = normalizeSpecialist(specialist) ?? specialist;
    const providers = await getProvidersForSpecialist(normalizedSpecialist, location);
    const hospitals = summarizeProvidersForCards(providers);
    res.json({ hospitals });
  } catch (error: any) {
    console.error("Controller Error (Hospitals):", error);
    res.status(500).json({ error: error.message || 'Server error locating hospitals.' });
  }
};

export const bookGeneratedProviderSlot = async (req: AuthRequest, res: Response) => {
  try {
    const { providerId, doctorId, date, time, specialist, location, reason } = req.body as {
      providerId?: string;
      doctorId?: string;
      date?: string;
      time?: string;
      specialist?: string;
      location?: string;
      reason?: string;
    };

    if (!providerId || !doctorId || !date || !time || !specialist || !location) {
      return res.status(400).json({
        error: 'providerId, doctorId, date, time, specialist, and location are required',
      });
    }

    const booking = await bookProviderSlot({
      providerId,
      doctorId,
      date,
      time,
      specialist,
      location,
      patientId: req.user?._id ? String(req.user._id) : undefined,
      patientName: req.user?.name ?? 'Patient',
      reason: reason ?? 'Consultation',
    });

    return res.status(200).json({
      message: 'Appointment slot booked successfully',
      booking,
    });
  } catch (error: any) {
    console.error('Controller Error (Generated Booking):', error);
    return res.status(400).json({
      error: error.message || 'Failed to book appointment slot',
    });
  }
};

const postToFlask = (path: string, payload: any): Promise<any> => {
  return new Promise((resolve, reject) => {
    const dataString = JSON.stringify(payload);
    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: 5001,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString),
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(parsed.error || `Flask Error ${res.statusCode}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from Flask AI server'));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(dataString);
    req.end();
  });
};

export const predictClaimProxy = async (req: Request, res: Response, next: any) => {
  try {
    const data = await postToFlask('/predict-claim', req.body);
    return res.json(data);
  } catch (error: any) {
    console.error('Insurance Proxy Error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Could not connect to Insurance AI service on port 5001.' });
  }
};

export const compareClaimProxy = async (req: Request, res: Response, next: any) => {
  try {
    const data = await postToFlask('/compare-claim', req.body);
    return res.json(data);
  } catch (error: any) {
    console.error('Insurance Compare Proxy Error:', error?.message || error);
    return res.status(500).json({ error: error?.message || 'Could not connect to Insurance AI service on port 5001.' });
  }
};
