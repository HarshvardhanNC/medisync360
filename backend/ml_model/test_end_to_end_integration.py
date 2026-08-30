"""
MediSync360 Full End-to-End System Integration Test Suite (Assignment 16)

Tests the complete validated disease prediction pipeline:
1. USER FREE-FORM DESCRIPTION -> PARSER -> ONTOLOGY -> ASSERTIONS -> SAFETY -> EVIDENCE -> MODEL -> CALIBRATION -> DECISION
2. Strict Non-Silent Conversion Invariants:
   - ABSTAIN is NEVER converted to PREDICT
   - CLARIFY is NEVER converted to PREDICT
3. Emergency Safety Priority (Category A red-flags override predictive models)
4. Multi-turn Interactive Clarification Loop
5. Full 11-Field API Response Contract Validation
"""

import unittest
import os
import sys
import json
import subprocess

sys.path.append(os.path.dirname(__file__))
from enhanced_predict_service import EnhancedMedicalPredictor
from symptom_parser import ClinicalSymptomParser
from safety_rules import SafetyRuleEngine
from diagnostic_evidence import DiagnosticEvidenceEngine
from decision_policy import DecisionPolicyEngine
from clarification_engine import ClarificationEngine

class TestFullSystemIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()
        cls.parser = ClinicalSymptomParser.get_instance()
        cls.safety = SafetyRuleEngine.get_instance()
        cls.evidence = DiagnosticEvidenceEngine.get_instance()
        cls.policy = DecisionPolicyEngine.get_instance()
        cls.clarifier = ClarificationEngine.get_instance()

    # =========================================================================
    # Test 1: Full Flow PREDICT Decision
    # =========================================================================
    def test_001_full_pipeline_predict(self):
        text = "I have high fever with severe shivering chills, drenching sweats, vomiting, and muscle ache."
        res = self.predictor.predict_disease(text)

        self.assertEqual(res["decision"], "PREDICT")
        self.assertFalse(res["abstained"])
        self.assertIsNotNone(res["prediction"])
        self.assertEqual(res["prediction"]["condition"], "Malaria")
        self.assertGreaterEqual(res["prediction"]["probability"], 0.40)
        self.assertEqual(res["calibrated_probability"], res["prediction"]["probability"])
        self.assertIsInstance(res["alternatives"], list)
        self.assertIn("chills", res["matched_symptoms"])
        self.assertEqual(res["missing_information"], [])
        self.assertIn("uncertainty", res)
        self.assertIn("score", res["uncertainty"])
        self.assertIn("entropy", res["uncertainty"])
        self.assertEqual(res["questions"], [])
        self.assertIsNone(res["abstention_reason"])
        self.assertEqual(res["model_version"], "medisync360-v2.0-calibrated-rf")

    # =========================================================================
    # Test 2: Full Flow CLARIFY Decision & Multi-Turn Convergence
    # =========================================================================
    def test_002_full_pipeline_clarify_and_converge(self):
        # Round 1: Ambiguous single generic symptom
        round1_text = "I have a headache"
        round1_res = self.predictor.predict_disease(round1_text)

        self.assertEqual(round1_res["decision"], "CLARIFY")
        self.assertFalse(round1_res["abstained"])
        self.assertGreaterEqual(len(round1_res["questions"]), 1)
        self.assertIn("headache", round1_res["matched_symptoms"])
        self.assertIn("uncertainty", round1_res)
        self.assertGreater(round1_res["uncertainty"]["score"], 0.30)
        self.assertIsNone(round1_res["abstention_reason"])

        # Round 2: User provides positive clarification with migraine-specific indicators
        triage_rounds = [
            {
                "stage": 1,
                "questions": round1_res["questions"],
                "answers": ["Yes" for _ in round1_res["questions"]]
            }
        ]
        round2_res = self.predictor.predict_disease(
            "I have severe headache, acidity, indigestion, blurred and distorted vision, and visual disturbances",
            triage_rounds=triage_rounds
        )
        self.assertEqual(round2_res["decision"], "PREDICT")
        self.assertEqual(round2_res["prediction"]["condition"], "Migraine")
        self.assertGreaterEqual(round2_res["prediction"]["probability"], 0.60)

    # =========================================================================
    # Test 3: Full Flow ABSTAIN on Pure Negation & Out-of-Scope
    # =========================================================================
    def test_003_full_pipeline_abstain_no_false_prediction(self):
        # Case A: Pure negation (denies everything)
        neg_text = "I do not have fever, no headache, no nausea, denies chest pain."
        neg_res = self.predictor.predict_disease(neg_text)

        self.assertEqual(neg_res["decision"], "ABSTAIN")
        self.assertTrue(neg_res["abstained"])
        self.assertIsNone(neg_res["prediction"])
        self.assertEqual(neg_res["calibrated_probability"], 0.0)
        self.assertIsNotNone(neg_res["abstention_reason"])
        self.assertEqual(neg_res["uncertainty"]["score"], 1.0)

        # Case B: Out-of-Scope Orthopedic Trauma
        oos_text = "I fell from a tree and have an open compound fracture in my tibia bone."
        oos_res = self.predictor.predict_disease(oos_text)

        self.assertEqual(oos_res["decision"], "ABSTAIN")
        self.assertTrue(oos_res["abstained"])
        self.assertIsNone(oos_res["prediction"])
        self.assertEqual(oos_res["calibrated_probability"], 0.0)
        self.assertIsNotNone(oos_res["abstention_reason"])

    # =========================================================================
    # Test 4: Full Flow URGENT_ESCALATION Life-Threat Priority
    # =========================================================================
    def test_004_full_pipeline_urgent_priority(self):
        urgent_text = "Crushing chest pain radiating down my left arm with cold sweats and severe breathlessness."
        res = self.predictor.predict_disease(urgent_text)

        self.assertEqual(res["decision"], "URGENT_ESCALATION")
        self.assertFalse(res["abstained"])
        self.assertIsNone(res["prediction"])
        self.assertEqual(res["calibrated_probability"], 0.0)
        self.assertIn("Emergency", res["urgency"])
        self.assertGreater(len(res["precautions"]), 0)
        self.assertEqual(res["uncertainty"]["score"], 0.0)

    # =========================================================================
    # Test 5: Invariant Verification - Never Silently Convert Decisions
    # =========================================================================
    def test_005_invariants_never_silently_convert(self):
        # 1. ABSTAIN must NEVER produce a valid condition prediction
        abstain_queries = [
            "My mother has high blood pressure and diabetes.",
            "I feel slightly off today.",
            "Tell me about the weather in Mumbai.",
            "Broken jaw bone and knocked out teeth."
        ]
        for q in abstain_queries:
            res = self.predictor.predict_disease(q)
            self.assertEqual(res["decision"], "ABSTAIN", f"Expected ABSTAIN for query: {q}")
            self.assertIsNone(res["prediction"], f"Prediction must be None on ABSTAIN for query: {q}")
            self.assertTrue(res["abstained"])

        # 2. CLARIFY must NEVER force an unclarified generic single symptom into PREDICT
        clarify_queries = [
            "headache",
            "fever",
            "stomach pain",
            "fatigue"
        ]
        for q in clarify_queries:
            res = self.predictor.predict_disease(q)
            self.assertEqual(res["decision"], "CLARIFY", f"Expected CLARIFY for query: {q}")
            self.assertFalse(res["abstained"])
            self.assertGreater(len(res["questions"]), 0, f"Expected questions for query: {q}")

    # =========================================================================
    # Test 6: Python Subprocess JSON Interface (Node.js ML Service Bridge)
    # =========================================================================
    def test_006_subprocess_json_contract_execution(self):
        script_path = os.path.join(os.path.dirname(__file__), "enhanced_predict_service.py")
        payload = json.dumps({
            "symptoms": "yellowing of skin, dark urine, vomiting, severe fatigue",
            "triageContext": {"rounds": []}
        })

        proc = subprocess.run(
            [sys.executable, script_path, payload],
            capture_output=True,
            text=True
        )

        self.assertEqual(proc.returncode, 0, f"Subprocess failed: {proc.stderr}")
        data = json.loads(proc.stdout)

        self.assertEqual(data["decision"], "PREDICT")
        self.assertEqual(data["prediction"]["condition"], "Jaundice")
        self.assertIn("calibrated_probability", data)
        self.assertIn("uncertainty", data)
        self.assertIn("matched_symptoms", data)
        self.assertEqual(data["model_version"], "medisync360-v2.0-calibrated-rf")

if __name__ == "__main__":
    unittest.main(verbosity=2)
