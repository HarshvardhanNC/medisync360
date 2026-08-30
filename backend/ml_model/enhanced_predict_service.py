import sys
import json
import numpy as np  # type: ignore[import-untyped]
import joblib  # type: ignore[import-untyped]
import os
from typing import Any, cast, ClassVar, Dict, List, Optional, Set, Tuple
import re

from symptom_ontology import SymptomOntology
from symptom_parser import ClinicalSymptomParser
from safety_rules import SafetyRuleEngine, RedFlagAlert
from diagnostic_evidence import DiagnosticEvidenceEngine
from feature_engineering import ClinicalFeatureExtractor
from decision_policy import DecisionPolicyEngine
from clarification_engine import ClarificationEngine

MODEL_VERSION = "medisync360-v2.0-calibrated-rf"

class EnhancedMedicalPredictor:
    def __init__(self) -> None:
        self.model: Any = None
        self.label_encoder: Any = None
        self.metadata: Dict[str, Any] = {}
        self.symptoms: List[str] = []
        self.diseases: List[str] = []
        self.symptom_to_diseases: Dict[str, List[str]] = {}
        
        self.ontology = SymptomOntology.get_instance()
        self.parser = ClinicalSymptomParser.get_instance()
        self.safety_engine = SafetyRuleEngine.get_instance()
        self.evidence_engine = DiagnosticEvidenceEngine.get_instance()
        self.feature_extractor = ClinicalFeatureExtractor.get_instance()
        self.decision_policy = DecisionPolicyEngine.get_instance()
        self.clarification_engine = ClarificationEngine.get_instance()
        
        self.load_model()
    
    def load_model(self):
        """Load trained calibrated model and metadata"""
        try:
            model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'trained_model')
            
            self.model = joblib.load(os.path.join(model_dir, 'disease_classifier.pkl'))
            self.label_encoder = joblib.load(os.path.join(model_dir, 'label_encoder.pkl'))
            
            with open(os.path.join(model_dir, 'metadata.json'), 'r') as f:
                self.metadata = json.load(f)
            
            self.symptoms = self.metadata['symptoms']
            self.diseases = self.metadata['diseases']
            self.symptom_to_diseases = self.metadata.get('symptom_to_diseases', {})
            
            print(f"Enhanced model loaded with {len(self.symptoms)} symptoms and {len(self.diseases)} diseases", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading enhanced model: {e}", file=sys.stderr)
            raise

    def extract_symptoms_from_text(self, text: str) -> List[str]:
        """Convert free-form natural language into canonical symptom keywords using ClinicalSymptomParser."""
        parsed = self.parser.parse(text)
        return parsed["present_symptoms"]

    def preprocess_symptoms(self, user_symptoms: str) -> Tuple[np.ndarray, List[str], Dict[str, Any]]:
        """Extracts canonical symptoms, evaluates entity attribution and builds 154-dim feature vector."""
        if not user_symptoms or not isinstance(user_symptoms, str):
            user_symptoms = str(user_symptoms or '')

        parsed_result = self.parser.parse(user_symptoms)
        present_symptoms = parsed_result["present_symptoms"]
        
        feature_vector = self.feature_extractor.extract_features_model_b(user_symptoms)
        return feature_vector, present_symptoms, parsed_result

    def get_specialist(self, condition: str) -> str:
        """Get recommended medical specialist for a condition"""
        return self.metadata.get('disease_specialists', {}).get(condition, 'General Practitioner')

    def get_urgency(self, condition: str, confidence: float) -> str:
        """Determine clinical urgency based on condition and severity"""
        return self.metadata.get('disease_urgencies', {}).get(condition, 'Medium - Schedule appointment soon')

    def predict_disease(
        self,
        user_symptoms: str,
        triage_rounds: Optional[List[Dict[str, Any]]] = None
    ) -> Dict[str, Any]:
        """
        Unified Multi-Turn Decision API Contract Pipeline (Assignment 13):
        Returns canonical contract fields:
        - decision: PREDICT | CLARIFY | ABSTAIN | URGENT_ESCALATION
        - prediction: { condition, probability, confidence_percentage } | null
        - alternatives: [ { condition, probability, confidence } ]
        - matched_symptoms, missing_information, questions, urgency, abstained, reason, model_version
        """
        if not user_symptoms or not isinstance(user_symptoms, str):
            user_symptoms = str(user_symptoms or '')

        triage_rounds = triage_rounds or []
        current_stage = len(triage_rounds) + 1

        # 1. Merge previous clarification answers into cumulative clinical state
        if triage_rounds:
            merged_symptoms, _ = self.clarification_engine.merge_clarification_answers(
                base_symptoms=user_symptoms,
                triage_rounds=triage_rounds
            )
            analysis_text = merged_symptoms
        else:
            analysis_text = user_symptoms

        try:
            # 2. Preprocess & extract structured evidence
            feature_vector, matched_symptoms, parsed_result = self.preprocess_symptoms(analysis_text)
            
            # 3. ML Model Inference (154-dim input with calibrated probabilities)
            raw_probabilities = self.model.predict_proba([feature_vector])[0]
            prob_dict = {self.label_encoder.inverse_transform([i])[0]: float(p) for i, p in enumerate(raw_probabilities)}

            # 4. Decision Policy Routing Engine
            decision_result = self.decision_policy.route_decision(
                raw_text=analysis_text,
                feature_vector=feature_vector,
                calibrated_probabilities=prob_dict,
                parsed_result=parsed_result
            )

            # Calculate clinical uncertainty (Shannon entropy & probability margin)
            non_zero_probs = [p for p in prob_dict.values() if p > 0.0001]
            if non_zero_probs:
                raw_entropy = -float(sum(p * np.log(p) for p in non_zero_probs))
                normalized_entropy = round(float(raw_entropy / np.log(max(len(self.diseases), 2))), 4)
            else:
                raw_entropy = 0.0
                normalized_entropy = 0.0

            action = decision_result["decision_action"]

            # Format Response based on Action
            # -------------------------------------------------------------
            # CASE 1: URGENT_ESCALATION
            # -------------------------------------------------------------
            if action == "URGENT_ESCALATION":
                return {
                    # Canonical API Contract Fields (Assignment 13 / 16)
                    'decision': 'URGENT_ESCALATION',
                    'prediction': None,
                    'calibrated_probability': 0.0,
                    'alternatives': [],
                    'matched_symptoms': matched_symptoms,
                    'missing_information': [],
                    'uncertainty': {
                        'score': 0.0,
                        'entropy': 0.0,
                        'level': 'Critical - Deterministic Red Flag'
                    },
                    'urgency': 'Emergency - Seek immediate emergency medical care (Call 911/112)',
                    'questions': [],
                    'clarification_questions': [],
                    'abstained': False,
                    'reason': f"CRITICAL SAFETY ESCALATION: {decision_result['rationale']}",
                    'abstention_reason': None,
                    'model_version': MODEL_VERSION,

                    # Backward Compatibility Properties
                    'decisionAction': 'URGENT_ESCALATION',
                    'safetyEscalation': 'EMERGENCY',
                    'predictedCondition': 'URGENT_MEDICAL_EVALUATION_REQUIRED',
                    'recommendedSpecialist': decision_result["recommended_specialist"],
                    'urgencyLevel': decision_result["urgency_level"],
                    'description': f"CRITICAL SAFETY ESCALATION: {decision_result['rationale']} {decision_result['guidance']}",
                    'confidence': 0.0,
                    'calibratedProbability': 0.0,
                    'rawModelScore': 0.0,
                    'calibrationMethod': 'statistical_safety_triage',
                    'clinicalDisclaimer': 'Emergency safety red-flags override standard outpatient predictive modeling.',
                    'matchedSymptoms': matched_symptoms,
                    'redFlagsDetected': [decision_result["rationale"]],
                    'alternativePossibilities': [],
                    'precautions': [
                        'Call emergency services (911/112) or go to the nearest emergency room immediately',
                        'Do not drive yourself to the hospital',
                        'Rest and stay in a safe, seated or lying position'
                    ],
                    'isEmergency': True,
                    'needs_more_info': False,
                    'follow_up_questions': [],
                    'triage_stage': current_stage,
                    'dataSource': 'MediSync360 Clinical Safety & Emergency Triage Engine',
                    'modelType': 'Safety Rule Engine (Category A)',
                    'totalDiseasesAnalyzed': len(self.diseases)
                }

            # -------------------------------------------------------------
            # CASE 2: ABSTAIN
            # -------------------------------------------------------------
            if action == "ABSTAIN":
                return {
                    # Canonical API Contract Fields (Assignment 13 / 16)
                    'decision': 'ABSTAIN',
                    'prediction': None,
                    'calibrated_probability': 0.0,
                    'alternatives': [],
                    'matched_symptoms': matched_symptoms,
                    'missing_information': ['Specific recognized in-domain clinical symptoms'],
                    'uncertainty': {
                        'score': 1.0,
                        'entropy': 1.0,
                        'level': 'High - Insufficient In-Domain Evidence'
                    },
                    'urgency': decision_result["urgency_level"],
                    'questions': [],
                    'clarification_questions': [],
                    'abstained': True,
                    'reason': decision_result['rationale'],
                    'abstention_reason': decision_result['rationale'],
                    'model_version': MODEL_VERSION,

                    # Backward Compatibility Properties
                    'decisionAction': 'ABSTAIN',
                    'safetyEscalation': 'ROUTINE',
                    'predictedCondition': 'No clear match found',
                    'recommendedSpecialist': decision_result["recommended_specialist"],
                    'urgencyLevel': decision_result["urgency_level"],
                    'description': f"ABSTAIN: {decision_result['rationale']} {decision_result['guidance']}",
                    'confidence': 0.0,
                    'calibratedProbability': 0.0,
                    'rawModelScore': 0.0,
                    'calibrationMethod': 'selective_abstention',
                    'clinicalDisclaimer': 'No reliable prediction possible. Abstaining rather than providing a false prediction.',
                    'matchedSymptoms': matched_symptoms,
                    'alternativePossibilities': [],
                    'precautions': ['Please provide a more detailed clinical description', 'Consult a healthcare professional for clinical examination'],
                    'isEmergency': False,
                    'needs_more_info': False,
                    'follow_up_questions': [],
                    'triage_stage': current_stage,
                    'dataSource': 'MediSync360 Selective Abstention Engine',
                    'modelType': 'OOD Detector & Policy Router',
                    'totalDiseasesAnalyzed': len(self.diseases)
                }

            # -------------------------------------------------------------
            # CASE 3: CLARIFY
            # -------------------------------------------------------------
            if action == "CLARIFY":
                if current_stage <= 3:
                    questions = self.clarification_engine.generate_clarification_questions(
                        present_symptoms=matched_symptoms,
                        top_candidates=decision_result.get("top_candidates", []),
                        conversation_history=triage_rounds,
                        raw_text=analysis_text
                    )
                    
                    if questions:
                        top_disease = decision_result.get("top_prediction", "Clinical Evaluation Pending")
                        conf = decision_result.get("confidence", 35.0)
                        prob = round(conf / 100.0, 4)
                        alternatives = [
                            {
                                'condition': cand["disease"],
                                'probability': round(cand["calibrated_score"], 4),
                                'confidence': round(cand["calibrated_score"] * 100, 1)
                            }
                            for cand in decision_result.get("top_candidates", [])[1:4]
                            if cand["calibrated_score"] > 0.05
                        ]

                        return {
                            # Canonical API Contract Fields (Assignment 13 / 16)
                            'decision': 'CLARIFY',
                            'prediction': {
                                'condition': top_disease,
                                'probability': prob,
                                'confidence_percentage': conf
                            },
                            'calibrated_probability': prob,
                            'alternatives': alternatives,
                            'matched_symptoms': matched_symptoms,
                            'missing_information': ['Differential confirmation indicators', 'Associated key symptoms'],
                            'uncertainty': {
                                'score': round(1.0 - prob, 4),
                                'entropy': normalized_entropy,
                                'level': 'High - Ambiguous Differential Candidates'
                            },
                            'urgency': 'Medium - Clarification required',
                            'questions': questions,
                            'clarification_questions': questions,
                            'abstained': False,
                            'reason': 'Multiple conditions are plausible. Clarifying questions required to reduce clinical entropy.',
                            'abstention_reason': None,
                            'model_version': MODEL_VERSION,

                            # Backward Compatibility Properties
                            'decisionAction': 'CLARIFY',
                            'safetyEscalation': 'ROUTINE',
                            'predictedCondition': top_disease,
                            'recommendedSpecialist': self.get_specialist(top_disease),
                            'urgencyLevel': 'Medium - Clarification required',
                            'description': 'Multiple conditions plausible. Please answer the following clarifying questions to refine your assessment.',
                            'confidence': conf,
                            'calibratedProbability': prob,
                            'rawModelScore': round(prob_dict.get(top_disease, 0.0) * 100, 1),
                            'calibrationMethod': 'isotonic',
                            'clinicalDisclaimer': 'Assessment is preliminary pending symptom clarification.',
                            'matchedSymptoms': matched_symptoms,
                            'alternativePossibilities': alternatives,
                            'precautions': ['Answer clarifying questions to narrow down possibilities'],
                            'isEmergency': False,
                            'needs_more_info': True,
                            'follow_up_questions': questions,
                            'triage_stage': current_stage,
                            'dataSource': 'MediSync360 Intelligent Clarification Engine',
                            'modelType': 'Active Clarification Loop',
                            'totalDiseasesAnalyzed': len(self.diseases)
                        }

                # After 3 rounds without resolution
                action = "CLARIFY"

            # -------------------------------------------------------------
            # CASE 4: PREDICT
            # -------------------------------------------------------------
            top_disease = decision_result["top_prediction"]
            confidence = decision_result["confidence"]
            calibrated_prob = round(confidence / 100.0, 4)
            uncalibrated_raw_percentage = round(prob_dict.get(top_disease, 0.0) * 100, 1)

            top_candidates = decision_result.get("top_candidates", [])
            alternatives = [
                {
                    'condition': cand["disease"],
                    'probability': round(cand["calibrated_score"], 4),
                    'confidence': round(cand["calibrated_score"] * 100, 1)
                }
                for cand in top_candidates[1:4]
                if cand["calibrated_score"] > 0.05
            ]

            description = self.metadata.get('disease_descriptions', {}).get(
                top_disease, f'Medical condition: {top_disease}'
            )
            precautions = self.metadata.get('disease_precautions', {}).get(top_disease, [])
            specialist = self.get_specialist(top_disease)
            urgency = self.get_urgency(top_disease, confidence)

            return {
                # Canonical API Contract Fields (Assignment 13 / 16)
                'decision': 'PREDICT',
                'prediction': {
                    'condition': top_disease,
                    'probability': calibrated_prob,
                    'confidence_percentage': confidence
                },
                'calibrated_probability': calibrated_prob,
                'alternatives': alternatives,
                'matched_symptoms': matched_symptoms,
                'missing_information': [],
                'uncertainty': {
                    'score': round(1.0 - calibrated_prob, 4),
                    'entropy': normalized_entropy,
                    'level': 'Low' if calibrated_prob >= 0.70 else 'Moderate'
                },
                'urgency': urgency,
                'questions': [],
                'clarification_questions': [],
                'abstained': False,
                'reason': decision_result.get("rationale", "Sufficient distinct clinical evidence supports diagnostic prediction."),
                'abstention_reason': None,
                'model_version': MODEL_VERSION,

                # Backward Compatibility Properties
                'decisionAction': 'PREDICT',
                'safetyEscalation': decision_result["safety_escalation"],
                'predictedCondition': top_disease,
                'recommendedSpecialist': specialist,
                'urgencyLevel': urgency,
                'description': description,
                'confidence': confidence,
                'calibratedProbability': calibrated_prob,
                'rawModelScore': uncalibrated_raw_percentage,
                'calibrationMethod': 'isotonic',
                'clinicalDisclaimer': 'Calibrated probability is a statistical estimate based on reported symptoms, not medical certainty.',
                'matchedSymptoms': matched_symptoms,
                'alternativePossibilities': alternatives,
                'precautions': precautions,
                'decisionRationale': decision_result.get("rationale", "Evidence supports diagnostic prediction."),
                'isEmergency': 'Emergency' in urgency,
                'needs_more_info': False,
                'follow_up_questions': [],
                'triage_stage': current_stage,
                'dataSource': 'MediSync360 Unified Prediction & Calibration Pipeline',
                'modelType': 'Isotonically Calibrated Classifier + Decision Policy',
                'totalDiseasesAnalyzed': len(self.diseases)
            }

        except Exception as e:
            return {
                # Canonical API Contract Fields
                'decision': 'ABSTAIN',
                'prediction': None,
                'calibrated_probability': 0.0,
                'alternatives': [],
                'matched_symptoms': [],
                'missing_information': ['Technical evaluation error'],
                'uncertainty': {
                    'score': 1.0,
                    'entropy': 1.0,
                    'level': 'High - System Fallback'
                },
                'urgency': 'Medium - Consult a doctor',
                'questions': [],
                'clarification_questions': [],
                'abstained': True,
                'reason': f'Error in prediction service: {str(e)}',
                'abstention_reason': f'Error in prediction service: {str(e)}',
                'model_version': MODEL_VERSION,

                # Backward Compatibility Properties
                'decisionAction': 'ABSTAIN',
                'safetyEscalation': 'ROUTINE',
                'predictedCondition': 'Diagnostic evaluation unavailable',
                'recommendedSpecialist': 'General Practitioner',
                'urgencyLevel': 'Medium - Consult a doctor',
                'description': f'Error in prediction service: {str(e)}',
                'confidence': 0.0,
                'calibratedProbability': 0.0,
                'rawModelScore': 0.0,
                'calibrationMethod': 'none',
                'clinicalDisclaimer': 'Evaluation failed due to system exception.',
                'matchedSymptoms': [],
                'alternativePossibilities': [],
                'precautions': ['Please consult a healthcare professional'],
                'isEmergency': False,
                'needs_more_info': False,
                'follow_up_questions': [],
                'triage_stage': current_stage,
                'dataSource': 'MediSync360 Fallback Service',
                'modelType': 'Diagnostic Triage',
                'totalDiseasesAnalyzed': len(self.diseases)
            }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Please provide symptoms as argument"
        }))
        return

    first_arg = sys.argv[1]
    if first_arg.startswith("{") and "symptoms" in first_arg:
        try:
            payload = json.loads(first_arg)
            user_symptoms = payload.get("symptoms", "")
            triage_rounds = payload.get("triageContext", {}).get("rounds", [])
            predictor = EnhancedMedicalPredictor()
            result = predictor.predict_disease(user_symptoms, triage_rounds=triage_rounds)
            print(json.dumps(result, indent=2))
            return
        except Exception:
            pass

    user_symptoms = " ".join(sys.argv[1:])
    predictor = EnhancedMedicalPredictor()
    result = predictor.predict_disease(user_symptoms)
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
