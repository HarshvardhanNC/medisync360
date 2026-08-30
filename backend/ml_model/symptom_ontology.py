"""
MediSync360 Canonical Symptom Ontology & Entity Resolver
Assignment 2: Canonical Ontology, Normalization & Safe Clinical Parsing

Provides:
1. Canonical symptom vocabulary loading from data/symptom_ontology.json.
2. Fast index-based lookups for canonical names, aliases, and spelling variants.
3. Sentence-level and clause-level clinical negation detection (NegEx-style windowing).
4. Subject and entity attribution filtering (family history, 3rd-party, pets).
5. Single source of truth for both training preprocessing and inference extraction.
"""

import os
import json
import re
from typing import Dict, List, Set, Tuple, Optional, Any

ONTOLOGY_PATH_1 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "symptom_ontology.json"))
ONTOLOGY_PATH_2 = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "src", "data", "symptom_ontology.json"))

class SymptomOntology:
    _instance: Optional["SymptomOntology"] = None

    def __init__(self, ontology_path: Optional[str] = None):
        self.ontology_path = ontology_path or (ONTOLOGY_PATH_1 if os.path.exists(ONTOLOGY_PATH_1) else ONTOLOGY_PATH_2)
        self.symptoms_data: List[Dict[str, Any]] = []
        self.canonical_symptoms: List[str] = []
        self.canonical_to_id: Dict[str, str] = {}
        self.alias_to_canonical: Dict[str, str] = {}
        self.variant_to_canonical: Dict[str, str] = {}
        self.symptom_to_diseases: Dict[str, List[str]] = {}
        self.severity_map: Dict[str, int] = {}
        self.category_map: Dict[str, str] = {}
        self.load_ontology()

    @classmethod
    def get_instance(cls) -> "SymptomOntology":
        if cls._instance is None:
            cls._instance = SymptomOntology()
        return cls._instance

    def load_ontology(self):
        if not os.path.exists(self.ontology_path):
            raise FileNotFoundError(f"Symptom ontology not found at {self.ontology_path}")

        with open(self.ontology_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.symptoms_data = data.get("symptoms", [])
        self.canonical_symptoms = []
        self.canonical_to_id = {}
        self.alias_to_canonical = {}
        self.variant_to_canonical = {}
        self.symptom_to_diseases = {}
        self.severity_map = {}
        self.category_map = {}

        for item in self.symptoms_data:
            c_name = item["canonical_name"].strip().lower()
            sym_id = item["id"]
            self.canonical_symptoms.append(c_name)
            self.canonical_to_id[c_name] = sym_id
            self.severity_map[c_name] = item.get("severity_weight", 3)
            self.category_map[c_name] = item.get("category", "General")
            self.symptom_to_diseases[c_name] = item.get("associated_diseases", [])

            # Direct mapping
            self.alias_to_canonical[c_name] = c_name

            # Map raw dataset terms
            for term in item.get("original_dataset_terms", []):
                cleaned_term = " ".join(term.replace("_", " ").lower().split())
                self.alias_to_canonical[cleaned_term] = c_name

            # Map aliases
            for alias in item.get("aliases", []):
                cleaned_alias = " ".join(alias.replace("_", " ").lower().split())
                self.alias_to_canonical[cleaned_alias] = c_name

            # Map spelling variants
            for variant in item.get("spelling_variants", []):
                cleaned_var = " ".join(variant.replace("_", " ").lower().split())
                self.variant_to_canonical[cleaned_var] = c_name
                self.alias_to_canonical[cleaned_var] = c_name

        self.canonical_symptoms = sorted(self.canonical_symptoms)

    # ---------------------------------------------------------
    # Negation & Entity Patterns
    # ---------------------------------------------------------
    NEGATION_CUES = [
        r'\b(?:no|not|neither|nor|without|never|denies|denied|free of|negative for)\b',
        r'\b(?:don\'t have|do not have|does not have|doesn\'t have|did not have|didn\'t have)\b',
        r'\b(?:have no|has no|experiencing no|no signs of|no evidence of)\b'
    ]

    THIRD_PARTY_CUES = [
        r'\b(?:my mother|my father|my parents|my brother|my sister|my son|my daughter|my wife|my husband|my grandfather|my grandmother|my cousin|my uncle|my aunt|my friend|my colleague)\b',
        r'\b(?:my dog|my cat|my pet|my puppy|my kitten)\b',
        r'\b(?:his|her|their|someone else|a relative)\b'
    ]

    FAMILY_HISTORY_CUES = [
        r'\b(?:family history of|mother had|father had|parents had|grandfather had|grandmother had|runs in family|hereditary)\b'
    ]

    def normalize_term(self, term: str) -> Optional[str]:
        """
        Normalize a single symptom string (handling case, underscores, whitespace, typos, aliases).
        Returns canonical name or None.
        """
        if not term:
            return None
        cleaned = " ".join(term.replace("_", " ").lower().split())

        # 1. Direct canonical or alias match
        if cleaned in self.alias_to_canonical:
            return self.alias_to_canonical[cleaned]

        # 2. Spelling variant match
        if cleaned in self.variant_to_canonical:
            return self.variant_to_canonical[cleaned]

        # 3. Fuzzy matching for typos
        best_match = None
        best_score = 0.0
        for alias, canonical in self.alias_to_canonical.items():
            score = self._calculate_similarity(cleaned, alias)
            if score > best_score and score >= 0.82:
                best_score = score
                best_match = canonical

        return best_match

    def _calculate_similarity(self, s1: str, s2: str) -> float:
        """Compute string similarity based on token overlap & Levenshtein bigrams."""
        if s1 == s2:
            return 1.0
        if not s1 or not s2:
            return 0.0

        if len(s1) >= 4 and len(s2) >= 4:
            if s1 in s2 or s2 in s1:
                return 0.90

        pairs1 = set(s1[i:i+2] for i in range(len(s1)-1))
        pairs2 = set(s2[i:i+2] for i in range(len(s2)-1))
        if not pairs1 or not pairs2:
            return 0.0
        intersection = len(pairs1 & pairs2)
        return (2.0 * intersection) / (len(pairs1) + len(pairs2))

    def extract_canonical_symptoms(self, text: str) -> List[str]:
        """
        Extract canonical symptoms from natural language text with:
        1. Sentence & clause level third-party / family history attribution.
        2. Clause-level negation detection.
        3. Multi-word alias and spelling variant resolution.
        """
        if not text or not text.strip():
            return []

        text_clean = " ".join(text.lower().strip().split())

        # Split into major clauses by terminal punctuation, conjunctions, and contrastive markers
        major_delimiters = r'[.!?;,\n]|\b(?:but|however|except|while|although)\b'
        clauses = [c.strip() for c in re.split(major_delimiters, text_clean) if c.strip()]

        extracted: List[str] = []

        for clause in clauses:
            # Check third-party or family history context in this specific clause
            is_third_party = any(re.search(pat, clause) for pat in self.THIRD_PARTY_CUES)
            is_family_history = any(re.search(pat, clause) for pat in self.FAMILY_HISTORY_CUES)

            if is_third_party or is_family_history:
                continue  # Discard third-party clause

            # Sub-split on phrase connectors (and / plus / as well as)
            sub_clauses = [s.strip() for s in re.split(r'\b(?:and|plus|as well as|also)\b', clause) if s.strip()]

            for sub in sub_clauses:
                # Check for negation in sub-clause
                has_neg_cue = any(re.search(pat, sub) for pat in self.NEGATION_CUES)
                if has_neg_cue:
                    # Extract any non-negated part preceding negation word
                    without_match = re.search(r'\b(?:without|no|not|denies|neither|nor)\s+([^,]+)', sub)
                    if without_match:
                        pos_text = sub[:without_match.start()].strip()
                        if pos_text:
                            self._extract_from_phrase(pos_text, extracted)
                    continue

                self._extract_from_phrase(sub, extracted)

        return extracted

    def _extract_from_phrase(self, phrase: str, extracted_list: List[str]):
        """Helper to match longest canonical alias or variant in phrase."""
        # Search longest aliases first
        for alias, canonical in sorted(self.alias_to_canonical.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = r'\b' + re.escape(alias) + r'\b'
            if re.search(pattern, phrase):
                if canonical not in extracted_list:
                    extracted_list.append(canonical)

        # Search spelling variants
        for var, canonical in sorted(self.variant_to_canonical.items(), key=lambda x: len(x[0]), reverse=True):
            pattern = r'\b' + re.escape(var) + r'\b'
            if re.search(pattern, phrase):
                if canonical not in extracted_list:
                    extracted_list.append(canonical)
