"""
MediSync360 Unified Prediction API Contract Test Suite (Assignment 16)

Validates the full cross-layer contract across all 4 clinical decisions:
1. PREDICT: Valid condition, calibrated probability, alternatives, uncertainty, non-abstained.
2. CLARIFY: Targeted questions, current information, missing information, uncertainty, non-abstained.
3. ABSTAIN: Prediction is null, abstained is True, abstention reason provided, uncertainty quantified.
4. URGENT_ESCALATION: Life-threat emergency urgency, prediction is null, emergency precautions prioritized.
"""

import unittest
import os
import sys
import json

sys.path.append(os.path.dirname(__file__))
from enhanced_predict_service import EnhancedMedicalPredictor

class TestUnifiedPredictionApiContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()

    # =========================================================================
    # Contract Test 1: PREDICT
    # =========================================================================
    def test_001_contract_predict_decision(self):
        res = self.predictor.predict_disease("high fever, severe shivering chills, drenching sweats, muscle pain, vomiting")
        
        # 1. Canonical Contract Keys (11 Required Fields)
        self.assertEqual(res.get("decision"), "PREDICT")
        self.assertFalse(res.get("abstained"))
        self.assertIsNotNone(res.get("prediction"))
        self.assertIn("condition", res["prediction"])
        self.assertIn("probability", res["prediction"])
        self.assertIn("confidence_percentage", res["prediction"])
        self.assertEqual(res["prediction"]["condition"], "Malaria")
        self.assertGreaterEqual(res["prediction"]["probability"], 0.40)
        
        # Calibrated probability field
        self.assertIn("calibrated_probability", res)
        self.assertEqual(res["calibrated_probability"], res["prediction"]["probability"])
        
        # Alternatives
        self.assertIsInstance(res.get("alternatives"), list)
        
        # Matched symptoms
        self.assertIn("matched_symptoms", res)
        self.assertIn("chills", res.get("matched_symptoms", []))
        
        # Missing information
        self.assertIn("missing_information", res)
        self.assertEqual(res.get("missing_information"), [])
        
        # Uncertainty
        self.assertIn("uncertainty", res)
        self.assertIn("score", res["uncertainty"])
        self.assertIn("entropy", res["uncertainty"])
        self.assertIn("level", res["uncertainty"])
        
        # Urgency
        self.assertIn("urgency", res)
        self.assertIsInstance(res["urgency"], str)
        
        # Clarification questions
        self.assertEqual(res.get("questions"), [])
        self.assertEqual(res.get("clarification_questions"), [])
        
        # Abstention reason
        self.assertIsNone(res.get("abstention_reason"))
        
        # Model version
        self.assertEqual(res.get("model_version"), "medisync360-v2.0-calibrated-rf")
        
        # 2. Backward Compatibility Properties
        self.assertEqual(res.get("decisionAction"), "PREDICT")
        self.assertEqual(res.get("predictedCondition"), "Malaria")
        self.assertFalse(res.get("needs_more_info"))
        self.assertEqual(res.get("follow_up_questions"), [])

    # =========================================================================
    # Contract Test 2: CLARIFY
    # =========================================================================
    def test_002_contract_clarify_decision(self):
        res = self.predictor.predict_disease("I have a headache")
        
        # 1. Canonical Contract Keys (11 Required Fields)
        self.assertEqual(res.get("decision"), "CLARIFY")
        self.assertFalse(res.get("abstained"))
        self.assertIsNotNone(res.get("prediction"))
        self.assertIn("calibrated_probability", res)
        
        # Alternatives
        self.assertIsInstance(res.get("alternatives"), list)
        
        # Matched symptoms
        self.assertIn("matched_symptoms", res)
        self.assertIn("headache", res.get("matched_symptoms", []))
        
        # Missing information
        self.assertIn("missing_information", res)
        self.assertGreater(len(res["missing_information"]), 0)
        
        # Uncertainty
        self.assertIn("uncertainty", res)
        self.assertGreater(res["uncertainty"]["score"], 0.40)
        
        # Urgency
        self.assertIn("urgency", res)
        
        # Clarification questions
        self.assertGreaterEqual(len(res.get("questions", [])), 1)
        self.assertLessEqual(len(res.get("questions", [])), 3)
        self.assertEqual(res.get("questions"), res.get("clarification_questions"))
        
        # Reason
        self.assertIsNotNone(res.get("reason"))
        self.assertIsNone(res.get("abstention_reason"))
        
        # Model version
        self.assertEqual(res.get("model_version"), "medisync360-v2.0-calibrated-rf")
        
        # 2. Backward Compatibility Properties
        self.assertEqual(res.get("decisionAction"), "CLARIFY")
        self.assertTrue(res.get("needs_more_info"))
        self.assertEqual(len(res.get("follow_up_questions", [])), len(res.get("questions", [])))

    # =========================================================================
    # Contract Test 3: ABSTAIN
    # =========================================================================
    def test_003_contract_abstain_decision(self):
        res = self.predictor.predict_disease("I slipped on the ice and have a severe compound bone fracture in my leg")
        
        # 1. Canonical Contract Keys (11 Required Fields)
        self.assertEqual(res.get("decision"), "ABSTAIN")
        self.assertTrue(res.get("abstained"))
        self.assertIsNone(res.get("prediction"))
        self.assertEqual(res.get("calibrated_probability"), 0.0)
        self.assertEqual(res.get("alternatives"), [])
        self.assertIn("matched_symptoms", res)
        self.assertIn("missing_information", res)
        
        # Uncertainty
        self.assertIn("uncertainty", res)
        self.assertEqual(res["uncertainty"]["score"], 1.0)
        
        # Urgency
        self.assertIn("urgency", res)
        
        # Questions
        self.assertEqual(res.get("questions"), [])
        self.assertEqual(res.get("clarification_questions"), [])
        
        # Abstention reason
        self.assertIsNotNone(res.get("abstention_reason"))
        self.assertIsNotNone(res.get("reason"))
        self.assertEqual(res.get("model_version"), "medisync360-v2.0-calibrated-rf")
        
        # 2. Backward Compatibility Properties
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")
        self.assertFalse(res.get("needs_more_info"))
        self.assertEqual(res.get("confidence"), 0.0)

    # =========================================================================
    # Contract Test 4: URGENT_ESCALATION
    # =========================================================================
    def test_004_contract_urgent_escalation_decision(self):
        res = self.predictor.predict_disease("Crushing substernal chest pain radiating to left arm with cold diaphoresis and breathlessness")
        
        # 1. Canonical Contract Keys (11 Required Fields)
        self.assertEqual(res.get("decision"), "URGENT_ESCALATION")
        self.assertFalse(res.get("abstained"))
        self.assertIsNone(res.get("prediction"))
        self.assertEqual(res.get("calibrated_probability"), 0.0)
        self.assertEqual(res.get("alternatives"), [])
        self.assertIn("matched_symptoms", res)
        self.assertIn("missing_information", res)
        
        # Uncertainty
        self.assertIn("uncertainty", res)
        self.assertEqual(res["uncertainty"]["score"], 0.0)
        
        # Urgency
        self.assertIn("Emergency", res.get("urgency", ""))
        
        # Questions
        self.assertEqual(res.get("questions"), [])
        self.assertEqual(res.get("clarification_questions"), [])
        
        # Reason
        self.assertIsNotNone(res.get("reason"))
        self.assertIsNone(res.get("abstention_reason"))
        self.assertEqual(res.get("model_version"), "medisync360-v2.0-calibrated-rf")
        
        # 2. Backward Compatibility Properties
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")
        self.assertTrue(res.get("isEmergency"))
        self.assertFalse(res.get("needs_more_info"))
        self.assertGreater(len(res.get("precautions", [])), 0)

if __name__ == "__main__":
    unittest.main(verbosity=2)
