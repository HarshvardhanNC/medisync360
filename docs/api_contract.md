# MediSync360 Unified Prediction API Specification (Assignment 13)

**Document Type:** Cross-Layer API Contract & Schema Specification  
**Phase:** Assignment 13 — Final Prediction API Contract  
**Target Architecture:** End-to-End (`Frontend UI` $\leftrightarrow$ `Express API` $\leftrightarrow$ `Python ML Service`)  
**Status:** Validated, Deployed, and Verified Across All 4 Decisions  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Design Principle

> [!IMPORTANT]
> **Core Contract Mandate:**
> **The API must NEVER assume that every request produces a disease diagnosis.**
> Standard classification APIs incorrectly return `{ "predictedCondition": "Some Disease", "confidence": 95 }` for every input, even for noise or emergencies.
> MediSync360's unified API natively represents all **four clinical decisions**:
> 1. **`PREDICT`**
> 2. **`CLARIFY`**
> 3. **`ABSTAIN`**
> 4. **`URGENT_ESCALATION`**

---

## 2. The Four Canonical Decision Payloads

### Decision 1: `PREDICT`
Returned when patient input provides sufficient discriminative evidence for a supported in-domain condition.

```json
{
  "decision": "PREDICT",
  "prediction": {
    "condition": "Malaria",
    "probability": 0.8504,
    "confidence_percentage": 85.0
  },
  "alternatives": [
    {
      "condition": "Dengue",
      "probability": 0.0821,
      "confidence": 8.2
    }
  ],
  "matched_symptoms": ["chills", "high fever", "muscle pain", "shivering", "vomiting"],
  "missing_information": [],
  "questions": [],
  "urgency": "Medium - Schedule appointment soon",
  "abstained": false,
  "reason": "Sufficient distinct clinical evidence supports diagnostic prediction.",
  "model_version": "medisync360-v2.0-calibrated-rf"
}
```

---

### Decision 2: `CLARIFY`
Returned when input presents ambiguous differentials or a single non-discriminative symptom (e.g. *“I have a headache”*).

```json
{
  "decision": "CLARIFY",
  "prediction": {
    "condition": "Migraine",
    "probability": 0.35,
    "confidence_percentage": 35.0
  },
  "alternatives": [
    {
      "condition": "Hypertension",
      "probability": 0.20,
      "confidence": 20.0
    }
  ],
  "matched_symptoms": ["headache"],
  "missing_information": ["Differential confirmation indicators"],
  "questions": [
    "Is the headache accompanied by nausea, vomiting, or extreme sensitivity to bright light or sound?",
    "Did the headache start suddenly with severe intensity, high fever, or neck stiffness?",
    "Do you have visual disturbances, such as blurred vision, seeing spots, or zigzag lines?"
  ],
  "urgency": "Medium - Clarification required",
  "abstained": false,
  "reason": "Multiple conditions are plausible. Clarifying questions required to reduce clinical entropy.",
  "model_version": "medisync360-v2.0-calibrated-rf"
}
```

---

### Decision 3: `ABSTAIN`
Returned when input is out-of-scope (e.g., bone fractures, dental pain), pure negation, third-party attribution, or unsupported noise.

```json
{
  "decision": "ABSTAIN",
  "prediction": null,
  "alternatives": [],
  "matched_symptoms": [],
  "missing_information": ["Specific recognized clinical symptoms"],
  "questions": [],
  "urgency": "Medium - Consult appropriate medical specialist",
  "abstained": true,
  "reason": "The suspected condition appears outside MediSync360's supported 41 disease classes.",
  "model_version": "medisync360-v2.0-calibrated-rf"
}
```

---

### Decision 4: `URGENT_ESCALATION`
Returned when life-threatening emergency red-flags (ACS, Stroke FAST, Coma, Massive Hemorrhage, Peritonitis) are identified.

```json
{
  "decision": "URGENT_ESCALATION",
  "prediction": null,
  "alternatives": [],
  "matched_symptoms": ["chest pain", "shortness of breath", "sweating"],
  "missing_information": [],
  "questions": [],
  "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
  "abstained": false,
  "reason": "CRITICAL SAFETY ESCALATION: High-risk cardiac red flag suggests acute coronary syndrome or myocardial ischemia.",
  "model_version": "medisync360-v2.0-calibrated-rf"
}
```

---

## 3. Backward Compatibility Preservation

To ensure existing frontend components and downstream services remain functional, all responses simultaneously expose legacy convenience properties:

| Legacy Property | Canonical Equivalent | Type |
| :--- | :--- | :--- |
| `decisionAction` | `decision` | String |
| `predictedCondition` | `prediction?.condition \|\| "No clear match found"` | String |
| `confidence` | `prediction?.confidence_percentage \|\| 0.0` | Float |
| `calibratedProbability` | `prediction?.probability \|\| 0.0` | Float |
| `follow_up_questions` | `questions` | Array of Strings |
| `needs_more_info` | `decision === "CLARIFY"` | Boolean |
| `isEmergency` | `decision === "URGENT_ESCALATION"` | Boolean |

---

## 4. End-to-End Layer Compatibility & Verification

```
┌────────────────────────────────────────────────────────┐
│  Frontend UI: symptom-checker/page.tsx                │
│  - Dedicated Cards for PREDICT, CLARIFY, ABSTAIN, ED   │
└──────────────────────────▲─────────────────────────────┘
                           │ HTTP POST /ai/symptoms
┌──────────────────────────▼─────────────────────────────┐
│  Backend Express: controllers/aiController.ts          │
│  - Types: types/predictionContract.ts                  │
└──────────────────────────▲─────────────────────────────┘
                           │ Spawn Python Subprocess JSON
┌──────────────────────────▼─────────────────────────────┐
│  Python ML: ml_model/enhanced_predict_service.py       │
│  - Multi-Signal Decision Policy & Clarification Engine │
└────────────────────────────────────────────────────────┘
```

Executed via [`backend/ml_model/test_api_contract.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/test_api_contract.py):

```powershell
python backend/ml_model/test_api_contract.py
```

* `test_001_contract_predict_decision` $\rightarrow$ **PASS**
* `test_002_contract_clarify_decision` $\rightarrow$ **PASS**
* `test_003_contract_abstain_decision` $\rightarrow$ **PASS**
* `test_004_contract_urgent_escalation_decision` $\rightarrow$ **PASS**

---
*End of Assignment 13 Documentation.*
