import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function test() {
  try {
    console.log('Testing Gemini API with key:', process.env.GEMINI_API_KEY?.substring(0, 10) + '...');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
      You are an expert medical AI assistant.
      The user describes the following symptoms: "I have a fever"
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

    console.log('Sending request to Gemini...');
    const result = await model.generateContent(prompt);
    console.log('Got result, generating response...');
    const response = await result.response;
    const text = response.text();
    console.log('Raw Text Output:', text);
    
    // Clean up potentially wrapped markdown from output
    const cleanJsonString = text.replace(/```json/g, '').replace(/```/g, '');
    console.log('Cleaned String:', cleanJsonString);
    const parsed = JSON.parse(cleanJsonString);
    console.log('Parsed JSON:', parsed);
  } catch (error) {
    console.error("AI Prediction Error Catch block:");
    console.error(error);
  }
}

test();
