"""
MediSync360 Clinical Feature Engineering Engine (Assignment 7)

Provides unified feature representations for disease classification:
- Model A: Baseline binary symptom indicators (131 dimensions)
- Model B: Enhanced multi-dimensional clinical representation:
    1. Signed symptom presence & explicit negation vector (-1.0 to +1.4)
    2. Body system cluster densities (16 organ systems)
    3. Clinical burden & severity aggregations (count, max severity, total weighted burden)
    4. Temporal acuity tiers (acute, subacute, chronic)

Training and inference use the EXACT same feature extraction pipeline.
"""

import os
import sys
import json
import re
import numpy as np
from typing import Dict, List, Any, Optional, Tuple, Union

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology
from symptom_parser import ClinicalSymptomParser

SEVERITY_MULTIPLIERS = {
    "mild": 0.7,
    "moderate": 1.0,
    "severe": 1.4,
    "UNKNOWN": 1.0
}

BODY_SYSTEMS = [
    "constitutional", "respiratory", "gastrointestinal", "cardiovascular",
    "dermatological", "neurological", "musculoskeletal", "genitourinary",
    "endocrine", "ophthalmological", "otolaryngological", "hepatic",
    "immunological", "hematological", "psychological", "vascular"
]

class ClinicalFeatureExtractor:
    _instance: Optional["ClinicalFeatureExtractor"] = None

    def __init__(self):
        self.ontology = SymptomOntology.get_instance()
        self.parser = ClinicalSymptomParser.get_instance()
        
        self.canonical_symptoms = [item["canonical_name"] for item in self.ontology.symptoms_data]
        self.canonical_index = {name: idx for idx, name in enumerate(self.canonical_symptoms)}
        self.symptom_item_map = {item["canonical_name"]: item for item in self.ontology.symptoms_data}
        self.system_index = {sys_name: idx for idx, sys_name in enumerate(BODY_SYSTEMS)}

        self.model_a_feature_names = [f"sym_{s.replace(' ', '_')}" for s in self.canonical_symptoms]
        
        self.model_b_feature_names = (
            [f"sym_val_{s.replace(' ', '_')}" for s in self.canonical_symptoms] +
            [f"sys_density_{s}" for s in BODY_SYSTEMS] +
            ["total_positive_symptoms", "total_negated_symptoms", "max_severity_weight", "total_severity_score"] +
            ["temporal_acute", "temporal_subacute", "temporal_chronic"]
        )

    @classmethod
    def get_instance(cls) -> "ClinicalFeatureExtractor":
        if cls._instance is None:
            cls._instance = ClinicalFeatureExtractor()
        return cls._instance

    def extract_features_model_a(self, input_data: Union[str, List[str], Dict[str, Any]]) -> np.ndarray:
        """Extracts Model A (131 binary indicators) feature vector."""
        vec = np.zeros(len(self.canonical_symptoms), dtype=np.float32)
        present_symptoms = self._extract_present_symptoms(input_data)
        for sym in present_symptoms:
            norm = self.ontology.normalize_term(sym)
            if norm and norm in self.canonical_index:
                vec[self.canonical_index[norm]] = 1.0
        return vec

    def extract_features_model_b(self, input_data: Union[str, List[str], Dict[str, Any]]) -> np.ndarray:
        """Extracts Model B (154 rich clinical dimensions) feature vector."""
        sym_vec = np.zeros(len(self.canonical_symptoms), dtype=np.float32)
        sys_vec = np.zeros(len(BODY_SYSTEMS), dtype=np.float32)

        parsed_evidence = self._extract_parsed_evidence(input_data)
        
        pos_count = 0
        neg_count = 0
        max_sev_wt = 0.0
        total_sev_score = 0.0

        is_acute = 0.0
        is_subacute = 0.0
        is_chronic = 0.0

        for item in parsed_evidence:
            sym_name = item.get("canonical_symptom")
            status = item.get("status", "present")
            severity = item.get("severity", "UNKNOWN")
            duration = item.get("duration", "UNKNOWN")

            if not sym_name or sym_name not in self.canonical_index:
                continue

            idx = self.canonical_index[sym_name]
            ontology_info = self.symptom_item_map.get(sym_name, {})
            base_wt = ontology_info.get("severity_weight", 3)
            system = ontology_info.get("system", "constitutional")

            if status == "present":
                pos_count += 1
                sev_mult = SEVERITY_MULTIPLIERS.get(severity, 1.0)
                weighted_val = 1.0 * sev_mult
                sym_vec[idx] = weighted_val

                if system in self.system_index:
                    sys_vec[self.system_index[system]] += weighted_val

                if base_wt > max_sev_wt:
                    max_sev_wt = float(base_wt)
                total_sev_score += base_wt * sev_mult

            elif status == "absent":
                neg_count += 1
                sym_vec[idx] = -1.0

            if duration != "UNKNOWN":
                dur_lower = duration.lower()
                if any(t in dur_lower for t in ["hour", "yesterday", "last night", "today", "1 day", "2 day", "3 day", "two day", "three day"]):
                    is_acute = 1.0
                elif any(t in dur_lower for t in ["week", "4 day", "5 day", "6 day", "7 day", "10 day", "few day", "several day"]):
                    is_subacute = 1.0
                elif any(t in dur_lower for t in ["month", "year"]):
                    is_chronic = 1.0

        agg_vec = np.array([
            float(pos_count),
            float(neg_count),
            float(max_sev_wt),
            float(total_sev_score)
        ], dtype=np.float32)

        temp_vec = np.array([is_acute, is_subacute, is_chronic], dtype=np.float32)
        return np.concatenate([sym_vec, sys_vec, agg_vec, temp_vec])

    def _extract_present_symptoms(self, input_data: Union[str, List[str], Dict[str, Any]]) -> List[str]:
        if isinstance(input_data, str):
            parsed = self.parser.parse(input_data)
            return parsed["present_symptoms"]
        elif isinstance(input_data, list):
            return [str(s) for s in input_data if str(s).strip()]
        elif isinstance(input_data, dict):
            if "canonical_symptoms" in input_data and input_data["canonical_symptoms"]:
                return input_data["canonical_symptoms"]
            elif "present_symptoms" in input_data and input_data["present_symptoms"]:
                return input_data["present_symptoms"]
            elif "free_form_description" in input_data and input_data["free_form_description"]:
                return self.parser.parse(input_data["free_form_description"])["present_symptoms"]
            elif "free_form_text" in input_data and input_data["free_form_text"]:
                return self.parser.parse(input_data["free_form_text"])["present_symptoms"]
            elif "narrative" in input_data and input_data["narrative"]:
                return self.parser.parse(input_data["narrative"])["present_symptoms"]
            elif "user_input" in input_data and input_data["user_input"]:
                return self.parser.parse(input_data["user_input"])["present_symptoms"]
        return []

    def _extract_parsed_evidence(self, input_data: Union[str, List[str], Dict[str, Any]]) -> List[Dict[str, Any]]:
        if isinstance(input_data, str):
            parsed = self.parser.parse(input_data)
            return parsed["evidence_list"]
        elif isinstance(input_data, list):
            return [{"canonical_symptom": self.ontology.normalize_term(str(s)), "status": "present", "severity": "UNKNOWN", "duration": "UNKNOWN"} for s in input_data]
        elif isinstance(input_data, dict):
            if "evidence_list" in input_data and input_data["evidence_list"]:
                return input_data["evidence_list"]
            elif "canonical_symptoms" in input_data and input_data["canonical_symptoms"]:
                sev = input_data.get("severity", "UNKNOWN")
                dur = input_data.get("duration", "UNKNOWN")
                return [
                    {
                        "canonical_symptom": sym,
                        "status": "present",
                        "severity": sev,
                        "duration": dur
                    }
                    for sym in input_data["canonical_symptoms"]
                ]
            elif "free_form_description" in input_data and input_data["free_form_description"]:
                return self.parser.parse(input_data["free_form_description"])["evidence_list"]
            elif "free_form_text" in input_data and input_data["free_form_text"]:
                return self.parser.parse(input_data["free_form_text"])["evidence_list"]
            elif "narrative" in input_data and input_data["narrative"]:
                return self.parser.parse(input_data["narrative"])["evidence_list"]
            elif "user_input" in input_data and input_data["user_input"]:
                return self.parser.parse(input_data["user_input"])["evidence_list"]
        return []
