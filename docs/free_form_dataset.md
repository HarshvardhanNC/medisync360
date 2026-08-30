# MediSync360 Free-Form Clinical Symptom Dataset (Assignment 4)

**Document Type:** Technical Specification & Dataset Documentation  
**Phase:** Assignment 4 — Realistic Free-Form Symptom Description Dataset  
**Target System:** MediSync360 Disease Prediction Engine  
**Status:** Generated, Validated, and Sealed  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Clinical Objective

While legacy diagnostic engines expect rigid, comma-separated medical tokens (`["high_fever", "chills", "sweating"]`), real patients describe their health experiences in unstructured natural language:
* *"For the past three days I've had a high fever. I keep getting intense chills and then wake up sweating heavily."*
* *"I've been extremely tired lately and get breathless whenever I climb stairs."*
* *"My stomach hurts after eating and I get a burning feeling in my chest."*

**Assignment 4 Objective:** Construct a realistic, linguistically diverse dataset of free-form clinical descriptions grounded strictly in verified underlying cases from our leakage-free splits, with a **strictly locked Final Test Set** (`evaluation/free_form_test_set.json`).

---

## 2. Ground-Truth Integrity & Anti-Hallucination Policy

> [!IMPORTANT]
> **Strict Source-of-Truth Rule:**
> 1. Every free-form narrative is deterministically linked to a verified underlying case from Assignment 3 via `parent_case_id` and cryptographic `pattern_hash`.
> 2. Under no circumstances are disease labels generated, modified, or imputed by LLMs or heuristics.
> 3. Ground-truth disease classifications and canonical symptom evidence remain 100% anchored in the underlying case.

---

## 3. Linguistic Diversity & Archetype Taxonomy

To ensure the model learns robust generalization across varied patient communication styles, narratives are generated across five clinical archetypes:

```
                                  Verified Clinical Case
                                            │
               ┌──────────────┬─────────────┼──────────────┬──────────────┐
               ▼              ▼             ▼              ▼              ▼
         SHORT_DIRECT   CONVERSATIONAL   DETAILED      COLLOQUIAL     TYPOS_PHONETIC
         (1 sentence)   (2 sentences)  (3+ sentences)  (Lay terms)    (Spelling errors)
```

### Archetype Descriptions & Examples

| Linguistic Style | Structural Characteristics | Clinical Narrative Example |
| :--- | :--- | :--- |
| **`SHORT_DIRECT`** | 1 concise, direct reporting sentence with temporal context | *"I am experiencing headache, loss of balance, and spinning movements for the past three days."* |
| **`CONVERSATIONAL`** | 2 sentences featuring natural conversational openers and conjunctions | *"Doctor, I need some help with my health. I've been having nausea and vomiting since yesterday morning. Additionally, I also noticed unsteadiness."* |
| **`DETAILED_NARRATIVE`** | 3+ sentences with symptom progression, duration, and severity modifiers | *"For the past few days I have been experiencing severe dizziness. It progressively developed into loss of balance, alongside vomiting. Furthermore, I have also noticed headache."* |
| **`COLLOQUIAL`** | Lay-person idioms and non-technical phrasing | *"Hey doctor, my room spinning has been acting up over the last 24 to 48 hours and I keep having unsteadiness and throwing up."* |
| **`TYPOS_PHONETIC`** | Realistic typos, phonetic misspellings, and informal abbreviations | *"Feeling very sick, having hedache with diziness and nawsea since last night."* |

---

## 4. Free-Form Case Schema Specification

Every record in `data/free_form_cases/` adheres to the following standardized schema:

```json
{
  "free_form_case_id": "FF_CASE_TRAIN_0001_95c913_SHO_01_a1b2",
  "parent_case_id": "CASE_TRAIN_0001_95c913",
  "split": "TRAIN",
  "disease": "(vertigo) Paroymsal  Positional Vertigo",
  "canonical_symptoms": [
    "headache",
    "loss of balance",
    "nausea",
    "spinning movements",
    "unsteadiness",
    "vomiting"
  ],
  "free_form_text": "I am experiencing headache, loss of balance, nausea, spinning movements, unsteadiness, and vomiting for the past three days.",
  "linguistic_style": "SHORT_DIRECT",
  "duration_mentioned": "for the past three days",
  "severity_mentioned": "UNKNOWN",
  "provenance": {
    "source_case_id": "CASE_TRAIN_0001_95c913",
    "pattern_hash": "95c91377ff047eb5",
    "split_assignment": "TRAIN",
    "generator_version": "1.0.0"
  }
}
```

---

## 5. Split Distribution & Cross-Split Leakage Prevention

Narratives are generated strictly within their assigned split partitions. **Near-duplicate descriptions and parent cases are prohibited from crossing split boundaries.**

```
Total Master Free-Form Narratives (912 cases)
          │
          ├── 70.39% ──► TRAIN FREE-FORM (642 cases across 214 underlying patterns)
          ├── 14.80% ──► VALIDATION FREE-FORM (135 cases across 45 underlying patterns)
          └── 14.80% ──► FINAL TEST FREE-FORM (135 cases across 45 underlying patterns) [LOCKED]
```

### Automated Leakage Verification Results

| Leakage & Integrity Check | Target | Observed Result | Status |
| :--- | :---: | :---: | :---: |
| **Parent Case Overlap ($\text{Train} \cap \text{Val}$)** | $0$ | **0** | **PASSED** |
| **Parent Case Overlap ($\text{Train} \cap \text{Test}$)** | $0$ | **0** | **PASSED** |
| **Parent Case Overlap ($\text{Val} \cap \text{Test}$)** | $0$ | **0** | **PASSED** |
| **Exact Narrative Text Overlap ($\text{Train} \cap \text{Val}$)** | $0$ | **0** | **PASSED** |
| **Exact Narrative Text Overlap ($\text{Train} \cap \text{Test}$)** | $0$ | **0** | **PASSED** |
| **Exact Narrative Text Overlap ($\text{Val} \cap \text{Test}$)** | $0$ | **0** | **PASSED** |
| **Disease Label Verification** | 100% Ground Truth | **100% Aligned** | **PASSED** |
| **Total Generated & Validated Records** | 912 | **912 cases** | **PASSED** |

---

## 6. Generated Artifacts & Locked Test Benchmark

* **Master Free-Form Dataset (912 cases):** [`data/free_form_cases/free_form_master.json`](file:///c:/Users/admin/Desktop/medisync360/data/free_form_cases/free_form_master.json)
* **Training Free-Form Split (642 cases):** [`data/free_form_cases/train_free_form.json`](file:///c:/Users/admin/Desktop/medisync360/data/free_form_cases/train_free_form.json)
* **Validation Free-Form Split (135 cases):** [`data/free_form_cases/val_free_form.json`](file:///c:/Users/admin/Desktop/medisync360/data/free_form_cases/val_free_form.json)
* **Final Test Free-Form Split (135 cases):** [`data/free_form_cases/test_free_form.json`](file:///c:/Users/admin/Desktop/medisync360/data/free_form_cases/test_free_form.json)
* **Locked Final Test Benchmark:** [`evaluation/free_form_test_set.json`](file:///c:/Users/admin/Desktop/medisync360/evaluation/free_form_test_set.json)

---

## 7. Validation Tooling & CLI Commands

To regenerate and validate the free-form dataset at any time:
```powershell
python backend/ml_model/generate_free_form_dataset.py
```

To run the complete suite of tests (Ontology, Case Builder, Free-Form Generator, and ML Leakage):
```powershell
python backend/ml_model/test_ontology.py
python backend/ml_model/build_case_dataset.py
python backend/ml_model/generate_free_form_dataset.py
python backend/ml_model/evaluate_model.py
```

---
*End of Assignment 4 Documentation.*
