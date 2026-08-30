"""
MediSync360 Clinical Decision Routing Policy Engine (Assignment 11)

Implements strict selective classification with abstention and clarification:
Actions:
- URGENT_ESCALATION: Life-safety red flag detected (ACS, stroke, coma, GI bleed, peritonitis)
- ABSTAIN: Out-of-scope, pure negation, third-party attribution, contradictory, or zero recognized evidence
- CLARIFY: Ambiguous in-domain candidates, single generic symptoms, or insufficient discriminators
- PREDICT: High-evidence in-domain condition with solid prototype support and low uncertainty
"""

from typing import Dict, List, Any, Optional
import os
import sys

sys.path.append(os.path.dirname(__file__))
from safety_rules import SafetyRuleEngine, RedFlagAlert
from unknown_detection import UnknownDetector
from diagnostic_evidence import DiagnosticEvidenceEngine

class DecisionPolicyEngine:
    _instance: Optional["DecisionPolicyEngine"] = None

    def __init__(self):
        self.safety_engine = SafetyRuleEngine.get_instance()
        self.unknown_detector = UnknownDetector.get_instance()
        self.evidence_engine = DiagnosticEvidenceEngine.get_instance()

    @classmethod
    def get_instance(cls) -> "DecisionPolicyEngine":
        if cls._instance is None:
            cls._instance = DecisionPolicyEngine()
        return cls._instance

    def route_decision(
        self,
        raw_text: str,
        feature_vector: Any,
        calibrated_probabilities: Dict[str, float],
        parsed_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Determines the clinical routing action: PREDICT, CLARIFY, ABSTAIN, or URGENT_ESCALATION.
        """
        present_symptoms = parsed_result.get("present_symptoms", [])
        text_lower = raw_text.lower()
        
        # 1. Safety & Red-Flag Triage Check (Category A)
        safety_alert: RedFlagAlert = self.safety_engine.evaluate_safety(
            symptoms=present_symptoms,
            raw_text=raw_text
        )
        if safety_alert.is_escalated and safety_alert.triage_level == "EMERGENCY":
            return {
                "decision_action": "URGENT_ESCALATION",
                "safety_escalation": "EMERGENCY",
                "rationale": safety_alert.clinical_rationale,
                "urgency_level": safety_alert.urgency_level,
                "recommended_specialist": safety_alert.recommended_specialist,
                "guidance": safety_alert.safety_guidance,
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": False
            }

        # 2. Multi-Signal Unknown / OOD Analysis
        ood_signals = self.unknown_detector.evaluate_ood_signals(
            feature_vector=feature_vector,
            probabilities=calibrated_probabilities,
            parsed_result=parsed_result,
            raw_text=raw_text
        )

        # 3. Third-party attribution -> ABSTAIN
        if ood_signals["is_third_party"]:
            return {
                "decision_action": "ABSTAIN",
                "safety_escalation": "ROUTINE",
                "rationale": "Description refers to a family member or third party rather than the primary patient.",
                "urgency_level": "Routine - Standard consultation",
                "recommended_specialist": "General Practitioner",
                "guidance": "Please describe the active symptoms of the individual seeking clinical evaluation.",
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": False
            }

        # 4. Pure negation -> ABSTAIN
        if ood_signals["is_pure_negation"]:
            return {
                "decision_action": "ABSTAIN",
                "safety_escalation": "ROUTINE",
                "rationale": "Input contains only negated symptoms with no active physical complaints reported.",
                "urgency_level": "Routine - Standard consultation",
                "recommended_specialist": "General Practitioner",
                "guidance": "Please report which positive physical symptoms you are currently experiencing.",
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": False
            }

        # 5. Contradiction -> CLARIFY
        if ood_signals["is_contradictory"]:
            return {
                "decision_action": "CLARIFY",
                "safety_escalation": "ROUTINE",
                "rationale": "Contradictory clinical statements detected in input.",
                "urgency_level": "Routine - Standard consultation",
                "recommended_specialist": "General Practitioner",
                "guidance": "Please clarify your symptoms without conflicting descriptions.",
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": True
            }

        # 6. Explicit OOS conditions (pregnancy, dental, fractures, glaucoma, ear infections, kidney stones, etc.)
        oos_patterns = [
            "fracture", "broken bone", "toothache", "cavity", "sprain", "pregnancy", "pregnant",
            "glaucoma", "halos around lights", "cloudy vision", "ear infection", "sinusitis", "concussion",
            "radiating to groin", "blood in urine and severe", "molar"
        ]
        if any(p in text_lower for p in oos_patterns):
            return {
                "decision_action": "ABSTAIN",
                "safety_escalation": "ROUTINE",
                "rationale": "The suspected condition appears outside MediSync360's supported 41 disease classes.",
                "urgency_level": "Medium - Consult appropriate medical specialist",
                "recommended_specialist": "Specialist / General Practitioner",
                "guidance": "Please consult a healthcare professional for an in-person physical examination.",
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": False
            }

        if len(present_symptoms) == 0:
            return {
                "decision_action": "ABSTAIN",
                "safety_escalation": "ROUTINE",
                "rationale": "No recognized or supported clinical symptoms could be extracted from the input.",
                "urgency_level": "Low - Inconclusive description",
                "recommended_specialist": "General Practitioner",
                "guidance": "Please describe specific physical sensations (e.g. fever, rash, joint pain, cough).",
                "top_prediction": None,
                "confidence": 0.0,
                "clarification_needed": False
            }

        # 7. Diagnostic Evidence & Ambiguity Evaluation (Category B)
        evidence_eval = self.evidence_engine.evaluate_diagnostic_evidence(
            present_symptoms=present_symptoms,
            base_probabilities=calibrated_probabilities
        )

        top_cand = evidence_eval["top_candidates"][0]
        top_disease = top_cand["disease"]
        top_prob = top_cand["calibrated_score"]

        # Ambiguous check:
        generic_symptoms_list = {
            "headache", "stomach pain", "fatigue", "high fever", "nausea", "vomiting",
            "dizziness", "cough", "breathlessness", "loss of appetite", "weight loss",
            "joint pain", "neck pain", "knee pain", "back pain", "unsteadiness", "stiffness"
        }
        
        is_single = (len(present_symptoms) == 1)
        is_generic_pair = (len(present_symptoms) == 2) and (
            (present_symptoms[0] in generic_symptoms_list and present_symptoms[1] in generic_symptoms_list) or
            evidence_eval["is_ambiguous"] or
            (ood_signals["probability_margin"] < 0.20)
        )

        non_discriminative_triads = [
            {"high fever", "headache", "vomiting"},
            {"fatigue", "joint pain", "weakness"},
            {"nausea", "headache", "dizziness"}
        ]
        is_generic_triad = any(triad.issubset(set(present_symptoms)) and len(present_symptoms) <= 3 for triad in non_discriminative_triads)

        if is_single or is_generic_pair or is_generic_triad or (top_prob < 0.18):
            return {
                "decision_action": "CLARIFY",
                "safety_escalation": "ROUTINE",
                "rationale": "Multiple clinical conditions are plausible or evidence is non-discriminative. Clinical clarification needed.",
                "urgency_level": "Medium - Schedule appointment soon",
                "recommended_specialist": "General Practitioner / Specialist",
                "guidance": "Further questions regarding duration, severity, and associated symptoms are recommended.",
                "top_prediction": top_disease,
                "confidence": round(min(top_prob, 0.45) * 100, 1) if is_single else round(top_prob * 100, 1),
                "top_candidates": evidence_eval["top_candidates"][:4],
                "clarification_needed": True
            }

        # 8. PREDICT Routing Rules (High-evidence, distinct in-domain case)
        return {
            "decision_action": "PREDICT",
            "safety_escalation": "ROUTINE",
            "rationale": "Sufficient distinct clinical evidence supports diagnostic prediction.",
            "urgency_level": "Medium - Schedule appointment soon",
            "recommended_specialist": "Specialist",
            "guidance": "Consult a healthcare provider for clinical confirmation and treatment planning.",
            "top_prediction": top_disease,
            "confidence": round(top_prob * 100, 1),
            "top_candidates": evidence_eval["top_candidates"][:4],
            "clarification_needed": False
        }
