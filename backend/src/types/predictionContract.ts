/**
 * MediSync360 Unified Prediction API Contract (Assignment 13)
 * Represents the 4 canonical clinical decisions: PREDICT, CLARIFY, ABSTAIN, URGENT_ESCALATION
 */

export type ClinicalDecision = 'PREDICT' | 'CLARIFY' | 'ABSTAIN' | 'URGENT_ESCALATION';

export interface DiseasePrediction {
  condition: string;
  probability: number;
  confidence_percentage: number;
  simplified_condition?: string;
  patient_summary?: string;
}

export interface DiseaseAlternative {
  condition: string;
  probability: number;
  confidence: number;
}

export interface TriageRound {
  stage: number;
  questions: string[];
  answers: string[];
}

export interface TriageContext {
  rounds: TriageRound[];
}

export interface PredictionUncertainty {
  score: number;
  entropy: number;
  level: string;
}

export interface PredictionApiResponse {
  // Canonical Contract Fields (Assignment 13 / Assignment 16)
  decision: ClinicalDecision;
  prediction: DiseasePrediction | null;
  calibrated_probability?: number;
  alternatives: DiseaseAlternative[];
  matched_symptoms: string[];
  missing_information: string[];
  uncertainty?: PredictionUncertainty | number;
  questions: string[];
  clarification_questions?: string[];
  urgency: string;
  abstained: boolean;
  reason: string | null;
  abstention_reason?: string | null;
  model_version: string;

  // Backward Compatibility Properties
  decisionAction: ClinicalDecision;
  predictedCondition: string;
  simplifiedCondition?: string;
  patientSummary?: string;
  recommendedSpecialist: string;
  urgencyLevel: string;
  description: string;
  confidence: number;
  calibratedProbability: number;
  rawModelScore: number;
  calibrationMethod: string;
  clinicalDisclaimer: string;
  isEmergency: boolean;
  matchedSymptoms: string[];
  alternativePossibilities: DiseaseAlternative[];
  precautions: string[];
  needs_more_info: boolean;
  follow_up_questions: string[];
  triage_stage: number;
  dataSource: string;
  modelType: string;
  totalDiseasesAnalyzed: number;
}
