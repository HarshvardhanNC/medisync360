# MediSync360 Leakage-Free Evaluation Methodology (Assignment 1)

**Document Type:** Technical Specification & Evaluation Protocol  
**Phase:** Assignment 1 — Trustworthy, Leakage-Free Evaluation Pipeline  
**Target System:** MediSync360 Disease Prediction Engine  
**Status:** Implemented, Automated, and Verified  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Core Objective

In Assignment 0, a comprehensive audit revealed that the legacy evaluation reported near-100% accuracy due to catastrophic data leakage: **4,616 out of 4,920 dataset records (93.82%) were exact duplicates**, and train/test splitting was performed after single-symptom expansion without deduplication. As a result, the test set was an exact copy of the training set, measuring memorization rather than clinical generalization.

**Assignment 1 Core Mandate:** Establish a scientifically rigorous, mathematically sound, and leakage-free evaluation pipeline before making any model improvements. The **Final Test Set** is strictly sealed and must remain completely untouched during development.

---

## 2. Dataset Deduplication & Canonical Representation

To eliminate synthetic redundancy and prevent cross-split contamination, all records in `backend/src/data/dataset.csv` are canonicalized and deduplicated.

### Canonicalization Algorithm
For every row in the dataset:
1. Extract all non-empty symptoms from `Symptom_1` through `Symptom_17`.
2. Normalize symptom strings (lowercase, replace underscores with spaces, strip whitespace).
3. Sort and deduplicate symptom tokens into a canonical set: $S = \{s_1, s_2, \dots, s_k\}$.
4. Generate a cryptographic SHA-256 fingerprint from the composite string:
   $$\text{PatternHash} = \text{SHA256}(\text{Disease} \mathbin{\Vert} \text{","} \mathbin{\Vert} \text{CanonicalSymptoms})[0:16]$$

### Deduplication Metrics
* **Raw Dataset Records:** 4,920 rows.
* **Exact Duplicate Rows:** 4,616 rows (93.82% redundancy).
* **Unique Clinical Disease-Symptom Patterns:** Exactly **304 unique patterns**.
* **Patterns per Disease:** Between 5 and 10 unique patterns per disease across all 41 disease classes (average 7.41 patterns per disease).

---

## 3. Leakage-Free 70 / 15 / 15 Stratified Split Design

Splitting is performed directly on the **304 unique clinical patterns** to guarantee zero symptom-combination overlap between splits.

```
Total Unique Clinical Patterns (304)
          │
          ├── 70.39% ──► TRAIN SET (214 patterns)
          ├── 14.80% ──► VALIDATION SET (45 patterns)
          └── 14.80% ──► FINAL TEST SET (45 patterns)  <--- SEALED & UNTOUCHED
```

### Stratification Policy
To ensure complete clinical coverage across the multi-class taxonomy:
* Each disease group is shuffled deterministically with `RandomState(seed=42)`.
* For each disease $d \in \{1, \dots, 41\}$:
  * If $|d| = 5$: Train = 3, Val = 1, Test = 1
  * If $|d| = 6$: Train = 4, Val = 1, Test = 1
  * If $|d| = 7$: Train = 5, Val = 1, Test = 1
  * If $|d| = 8$: Train = 6, Val = 1, Test = 1
  * If $|d| \in \{9, 10\}$: Train = 6 or 7, Val = 1 or 2, Test = 1 or 2
* **Disease Representation:** All 41 disease classes are represented in Train, Validation, and Final Test.

---

## 4. The "Untouchable Final Test Set" Protocol

The Final Test Set is the ultimate ground-truth benchmark for clinical safety and generalization.

> [!CAUTION]
> **Strict Isolation Rules:**
> The Final Test Set (`test_split.csv`) must **NEVER** be used for:
> 1. Training or fine-tuning models.
> 2. Synthetic augmentation or data expansion.
> 3. Feature engineering or vocabulary selection decisions.
> 4. Hyperparameter tuning (grid search, random search, Bayesian optimization).
> 5. Model architecture selection.
> 6. Decision threshold selection.
> 7. Probability calibration (Platt scaling / Isotonic regression).
> 8. Rule tuning or critical override engineering.
> 9. LLM prompt tuning or few-shot exemplar selection.

All iterative development, tuning, and ablation studies must use the **Validation Set** (`val_split.csv`) or cross-validation on the **Train Set** (`train_split.csv`).

---

## 5. Post-Split Augmentation Safety Policy

If synthetic single-symptom synthesis or data augmentation is used:
* **Rule 1:** Augmentation must occur **ONLY AFTER** the original training split has been generated.
* **Rule 2:** Augmentations may only be synthesized from records present in the **Train Split**.
* **Rule 3:** No augmented or single-symptom derivative of any record in the Validation or Final Test sets may ever enter the training pipeline.
* **Rule 4:** Validation and Test sets must consist exclusively of unaugmented, original clinical patterns.

---

## 6. Automated Leakage Detection Suite

The evaluation harness in [`backend/ml_model/evaluate_model.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/evaluate_model.py) runs automated verification checks before and after any evaluation:

| Leakage Verification Check | Metric / Formula | Target Value | Observed Value | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Exact Hash Overlap (Train $\cap$ Val)** | $|\text{Hash}(\text{Train}) \cap \text{Hash}(\text{Val})|$ | $0$ | **0** | **PASSED** |
| **Exact Hash Overlap (Train $\cap$ Test)** | $|\text{Hash}(\text{Train}) \cap \text{Hash}(\text{Test})|$ | $0$ | **0** | **PASSED** |
| **Exact Hash Overlap (Val $\cap$ Test)** | $|\text{Hash}(\text{Val}) \cap \text{Hash}(\text{Test})|$ | $0$ | **0** | **PASSED** |
| **Symptom Set Overlap (Train $\cap$ Val)** | $|\text{Sym}(\text{Train}) \cap \text{Sym}(\text{Val})|$ | $0$ | **0** | **PASSED** |
| **Symptom Set Overlap (Train $\cap$ Test)** | $|\text{Sym}(\text{Train}) \cap \text{Sym}(\text{Test})|$ | $0$ | **0** | **PASSED** |
| **Symptom Set Overlap (Val $\cap$ Test)** | $|\text{Sym}(\text{Val}) \cap \text{Sym}(\text{Test})|$ | $0$ | **0** | **PASSED** |
| **Disease Class Coverage (Train)** | $\text{Diseases}(\text{Train})$ | 41 classes | **41 classes** | **PASSED** |
| **Disease Class Coverage (Val)** | $\text{Diseases}(\text{Val})$ | 41 classes | **41 classes** | **PASSED** |
| **Disease Class Coverage (Test)** | $\text{Diseases}(\text{Test})$ | 41 classes | **41 classes** | **PASSED** |
| **Near-Duplicate Jaccard (Mean)** | $\text{mean}_{t \in \text{Test}} \max_{r \in \text{Train}} J(t, r)$ | $< 0.95$ | **0.8057** | **PASSED** |

---

## 7. Baseline Evaluation Results on Clean Splits

We evaluated two configurations using [`backend/ml_model/evaluate_model.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/evaluate_model.py):
1. **Current Serialized Model (`disease_classifier.pkl`):** The legacy model artifact trained on all 4,920 records (which memorized all 304 patterns).
2. **Clean Split-Trained Model:** A model trained strictly on the **70% Train split (214 patterns)** with zero exposure to Validation (45 patterns) or Final Test (45 patterns).

### Comparative Evaluation Summary

| Metric | Current Model on Clean Test (Memorized) | Clean Model on Clean Val (Unseen) | Clean Model on Clean Test (Unseen) | Partial Symptom Test (2-Syms Presented) |
| :--- | :---: | :---: | :---: | :---: |
| **Evaluated Cases** | 45 | 45 | 45 | 45 |
| **Top-1 Accuracy** | 100.00% | 93.33% | **95.56%** | **60.00%** |
| **Top-3 Accuracy** | 100.00% | 100.00% | **100.00%** | 82.22% |
| **Macro Precision** | 1.0000 | 0.9024 | **0.9350** | 0.5841 |
| **Macro Recall** | 1.0000 | 0.9268 | **0.9512** | 0.6000 |
| **Macro F1-Score** | 1.0000 | 0.9024 | **0.9350** | 0.5789 |
| **Weighted F1-Score** | 1.0000 | 0.9185 | **0.9519** | 0.5833 |
| **Log Loss** | 0.0000 | 0.3256 | **0.2841** | 1.8412 |
| **False Confident Count ($\ge 80\%$)** | 0 | 1 | **1** | **14** |

### Key Observations & Scientific Insights
1. **True Generalization Gap:** When evaluated on complete synthetic symptom vectors from unseen patterns, the clean model achieves **95.56% Top-1 Accuracy** on the Final Test Set.
2. **Partial Presentation Degradation:** When patients present with only 2 initial symptoms (common in early triage), clean model accuracy drops sharply to **60.00%**, and false confident predictions increase to **14 cases**.
3. **Robustness Benchmark:** Combined with the 60-case clinical benchmark from Assignment 0 (which showed a 78.33% failure rate on negation, family history, and out-of-scope conditions), these metrics provide an unmanipulated, trustworthy baseline against which future models will be measured.

---

## 8. Reproducibility & CLI Execution Guide

### Split Files Location
* Train Split (214 records): [`evaluation/splits/train_split.csv`](file:///c:/Users/admin/Desktop/medisync360/evaluation/splits/train_split.csv)
* Validation Split (45 records): [`evaluation/splits/val_split.csv`](file:///c:/Users/admin/Desktop/medisync360/evaluation/splits/val_split.csv)
* Final Test Split (45 records): [`evaluation/splits/test_split.csv`](file:///c:/Users/admin/Desktop/medisync360/evaluation/splits/test_split.csv)
* Complete Leakage Report: [`evaluation/leakage_report.json`](file:///c:/Users/admin/Desktop/medisync360/evaluation/leakage_report.json)

### Running the Evaluation Pipeline
To regenerate splits, execute automated leakage checks, and run multi-metric evaluations:
```powershell
python backend/ml_model/evaluate_model.py
```

To run without modifying existing split CSVs:
```powershell
python backend/ml_model/evaluate_model.py --check-leakage --eval
```

---
*End of Assignment 1 Methodology Document.*
