const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const symptoms = 'my head feels heavy';
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
const prompt = `
  You are a medical triage nurse AI. 
  Read the following patient input: "${symptoms}"
  
  If the symptoms are too vague (e.g. just "chest pain" or "my leg hurts" or "fever"), 
  return needs_more_info: true, and provide 3 specific follow-up questions to ask the patient.
  If the symptoms are specific enough, or the patient has provided additional context/answers, 
  return needs_more_info: false, and extract an array of specific medical symptoms.
  
  Return ONLY valid JSON with no markdown formatting:
  {
    "needs_more_info": boolean,
    "follow_up_questions": ["string"],
    "extracted_symptoms": ["string"]
  }
`;

model.generateContent(prompt).then(result => {
  const text = result.response.text();
  console.log('Gemini output:', text);
}).catch(console.error);
