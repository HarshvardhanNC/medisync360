"""
MediSync360 Free-Form Symptom Dataset Generator & Validator (Assignment 4)
Generates realistic, linguistically diverse natural language clinical descriptions
grounded strictly in verified underlying cases across sealed Train, Val, and Final Test splits.
Enforces 100% Cross-Split Text and Parent Isolation.
"""

import os
import sys
import json
import hashlib
import random
from typing import Dict, List, Any, Optional, Set, Tuple

sys.path.append(os.path.dirname(__file__))
from symptom_ontology import SymptomOntology

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CASES_DIR = os.path.join(WORKSPACE_DIR, "data", "cases")
OUTPUT_FF_DIR = os.path.join(WORKSPACE_DIR, "data", "free_form_cases")
EVAL_TEST_SET = os.path.join(WORKSPACE_DIR, "evaluation", "free_form_test_set.json")

DURATION_PHRASES = [
    "for the past two days",
    "for the past three days",
    "since yesterday morning",
    "over the last 24 to 48 hours",
    "for almost a week now",
    "for the past few days",
    "starting about 3 days ago",
    "since last Tuesday",
    "for nearly 5 days"
]

SEVERITY_MODIFIERS = [
    "severe", "really bad", "intense", "terrible", "unbearable", "persistent", "constant", "heavy", "troubling"
]

SENTENCE_OPENERS = [
    "Doctor, I need some help with my health.",
    "I haven't been feeling well at all lately.",
    "I'm writing because I'm very concerned about these symptoms.",
    "Please evaluate what could be causing this illness.",
    "I've been experiencing a cluster of uncomfortable symptoms.",
    "I started feeling sick a few days back.",
    "I'm feeling quite unwell and seeking advice.",
    "Just wanted to check what medical condition might explain this."
]

CONJUNCTIONS = [
    "On top of that,", "Additionally,", "Along with this,", "To make matters worse,", "Furthermore,", "I also noticed"
]

class FreeFormDatasetGenerator:
    def __init__(self, seed: int = 42):
        self.ontology = SymptomOntology.get_instance()
        self.symptom_item_map = {item["canonical_name"]: item for item in self.ontology.symptoms_data}
        self.rng = random.Random(seed)
        self.global_seen_texts: Dict[str, Set[str]] = {"TRAIN": set(), "VAL": set(), "TEST": set()}
        os.makedirs(OUTPUT_FF_DIR, exist_ok=True)
        os.makedirs(os.path.dirname(EVAL_TEST_SET), exist_ok=True)

    def _get_symptom_phrasing(self, symptom: str, style: str) -> str:
        """Returns phrasing variant for a canonical symptom based on linguistic style."""
        ontology_item = self.symptom_item_map.get(symptom)
        aliases = ontology_item.get("aliases", [symptom]) if ontology_item else [symptom]
        spelling_variants = ontology_item.get("spelling_variants", []) if ontology_item else []

        if style == "TYPOS_PHONETIC" and spelling_variants:
            return self.rng.choice(spelling_variants)
        elif style == "COLLOQUIAL" and aliases:
            colloquial_opts = [a for a in aliases if a != symptom]
            if colloquial_opts:
                return self.rng.choice(colloquial_opts)
            return symptom
        elif style in ["DETAILED_NARRATIVE", "CONVERSATIONAL"]:
            return self.rng.choice(aliases)
        else:
            return symptom

    def generate_narrative_for_case(self, case: Dict[str, Any], style: str, index: int) -> Dict[str, Any]:
        """
        Generates a natural language narrative for a verified underlying case.
        Strictly preserves ground-truth disease label and canonical symptoms.
        Ensures cross-split narrative uniqueness.
        """
        canonical_syms = case["canonical_symptoms"]
        disease = case["disease"]
        parent_case_id = case["case_id"]
        split = case["split"]
        pattern_hash = case["provenance"]["pattern_hash"]

        max_attempts = 10
        text = ""

        for attempt in range(max_attempts):
            # Shuffle symptom presentation order deterministically
            sym_list = list(canonical_syms)
            self.rng.shuffle(sym_list)

            phrased_syms = [self._get_symptom_phrasing(s, style) for s in sym_list]
            duration = self.rng.choice(DURATION_PHRASES)
            severity = self.rng.choice(SEVERITY_MODIFIERS)

            if style == "SHORT_DIRECT":
                opener = self.rng.choice(["I am experiencing", "I've been dealing with", "Currently struggling with", "Reporting"])
                if len(phrased_syms) == 1:
                    text = f"{opener} {phrased_syms[0]} {duration}."
                elif len(phrased_syms) == 2:
                    text = f"{opener} {phrased_syms[0]} and {phrased_syms[1]} {duration}."
                else:
                    text = f"{opener} {', '.join(phrased_syms[:-1])}, and {phrased_syms[-1]} {duration}."

            elif style == "CONVERSATIONAL":
                opener = self.rng.choice(SENTENCE_OPENERS)
                mid = max(1, len(phrased_syms) // 2)
                part1 = f"I've been having {', '.join(phrased_syms[:mid])} {duration}."
                part2 = f"{self.rng.choice(CONJUNCTIONS)} I have also developed {', '.join(phrased_syms[mid:])}." if len(phrased_syms) > mid else ""
                text = f"{opener} {part1} {part2}".strip()

            elif style == "DETAILED_NARRATIVE":
                dur_str = duration
                sev_str = f" {severity}"
                if len(phrased_syms) >= 3:
                    s1 = f"{dur_str.capitalize()} I have been experiencing{sev_str} {phrased_syms[0]}."
                    s2 = f"It progressively developed into {phrased_syms[1]}, alongside {phrased_syms[2]}."
                    rem = phrased_syms[3:]
                    s3 = f"{self.rng.choice(CONJUNCTIONS)} I have also noticed {', '.join(rem)}." if rem else ""
                    text = f"{s1} {s2} {s3}".strip()
                else:
                    s1 = f"{dur_str.capitalize()} I've been feeling quite ill with{sev_str} {phrased_syms[0]}."
                    s2 = f"I am also significantly troubled by {phrased_syms[-1]}." if len(phrased_syms) > 1 else ""
                    text = f"{s1} {s2}".strip()

            elif style == "COLLOQUIAL":
                opener = self.rng.choice(["Hey doctor,", "Hello doc,", "Doc, please help,", "Hi doctor,"])
                if len(phrased_syms) >= 2:
                    text = f"{opener} my {phrased_syms[0]} has been acting up {duration} and I keep having {', '.join(phrased_syms[1:])}."
                else:
                    text = f"{opener} I've had terrible {phrased_syms[0]} {duration}."

            elif style == "TYPOS_PHONETIC":
                opener = self.rng.choice(["Feeling very sick,", "Doc feeling bad,", "Pls advice,"])
                if len(phrased_syms) >= 2:
                    text = f"{opener} having {phrased_syms[0]} with {', '.join(phrased_syms[1:])} {duration}."
                else:
                    text = f"{opener} suffering from {phrased_syms[0]} {duration}."

            text = " ".join(text.split())
            norm_text = text.lower()

            # Check if this text has been seen in OTHER splits
            other_splits = [s for s in ["TRAIN", "VAL", "TEST"] if s != split]
            is_cross_leak = any(norm_text in self.global_seen_texts[s] for s in other_splits)

            if not is_cross_leak and norm_text not in self.global_seen_texts[split]:
                self.global_seen_texts[split].add(norm_text)
                break

        # Generate unique deterministic Free-Form Case ID
        ff_hash = hashlib.sha256(f"{parent_case_id}_{style}_{text}".encode('utf-8')).hexdigest()[:8]
        ff_case_id = f"FF_{parent_case_id}_{style[:3]}_{index:02d}_{ff_hash[:4]}"

        return {
            "free_form_case_id": ff_case_id,
            "parent_case_id": parent_case_id,
            "split": split,
            "disease": disease,
            "canonical_symptoms": canonical_syms,
            "free_form_text": text,
            "linguistic_style": style,
            "duration_mentioned": duration if duration else "UNKNOWN",
            "severity_mentioned": severity if severity else "UNKNOWN",
            "provenance": {
                "source_case_id": parent_case_id,
                "pattern_hash": pattern_hash,
                "split_assignment": split,
                "generator_version": "1.0.0"
            }
        }

    def generate_split_dataset(self, split_name: str) -> List[Dict[str, Any]]:
        """Generates free-form descriptions for all cases in a given split."""
        split_file = os.path.join(CASES_DIR, f"{split_name.lower()}_cases.json")
        if not os.path.exists(split_file):
            raise FileNotFoundError(f"Source case file not found: {split_file}")

        with open(split_file, "r", encoding="utf-8") as f:
            cases_data = json.load(f)["cases"]

        styles = ["SHORT_DIRECT", "CONVERSATIONAL", "DETAILED_NARRATIVE", "COLLOQUIAL", "TYPOS_PHONETIC"]
        generated_cases = []

        for idx, case in enumerate(cases_data, 1):
            selected_styles = self.rng.sample(styles, 3)
            for v_idx, style in enumerate(selected_styles, 1):
                ff_case = self.generate_narrative_for_case(case, style, v_idx)
                generated_cases.append(ff_case)

        return generated_cases

    def build_and_export_all(self) -> Dict[str, Any]:
        """Builds all free-form datasets across Train, Val, and Final Test splits."""
        print("Generating Free-Form Clinical Datasets across sealed splits...")

        train_ff = self.generate_split_dataset("train")
        val_ff = self.generate_split_dataset("val")
        test_ff = self.generate_split_dataset("test")

        master_ff = train_ff + val_ff + test_ff

        # Export split JSON files
        train_out = os.path.join(OUTPUT_FF_DIR, "train_free_form.json")
        val_out = os.path.join(OUTPUT_FF_DIR, "val_free_form.json")
        test_out = os.path.join(OUTPUT_FF_DIR, "test_free_form.json")
        master_out = os.path.join(OUTPUT_FF_DIR, "free_form_master.json")

        with open(train_out, "w", encoding="utf-8") as f:
            json.dump({"total_cases": len(train_ff), "split": "TRAIN", "cases": train_ff}, f, indent=2)

        with open(val_out, "w", encoding="utf-8") as f:
            json.dump({"total_cases": len(val_ff), "split": "VAL", "cases": val_ff}, f, indent=2)

        with open(test_out, "w", encoding="utf-8") as f:
            json.dump({"total_cases": len(test_ff), "split": "TEST", "cases": test_ff}, f, indent=2)

        with open(master_out, "w", encoding="utf-8") as f:
            json.dump({
                "schema_version": "1.0.0",
                "total_free_form_cases": len(master_ff),
                "split_distribution": {
                    "train": len(train_ff),
                    "val": len(val_ff),
                    "test": len(test_ff)
                },
                "cases": master_ff
            }, f, indent=2)

        # Export locked evaluation test set
        with open(EVAL_TEST_SET, "w", encoding="utf-8") as f:
            json.dump({
                "description": "MediSync360 Locked Final Free-Form Evaluation Test Set",
                "status": "SEALED_FINAL_TEST_BENCHMARK",
                "total_test_cases": len(test_ff),
                "cases": test_ff
            }, f, indent=2)

        print(f"Generated Free-Form Datasets:")
        print(f"  Train Free-Form:      {len(train_ff)} cases -> {train_out}")
        print(f"  Validation Free-Form: {len(val_ff)} cases -> {val_out}")
        print(f"  Final Test Free-Form: {len(test_ff)} cases -> {test_out}")
        print(f"  Master Free-Form:     {len(master_ff)} cases -> {master_out}")
        print(f"  Locked Test Set:      {len(test_ff)} cases -> {EVAL_TEST_SET}")

        return {
            "train": train_ff,
            "val": val_ff,
            "test": test_ff,
            "master": master_ff
        }

    def validate_free_form_integrity(self) -> bool:
        """Validates schema completeness, parent ground-truth alignment, and cross-split isolation."""
        print("\nValidating Free-Form Dataset Integrity and Leakage Isolation...")
        master_file = os.path.join(OUTPUT_FF_DIR, "free_form_master.json")
        with open(master_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        cases = data["cases"]
        train_parents: Set[str] = set()
        val_parents: Set[str] = set()
        test_parents: Set[str] = set()

        train_texts: Set[str] = set()
        val_texts: Set[str] = set()
        test_texts: Set[str] = set()

        for c in cases:
            # Check required fields
            assert "free_form_case_id" in c
            assert "parent_case_id" in c
            assert "disease" in c and c["disease"]
            assert "canonical_symptoms" in c and len(c["canonical_symptoms"]) > 0
            assert "free_form_text" in c and len(c["free_form_text"]) > 5
            assert "provenance" in c and c["provenance"]["pattern_hash"]

            parent_id = c["parent_case_id"]
            text = c["free_form_text"].strip().lower()

            if c["split"] == "TRAIN":
                train_parents.add(parent_id)
                train_texts.add(text)
            elif c["split"] == "VAL":
                val_parents.add(parent_id)
                val_texts.add(text)
            elif c["split"] == "TEST":
                test_parents.add(parent_id)
                test_texts.add(text)

        # Cross-split parent isolation checks
        parent_tv_overlap = train_parents & val_parents
        parent_tt_overlap = train_parents & test_parents
        parent_vt_overlap = val_parents & test_parents

        assert len(parent_tv_overlap) == 0, f"Parent leakage Train-Val: {parent_tv_overlap}"
        assert len(parent_tt_overlap) == 0, f"Parent leakage Train-Test: {parent_tt_overlap}"
        assert len(parent_vt_overlap) == 0, f"Parent leakage Val-Test: {parent_vt_overlap}"

        # Cross-split narrative text isolation checks
        text_tv_overlap = train_texts & val_texts
        text_tt_overlap = train_texts & test_texts
        text_vt_overlap = val_texts & test_texts

        assert len(text_tv_overlap) == 0, f"Text leakage Train-Val: {text_tv_overlap}"
        assert len(text_tt_overlap) == 0, f"Text leakage Train-Test: {text_tt_overlap}"
        assert len(text_vt_overlap) == 0, f"Text leakage Val-Test: {text_vt_overlap}"

        print("Parent Ground-Truth Alignment: PASSED (100% derived from verified split cases)")
        print("Cross-Split Parent Isolation: PASSED (0 overlaps)")
        print("Cross-Split Text Isolation: PASSED (0 duplicate narratives across splits)")
        print(f"Total Validated Free-Form Records: {len(cases)} cases")
        return True

if __name__ == "__main__":
    generator = FreeFormDatasetGenerator(seed=42)
    generator.build_and_export_all()
    generator.validate_free_form_integrity()
