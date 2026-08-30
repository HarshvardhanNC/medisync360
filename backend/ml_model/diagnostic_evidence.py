"""
MediSync360 Diagnostic Evidence Engine (Assignment 8 - Category B)

Provides calibrated diagnostic evidence support for disease differentials.
Rules in this module contribute evidence to candidate disease ranking.
They NEVER manually assign arbitrary probabilities (e.g. 95% or 93%).
"""

from typing import Dict, List, Any, Optional, Set, Tuple
import os
import sys

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology

class DiagnosticEvidenceEngine:
    _instance: Optional["DiagnosticEvidenceEngine"] = None

    def __init__(self):
        self.ontology = SymptomOntology.get_instance()
        self._init_evidence_clusters()

    @classmethod
    def get_instance(cls) -> "DiagnosticEvidenceEngine":
        if cls._instance is None:
            cls._instance = DiagnosticEvidenceEngine()
        return cls._instance

    def _init_evidence_clusters(self):
        # Established pathognomonic symptom clusters (triads/tetrads)
        # Note: These provide evidence weights, NOT hardcoded probabilities.
        self.syndromic_clusters = {
            "Malaria": {
                "key_symptoms": {"high fever", "chills", "sweating", "muscle pain"},
                "min_key_matches": 3,
                "evidence_weight": 1.25,
                "clinical_note": "Paroxysmal triad of fever, rigors, and diaphoresis strongly supports Malaria differential."
            },
            "Jaundice": {
                "key_symptoms": {"yellowish skin", "yellowing of eyes", "dark urine"},
                "min_key_matches": 2,
                "evidence_weight": 1.30,
                "clinical_note": "Scleral icterus with bilirubinuria strongly supports Jaundice differential."
            },
            "Psoriasis": {
                "key_symptoms": {"skin peeling", "silver like dusting", "small dents in nails"},
                "min_key_matches": 2,
                "evidence_weight": 1.35,
                "clinical_note": "Silvery micaceous scales with nail pitting strongly supports Psoriasis differential."
            },
            "GERD": {
                "key_symptoms": {"acidity", "stomach pain", "passage of gases", "chest pain"},
                "min_key_matches": 2,
                "evidence_weight": 1.15,
                "clinical_note": "Acid regurgitation and epigastric burning support GERD differential."
            },
            "Urinary tract infection": {
                "key_symptoms": {"burning micturition", "continuous feel of urine", "bladder discomfort"},
                "min_key_matches": 2,
                "evidence_weight": 1.30,
                "clinical_note": "Dysuria with urinary urgency supports UTI differential."
            },
            "Diabetes ": {
                "key_symptoms": {"polyuria", "excessive hunger", "weight loss", "fatigue"},
                "min_key_matches": 2,
                "evidence_weight": 1.25,
                "clinical_note": "Osmotic diuresis triad (polyuria, polyphagia, weight loss) supports Diabetes differential."
            },
            "(vertigo) Paroymsal  Positional Vertigo": {
                "key_symptoms": {"spinning movements", "loss of balance", "unsteadiness", "nausea"},
                "min_key_matches": 2,
                "evidence_weight": 1.25,
                "clinical_note": "Rotational vertigo with ataxia and nausea supports BPPV differential."
            }
        }

    def evaluate_diagnostic_evidence(
        self,
        present_symptoms: List[str],
        base_probabilities: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Calibrates base ML disease probabilities using validated syndromic evidence.
        Enforces evidence checks:
        1. Single generic symptoms (headache, stomach pain, joint pain) receive NO artificial boost.
        2. Multi-symptom pathognomonic clusters receive calibrated likelihood adjustments.
        3. Identifies ambiguity when multiple in-scope candidates compete closely.
        """
        present_set = set(self.ontology.normalize_term(s) for s in present_symptoms if s)
        calibrated_scores: Dict[str, float] = dict(base_probabilities)
        active_evidence_notes: List[str] = []

        # Generic single symptom check: do NOT boost single non-specific symptoms
        if len(present_set) < 2:
            # Normalize probabilities as-is without arbitrary boost
            total_prob = sum(calibrated_scores.values()) or 1.0
            norm_scores = {k: v / total_prob for k, v in calibrated_scores.items()}
            sorted_candidates = sorted(norm_scores.items(), key=lambda x: x[1], reverse=True)
            
            return {
                "calibrated_probabilities": norm_scores,
                "top_candidates": [{"disease": d, "calibrated_score": round(s, 4)} for d, s in sorted_candidates[:5]],
                "is_ambiguous": len(sorted_candidates) > 1 and (sorted_candidates[0][1] - sorted_candidates[1][1] < 0.25),
                "needs_clarification": True,
                "evidence_notes": ["Single non-discriminative symptom presented. Insufficient evidence for definitive single-disease diagnosis."]
            }

        # Multi-symptom syndromic calibration
        for disease, cluster in self.syndromic_clusters.items():
            overlap = cluster["key_symptoms"] & present_set
            if len(overlap) >= cluster["min_key_matches"] and disease in calibrated_scores:
                # Apply gentle calibrated multiplier
                calibrated_scores[disease] *= cluster["evidence_weight"]
                active_evidence_notes.append(cluster["clinical_note"])

        # Re-normalize
        total_prob = sum(calibrated_scores.values()) or 1.0
        norm_scores = {k: v / total_prob for k, v in calibrated_scores.items()}
        sorted_candidates = sorted(norm_scores.items(), key=lambda x: x[1], reverse=True)

        top1_score = sorted_candidates[0][1] if sorted_candidates else 0.0
        top2_score = sorted_candidates[1][1] if len(sorted_candidates) > 1 else 0.0
        gap = top1_score - top2_score

        is_ambiguous = gap < 0.20
        needs_clarification = is_ambiguous or (top1_score < 0.40)

        return {
            "calibrated_probabilities": norm_scores,
            "top_candidates": [{"disease": d, "calibrated_score": round(s, 4)} for d, s in sorted_candidates[:5]],
            "is_ambiguous": is_ambiguous,
            "needs_clarification": needs_clarification,
            "evidence_notes": active_evidence_notes
        }
