"""
MediSync360 Rule Engine Regression Test Suite (Assignment 8)
Verifies:
1. Generic single symptoms are NOT assigned arbitrary high-confidence diagnoses (No Migraine 95%, GERD 93%, etc.)
2. Life-threatening emergency red-flags trigger immediate URGENT_ESCALATION
3. Diagnostic evidence gently calibrates probabilities without hardcoded manual overrides
4. Safe handling of ambiguous queries
"""

import unittest
import os
import sys

sys.path.append(os.path.dirname(__file__))
from enhanced_predict_service import EnhancedMedicalPredictor
from safety_rules import SafetyRuleEngine
from diagnostic_evidence import DiagnosticEvidenceEngine

class TestRedesignedRuleEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()
        cls.safety_engine = SafetyRuleEngine.get_instance()
        cls.evidence_engine = DiagnosticEvidenceEngine.get_instance()

    # =========================================================================
    # Group 1: Non-Overconfident Generic Symptoms (No Unsafe Overrides)
    # =========================================================================
    def test_001_headache_not_forced_migraine_95(self):
        res = self.predictor.predict_disease("headache")
        self.assertNotEqual(res.get("confidence"), 95.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertIn(res.get("decisionAction"), ["CLARIFY", "ABSTAIN"])

    def test_002_stomach_pain_not_forced_gerd_93(self):
        res = self.predictor.predict_disease("stomach pain")
        self.assertNotEqual(res.get("confidence"), 93.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertIn(res.get("decisionAction"), ["CLARIFY", "ABSTAIN"])

    def test_003_wheezing_not_forced_asthma_96(self):
        res = self.predictor.predict_disease("wheezing")
        self.assertNotEqual(res.get("confidence"), 96.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertIn(res.get("decisionAction"), ["CLARIFY", "ABSTAIN"])

    def test_004_joint_pain_not_forced_osteoarthritis_95(self):
        res = self.predictor.predict_disease("joint pain")
        self.assertNotEqual(res.get("confidence"), 95.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    def test_005_knee_pain_not_forced_osteoarthritis_95(self):
        res = self.predictor.predict_disease("knee pain")
        self.assertNotEqual(res.get("confidence"), 95.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    def test_006_acidity_not_forced_gerd_95(self):
        res = self.predictor.predict_disease("acidity")
        self.assertNotEqual(res.get("confidence"), 95.0)
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    def test_007_itching_not_forced_fungal_95(self):
        res = self.predictor.predict_disease("itching")
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    def test_008_fatigue_not_overconfident(self):
        res = self.predictor.predict_disease("fatigue")
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    # =========================================================================
    # Group 2: Category A Safety Red-Flags (Immediate URGENT_ESCALATION)
    # =========================================================================
    def test_009_cardiac_crushing_chest_pain_escalation(self):
        res = self.predictor.predict_disease("Severe crushing chest pain radiating to left arm with cold sweating.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")
        self.assertIn("Emergency", res.get("urgencyLevel", ""))

    def test_010_stroke_fast_slurred_speech_escalation(self):
        res = self.predictor.predict_disease("Sudden weakness on one side of body, facial drooping, and slurred speech.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_011_coma_unresponsive_escalation(self):
        res = self.predictor.predict_disease("Patient is unresponsive in a deep coma.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_012_gi_bleed_hemorrhage_escalation(self):
        res = self.predictor.predict_disease("Vomiting large volumes of dark blood and stomach bleeding.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_013_acute_abdomen_appendicitis_escalation(self):
        res = self.predictor.predict_disease("Severe sharp lower right abdominal pain with vomiting and high fever.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_014_chest_pain_and_breathlessness_safety_eval(self):
        res = self.predictor.predict_disease("Chest pain and severe shortness of breath.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertIn("Emergency", res.get("urgencyLevel", ""))

    # =========================================================================
    # Group 3: Category B Diagnostic Evidence Engine
    # =========================================================================
    def test_015_malaria_triad_evidence_support(self):
        res = self.predictor.predict_disease("high fever, chills, sweating, muscle pain, and headache for 3 days.")
        self.assertEqual(res.get("predictedCondition"), "Malaria")
        self.assertGreater(res.get("confidence", 0.0), 50.0)
        self.assertEqual(res.get("decisionAction"), "PREDICT")

    def test_016_jaundice_triad_evidence_support(self):
        res = self.predictor.predict_disease("itching, vomiting, fatigue, yellowish skin, dark urine, abdominal pain.")
        self.assertIn(res.get("predictedCondition"), ["Jaundice", "Hepatitis C", "Hepatitis B"])
        self.assertIn(res.get("decisionAction"), ["PREDICT", "CLARIFY"])

    def test_017_ambiguous_in_domain_clarify(self):
        res = self.predictor.predict_disease("I have high fever and headache.")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")
        self.assertGreater(len(res.get("alternativePossibilities", [])), 0)

    def test_018_empty_noise_abstain(self):
        res = self.predictor.predict_disease("I feel weird today.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")
        self.assertEqual(res.get("confidence"), 0.0)

if __name__ == "__main__":
    unittest.main(verbosity=2)
