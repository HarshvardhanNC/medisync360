import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with an API key from environment
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fake-key-for-now');

export const predictDiseaseFromSymptoms = async (symptoms: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an expert medical AI assistant.
      The user describes the following symptoms: "${symptoms}"
      Based on these symptoms, predict the most likely disease or medical condition.
      Also suggest the appropriate medical specialist the user should consult.
      Return the output strictly in the following JSON format without formatting blocks:
      {
        "predictedCondition": "Condition Name",
        "recommendedSpecialist": "Specialist Name",
        "urgencyLevel": "Low/Medium/High",
        "description": "Short description of condition"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up potentially wrapped markdown from output
    const cleanJsonString = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJsonString);
  } catch (error: any) {
    console.error("AI Prediction Error:", error);
    throw new Error(error.message || "Failed to process prediction via AI");
  }
};

export const analyzeInsurancePolicy = async (policyText: string, costQuotation: number) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an expert health insurance claims analyst.
      Analyze the following insurance policy excerpts:
      "${policyText}"
      
      The hospital has quoted a treatment cost of: $${costQuotation}.
      
      Calculate or estimate:
      1. Estimated approved amount.
      2. Expenses not covered.
      3. Possible reasons for claim rejection based on exclusions.
      
      Return the output strictly in the following JSON format without formatting blocks:
      {
        "estimatedCoveredAmount": 0,
        "estimatedOutOfPocket": 0,
        "notCoveredReasons": ["reason 1"],
        "rejectionRisks": ["risk 1"]
      }
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanJsonString = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJsonString);
  } catch (error: any) {
    console.error("AI Insurance Analysis Error:", error);
    throw new Error(error.message || "Failed to process insurance policy via AI");
  }
};

export const findRealHospitals = async (specialist: string, location: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `
      You are an expert healthcare navigation assistant.
      Provide a list of 6 real-world, prominent hospitals located in or near "${location}" that have excellent departments for "${specialist}".
      Estimate their general treatment cost range (e.g. "$500 - $2000" or "$$$"), average hospital rating out of 5.0, average doctor experience in years, and common insurances they might accept.
      Return the output strictly in the following JSON format as an array of objects without formatting blocks:
      [
        {
          "name": "Actual Hospital Name",
          "location": "City, State",
          "treatmentCostRange": "Estimated Cost",
          "rating": 4.5,
          "doctorExperienceAvgYears": 15,
          "insuranceCompatibility": ["Insurance A", "Insurance B"],
          "specialties": ["Specialty 1", "Specialty 2"]
        }
      ]
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    const cleanJsonString = text.replace(/```json/g, '').replace(/```/g, '');
    return JSON.parse(cleanJsonString);
  } catch (error: any) {
    console.error("AI Hospital Search Error:", error);
    throw new Error(error.message || "Failed to search hospitals via AI");
  }
};
