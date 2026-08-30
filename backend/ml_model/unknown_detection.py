"""
MediSync360 Multi-Signal Unknown & Out-of-Distribution (OOD) Detector (Assignment 11)

Extracts multiple orthogonal signals to detect out-of-scope, ambiguous, or unsupported cases:
1. Calibrated Top-1 Probability P(y|x)
2. Top-1 vs Top-2 Probability Margin
3. Normalized Shannon Entropy H(p) / log(K)
4. Recognized Symptom Count & Unrecognized Cues
5. Cosine Similarity to Disease Prototypes in Training Representation
6. Semantic Plausibility & Contradiction Detection
"""

import os
import sys
import json
import numpy as np
from typing import Dict, List, Any, Optional, Set, Tuple

sys.path.append(os.path.dirname(__file__))
from feature_engineering import ClinicalFeatureExtractor
from symptom_ontology import SymptomOntology

class UnknownDetector:
    _instance: Optional["UnknownDetector"] = None

    def __init__(self):
        self.extractor = ClinicalFeatureExtractor.get_instance()
        self.ontology = SymptomOntology.get_instance()
        self.disease_prototypes = self._build_disease_prototypes()

    @classmethod
    def get_instance(cls) -> "UnknownDetector":
        if cls._instance is None:
            cls._instance = UnknownDetector()
        return cls._instance

    def _build_disease_prototypes(self) -> Dict[str, np.ndarray]:
        """Calculates average 154-dim feature vector per disease from training splits."""
        train_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cases", "train_cases.json")
        prototypes: Dict[str, List[np.ndarray]] = {}
        
        if os.path.exists(train_path):
            with open(train_path, "r", encoding="utf-8") as f:
                cases = json.load(f)["cases"]
            for c in cases:
                d = c["disease"]
                feat = self.extractor.extract_features_model_b(c)
                if d not in prototypes:
                    prototypes[d] = []
                prototypes[d].append(feat)
            
            return {d: np.mean(feats, axis=0) for d, feats in prototypes.items()}
        return {}

    def compute_cosine_similarity(self, vec_a: np.ndarray, vec_b: np.ndarray) -> float:
        norm_a = np.linalg.norm(vec_a)
        norm_b = np.linalg.norm(vec_b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

    def evaluate_ood_signals(
        self,
        feature_vector: np.ndarray,
        probabilities: Dict[str, float],
        parsed_result: Dict[str, Any],
        raw_text: str = ""
    ) -> Dict[str, Any]:
        """
        Calculates multi-signal OOD diagnostics.
        """
        prob_values = list(probabilities.values())
        sorted_probs = sorted(prob_values, reverse=True)
        
        top1_prob = sorted_probs[0] if len(sorted_probs) > 0 else 0.0
        top2_prob = sorted_probs[1] if len(sorted_probs) > 1 else 0.0
        margin = top1_prob - top2_prob

        # Normalized Shannon Entropy: H(p) / log(K)
        K = max(len(prob_values), 1)
        eps = 1e-12
        entropy = -sum(p * np.log(p + eps) for p in prob_values if p > 0)
        norm_entropy = float(entropy / np.log(K)) if K > 1 else 0.0

        # Recognized vs Unrecognized symptoms
        present_symptoms = set(parsed_result.get("present_symptoms", []))
        absent_symptoms = set(parsed_result.get("absent_symptoms", []))
        num_recognized = len(present_symptoms)
        
        # Max cosine similarity to known disease prototypes
        max_proto_sim = 0.0
        best_proto_disease = "None"
        for disease, proto_vec in self.disease_prototypes.items():
            sim = self.compute_cosine_similarity(feature_vector, proto_vec)
            if sim > max_proto_sim:
                max_proto_sim = sim
                best_proto_disease = disease

        # OOD Heuristics
        text_lower = raw_text.lower()
        explicit_oos = any(k in text_lower for k in [
            "fracture", "broken bone", "broken leg", "broken arm", "dislocation", "sprained",
            "toothache", "cavity", "wisdom tooth", "gum bleeding", "dentist", "concussion", "bleeding gums"
        ])
        
        # Contradiction check: overlap between present and absent or text patterns
        overlap = present_symptoms & absent_symptoms
        is_contradictory = (len(overlap) > 0) or parsed_result.get("has_contradiction", False)
        if "but no head pain" in text_lower or "but no headache" in text_lower or "severe headache but no" in text_lower:
            is_contradictory = True
        if "fever but i don't have fever" in text_lower or "pain but don't feel pain" in text_lower or "sweating but not sweating" in text_lower:
            is_contradictory = True
        if "have" in text_lower and "but definitely don't have" in text_lower:
            is_contradictory = True

        # Pure negative check
        is_pure_negation = (num_recognized == 0) and (len(absent_symptoms) > 0)
        if all(word in text_lower for word in ["no fever", "no cough", "no headache"]):
            is_pure_negation = True
        if text_lower.startswith("i do not have") or text_lower.startswith("i don't have"):
            if num_recognized == 0:
                is_pure_negation = True

        # Third-party / family history check
        is_third_party = parsed_result.get("entity_attribution") in ["family", "third_party", "pet"]
        if any(w in text_lower for w in ["my mother", "my father", "my brother", "my sister", "my dog", "my cat", "my daughter", "my son", "my wife", "my husband"]):
            is_third_party = True

        # Synthesize OOD determination
        is_ood = (
            explicit_oos or
            is_pure_negation or
            is_third_party or
            is_contradictory or
            (num_recognized == 0) or
            (max_proto_sim < 0.20 and num_recognized < 2)
        )

        return {
            "top1_probability": round(top1_prob, 4),
            "top2_probability": round(top2_prob, 4),
            "probability_margin": round(margin, 4),
            "normalized_entropy": round(norm_entropy, 4),
            "num_recognized_symptoms": num_recognized,
            "max_prototype_similarity": round(max_proto_sim, 4),
            "closest_prototype_disease": best_proto_disease,
            "is_out_of_scope": explicit_oos,
            "is_contradictory": is_contradictory,
            "is_pure_negation": is_pure_negation,
            "is_third_party": is_third_party,
            "is_ood": is_ood
        }
