# MediSync360 Model Comparison, Calibration & Selection Report (Assignment 9)

**Document Type:** Empirical Machine Learning Benchmark & Model Selection Report  
**Phase:** Assignment 9 — Multi-Architecture Model Comparison & Probability Calibration  
**Target System:** MediSync360 Disease Prediction Core  
**Status:** Completed, Evaluated, and Winning Model Deployed  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Evaluation Methodology

> [!IMPORTANT]
> **Core Engineering Rule:**
> Model selection must **NEVER** be based on training accuracy or assumptions that a single family (such as Gradient Boosting) is universally superior.
> Candidate models were trained and tuned strictly on **TRAIN + VALIDATION** partitions. The **FINAL TEST SET** remained locked and sealed until the final evaluation step.

Five distinct machine learning architectures were trained on the multi-dimensional 154-feature representation (`ClinicalFeatureExtractor`) using clean data, canonical ontology linking, and free-form narrative augmentation.

---

## 2. Candidate Architectures Evaluated

1. **Multinomial Logistic Regression (L2-Regularized):** Linear generalized linear model with softmax probability distribution.
2. **Random Forest Classifier (Balanced Depth):** Non-parametric ensemble of 150 decorrelated decision trees with class-balanced weighting.
3. **Gradient Boosting Classifier:** Sequential stage-wise additive gradient boosted decision trees.
4. **HistGradientBoosting Classifier:** Histogram-based gradient boosting with integer binning and early stopping.
5. **Calibrated Random Forest (Platt Sigmoid Calibration):** 3-fold cross-validated probability calibration applied to random forest outputs to minimize Brier score and log loss.

---

## 3. Empirical Validation Comparison Table (Tuned on Train + Val)

```
                            Validation Benchmark Matrix (41 Diseases)
┌───────────────────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Model Architecture        │ Struct Top-1 │ Free-Form F1 │  Log Loss    │ Partial Top-1│ False Conf # │
├───────────────────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Logistic Regression       │   100.0%     │    0.9833    │    0.1236    │    15.56%    │   22 cases   │
│ Random Forest (Baseline)  │   100.0%     │    1.0000    │    0.6313    │    37.78%    │    0 cases   │
│ Gradient Boosting         │    82.22%    │    0.7861    │    0.8603    │    28.89%    │    5 cases   │
│ HistGradientBoosting      │    77.78%    │    0.7546    │    0.8117    │    24.44%    │   26 cases   │
│ Calibrated Random Forest  │   100.0%     │    1.0000    │    0.2614    │    44.44%    │    3 cases   │
└───────────────────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### Key Analytical Findings

1. **Failure of Gradient Boosting on Low-Sample Multi-Class Phenotypes:**
   * Both `GradientBoosting` ($F_1 = 0.786$) and `HistGradientBoosting` ($F_1 = 0.755$) suffered severe degradation compared to tree bagging. With 41 discrete disease classes and sparse orthogonal symptom presentations, sequential gradient boosting overfits residual gradients of frequent classes while starving low-frequency conditions.
2. **Linear Model Overconfidence on Unseen Noise:**
   * `LogisticRegression` achieved low log loss ($0.1236$) on in-domain cases, but produced **22 false-confident predictions ($>40\%$)** on out-of-scope / ambiguous benchmark queries due to unbounded linear hyperplane extrapolation.
3. **Superiority of Calibrated Random Forest:**
   * `Calibrated_Random_Forest` achieved perfect **100.0% Top-1** and **1.0 Macro F1** across structured and free-form validation sets while reducing uncalibrated log loss from $0.6313$ down to **$0.2614$** (a **$58.6\%$ calibration improvement**).

---

## 4. Winning Model Performance on Locked Final Test Benchmark

The winning model (**`Calibrated_Random_Forest`**) was evaluated **ONCE** on the sealed and locked final test partitions:

```powershell
python backend/ml_model/model_comparison.py
```

| Evaluation Split | Metric | Result | Benchmark Target | Status |
| :--- | :--- | :---: | :---: | :---: |
| **Locked Final Test (Structured)** | Top-1 Accuracy | **100.0%** | $\ge 90.0\%$ | **EXCEEDED** |
| (45 unseen clinical cases) | Top-3 Accuracy | **100.0%** | $\ge 95.0\%$ | **EXCEEDED** |
| | Macro Precision | **1.0000** | $\ge 0.90$ | **EXCEEDED** |
| | Macro Recall | **1.0000** | $\ge 0.90$ | **EXCEEDED** |
| | Macro F1 Score | **1.0000** | $\ge 0.90$ | **EXCEEDED** |
| | Log Loss | **0.2777** | $\le 0.50$ | **EXCEEDED** |
| **Locked Final Test (Free-Form)** | Top-1 Accuracy | **99.26%** | $\ge 85.0\%$ | **EXCEEDED** |
| (135 patient narratives) | Top-3 Accuracy | **100.0%** | $\ge 95.0\%$ | **EXCEEDED** |
| | Macro Precision | **0.9939** | $\ge 0.85$ | **EXCEEDED** |
| | Macro Recall | **0.9919** | $\ge 0.85$ | **EXCEEDED** |
| | Macro F1 Score | **0.9916** | $\ge 0.85$ | **EXCEEDED** |
| | Log Loss | **0.3041** | $\le 0.50$ | **EXCEEDED** |

---

## 5. Model Serialization & Production Deployment

* **Trained Classifier:** [`backend/ml_model/trained_model/disease_classifier.pkl`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/disease_classifier.pkl) (Calibrated Classifier Ensemble).
* **Label Encoder:** [`backend/ml_model/trained_model/label_encoder.pkl`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/label_encoder.pkl).
* **Metadata & Benchmarks:** [`backend/ml_model/trained_model/metadata.json`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/metadata.json).
* **Full Benchmark Metrics Export:** [`evaluation/model_comparison.json`](file:///c:/Users/admin/Desktop/medisync360/evaluation/model_comparison.json).

---
*End of Assignment 9 Documentation.*
