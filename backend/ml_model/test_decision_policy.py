"""
MediSync360 Decision Policy & Selective Abstention Regression Test Suite (Assignment 11)

Verifies:
1. Clear In-Domain Cases -> PREDICT
2. Ambiguous In-Domain Cases -> CLARIFY
3. Single Generic Symptoms -> CLARIFY (Never overconfident forced prediction)
4. Out-of-Scope Cases -> ABSTAIN (Never forced to choose a known disease)
5. Insufficient / Unsupported Queries -> ABSTAIN
6. Contradictory Input -> CLARIFY / ABSTAIN
7. Pure Negation -> ABSTAIN
8. Third-Party Family History -> ABSTAIN
9. Acute Life-Safety Red-Flags -> URGENT_ESCALATION
"""

import unittest
import os
import sys
import json

sys.path.append(os.path.dirname(__file__))
from enhanced_predict_service import EnhancedMedicalPredictor

class TestDecisionPolicyRouting(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()
        
        dec_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "decision_cases", "decision_cases_master.json")
        if os.path.exists(dec_path):
            with open(dec_path, "r", encoding="utf-8") as f:
                cls.gold_cases = json.load(f)["cases"]
        else:
            cls.gold_cases = []

    # =========================================================================
    # Group 1: Clear In-Domain Cases -> PREDICT
    # =========================================================================
    def test_001_clear_malaria_triad_predict(self):
        res = self.predictor.predict_disease("high fever, severe chills, drenching sweating, muscle pain, and vomiting.")
        self.assertEqual(res.get("decisionAction"), "PREDICT")
        self.assertEqual(res.get("predictedCondition"), "Malaria")
        self.assertGreaterEqual(res.get("confidence", 0.0), 40.0)

    def test_002_clear_jaundice_triad_predict(self):
        res = self.predictor.predict_disease("itching, vomiting, yellowish skin, dark urine, and severe fatigue.")
        self.assertEqual(res.get("decisionAction"), "PREDICT")
        self.assertIn(res.get("predictedCondition"), ["Jaundice", "Hepatitis C", "Hepatitis B"])

    def test_003_clear_psoriasis_triad_predict(self):
        res = self.predictor.predict_disease("skin rash, joint pain, skin peeling, silver like dusting, and small dents in nails.")
        self.assertEqual(res.get("decisionAction"), "PREDICT")
        self.assertEqual(res.get("predictedCondition"), "Psoriasis")

    def test_004_clear_gerd_cluster_predict(self):
        res = self.predictor.predict_disease("stomach pain, acidity, ulcers on tongue, vomiting, and cough.")
        self.assertEqual(res.get("decisionAction"), "PREDICT")
        self.assertEqual(res.get("predictedCondition"), "GERD")

    # =========================================================================
    # Group 2: Ambiguous In-Domain Cases -> CLARIFY
    # =========================================================================
    def test_005_ambiguous_fever_headache_clarify(self):
        res = self.predictor.predict_disease("I have high fever and headache.")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")
        self.assertGreater(len(res.get("alternativePossibilities", [])), 0)

    def test_006_ambiguous_fatigue_nausea_clarify(self):
        res = self.predictor.predict_disease("Feeling tired with some nausea lately.")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    # =========================================================================
    # Group 3: Single Generic Symptoms -> CLARIFY (Never Forced Overconfident)
    # =========================================================================
    def test_007_single_headache_clarify(self):
        res = self.predictor.predict_disease("headache")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)

    def test_008_single_stomach_pain_clarify(self):
        res = self.predictor.predict_disease("stomach pain")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")
        self.assertLessEqual(res.get("confidence", 0.0), 50.0)

    def test_009_single_fatigue_clarify(self):
        res = self.predictor.predict_disease("fatigue")
        self.assertEqual(res.get("decisionAction"), "CLARIFY")

    # =========================================================================
    # Group 4: Out-Of-Scope Medical Queries -> ABSTAIN (No Forced Prediction)
    # =========================================================================
    def test_010_out_of_scope_fracture_abstain(self):
        res = self.predictor.predict_disease("I slipped on ice and have a severe compound fracture in my lower leg.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    def test_011_out_of_scope_toothache_abstain(self):
        res = self.predictor.predict_disease("Severe throbbing toothache with a deep cavity in my molar.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    # =========================================================================
    # Group 5: Insufficient / Unsupported Information -> ABSTAIN
    # =========================================================================
    def test_012_insufficient_vague_sick_abstain(self):
        res = self.predictor.predict_disease("I just feel sick and not myself today.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    def test_013_insufficient_noise_abstain(self):
        res = self.predictor.predict_disease("Hello doctor, I need advice.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    # =========================================================================
    # Group 6: Contradictory Input -> CLARIFY / ABSTAIN
    # =========================================================================
    def test_014_contradictory_input_abstain(self):
        res = self.predictor.predict_disease("I have a severe headache but no head pain at all.")
        self.assertIn(res.get("decisionAction"), ["CLARIFY", "ABSTAIN"])

    # =========================================================================
    # Group 7: Pure Negation -> ABSTAIN
    # =========================================================================
    def test_015_pure_negation_abstain(self):
        res = self.predictor.predict_disease("I do not have fever, no cough, no headache, and no stomach pain.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    # =========================================================================
    # Group 8: Third-Party / Family History -> ABSTAIN
    # =========================================================================
    def test_016_third_party_family_history_abstain(self):
        res = self.predictor.predict_disease("My father was diagnosed with type 2 diabetes and high blood pressure.")
        self.assertEqual(res.get("decisionAction"), "ABSTAIN")

    # =========================================================================
    # Group 9: Life-Safety Emergency Red-Flags -> URGENT_ESCALATION
    # =========================================================================
    def test_017_cardiac_red_flag_escalation(self):
        res = self.predictor.predict_disease("Crushing substernal chest pain radiating to left arm with cold diaphoresis.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_018_stroke_fast_red_flag_escalation(self):
        res = self.predictor.predict_disease("Sudden weakness on right side, facial drooping, and slurred speech.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")
        self.assertEqual(res.get("safetyEscalation"), "EMERGENCY")

    def test_019_coma_red_flag_escalation(self):
        res = self.predictor.predict_disease("Patient is completely unresponsive in a coma.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")

    def test_020_acute_abdomen_red_flag_escalation(self):
        res = self.predictor.predict_disease("Severe lower right abdominal pain with projectile vomiting and high fever.")
        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")

    # =========================================================================
    # Group 10: Full Gold-Standard Benchmark Execution (All 112 Cases)
    # =========================================================================
    def test_021_gold_standard_benchmark_accuracy(self):
        if not self.gold_cases:
            self.skipTest("Gold cases not available")

        correct_action_count = 0
        total = len(self.gold_cases)
        zero_false_prediction_on_ood = True

        for c in self.gold_cases:
            res = self.predictor.predict_disease(c["user_input"])
            pred_action = res.get("decisionAction")
            expected_action = c["expected_action"]

            # Exact match or valid safety escalation
            if pred_action == expected_action:
                correct_action_count += 1
            elif expected_action in ["PREDICT", "ABSTAIN"] and pred_action == "URGENT_ESCALATION":
                correct_action_count += 1
            elif expected_action == "CLARIFY" and pred_action in ["CLARIFY", "ABSTAIN"]:
                correct_action_count += 1
            elif expected_action == "ABSTAIN" and pred_action in ["ABSTAIN", "CLARIFY"]:
                correct_action_count += 1
            elif expected_action == "ABSTAIN" and pred_action == "PREDICT":
                zero_false_prediction_on_ood = False

        self.assertTrue(zero_false_prediction_on_ood, "Model must NEVER force PREDICT on OOD/ABSTAIN cases")
        action_accuracy = (correct_action_count / total) * 100.0
        self.assertGreaterEqual(action_accuracy, 95.0)

if __name__ == "__main__":
    unittest.main(verbosity=2)
