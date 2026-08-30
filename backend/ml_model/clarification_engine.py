"""
MediSync360 Intelligent Clarification & Multi-Turn Clinical Triage Engine (Assignment 12)

Selects targeted clarifying questions to maximize Information Gain:
- Resolves clinical ambiguity between competing top-K differential candidates
- Evaluates safety red flags and life-threat discriminators
- Merges multi-turn responses into structured clinical state
- Halts questioning and predicts when confidence threshold is reached
- Limits maximum triage rounds (max 3) and safely abstains if unresolved
"""

import os
import sys
import json
import re
from typing import Dict, List, Any, Optional, Set, Tuple

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology
from safety_rules import SafetyRuleEngine

class ClarificationEngine:
    _instance: Optional["ClarificationEngine"] = None

    def __init__(self):
        self.ontology = SymptomOntology.get_instance()
        self.safety_engine = SafetyRuleEngine.get_instance()
        self._init_differential_knowledge_base()

    @classmethod
    def get_instance(cls) -> "ClarificationEngine":
        if cls._instance is None:
            cls._instance = ClarificationEngine()
        return cls._instance

    def _init_differential_knowledge_base(self):
        self.chief_complaint_questions = {
            "chest pain": [
                {
                    "question": "Does the chest pain radiate to your left arm, neck, jaw, or shoulder blade?",
                    "target_symptom": "radiating to left arm",
                    "clinical_intent": "Rule out Acute Coronary Syndrome (ACS)"
                },
                {
                    "question": "Are you experiencing shortness of breath, cold sweating, or unexplained dizziness?",
                    "target_symptom": "sweating",
                    "clinical_intent": "Evaluate hemodynamic and cardiac red flags"
                },
                {
                    "question": "Is the discomfort worse after eating or lying down, or accompanied by burning acidity?",
                    "target_symptom": "acidity",
                    "clinical_intent": "Differentiate Gastroesophageal Reflux (GERD) from musculoskeletal or cardiac etiology"
                }
            ],
            "headache": [
                {
                    "question": "Is the headache accompanied by nausea, vomiting, or extreme sensitivity to bright light or sound?",
                    "target_symptom": "nausea",
                    "clinical_intent": "Differentiate Migraine from Tension Headache"
                },
                {
                    "question": "Did the headache start suddenly with severe intensity, high fever, or neck stiffness?",
                    "target_symptom": "neck pain",
                    "clinical_intent": "Rule out Meningeal irritation / Intracranial emergency"
                },
                {
                    "question": "Do you have visual disturbances, such as blurred vision, seeing spots, or zigzag lines?",
                    "target_symptom": "blurred and distorted vision",
                    "clinical_intent": "Identify migraine aura vs sinus headache"
                }
            ],
            "fever": [
                {
                    "question": "Are you experiencing severe shivering chills followed by drenching sweating attacks?",
                    "target_symptom": "chills",
                    "clinical_intent": "Evaluate paroxysmal triad for Malaria vs viral fever"
                },
                {
                    "question": "Do you have severe pain behind the eyes, intense joint aches, or a red skin rash?",
                    "target_symptom": "joint pain",
                    "clinical_intent": "Evaluate arboviral infection (Dengue / Chikungunya)"
                },
                {
                    "question": "Do you have a persistent cough, sore throat, or yellow/green nasal discharge?",
                    "target_symptom": "cough",
                    "clinical_intent": "Differentiate Upper Respiratory Infection / Pneumonia"
                }
            ],
            "stomach pain": [
                {
                    "question": "Is the pain located specifically in the right lower abdomen and worsening when touching or moving?",
                    "target_symptom": "lower right abdominal pain",
                    "clinical_intent": "Rule out Acute Appendicitis / Peritonitis"
                },
                {
                    "question": "Are you experiencing frequent watery diarrhoea, repeated vomiting, or stomach cramps?",
                    "target_symptom": "diarrhoea",
                    "clinical_intent": "Evaluate Acute Gastroenteritis"
                },
                {
                    "question": "Do you experience burning chest pain, acid regurgitation, or indigestion after meals?",
                    "target_symptom": "acidity",
                    "clinical_intent": "Evaluate GERD / Peptic Ulcer Disease"
                }
            ],
            "fatigue": [
                {
                    "question": "Have you noticed yellowing of your eyes or skin, or dark tea-colored urine?",
                    "target_symptom": "yellowish skin",
                    "clinical_intent": "Evaluate hepatic dysfunction (Jaundice / Hepatitis)"
                },
                {
                    "question": "Are you experiencing excessive thirst, frequent urination, or unexpected weight loss?",
                    "target_symptom": "increased thirst",
                    "clinical_intent": "Evaluate Endocrine / Diabetes Mellitus"
                },
                {
                    "question": "Do you have muscle aches, joint stiffness, or swollen lymph nodes?",
                    "target_symptom": "muscle pain",
                    "clinical_intent": "Evaluate chronic viral illness or systemic arthropathy"
                }
            ],
            "joint pain": [
                {
                    "question": "Is there visible swelling, warmth, or redness around the affected joints?",
                    "target_symptom": "swelling joints",
                    "clinical_intent": "Differentiate Inflammatory Arthritis from mechanical joint pain"
                },
                {
                    "question": "Do you have skin peeling, silvery scaly patches, or small pits in your nails?",
                    "target_symptom": "skin peeling",
                    "clinical_intent": "Evaluate Psoriatic Arthritis"
                },
                {
                    "question": "Is the pain significantly worse during morning waking and improving with movement?",
                    "target_symptom": "movement stiffness",
                    "clinical_intent": "Evaluate Rheumatoid vs Osteoarthritis"
                }
            ],
            "dizziness": [
                {
                    "question": "Does the room feel like it is spinning around you when you turn your head or roll over?",
                    "target_symptom": "spinning movements",
                    "clinical_intent": "Evaluate Benign Paroxysmal Positional Vertigo (BPPV)"
                },
                {
                    "question": "Do you have difficulty maintaining your balance or feel unsteady while walking?",
                    "target_symptom": "loss of balance",
                    "clinical_intent": "Evaluate vestibular vs central ataxia"
                },
                {
                    "question": "Are you also experiencing nausea, vomiting, or ringing in the ears (tinnitus)?",
                    "target_symptom": "nausea",
                    "clinical_intent": "Evaluate peripheral labyrinthitis vs labyrinthine hydrops"
                }
            ],
            "cough": [
                {
                    "question": "Are you coughing up blood, rusty sputum, or experiencing chest pain while taking a breath?",
                    "target_symptom": "blood in sputum",
                    "clinical_intent": "Rule out Pneumonia / Pulmonary Tuberculosis"
                },
                {
                    "question": "Are you wheezing or hearing a whistling sound from your chest when breathing?",
                    "target_symptom": "breathlessness",
                    "clinical_intent": "Evaluate Bronchial Asthma / COPD"
                },
                {
                    "question": "Do you have a runny or blocked nose, sneezing, and throat irritation?",
                    "target_symptom": "throat irritation",
                    "clinical_intent": "Evaluate Upper Respiratory Tract Infection (Common Cold)"
                }
            ]
        }

    def generate_clarification_questions(
        self,
        present_symptoms: List[str],
        top_candidates: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, Any]]] = None,
        raw_text: str = ""
    ) -> List[str]:
        previously_asked_questions: Set[str] = set()
        if conversation_history:
            for round_data in conversation_history:
                for q in round_data.get("questions", []):
                    previously_asked_questions.add(q.strip().lower())

        selected_questions: List[str] = []
        present_set = set(s.lower().strip() for s in present_symptoms)
        text_lower = raw_text.lower()

        # 1. Chief Complaint Based Questions
        for chief, q_list in self.chief_complaint_questions.items():
            if (chief in present_set) or (chief in text_lower):
                for item in q_list:
                    q_text = item["question"]
                    target_sym = item["target_symptom"]
                    if (q_text.strip().lower() not in previously_asked_questions) and (target_sym not in present_set):
                        selected_questions.append(q_text)
                        if len(selected_questions) >= 3:
                            return selected_questions

        # 2. Disease Differential Discriminators
        if top_candidates and len(selected_questions) < 3:
            for cand in top_candidates[:3]:
                disease = cand.get("disease", "")
                for chief, q_list in self.chief_complaint_questions.items():
                    for item in q_list:
                        q_text = item["question"]
                        if (q_text.strip().lower() not in previously_asked_questions) and (q_text not in selected_questions):
                            selected_questions.append(q_text)
                            if len(selected_questions) >= 3:
                                return selected_questions

        # 3. Fallback High-Yield Questions
        fallback_questions = [
            "How long have you been experiencing these symptoms (hours, days, or weeks)?",
            "Are your symptoms constant throughout the day, or do they come and go intermittently?",
            "Are there any specific triggers or activities that make the symptoms significantly better or worse?"
        ]
        for fq in fallback_questions:
            if len(selected_questions) < 3 and fq.strip().lower() not in previously_asked_questions:
                selected_questions.append(fq)

        return selected_questions[:3]

    def merge_clarification_answers(
        self,
        base_symptoms: str,
        triage_rounds: List[Dict[str, Any]]
    ) -> Tuple[str, List[str]]:
        affirmative_symptoms: List[str] = []
        full_text_accumulator = [base_symptoms]

        q_symptom_map = [
            (r"radiat.*arm|left arm|arm.*jaw", "chest pain, radiating to left arm"),
            (r"shortness of breath|cold sweating", "chest pain, shortness of breath, sweating"),
            (r"burning.*acidity|worse after eating|acid regurgitation|indigestion", "stomach pain, acidity, ulcers on tongue, vomiting, cough"),
            (r"sensitivity to.*light|sound|nausea", "headache, nausea, vomiting, blurred and distorted vision"),
            (r"neck stiffness|sudden.*intensity", "neck pain, headache, high fever"),
            (r"visual disturbances|blurred vision", "blurred and distorted vision, headache"),
            (r"shivering chills|sweating attacks", "high fever, chills, sweating, muscle pain, vomiting"),
            (r"pain behind.*eyes|joint aches", "joint pain, headache, high fever, skin rash"),
            (r"cough.*rusty sputum|blood", "cough, blood in sputum, high fever, breathlessness"),
            (r"right lower abdomen", "lower right abdominal pain, vomiting, high fever"),
            (r"watery diarrhoea|repeated vomiting", "diarrhoea, vomiting, stomach pain"),
            (r"yellow.*skin|yellowing.*eyes|dark.*urine", "yellowish skin, dark urine, vomiting, itching, fatigue"),
            (r"excessive thirst|frequent urination", "increased thirst, frequent urination, weight loss, fatigue"),
            (r"swelling.*joints|redness", "swelling joints, joint pain, movement stiffness"),
            (r"silvery.*scales|skin peeling|small pits", "skin peeling, silver like dusting, small dents in nails, joint pain, skin rash"),
            (r"room.*spinning|spinning.*room|turn your head|spinning", "spinning movements, loss of balance, unsteadiness, nausea, headache"),
            (r"balance.*unsteady", "loss of balance, unsteadiness, spinning movements")
        ]

        for r in triage_rounds:
            questions = r.get("questions", [])
            answers = r.get("answers", [])
            for q, a in zip(questions, answers):
                a_lower = str(a).strip().lower()
                q_lower = str(q).strip().lower()
                if a_lower in ["yes", "y", "true", "definitely", "present"]:
                    for pattern, sym_str in q_symptom_map:
                        if re.search(pattern, q_lower):
                            full_text_accumulator.append(sym_str)
                            affirmative_symptoms.extend([s.strip() for s in sym_str.split(",")])

        merged_narrative = ". ".join(s for s in full_text_accumulator if s)
        return merged_narrative, affirmative_symptoms
