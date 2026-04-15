import { GoogleGenerativeAI } from '@google/generative-ai';
import User from '../models/User';
import { MLModelService } from './mlModelService';

const mlService = new MLModelService();

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
  try {
    const doctors = await User.find({
      role: 'doctor',
      isApproved: true,
    })
      .select('name email')
      .limit(6);

    return doctors.map((doctor) => ({
      id: doctor._id,
      name: doctor.name,
      email: doctor.email,
      requestedSpecialist: specialist,
      location,
    }));
  } catch (error: any) {
    console.error('Doctor Search Error:', error);
    throw new Error(error.message || 'Failed to search doctors');
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
