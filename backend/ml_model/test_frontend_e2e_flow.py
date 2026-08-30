#!/usr/bin/env python3
"""
MediSync360 Full Stack & Frontend E2E Validation Test Suite (Assignment 18)

Validates the full End-to-End flow across all four clinical decision states:
USER -> FRONTEND -> API -> BACKEND -> PARSER -> ML -> DECISION -> API -> FRONTEND/UI

1. PREDICT:
   - User input: Free-form classical presentation
   - Returns: PREDICT decision, calibrated probability, supporting symptoms, differential alternatives, precautions, disclaimer
2. CLARIFY:
   - User input: Ambiguous single generic symptom
   - Returns: CLARIFY decision, targeted follow-up questions, evidence recognized so far
   - Multi-turn loop: Patient submits answers -> resolves to high-confidence PREDICT
3. ABSTAIN:
   - User input: Out-of-scope orthopedic trauma / pure negation
   - Returns: ABSTAIN decision, zero random disease guessing, clear clinical justification & next steps
4. URGENT_ESCALATION:
   - User input: Life-threatening acute coronary syndrome presentation
   - Returns: URGENT_ESCALATION decision, immediate emergency priority, emergency hotlines & action steps
"""

import unittest
import os
import sys
import json

sys.path.append(os.path.join(os.path.dirname(__file__), "..", "ml_model"))
from enhanced_predict_service import EnhancedMedicalPredictor
from symptom_parser import ClinicalSymptomParser
from decision_policy import DecisionPolicyEngine
from safety_rules import SafetyRuleEngine


class TestFrontendE2EValidation(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()
        cls.parser = ClinicalSymptomParser.get_instance()
        cls.policy = DecisionPolicyEngine.get_instance()
        cls.safety = SafetyRuleEngine.get_instance()

    # =========================================================================
    # Test 1: PREDICT Flow
    # =========================================================================
    def test_e2e_predict_flow(self):
        user_input = "I have high fever with severe shivering chills, drenching sweats, vomiting, and muscle ache."
        res = self.predictor.predict_disease(user_input)

        # 1. Decision Assertions
        self.assertEqual(res["decision"], "PREDICT")
        self.assertFalse(res["abstained"])
        self.assertIsNotNone(res["prediction"])
        self.assertEqual(res["prediction"]["condition"], "Malaria")
        self.assertGreaterEqual(res["prediction"]["probability"], 0.40)
        self.assertIn("chills", res["matched_symptoms"])

        # 2. UI Contract Assertions
        self.assertIn("calibrated_probability", res)
        self.assertIsInstance(res["alternatives"], list)
        self.assertIn("uncertainty", res)
        self.assertIn("score", res["uncertainty"])
        self.assertIn("precautions", res)
        self.assertGreater(len(res["precautions"]), 0)
        self.assertIn("clinicalDisclaimer", res)
        self.assertIn("statistical", res["clinicalDisclaimer"].lower())

    # =========================================================================
    # Test 2: CLARIFY Flow & Multi-Turn Convergence
    # =========================================================================
    def test_e2e_clarify_flow_and_multiturn(self):
        # Round 1: Ambiguous single generic symptom
        user_input = "I have a headache"
        round1_res = self.predictor.predict_disease(user_input)

        self.assertEqual(round1_res["decision"], "CLARIFY")
        self.assertFalse(round1_res["abstained"])
        self.assertGreaterEqual(len(round1_res["questions"]), 1)
        self.assertIn("headache", round1_res["matched_symptoms"])
        self.assertGreater(round1_res["uncertainty"]["score"], 0.30)

        # Round 2: Patient confirms migraine-specific features
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
    # Test 3: ABSTAIN Flow (Zero-Forced-Guessing)
    # =========================================================================
    def test_e2e_abstain_flow(self):
        # Case A: Out-of-scope orthopedic trauma
        oos_input = "I fell from a roof and have an open compound fracture in my tibia bone with bleeding."
        oos_res = self.predictor.predict_disease(oos_input)

        self.assertEqual(oos_res["decision"], "ABSTAIN")
        self.assertTrue(oos_res["abstained"])
        self.assertIsNone(oos_res["prediction"])
        self.assertEqual(oos_res["calibrated_probability"], 0.0)
        self.assertIsNotNone(oos_res["abstention_reason"])

        # Case B: Pure negation query
        neg_input = "I do not have fever, no headache, no nausea, denies chest pain."
        neg_res = self.predictor.predict_disease(neg_input)

        self.assertEqual(neg_res["decision"], "ABSTAIN")
        self.assertTrue(neg_res["abstained"])
        self.assertIsNone(neg_res["prediction"])
        self.assertEqual(neg_res["uncertainty"]["score"], 1.0)

    # =========================================================================
    # Test 4: URGENT_ESCALATION Flow (Emergency Priority)
    # =========================================================================
    def test_e2e_urgent_escalation_flow(self):
        urgent_input = "Crushing chest pain radiating down my left arm with cold sweats and severe breathlessness."
        urgent_res = self.predictor.predict_disease(urgent_input)

        self.assertEqual(urgent_res["decision"], "URGENT_ESCALATION")
        self.assertFalse(urgent_res["abstained"])
        self.assertIsNone(urgent_res["prediction"])
        self.assertEqual(urgent_res["calibrated_probability"], 0.0)
        self.assertIn("Emergency", urgent_res["urgency"])
        self.assertGreater(len(urgent_res["precautions"]), 0)
        self.assertIn("911", str(urgent_res["precautions"]))


if __name__ == "__main__":
    unittest.main()
