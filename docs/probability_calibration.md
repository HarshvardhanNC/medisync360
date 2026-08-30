# MediSync360 Statistical Probability Calibration Report (Assignment 10)

**Document Type:** Machine Learning Calibration & Statistical Reliability Specification  
**Phase:** Assignment 10 — Post-Hoc Probability Calibration & ECE Minimization  
**Target System:** MediSync360 Disease Prediction Inference Pipeline  
**Status:** Completed, Evaluated, and Deployed (Isotonic Calibration Selected)  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Calibration Mandate

> [!IMPORTANT]
> **Core Mandate:**
> Displayed confidence values must reflect **statistically validated probabilities**, not arbitrary heuristic multipliers or hard-coded claims (such as forcing $95\%$, $96\%$, or $97\%$).
> All manual probability boosters (`probability * boost`) have been completely removed.
> 
> **Clinical Non-Certainty Rule:**
> A calibrated probability is a statistical estimate of condition likelihood given the reported symptoms. It is **NOT medical certainty** and must never be presented as a definitive diagnosis.

---

## 2. Raw Model Score vs. Calibrated Probability

To guarantee scientific transparency and clinical safety, the system explicitly distinguishes between raw model scores and calibrated probabilities:

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│              RAW MODEL SCORE                  │             CALIBRATED PROBABILITY            │
├───────────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • Uncalibrated vote fraction from trees       │ • Monotonically transformed probability       │
│ • Prone to overconfidence and margin errors   │ • Minimizes Expected Calibration Error (ECE)  │
│ • Not interpretable as a true frequency       │ • If model outputs 80%, empirical acc is ~80% │
│ • Log Loss: 0.6265                            │ • Log Loss: 0.0375 (94.0% reduction)          │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 3. Mathematical Calibration Formulations

### 1. Expected Calibration Error (ECE)
Samples are partitioned into $M=10$ equally spaced confidence bins $B_1, B_2, \dots, B_M$. ECE is computed as the weighted average difference between accuracy and confidence:
$$\text{ECE} = \sum_{m=1}^M \frac{|B_m|}{N} \left| \text{acc}(B_m) - \text{conf}(B_m) \right|$$

### 2. Multi-Class Brier Score
Measures mean squared difference between predicted class probabilities $\hat{p}_{ik}$ and one-hot ground truth $y_{ik}$:
$$\text{BS} = \frac{1}{N} \sum_{i=1}^N \sum_{k=1}^K (\hat{p}_{ik} - y_{ik})^2$$

---

## 4. Empirical Validation Benchmark (Trained & Tuned on Train + Val)

```powershell
python backend/ml_model/calibration.py
```

```
                        Calibration Validation Benchmark (41 Diseases)
┌─────────────────────────────────┬────────────┬────────────┬────────────┬────────────┬──────────────┐
│ Calibration Method              │    ECE     │    MCE     │ Brier Score│  Log Loss  │ Top-1 Acc    │
├─────────────────────────────────┼────────────┼────────────┼────────────┼────────────┼──────────────┤
│ 1. Uncalibrated Base RF         │   0.4232   │   0.7456   │   0.2361   │   0.6265   │   100.0%     │
│ 2. Platt Scaling (Sigmoid)      │   0.2177   │   0.6596   │   0.0639   │   0.2600   │   100.0%     │
│ 3. Isotonic Calibration (WINNER)│   0.0346   │   0.3551   │   0.0092   │   0.0375   │   100.0%     │
└─────────────────────────────────┴────────────┴────────────┴────────────┴────────────┴──────────────┘
```

### Key Statistical Observations:
* **Isotonic Regression** outperformed Platt scaling by a wide margin, reducing **ECE by $91.8\%$** (from $0.4232$ to $0.0346$) and reducing **Brier Score by $96.1\%$** (from $0.2361$ to $0.0092$).
* Top-1 accuracy remained intact at $100.0\%$.

---

## 5. Locked Final Test Calibration Impact

The winning isotonic calibrator was evaluated **ONCE** on the sealed final test partition:

| Metric | Uncalibrated Test | Calibrated Test (Isotonic) | Improvement |
| :--- | :---: | :---: | :---: |
| **Expected Calibration Error (ECE)** | $0.4309$ | **$0.0336$** | **$\mathbf{92.2\%}$ Improvement** |
| **Multi-Class Brier Score** | $0.2562$ | **$0.0213$** | **$\mathbf{91.7\%}$ Improvement** |
| **Log Loss (Cross Entropy)** | $0.6711$ | **$0.0529$** | **$\mathbf{92.1\%}$ Improvement** |
| **Top-1 Test Accuracy** | $99.44\%$ | **$99.44\%$** | Preserved |

### 10-Bin Reliability Distribution (Locked Test)

```
Confidence Bin Range   Sample Count   Mean Confidence   Mean Accuracy   Calibration Gap
0.60 – 0.70                 7             0.6483            0.8571          0.2088
0.70 – 0.80                 6             0.7403            1.0000          0.2597
0.80 – 0.90                 8             0.8577            1.0000          0.1423
0.90 – 1.00               159             0.9881            1.0000          0.0119
```

---

## 6. API Contracts & Production Deployment

The inference service ([`backend/ml_model/enhanced_predict_service.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_predict_service.py)) returns:

```json
{
  "decisionAction": "PREDICT",
  "predictedCondition": "Malaria",
  "confidence": 85.0,
  "calibratedProbability": 0.8504,
  "rawModelScore": 84.0,
  "calibrationMethod": "isotonic",
  "clinicalDisclaimer": "Calibrated probability is a statistical estimate based on reported symptoms, not medical certainty.",
  "alternativePossibilities": [
    {
      "condition": "Dengue",
      "confidence": 12.4,
      "calibratedProbability": 0.1241
    }
  ]
}
```

---
*End of Assignment 10 Documentation.*
