import { MLModelService } from './mlModelService';
import fs from 'fs';
import path from 'path';

// Initialize ML Model Service (NO GEMINI AI)
const mlService = new MLModelService();

export const predictDiseaseFromSymptoms = async (symptoms: string) => {
  try {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new Error("Please provide at least one symptom");
    }
    
    console.log(`Using trained ML model for symptoms: ${symptoms}`);
    
    // Use trained ML model for prediction
    const result = await mlService.predictDisease(symptoms);
    
    console.log(`ML Model prediction: ${result.predictedCondition} (${result.confidence}% confidence)`);
    
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
      totalDiseasesAnalyzed: 41 // From Kaggle dataset
    };
  } catch (error: any) {
    console.error("ML Model Prediction Error:", error);
    throw new Error(error.message || "Failed to process symptom analysis with ML model");
  }
};

// Keep insurance analysis simple without AI
export const analyzeInsurancePolicy = async (policyText: string, costQuotation: number) => {
  try {
    // Simple rule-based insurance analysis
    const coveragePercentage = 0.8; // Assume 80% coverage
    const estimatedCovered = Math.round(costQuotation * coveragePercentage);
    const estimatedOutOfPocket = costQuotation - estimatedCovered;
    
    return {
      estimatedCoveredAmount: estimatedCovered,
      estimatedOutOfPocket: estimatedOutOfPocket,
      notCoveredReasons: [
        "Pre-existing conditions may not be covered",
        "Cosmetic procedures typically excluded",
        "Experimental treatments may not be covered"
      ],
      rejectionRisks: [
        "Incomplete documentation",
        "Treatment not medically necessary",
        "Provider not in network"
      ],
      analysisMethod: "Rule-based estimation"
    };
  } catch (error: any) {
    console.error("Insurance Analysis Error:", error);
    throw new Error(error.message || "Failed to process insurance policy analysis");
  }
};

export const findRealHospitals = async (specialist: string, location: string) => {
  try {
    // Load hospital database
    const hospitalDbPath = path.join(__dirname, '../data/hospital-database.json');
    const hospitalData = JSON.parse(fs.readFileSync(hospitalDbPath, 'utf8'));
    
    // Filter hospitals by specialty
    const matchingHospitals = hospitalData.hospitals.filter((hospital: any) => {
      return hospital.specialties.some((specialty: string) => 
        specialty.toLowerCase().includes(specialist.toLowerCase()) ||
        specialist.toLowerCase().includes(specialty.toLowerCase())
      );
    });
    
    // If no specialty match, return top-rated general hospitals
    const hospitalsToReturn = matchingHospitals.length > 0 ? matchingHospitals : hospitalData.hospitals;
    
    // Sort by rating and return top 6
    const topHospitals = hospitalsToReturn
      .sort((a: any, b: any) => b.rating - a.rating)
      .slice(0, 6)
      .map((hospital: any) => ({
        name: hospital.name,
        location: hospital.location,
        treatmentCostRange: hospital.treatmentCostRange,
        rating: hospital.rating,
        doctorExperienceAvgYears: hospital.doctorExperienceAvg,
        insuranceCompatibility: hospital.insuranceCompatibility,
        specialties: hospital.specialties,
        emergencyServices: hospital.emergencyServices
      }));
    
    return topHospitals;
  } catch (error: any) {
    console.error("Hospital Search Error:", error);
    throw new Error(error.message || "Failed to search hospitals");
  }
};

// ML Model health check
export const getMLModelStatus = async () => {
  try {
    const modelInfo = await mlService.getModelInfo();
    return {
      status: 'ML Model Active',
      ...modelInfo,
      aiProvider: 'None - Using Trained ML Model',
      geminiStatus: 'Disabled - Not using external AI'
    };
  } catch (error: any) {
    console.error("ML Model Status Error:", error);
    throw new Error("ML Model is not available");
  }
};