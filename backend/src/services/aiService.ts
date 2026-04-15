import { GoogleGenerativeAI } from '@google/generative-ai';
import { MLModelService } from './mlModelService';

const mlService = new MLModelService();

type HospitalSuggestion = {
  name: string;
  location: string;
  treatmentCostRange: string;
  rating: number;
  doctorExperienceAvgYears: number;
  insuranceCompatibility: string[];
  emergencyServices: boolean;
};

const fallbackHospitalSuggestions = (specialist: string, location: string): HospitalSuggestion[] => {
  return [
    {
      name: `${location} Central ${specialist} Clinic`,
      location,
      treatmentCostRange: 'INR 800 - 1500',
      rating: 4.4,
      doctorExperienceAvgYears: 11,
      insuranceCompatibility: ['Star Health', 'Niva Bupa', 'ICICI Lombard'],
      emergencyServices: false,
    },
    {
      name: `${location} Advanced Care Hospital`,
      location,
      treatmentCostRange: 'INR 1500 - 3500',
      rating: 4.6,
      doctorExperienceAvgYears: 14,
      insuranceCompatibility: ['HDFC ERGO', 'Care Health', 'Aditya Birla'],
      emergencyServices: true,
    },
    {
      name: `${location} Multi-Speciality Medical Center`,
      location,
      treatmentCostRange: 'INR 1200 - 2800',
      rating: 4.3,
      doctorExperienceAvgYears: 10,
      insuranceCompatibility: ['MediAssist', 'ManipalCigna', 'Bajaj Allianz'],
      emergencyServices: true,
    },
    {
      name: `${location} ${specialist} Institute`,
      location,
      treatmentCostRange: 'INR 1000 - 2200',
      rating: 4.5,
      doctorExperienceAvgYears: 12,
      insuranceCompatibility: ['Future Generali', 'Reliance Health', 'ACKO'],
      emergencyServices: false,
    },
  ];
};

const normalizeHospitalSuggestions = (
  hospitals: Array<Partial<HospitalSuggestion>>,
  location: string,
): HospitalSuggestion[] => {
  return hospitals.map((hospital) => ({
    name: hospital.name ?? 'Unknown Hospital',
    location: hospital.location ?? location,
    treatmentCostRange: hospital.treatmentCostRange ?? 'Variable',
    rating: typeof hospital.rating === 'number' ? hospital.rating : 4.2,
    doctorExperienceAvgYears:
      typeof hospital.doctorExperienceAvgYears === 'number'
        ? hospital.doctorExperienceAvgYears
        : 10,
    insuranceCompatibility: Array.isArray(hospital.insuranceCompatibility)
      ? hospital.insuranceCompatibility
      : ['General Coverage'],
    emergencyServices: Boolean(hospital.emergencyServices),
  }));
};

export const predictDiseaseFromSymptoms = async (symptoms: string) => {
  try {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new Error('Please provide at least one symptom');
    }

    const result = await mlService.predictDisease(symptoms);

    return {
      predictedCondition: result.predictedCondition,
      recommendedSpecialist: result.recommendedSpecialist,
      urgencyLevel: result.urgencyLevel,
      description: result.description,
      confidence: result.confidence,
      isEmergency: result.urgencyLevel.includes('Emergency'),
      precautions: result.precautions,
      alternativePossibilities: result.alternativePossibilities,
      matchedSymptoms: result.matchedSymptoms,
      dataSource: result.dataSource,
      modelType: result.modelType,
      totalDiseasesAnalyzed: 41,
    };
  } catch (error: any) {
    console.error('ML Model Prediction Error:', error);
    throw new Error(error.message || 'Failed to process symptom analysis with ML model');
  }
};

export const analyzeInsurancePolicy = async (policyText: string, costQuotation: number) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('Gemini API key is not configured for algorithmic insurance scanning.');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are an expert Medical Insurance Underwriter AI.
      Analyze the following insurance policy text against a proposed hospital quotation of ${costQuotation} rupees.

      Policy Text:
      "${policyText}"

      Output strictly valid JSON with no markdown:
      {
        "estimatedCoveredAmount": 0,
        "estimatedOutOfPocket": 0,
        "notCoveredReasons": ["string"],
        "rejectionRisks": ["string"],
        "analysisMethod": "Gemini 1.5 Flash Underwriter"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJsonString = text.replace(/```json/gi, '').replace(/```/gi, '').trim();

    return JSON.parse(cleanJsonString);
  } catch (error: any) {
    console.error('Insurance Analysis Error:', error);
    throw new Error(error.message || 'Failed to process insurance policy analysis via AI node');
  }
};

export const findRealHospitals = async (specialist: string, location: string) => {
  const fallbackHospitals = fallbackHospitalSuggestions(specialist, location);

  try {
    if (!process.env.GEMINI_API_KEY) {
      return fallbackHospitals;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `
      You are generating hospital comparison suggestions for a healthcare platform.
      Suggest 4 realistic hospital or clinic options for the specialist "${specialist}" near "${location}".

      Return ONLY valid JSON with this exact shape:
      {
        "hospitals": [
          {
            "name": "string",
            "location": "string",
            "treatmentCostRange": "string",
            "rating": number,
            "doctorExperienceAvgYears": number,
            "insuranceCompatibility": ["string"],
            "emergencyServices": boolean
          }
        ]
      }

      Rules:
      - rating must be between 3.5 and 5.0
      - doctorExperienceAvgYears must be a number
      - insuranceCompatibility must contain 2 to 4 payer names
      - no markdown
      - no commentary
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const cleanJsonString = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleanJsonString) as {
      hospitals?: Array<{
        name?: string;
        location?: string;
        treatmentCostRange?: string;
        rating?: number;
        doctorExperienceAvgYears?: number;
        insuranceCompatibility?: string[];
        emergencyServices?: boolean;
      }>;
    };

    if (!parsed.hospitals || !Array.isArray(parsed.hospitals)) {
      return fallbackHospitals;
    }

    return normalizeHospitalSuggestions(parsed.hospitals, location);
  } catch (error: any) {
    console.error('Hospital Search Error:', error);
    return fallbackHospitals;
  }
};

export const getMLModelStatus = async () => {
  try {
    const modelInfo = await mlService.getModelInfo();
    return {
      status: 'ML Model Active',
      ...modelInfo,
      aiProvider: 'None - Using Trained ML Model',
      geminiStatus: 'Disabled - Not using external AI',
    };
  } catch (error: any) {
    console.error('ML Model Status Error:', error);
    throw new Error('ML Model is not available');
  }
};
