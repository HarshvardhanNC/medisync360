# MediSync360 Case Dataset Schema & Unified Representation (Assignment 3)

**Document Type:** Technical Specification & Data Schema  
**Phase:** Assignment 3 — Rich Case Representation & Provenance  
**Target System:** MediSync360 Disease Prediction Engine  
**Status:** Implemented, Validated, and Verified  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Problem Formulation

In legacy medical datasets (including Kaggle's disease-symptom dataset), data is stored exclusively as static binary or discrete tabular matrices: `Disease + [Symptom_1 ... Symptom_17]`.

However, in clinical practice:
* Real patients communicate in **free-form natural language** with temporal modifiers, negation, severity, and context.
* Triage engines require a **unified, extensible case representation** capable of handling both structured canonical records and unstructured clinical vignettes.
* Scientific integrity requires **strict provenance** (tracking exact raw row indices and cryptographic pattern hashes) and **zero data fabrication** (unknown attributes must remain `UNKNOWN` rather than synthetically guessed).

**Assignment 3 Objective:** Establish a normalized, rich, and deterministic Case Representation while preserving the original dataset files completely untouched.

---

## 2. Normalized Case Schema Specification

Every case in `data/cases/` adheres to the following JSON schema:

```json
{
  "case_id": "CASE_TRAIN_0001_95c913",
  "split": "TRAIN",
  "disease": "(vertigo) Paroymsal  Positional Vertigo",
  "original_raw_symptoms": [
    "headache",
    "loss of balance",
    "nausea",
    "spinning movements",
    "unsteadiness",
    "vomiting"
  ],
  "canonical_symptoms": [
    "headache",
    "loss of balance",
    "nausea",
    "spinning movements",
    "unsteadiness",
    "vomiting"
  ],
  "free_form_description": "UNKNOWN",
  "duration": "UNKNOWN",
  "severity": "UNKNOWN",
  "location": "UNKNOWN",
  "trigger": "UNKNOWN",
  "temporal_pattern": "UNKNOWN",
  "frequency": "UNKNOWN",
  "associated_symptoms": [],
  "explicit_negative_symptoms": [],
  "provenance": {
    "source_file": "backend/src/data/dataset.csv",
    "pattern_hash": "95c91377ff047eb5",
    "split_assignment": "TRAIN",
    "dataset_row_indices": [0, 492, 984, 1476, 1968, 2460, 2952, 3444, 3936, 4428]
  },
  "evidence_quality": {
    "completeness_score": 0.6,
    "symptom_count": 6,
    "record_type": "STRUCTURED_CANONICAL_RECORD",
    "has_explicit_negations": false,
    "has_temporal_modifiers": false,
    "is_synthetic_duplicate_derived": true
  }
}
```

### Detailed Field Definitions

| Field Name | Type | Required | Clinical & Technical Description |
| :--- | :---: | :---: | :--- |
| `case_id` | String | Yes | Unique deterministic identifier formatted as `CASE_<SPLIT>_<INDEX>_<HASH_PREFIX>`. |
| `split` | Enum | Yes | Data partition: `TRAIN`, `VAL`, `TEST`, or `BENCHMARK_CLINICAL`. |
| `disease` | String | Yes | Target clinical diagnosis (canonical disease label). |
| `original_raw_symptoms` | Array[String] | Yes | Raw, unnormalized symptom tokens preserved for 100% backward traceability. |
| `canonical_symptoms` | Array[String] | Yes | Normalized symptom tokens resolved via `SymptomOntology`. |
| `free_form_description` | String | Yes | Patient's raw clinical narrative (or `"UNKNOWN"` for purely structured records). |
| `duration` | String | Yes | Explicit clinical duration (e.g., `"3 days"`), or `"UNKNOWN"`. |
| `severity` | String | Yes | Explicit clinical severity (e.g., `"severe"`, `"mild"`), or `"UNKNOWN"`. |
| `location` | String | Yes | Anatomical localization (e.g., `"substernal"`, `"epigastric"`), or `"UNKNOWN"`. |
| `trigger` | String | Yes | Precipitating factors (e.g., `"after fatty meal"`), or `"UNKNOWN"`. |
| `temporal_pattern` | String | Yes | Progression / timing (e.g., `"nocturnal"`, `"paroxysmal"`), or `"UNKNOWN"`. |
| `frequency` | String | Yes | Recurrence cadence (e.g., `"daily"`, `"post-prandial"`), or `"UNKNOWN"`. |
| `associated_symptoms` | Array[String] | Yes | Secondary or contextual symptoms. |
| `explicit_negative_symptoms` | Array[String] | Yes | Symptoms explicitly negated by the patient (e.g., `"no fever"`). |
| `provenance` | Object | Yes | Traceability block linking back to source CSVs, row indices, and SHA-256 hashes. |
| `evidence_quality` | Object | Yes | Data richness indicators: completeness score, record type, negation flags. |

---

## 3. The "Never Invent Information" Policy

> [!CAUTION]
> **Strict Scientific Protocol:**
> Under no circumstances may missing clinical attributes be fabricated, hallucinated, or synthetically imputed.
> If a structured record does not explicitly specify a duration, severity, location, trigger, temporal pattern, or frequency, the value is strictly stored as `"UNKNOWN"`.

This prevents models from learning spurious correlations based on synthetic hallucinations.

---

## 4. Generated Artifacts & Directory Structure

The case dataset is structured under [`data/cases/`](file:///c:/Users/admin/Desktop/medisync360/data/cases):

* **Master Structured Cases (304 cases):** [`data/cases/cases_master.json`](file:///c:/Users/admin/Desktop/medisync360/data/cases/cases_master.json)
* **Training Split Cases (214 cases, 70.4%):** [`data/cases/train_cases.json`](file:///c:/Users/admin/Desktop/medisync360/data/cases/train_cases.json)
* **Validation Split Cases (45 cases, 14.8%):** [`data/cases/val_cases.json`](file:///c:/Users/admin/Desktop/medisync360/data/cases/val_cases.json)
* **Final Test Split Cases (45 cases, 14.8% - Sealed):** [`data/cases/test_cases.json`](file:///c:/Users/admin/Desktop/medisync360/data/cases/test_cases.json)
* **Clinical Benchmark Narratives (60 cases):** [`data/cases/benchmark_clinical_cases.json`](file:///c:/Users/admin/Desktop/medisync360/data/cases/benchmark_clinical_cases.json)

---

## 5. Automated Validation & Verification Suite

Executed via [`backend/ml_model/build_case_dataset.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/build_case_dataset.py):

```powershell
python backend/ml_model/build_case_dataset.py
```

### Validation Results

| Verification Check | Target Requirement | Observed Result | Status |
| :--- | :---: | :---: | :---: |
| **Schema Completeness** | All 16 fields present on all records | 100% compliant | **PASSED** |
| **Data Fabrication Check** | 0 fabricated values in unknown fields | 100% stored as `UNKNOWN` | **PASSED** |
| **Provenance Integrity** | 100% cases have SHA-256 pattern hash | 304 / 304 verified | **PASSED** |
| **Train $\cap$ Validation Overlap** | $0$ cases | **0** | **PASSED** |
| **Train $\cap$ Test Overlap** | $0$ cases | **0** | **PASSED** |
| **Validation $\cap$ Test Overlap** | $0$ cases | **0** | **PASSED** |
| **Original Dataset Preservation** | `dataset.csv` untouched | Preserved | **PASSED** |

---
*End of Assignment 3 Documentation.*
