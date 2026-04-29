import { GoogleGenerativeAI } from '@google/generative-ai';
import { MLModelService } from './mlModelService';

const mlService = new MLModelService();
const MAX_TRIAGE_ROUNDS = 3;

export type TriageRound = {
  stage: number;
  questions: string[];
  answers: string[];
};

export type TriageContext = {
  rounds: TriageRound[];
};

const BROAD_TRIAGE_FALLBACKS: Record<string, string[]> = {
  'chest pain': [
    'How would you describe the pain: sharp, pressure-like, squeezing, or burning?',
    'Does the pain radiate to your arm, jaw, neck, or back?',
    'Are you having shortness of breath, nausea, sweating, or dizziness?',
  ],
  fever: [
    'How high is the fever, and how long have you had it?',
    'Are you also having chills, cough, vomiting, rash, or body aches?',
    'Have you recently been around anyone sick or traveled anywhere recently?',
  ],
  headache: [
    'Is the headache sudden and severe, or gradual and mild?',
    'Do you also have nausea, vomiting, light sensitivity, or blurred vision?',
    'Do you have fever, neck stiffness, weakness, or trouble speaking?',
  ],
  'my leg hurts': [
    'Where exactly is the pain: calf, thigh, knee, ankle, or the whole leg?',
    'Did it start after an injury, strain, long travel, or while at rest?',
    'Do you have swelling, redness, warmth, numbness, or difficulty walking?',
  ],
};

const SECONDARY_TRIAGE_FALLBACKS: Record<string, string[]> = {
  'chest pain': [
    'Did the pain start suddenly, and has it lasted more than a few minutes or come back repeatedly?',
    'Did it begin during exertion, stress, or while at rest?',
    'Is the pain severe or pressure-like enough that you feel you may need urgent medical help right now?',
  ],
  fever: [
    'When did the fever begin, and is it constant or intermittent?',
    'Have you measured your temperature, and if so what was the highest reading?',
    'Are you able to drink fluids and stay active, or are you feeling weak and dehydrated?',
  ],
  headache: [
    'Where exactly is the headache located, and is it one-sided or all over the head?',
    'How severe is it from 1 to 10, and is it getting worse?',
    'Did it start suddenly, or did it build up gradually over time?',
  ],
  'my leg hurts': [
    'Is the pain mainly in the muscle, joint, calf, or bone area?',
    'Is the pain worse when walking, standing, or touching the area?',
    'Did the problem begin suddenly or gradually over time?',
  ],
};

const AFFIRMATIVE_TRIAGE_FALLBACKS: Record<string, string[]> = {
  'chest pain': [
    'When did the chest pain start, and is it constant or does it come and go?',
    'What were you doing when it started, such as resting, walking, climbing stairs, eating, or feeling stressed?',
    'On a scale from 1 to 10, how severe is it, and is it getting worse, better, or staying the same?',
  ],
  fever: SECONDARY_TRIAGE_FALLBACKS.fever,
  headache: SECONDARY_TRIAGE_FALLBACKS.headache,
  'my leg hurts': SECONDARY_TRIAGE_FALLBACKS['my leg hurts'],
};

const TERTIARY_TRIAGE_FALLBACKS: Record<string, string[]> = {
  'chest pain': [
    'Is the pain worse after eating, lying down, moving, touching the chest, or taking a deep breath?',
    'Do you have heartburn, acid taste in the mouth, recent cough, or soreness when pressing on the chest?',
    'Have you had similar episodes before, and did they improve with rest, antacids, or pain relief?',
  ],
  fever: [
    'Do you have throat pain, burning urine, stomach upset, or any local source of infection?',
    'Have you taken any medicine for the fever, and did it help?',
    'Are you sleeping normally, eating normally, and passing urine normally?',
  ],
  headache: [
    'Is the headache worse with light, noise, bending, coughing, or screen time?',
    'Do you have sinus pressure, dehydration, stress, or poor sleep?',
    'Have you had similar headaches before, and what usually helps?',
  ],
  'my leg hurts': [
    'Is the pain worse with movement, standing, or at night while resting?',
    'Is the area tender to touch, cramping, or stiff?',
    'Have you had similar leg pain before, and what made it better or worse?',
  ],
};

const BROAD_SYMPTOM_PATTERNS: Array<{ pattern: RegExp; key: string }> = [
  { pattern: /^\s*chest pain[.!?\s]*$/i, key: 'chest pain' },
  { pattern: /^\s*fever[.!?\s]*$/i, key: 'fever' },
  { pattern: /^\s*headache[.!?\s]*$/i, key: 'headache' },
  { pattern: /^\s*(my\s+)?leg hurts[.!?\s]*$/i, key: 'my leg hurts' },
];

const getBroadSymptomKey = (symptoms: string): string | null => {
  for (const entry of BROAD_SYMPTOM_PATTERNS) {
    if (entry.pattern.test(symptoms)) {
      return entry.key;
    }
  }

  return null;
};

const getBaseSymptomsText = (symptoms: string): string => {
  const splitIndex = symptoms.search(/follow-up response\s+\d+:\s+answer=/i);
  if (splitIndex === -1) {
    return symptoms.trim();
  }

  return symptoms.slice(0, splitIndex).trim().replace(/[.\s]+$/, '');
};

const parseFollowUpAnswerCounts = (text: string) => {
  const matches = [...text.matchAll(/follow-up response\s+\d+:\s+answer=(yes|no|not sure);/gi)];
  let yes = 0;
  let no = 0;
  let notSure = 0;

  for (const match of matches) {
    const answer = match[1].toLowerCase();
    if (answer === 'yes') {
      yes += 1;
    } else if (answer === 'no') {
      no += 1;
    } else if (answer === 'not sure') {
      notSure += 1;
    }
  }

  return { yes, no, notSure, total: matches.length };
};

const buildNeedsMoreInfoResponse = (symptoms: string, questions: string[], triageStage = 1) => ({
  predictedCondition: 'Needs More Information',
  recommendedSpecialist: 'General Practitioner',
  urgencyLevel: 'Triage - Please answer follow-up questions',
  description: 'The provided symptoms are too broad. Please answer the following questions to help us narrow down the diagnosis.',
  confidence: 0,
  isEmergency: false,
  matchedSymptoms: [symptoms],
  alternativePossibilities: [],
  precautions: ['Monitor your symptoms closely'],
  dataSource: 'Gemini Dynamic Triage',
  modelType: 'LLM Conversational Flow',
  needs_more_info: true,
  follow_up_questions: questions,
  triage_stage: triageStage,
  totalDiseasesAnalyzed: 41,
});

const buildInsufficientInformationResponse = (symptoms: string) => ({
  predictedCondition: 'Insufficient Information',
  recommendedSpecialist: 'General Practitioner',
  urgencyLevel: 'Needs clinical evaluation',
  description:
    'The current answers do not provide enough confirmed detail for a reliable prediction. Please seek a medical evaluation if symptoms persist or worsen.',
  confidence: 0,
  isEmergency: false,
  matchedSymptoms: [symptoms],
  alternativePossibilities: [],
  precautions: ['Seek medical attention if symptoms worsen', 'Monitor symptoms closely'],
  dataSource: 'Gemini Dynamic Triage',
  modelType: 'LLM Conversational Flow',
  needs_more_info: false,
  follow_up_questions: [],
  totalDiseasesAnalyzed: 41,
});

const buildTriageOverrideResponse = (
  symptoms: string,
  predictedCondition: string,
  recommendedSpecialist: string,
  urgencyLevel: string,
  description: string,
  confidence: number,
  matchedSymptoms: string[],
  precautions: string[],
) => ({
  predictedCondition,
  recommendedSpecialist,
  urgencyLevel,
  description,
  confidence,
  isEmergency: urgencyLevel.includes('Emergency'),
  matchedSymptoms,
  alternativePossibilities: [],
  precautions,
  dataSource: 'Structured Triage Override',
  modelType: 'Rule-Based Triage Flow',
  needs_more_info: false,
  follow_up_questions: [],
  totalDiseasesAnalyzed: 41,
});

const symptomAliasMap: Record<string, string[]> = {
  'chest pain': ['chest pain', 'pain in chest'],
  breathlessness: ['shortness of breath', 'breathlessness', 'difficulty breathing'],
  nausea: ['nausea', 'nauseous'],
  sweating: ['sweating', 'sweaty', 'sweat'],
  'neck pain': ['neck pain', 'neck'],
  'back pain': ['back pain', 'back'],
  'joint pain': ['joint pain'],
  'muscle pain': ['muscle pain'],
  'high fever': ['high fever', 'fever'],
  vomiting: ['vomiting', 'vomit'],
  dizziness: ['dizziness', 'dizzy'],
  'painful walking': ['leg pain', 'pain in leg', 'painful walking'],
  'swollen legs': ['swollen legs', 'leg swelling', 'swelling'],
  'skin rash': ['skin rash', 'redness', 'red skin', 'warmth'],
};

const extractNegativeQuestionSegments = (rawText: string): string[] => {
  const normalized = rawText.toLowerCase();
  const matches = [...normalized.matchAll(/follow-up response\s+\d+:\s+answer=(no|not sure);\s+question=(.*?)(?=follow-up response\s+\d+:|$)/g)];
  return matches.map((match) => match[2].trim());
};

const stripNegatedSymptoms = (symptoms: string[], rawText: string): string[] => {
  const negativeSegments = extractNegativeQuestionSegments(rawText);
  if (negativeSegments.length === 0) {
    return symptoms;
  }

  return symptoms.filter((symptom) => {
    const aliases = symptomAliasMap[symptom] ?? [symptom];
    return !negativeSegments.some((segment) =>
      aliases.some((alias) => segment.includes(alias.toLowerCase())),
    );
  });
};

const normalizeExtractedSymptomsForModel = (symptoms: string[], rawText: string): string[] => {
  const raw = rawText.toLowerCase();
  const normalized = new Set<string>();
  const mentionsLeg = /\bleg|calf|thigh|ankle\b/.test(raw);

  for (const symptom of symptoms) {
    const value = symptom.trim().toLowerCase();
    if (!value) {
      continue;
    }

    if (/^(leg pain|pain in leg|leg ache|aching leg)$/.test(value)) {
      normalized.add(mentionsLeg ? 'painful walking' : 'muscle pain');
      continue;
    }

    if (/^(swelling|swollen|leg swelling)$/.test(value)) {
      normalized.add(mentionsLeg ? 'swollen legs' : 'swelling joints');
      continue;
    }

    if (/^(redness|red skin|skin redness)$/.test(value)) {
      normalized.add('skin rash');
      continue;
    }

    if (/^(warmth|warm skin)$/.test(value)) {
      normalized.add('skin rash');
      continue;
    }

    normalized.add(value);
  }

  return [...normalized];
};

const buildTriageNarrative = (symptoms: string, triageContext?: TriageContext): string => {
  if (!triageContext || triageContext.rounds.length === 0) {
    return symptoms;
  }

  const sections = [`Primary symptom: ${symptoms}`];

  for (const round of triageContext.rounds) {
    const roundLines = round.questions.map((question, index) => {
      const answer = round.answers[index] ?? 'Not sure';
      return `Question: ${question}\nAnswer: ${answer}`;
    });
    sections.push(`Triage round ${round.stage}:\n${roundLines.join('\n')}`);
  }

  return sections.join('\n\n');
};

const buildQuestionSummaryText = (triageContext: TriageContext): string => {
  return triageContext.rounds
    .flatMap((round) =>
      round.answers.map((answer, index) => `Follow-up response ${index + 1}: Answer=${answer}; Question=${round.questions[index]}`),
    )
    .join(' ');
};

const getNextFallbackQuestions = (key: string, stage: number): string[] | null => {
  if (stage <= 1) {
    return SECONDARY_TRIAGE_FALLBACKS[key] ?? null;
  }
  if (stage === 2) {
    return TERTIARY_TRIAGE_FALLBACKS[key] ?? null;
  }
  return null;
};

const getAffirmativeNextQuestions = (key: string, stage: number): string[] | null => {
  if (stage === 1) {
    return AFFIRMATIVE_TRIAGE_FALLBACKS[key] ?? SECONDARY_TRIAGE_FALLBACKS[key] ?? null;
  }
  if (stage === 2) {
    return TERTIARY_TRIAGE_FALLBACKS[key] ?? null;
  }
  return null;
};

const countConfirmedAnswers = (triageContext?: TriageContext) => {
  if (!triageContext) {
    return 0;
  }

  return triageContext.rounds.reduce(
    (total, round) => total + round.answers.filter((answer) => answer.toLowerCase() === 'yes').length,
    0,
  );
};

const findRoundByStage = (triageContext: TriageContext | undefined, stage: number) =>
  triageContext?.rounds.find((round) => round.stage === stage);

const getAnswerAt = (round: TriageRound | undefined, index: number) =>
  (round?.answers[index] ?? '').toLowerCase();

const buildChestPainTriageOverride = (symptoms: string, triageContext?: TriageContext) => {
  if (!triageContext) {
    return null;
  }

  const stage1 = findRoundByStage(triageContext, 1);
  const stage2 = findRoundByStage(triageContext, 2);

  const stage1RadiationYes = getAnswerAt(stage1, 1) === 'yes';
  const stage1AssociatedYes = getAnswerAt(stage1, 2) === 'yes';
  const stage2SuddenYes = getAnswerAt(stage2, 0) === 'yes';
  const stage2ExertionYes = getAnswerAt(stage2, 1) === 'yes';
  const stage2SevereYes = getAnswerAt(stage2, 2) === 'yes';

  if (stage1RadiationYes && stage1AssociatedYes) {
    return buildTriageOverrideResponse(
      symptoms,
      'Heart attack',
      'Cardiologist',
      'Emergency - Seek immediate care',
      'Chest pain with radiation and associated autonomic or breathing symptoms is highly concerning for an acute cardiac emergency.',
      92,
      ['chest pain', 'radiating pain', 'associated cardiac symptoms'],
      ['Call emergency services immediately', 'Do not exert yourself', 'Seek urgent medical care now'],
    );
  }

  if (stage1AssociatedYes && (stage2SuddenYes || stage2ExertionYes || stage2SevereYes)) {
    return buildTriageOverrideResponse(
      symptoms,
      'Heart attack',
      'Cardiologist',
      'Emergency - Seek immediate care',
      'Chest pain with concerning associated symptoms plus sudden onset, exertional trigger, or severe intensity is highly suspicious for a cardiac emergency.',
      90,
      ['chest pain', 'associated cardiac symptoms', 'concerning onset pattern'],
      ['Call emergency services immediately', 'Do not exert yourself', 'Seek urgent medical care now'],
    );
  }

  return null;
};

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

export const predictDiseaseFromSymptoms = async (symptoms: string, triageContext?: TriageContext) => {
  try {
    if (!symptoms || symptoms.trim().length === 0) {
      throw new Error('Please provide at least one symptom');
    }

    let processedSymptoms = symptoms;

    if (process.env.GEMINI_API_KEY) {
      const triageNarrative = buildTriageNarrative(symptoms, triageContext);
      const normalizedSymptoms = triageNarrative.trim().toLowerCase();
      const baseSymptomsText = getBaseSymptomsText(symptoms);
      const broadSymptomKey = getBroadSymptomKey(baseSymptomsText);
      const chestPainOverride =
        broadSymptomKey === 'chest pain' ? buildChestPainTriageOverride(baseSymptomsText, triageContext) : null;
      if (chestPainOverride) {
        return chestPainOverride;
      }
      const hasStructuredFollowUps = Boolean(triageContext && triageContext.rounds.length > 0);
      const triageRoundCount = triageContext?.rounds.length ?? 0;
      const latestRound =
        triageContext && triageContext.rounds.length > 0
          ? triageContext.rounds[triageContext.rounds.length - 1]
          : undefined;
      const latestRoundSummary =
        latestRound && latestRound.questions.length > 0
          ? latestRound.questions
              .map((question, index) => `Follow-up response ${index + 1}: Answer=${latestRound.answers[index] ?? 'Not sure'}; Question=${question}`)
              .join(' ')
          : '';
      const followUpCounts = parseFollowUpAnswerCounts(latestRoundSummary);
      const confirmedAnswerCount = countConfirmedAnswers(triageContext);
      const wordCount = normalizedSymptoms.split(/\s+/).filter(Boolean).length;
      const hasMultipleClauses = /,|\bwith\b|\band\b|\bafter\b|\balong with\b/.test(normalizedSymptoms);
      const hasClinicalDetail =
        /\b(red|redness|swollen|swelling|warm|warmth|sharp|dull|throbbing|nausea|vomiting|fever|chills|rash|cough|dizziness|numb|tingling|injury|fell|falling|left|right|one leg|both legs)\b/.test(
          normalizedSymptoms,
        );
      const mustAskFollowUps = Boolean(broadSymptomKey) && !hasStructuredFollowUps;
      const stillTooUncertainAfterFollowUps =
        Boolean(broadSymptomKey) &&
        hasStructuredFollowUps &&
        followUpCounts.total > 0 &&
        followUpCounts.yes === 0;
      const needsAffirmativeProgression =
        Boolean(broadSymptomKey) &&
        hasStructuredFollowUps &&
        followUpCounts.yes > 0 &&
        latestRound !== undefined &&
        latestRound.stage <= 2;
      const mustForceAnalysis =
        Boolean(broadSymptomKey) &&
        triageRoundCount >= MAX_TRIAGE_ROUNDS &&
        confirmedAnswerCount > 0;
      const likelySpecificEnough =
        mustForceAnalysis ||
        (!mustAskFollowUps &&
          !needsAffirmativeProgression &&
          (confirmedAnswerCount > 0 || hasMultipleClauses || (hasClinicalDetail && wordCount >= 4)));

      if (broadSymptomKey && triageRoundCount >= MAX_TRIAGE_ROUNDS) {
        if (confirmedAnswerCount === 0) {
          return buildInsufficientInformationResponse(baseSymptomsText);
        }
      }

      if (stillTooUncertainAfterFollowUps && broadSymptomKey) {
        const currentStage = latestRound?.stage ?? 1;
        const nextQuestions = getNextFallbackQuestions(broadSymptomKey, currentStage);
        if (nextQuestions && triageRoundCount < MAX_TRIAGE_ROUNDS) {
          return buildNeedsMoreInfoResponse(baseSymptomsText, nextQuestions, currentStage + 1);
        }
        return buildInsufficientInformationResponse(baseSymptomsText);
      }

      if (needsAffirmativeProgression && broadSymptomKey && latestRound) {
        const nextQuestions = getAffirmativeNextQuestions(broadSymptomKey, latestRound.stage);
        if (nextQuestions && triageRoundCount < MAX_TRIAGE_ROUNDS) {
          return buildNeedsMoreInfoResponse(baseSymptomsText, nextQuestions, latestRound.stage + 1);
        }
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: 'gemini-flash-latest',
        generationConfig: {
          responseMimeType: 'application/json',
        },
      });
      const prompt = likelySpecificEnough
        ? `
        You are a medical symptom extraction AI.
        Read the following patient input:
        ${triageNarrative}

        The input already contains enough detail for extraction. Do not ask follow-up questions.
        Extract a precise array of normalized medical symptom keywords explicitly present in the text.
        If a triage answer is Yes, treat it as confirmed evidence.
        If a triage answer is No, treat that symptom as absent.
        If a triage answer is Not sure, treat that symptom as unknown and do not extract it as present.

        Return ONLY valid JSON:
        {
          "needs_more_info": false,
          "follow_up_questions": [],
          "extracted_symptoms": ["string"]
        }
      `
        : `
        You are a medical triage nurse AI.
        Read the following patient input:
        ${triageNarrative}

        Your job is to decide whether the input is too vague for symptom extraction, or whether it already contains enough detail to extract usable medical symptoms for an ML model.

        Mark needs_more_info as true ONLY when the user gives a single broad complaint with too little context.
        Examples of vague input:
        - "chest pain"
        - "my leg hurts"
        - "fever"
        - "headache"

        Mark needs_more_info as false when the user gives any meaningful qualifiers, associated symptoms, or answers to follow-up questions.
        Examples that are specific enough and should be extracted:
        - "my leg hurts, red and swollen"
        - "chest pain with sweating and nausea"
        - "stomach pain after vomiting twice"
        - "sharp pain in my right knee after falling"
        - "fever with chills and body ache"

        If needs_more_info is true:
        - return exactly 3 highly specific follow-up questions
        - questions must be tailored to the user input

        If needs_more_info is false:
        - extract precise medical symptom keywords
        - prefer normalized symptom phrases such as "leg pain", "swelling", "redness", "chest pain", "nausea", "vomiting", "high fever"
        - include all meaningful symptoms that are explicitly present in the user input
        - if triage answers are present: Yes = confirmed, No = absent, Not sure = unknown
        - do not treat No or Not sure answers as positive symptoms
        - do not ask questions

        Return ONLY valid JSON:
        {
          "needs_more_info": boolean,
          "follow_up_questions": ["string"],
          "extracted_symptoms": ["string"]
        }
      `;
      
      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const cleanJsonString = text.replace(/```json/gi, '').replace(/```/gi, '').trim();
        const parsed = JSON.parse(cleanJsonString);

        if (broadSymptomKey && triageRoundCount >= MAX_TRIAGE_ROUNDS && parsed.needs_more_info) {
          if (confirmedAnswerCount > 0) {
            processedSymptoms = normalizeExtractedSymptomsForModel([baseSymptomsText.toLowerCase()], triageNarrative).join(', ');
          } else {
            return buildInsufficientInformationResponse(baseSymptomsText);
          }
        }

        if (parsed.needs_more_info && parsed.follow_up_questions && parsed.follow_up_questions.length > 0) {
          if (mustForceAnalysis) {
            processedSymptoms = normalizeExtractedSymptomsForModel([baseSymptomsText.toLowerCase()], triageNarrative).join(', ');
          } else {
            return buildNeedsMoreInfoResponse(baseSymptomsText, parsed.follow_up_questions, latestRound?.stage ?? 1);
          }
        }

        if (
          (!parsed.extracted_symptoms || !Array.isArray(parsed.extracted_symptoms) || parsed.extracted_symptoms.length === 0) &&
          mustForceAnalysis
        ) {
          processedSymptoms = normalizeExtractedSymptomsForModel([baseSymptomsText.toLowerCase()], triageNarrative).join(', ');
        }

        if (parsed.extracted_symptoms && Array.isArray(parsed.extracted_symptoms) && parsed.extracted_symptoms.length > 0) {
          const filteredSymptoms = stripNegatedSymptoms(
            parsed.extracted_symptoms,
            triageContext ? buildQuestionSummaryText(triageContext) : symptoms,
          );
          const normalizedExtractedSymptoms = normalizeExtractedSymptomsForModel(filteredSymptoms, triageNarrative);
          processedSymptoms =
            normalizedExtractedSymptoms.length > 0
              ? normalizedExtractedSymptoms.join(', ')
              : mustForceAnalysis
                ? normalizeExtractedSymptomsForModel([baseSymptomsText.toLowerCase()], triageNarrative).join(', ')
                : processedSymptoms;
        }
      } catch (geminiError) {
        console.warn("Gemini triage failed, falling back to raw symptoms", geminiError);
        if (broadSymptomKey) {
          if (mustForceAnalysis) {
            processedSymptoms = normalizeExtractedSymptomsForModel([baseSymptomsText.toLowerCase()], triageNarrative).join(', ');
          } else {
          return buildNeedsMoreInfoResponse(baseSymptomsText, BROAD_TRIAGE_FALLBACKS[broadSymptomKey], 1);
          }
        }
      }
    }

    const result = await mlService.predictDisease(processedSymptoms);

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
      needs_more_info: result.needs_more_info,
      follow_up_questions: result.follow_up_questions,
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
