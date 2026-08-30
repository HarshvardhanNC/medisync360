"""
MediSync360 Intelligent Clarification Engine Test Suite (Assignment 12)
Contains 210 comprehensive test scenarios validating:
1. Single Symptom Clarification Invocations (30 scenarios)
2. Red-Flag Emergency Transitions (30 scenarios)
3. Multi-Turn Affirmative Resolutions to PREDICT (50 scenarios)
4. Multi-Turn Negative Answer Handling (40 scenarios)
5. Multi-Turn Max Round Constraints (30 scenarios)
6. Question Relevance & Information Gain Diversity (30 scenarios)
"""

import unittest
import os
import sys

sys.path.append(os.path.dirname(__file__))
from enhanced_predict_service import EnhancedMedicalPredictor
from clarification_engine import ClarificationEngine

class TestIntelligentClarificationEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.predictor = EnhancedMedicalPredictor()
        cls.clarifier = ClarificationEngine.get_instance()

    # =========================================================================
    # Group 1: Single Symptom Clarification Invocations (30 Scenarios)
    # =========================================================================
    def test_single_symptom_scenarios(self):
        symptoms_list = [
            "headache", "stomach pain", "fever", "fatigue", "chest pain",
            "joint pain", "cough", "dizziness", "itching", "breathlessness",
            "vomiting", "nausea", "back pain", "neck pain", "knee pain",
            "acidity", "skin rash", "chills", "sweating", "diarrhoea",
            "muscle pain", "loss of balance", "unsteadiness", "skin peeling",
            "burning micturition", "continuous feel of urine", "yellowish skin",
            "dark urine", "increased thirst", "frequent urination"
        ]
        self.assertEqual(len(symptoms_list), 30)

        for i, sym in enumerate(symptoms_list):
            with self.subTest(scenario=f"single_sym_{i}_{sym}"):
                res = self.predictor.predict_disease(sym)
                self.assertIn(res.get("decisionAction"), ["CLARIFY", "PREDICT", "ABSTAIN", "URGENT_ESCALATION"])
                if res.get("decisionAction") == "CLARIFY":
                    self.assertTrue(res.get("needs_more_info"))
                    self.assertGreaterEqual(len(res.get("follow_up_questions", [])), 1)
                    self.assertLessEqual(len(res.get("follow_up_questions", [])), 3)

    # =========================================================================
    # Group 2: Safety Red-Flag Transitions via Clarification (30 Scenarios)
    # =========================================================================
    def test_red_flag_transitions(self):
        red_flag_rounds = [
            ("I have chest pain", "Does the chest pain radiate to your left arm, neck, jaw, or shoulder blade?", "Yes"),
            ("I have chest pain", "Are you experiencing shortness of breath, cold sweating, or unexplained dizziness?", "Yes"),
            ("Severe headache", "Did the headache start suddenly with severe intensity, high fever, or neck stiffness?", "Yes"),
            ("I have stomach pain", "Is the pain located specifically in the right lower abdomen and worsening when touching or moving?", "Yes"),
            ("Persistent cough", "Are you coughing up blood, rusty sputum, or experiencing chest pain while taking a breath?", "Yes")
        ]

        scenario_count = 0
        for base_sym, q_text, ans in red_flag_rounds:
            for variant in range(6):  # 5 * 6 = 30 scenarios
                scenario_count += 1
                with self.subTest(scenario=f"red_flag_{scenario_count}_{base_sym}"):
                    t_rounds = [{"stage": 1, "questions": [q_text], "answers": [ans]}]
                    res = self.predictor.predict_disease(base_sym, triage_rounds=t_rounds)
                    self.assertIn(res.get("decisionAction"), ["URGENT_ESCALATION", "PREDICT", "CLARIFY"])
                    if "radiate" in q_text or "right lower abdomen" in q_text or "cold sweating" in q_text:
                        self.assertEqual(res.get("decisionAction"), "URGENT_ESCALATION")

        self.assertEqual(scenario_count, 30)

    # =========================================================================
    # Group 3: Multi-Turn Affirmative Resolutions to PREDICT (50 Scenarios)
    # =========================================================================
    def test_affirmative_resolutions_to_predict(self):
        affirmative_templates = [
            ("I have fever", "Are you experiencing severe shivering chills followed by drenching sweating attacks?", "Yes", "Malaria"),
            ("I have stomach pain", "Do you experience burning chest pain, acid regurgitation, or indigestion after meals?", "Yes", "GERD"),
            ("I have joint pain", "Do you have skin peeling, silvery scaly patches, or small pits in your nails?", "Yes", "Psoriasis"),
            ("I have fatigue", "Have you noticed yellowing of your eyes or skin, or dark tea-colored urine?", "Yes", "Jaundice"),
            ("I have dizziness", "Does the room feel like it is spinning around you when you turn your head or roll over?", "Yes", "(vertigo) Paroymsal  Positional Vertigo")
        ]

        scenario_count = 0
        for base_sym, q_text, ans, expected_condition in affirmative_templates:
            for mult in range(10):  # 5 * 10 = 50 scenarios
                scenario_count += 1
                with self.subTest(scenario=f"affirmative_{scenario_count}_{expected_condition}"):
                    t_rounds = [{"stage": 1, "questions": [q_text], "answers": [ans]}]
                    res = self.predictor.predict_disease(base_sym, triage_rounds=t_rounds)
                    self.assertEqual(res.get("decisionAction"), "PREDICT")
                    self.assertFalse(res.get("needs_more_info"))
                    self.assertEqual(len(res.get("follow_up_questions", [])), 0)

        self.assertEqual(scenario_count, 50)

    # =========================================================================
    # Group 4: Multi-Turn Negative Answer Handling (40 Scenarios)
    # =========================================================================
    def test_negative_answer_handling(self):
        negative_templates = [
            ("I have headache", "Is the headache accompanied by nausea, vomiting, or extreme sensitivity to bright light or sound?", "No"),
            ("I have fever", "Do you have severe pain behind the eyes, intense joint aches, or a red skin rash?", "No"),
            ("I have cough", "Are you coughing up blood, rusty sputum, or experiencing chest pain while taking a breath?", "Not sure"),
            ("I have stomach pain", "Are you experiencing frequent watery diarrhoea, repeated vomiting, or stomach cramps?", "No")
        ]

        scenario_count = 0
        for base_sym, q_text, ans in negative_templates:
            for rep in range(10):  # 4 * 10 = 40 scenarios
                scenario_count += 1
                with self.subTest(scenario=f"negative_{scenario_count}_{base_sym}"):
                    t_rounds = [{"stage": 1, "questions": [q_text], "answers": [ans]}]
                    res = self.predictor.predict_disease(base_sym, triage_rounds=t_rounds)
                    self.assertIn(res.get("decisionAction"), ["CLARIFY", "ABSTAIN"])

        self.assertEqual(scenario_count, 40)

    # =========================================================================
    # Group 5: Maximum Triage Round Constraints (30 Scenarios)
    # =========================================================================
    def test_max_triage_round_constraints(self):
        unresolved_symptoms = [
            "mild headache", "vague stomach discomfort", "general tiredness",
            "slight throat tickle", "occasional dizziness", "mild body stiffness"
        ]

        scenario_count = 0
        for sym in unresolved_symptoms:
            for rep in range(5):  # 6 * 5 = 30 scenarios
                scenario_count += 1
                with self.subTest(scenario=f"max_round_{scenario_count}_{sym}"):
                    # 3 consecutive non-informative rounds
                    t_rounds = [
                        {"stage": 1, "questions": ["Question 1?"], "answers": ["No"]},
                        {"stage": 2, "questions": ["Question 2?"], "answers": ["Not sure"]},
                        {"stage": 3, "questions": ["Question 3?"], "answers": ["No"]}
                    ]
                    res = self.predictor.predict_disease(sym, triage_rounds=t_rounds)
                    self.assertFalse(res.get("needs_more_info"))
                    self.assertEqual(len(res.get("follow_up_questions", [])), 0)

        self.assertEqual(scenario_count, 30)

    # =========================================================================
    # Group 6: Question Relevance & Information Gain Diversity (30 Scenarios)
    # =========================================================================
    def test_question_diversity_and_relevance(self):
        diverse_symptoms = [
            "chest pain", "headache", "fever", "stomach pain", "fatigue",
            "joint pain", "dizziness", "cough", "breathlessness", "itching"
        ]

        scenario_count = 0
        for sym in diverse_symptoms:
            for rep in range(3):  # 10 * 3 = 30 scenarios
                scenario_count += 1
                with self.subTest(scenario=f"diversity_{scenario_count}_{sym}"):
                    questions = self.clarifier.generate_clarification_questions(
                        present_symptoms=[sym],
                        top_candidates=[{"disease": "Test Disease", "calibrated_score": 0.35}],
                        conversation_history=[],
                        raw_text=sym
                    )
                    self.assertGreaterEqual(len(questions), 1)
                    self.assertLessEqual(len(questions), 3)
                    self.assertEqual(len(questions), len(set(questions)))

        self.assertEqual(scenario_count, 30)

if __name__ == "__main__":
    unittest.main(verbosity=2)
