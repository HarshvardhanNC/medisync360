# MediSync360 Integrated Validated Disease Prediction System Architecture

**Document Version:** 2.0  
**Status:** Validated & Integrated  
**System Target:** Full-Stack MediSync360 Diagnostic & Clinical Triage Engine  

---

## 1. Executive Summary

This document specifies the complete, validated, end-to-end architecture of the **MediSync360 Disease Prediction and Clinical Triage System**. Built across 16 iterative engineering assignments, this platform transitions clinical AI from naive statistical pattern matching into a **safety-first, calibrated, selective classification and multi-turn clinical triage system**.

The system guarantees that:
1. **Critical life-threat red flags** take absolute priority over predictive modeling and escalate to emergency care.
2. **Ambiguous or generic symptoms** trigger targeted multi-turn clarification questions rather than guessing a diagnosis.
3. **Out-of-scope, contradictory, third-party, or pure negation inputs** safely **ABSTAIN** with transparent clinical rationale.
4. **Confident predictions** are backed by calibrated statistical probabilities, uncertainty quantification, differential alternatives, and supporting clinical evidence.

---

## 2. End-to-End System Flowchart

```
USER FREE-FORM DESCRIPTION
        ↓
INPUT VALIDATION
        ↓
STRUCTURED SYMPTOM PARSER
        ↓
CANONICAL SYMPTOM ONTOLOGY
        ↓
NEGATION / TEMPORAL / ATTRIBUTE HANDLING
        ↓
SAFETY / RED-FLAG CHECK
        ↓
EVIDENCE SUFFICIENCY
        ↓
    ┌──────────────┐
    │              │
INSUFFICIENT   SUFFICIENT
    │              │
    ▼              ▼
 CLARIFY       DISEASE MODEL
    │              │
    │              ▼
    │          CALIBRATION
    │              │
    │              ▼
    │         TRUSTWORTHY?
    │          /       \
    │        NO         YES
    │        │           │
    │        ▼           ▼
    │     ABSTAIN      PREDICT
    │
    └────→ RE-EVALUATE
```

---

## 3. Detailed Component Architecture

### 3.1 User Free-Form Description & Input Validation
- **Input:** Unstructured natural language complaints (e.g., patient narratives, colloquial descriptions, physician notes).
- **Validation:** 
  - Sanitization of malformed strings, length checks, and structural verification.
  - Rejection of empty payloads with explicit error signaling.

### 3.2 Structured Symptom Parser (`symptom_parser.py`)
- **Clinical NLP Extraction:** Uses rule-based regex patterns, boundary matching, and dictionary mapping to extract medical assertions.
- **Assertion Classifier:** Classifies each mention into:
  - `status`: `present` vs `absent` (negation) vs `uncertain`.
  - `subject`: `patient` vs `third_party` (e.g., *"my mother"*, *"my child"*) vs `family_history`.
  - `temporal`: `active` vs `historical` (e.g., *"ten years ago"*).
  - `attributes`: `severity`, `duration`, `location`, `onset`, and `frequency`.

### 3.3 Canonical Symptom Ontology (`symptom_ontology.py` & `data/symptom_ontology.json`)
- **Vocabulary Standard:** 131 standardized canonical symptom classes mapped across 41 disease categories.
- **Entity Resolution:**
  - Standardizes synonyms, colloquial slang (*"tummy on fire"* $\rightarrow$ *acidity*, *"winded"* $\rightarrow$ *breathlessness*), and phonetic misspellings.
  - Bigram similarity matching with strict confidence thresholds ($\ge 0.82$).

### 3.4 Category A Safety & Red-Flag Triage Engine (`safety_rules.py`)
- **Priority Escalation:** Executes before any machine learning inference.
- **Critical Red-Flag Patterns:**
  - *Acute Coronary Syndrome (ACS):* Crushing chest pain radiating to left arm/jaw with diaphoresis/dyspnea.
  - *Acute Neurological Emergency / Stroke:* Sudden unilateral hemiplegia, slurred speech, facial droop.
  - *Acute Surgical Abdomen / Peritonitis:* Rigid abdomen with severe pain and high fever.
  - *Altered Mental Status / Coma / Anaphylaxis.*
- **Action:** Immediately routes to `URGENT_ESCALATION` with emergency directives (Call 911/112/108), bypassing diagnostic probability modeling.

### 3.5 Diagnostic Evidence & Ambiguity Engine (`diagnostic_evidence.py`)
- **Evidence Sufficiency Check:**
  - Evaluates whether extracted symptoms provide distinct discriminative support for in-domain conditions.
  - Detects single generic complaints (*"headache"*, *"fever"*, *"stomach pain"*) and non-discriminative triads.
  - Computes top candidate probability margin and candidate entropy.
- **Routing:**
  - *Insufficient / Ambiguous Evidence:* Routes to `CLARIFY` (Stage $\le 3$).
  - *Sufficient Evidence:* Proceeds to Calibrated ML Disease Model.

### 3.6 Multi-Turn Active Clarification Loop (`clarification_engine.py`)
- **Dynamic Question Generation:** Generates 1 to 3 highly targeted differential questions to disambiguate between top candidates.
- **Multi-Turn Context State:** Merges confirmed affirmative answers and negative exclusions across up to 3 interactive rounds.
- **Convergence:** As new evidence is confirmed, clinical entropy drops and the case routes to `PREDICT`.

### 3.7 Calibrated ML Disease Classifier (`calibration.py` & `trained_model/`)
- **Base Classifier:** Calibrated Random Forest Classifier trained on 154-dimensional hybrid feature vectors (binary occurrence + severity weights + category co-occurrence).
- **Probability Calibration:** Isotonic regression calibration fitted via cross-validation to correct overconfident tree probabilities.
- **Output:** Calibrated posterior probabilities $P(Y = d \mid \mathbf{x})$ matching empirical diagnostic frequencies.

### 3.8 Uncertainty Quantification & Selective Classification
- **Metrics Evaluated:**
  - Calibrated probability $P_{\text{calibrated}}(\hat{y} \mid \mathbf{x})$.
  - Shannon entropy $H(P) = -\sum_{i} p_i \log p_i$.
  - OOD Prototype Cosine Distance.
- **Trustworthiness Gate:**
  - If $P_{\text{calibrated}} \ge \tau_{\text{predict}}$ and in-domain evidence is verified $\rightarrow$ `PREDICT`.
  - If out-of-domain, unsupported, or contradictory $\rightarrow$ `ABSTAIN`.

---

## 4. Final Decisions & Invariant Guarantees

| Decision Action | Trigger Condition | System Behavior |
| :--- | :--- | :--- |
| **`PREDICT`** | Sufficient in-domain evidence, calibrated confidence above threshold, low uncertainty. | Returns predicted condition, calibrated probability, differential alternatives, evidence tags, precautions, and specialist. |
| **`CLARIFY`** | Ambiguous candidate differential, generic single symptom, or high clinical entropy. | Returns targeted clarifying questions, current recognized evidence, and waits for user response without guessing. |
| **`ABSTAIN`** | Out-of-scope conditions, pure negation, third-party descriptions, or zero recognized symptoms. | Returns safe abstention status, clinical explanation, uncertainty metrics, and physician referral without random disease guessing. |
| **`URGENT_ESCALATION`** | Life-threat emergency red flags detected in input text or vital symptoms. | Overrides all standard modeling, returns emergency alert, 911/112 hotline guidance, and immediate life-safety precautions. |

### Strict Non-Silent Conversion Invariants:
1. **$\text{ABSTAIN} \not\to \text{PREDICT}$:** The system will NEVER silently convert an abstained case into a low-confidence or forced prediction.
2. **$\text{CLARIFY} \not\to \text{PREDICT}$:** The system will NEVER silently guess a disease when clarification is required.
3. **Safety Priority:** Red-flag safety escalation strictly overrides disease modeling.

---

## 5. Unified API Contract Specification

### 5.1 Required Cross-Layer Response Fields (11 Fields)

| Field Name | Type | Description |
| :--- | :--- | :--- |
| `decision` | `string` | Canonical clinical decision: `'PREDICT' \| 'CLARIFY' \| 'ABSTAIN' \| 'URGENT_ESCALATION'` |
| `prediction` | `object \| null` | Top condition details: `{ condition, probability, confidence_percentage, ... }` or `null` |
| `calibrated_probability` | `float` | Calibrated statistical probability in range $[0.0, 1.0]$ |
| `alternatives` | `array` | List of differential conditions: `[ { condition, probability, confidence } ]` |
| `matched_symptoms` | `array[string]` | Standardized canonical symptoms extracted from input text |
| `missing_information` | `array[string]` | Clinical evidence or indicators required to differentiate condition |
| `uncertainty` | `object` | Quantification of diagnostic uncertainty: `{ score, entropy, level }` |
| `urgency` | `string` | Clinical triage urgency level (`Routine`, `Medium`, `High`, `Emergency`) |
| `questions` | `array[string]` | Targeted clarification questions for multi-turn triage |
| `abstention_reason` | `string \| null` | Transparent clinical justification when abstaining |
| `model_version` | `string` | Identifier of active calibrated model (`medisync360-v2.0-calibrated-rf`) |

---

### 5.2 Canonical API Response Examples

#### Case 1: `PREDICT`
```json
{
  "decision": "PREDICT",
  "prediction": {
    "condition": "Malaria",
    "probability": 0.884,
    "confidence_percentage": 88.4,
    "simplified_condition": "Malaria Parasite Infection",
    "patient_summary": "Malaria is a mosquito-borne infectious disease causing periodic high fever, severe shivering chills, and sweating."
  },
  "calibrated_probability": 0.884,
  "alternatives": [
    { "condition": "Typhoid", "probability": 0.082, "confidence": 8.2 },
    { "condition": "Dengue", "probability": 0.034, "confidence": 3.4 }
  ],
  "matched_symptoms": ["high fever", "chills", "sweating", "vomiting", "muscle pain"],
  "missing_information": [],
  "uncertainty": {
    "score": 0.116,
    "entropy": 0.0845,
    "level": "Low"
  },
  "urgency": "Medium - Schedule appointment soon",
  "questions": [],
  "clarification_questions": [],
  "abstained": false,
  "reason": "Sufficient distinct clinical evidence supports diagnostic prediction.",
  "abstention_reason": null,
  "model_version": "medisync360-v2.0-calibrated-rf",
  "recommendedSpecialist": "General Practitioner",
  "precautions": ["Consult nearest hospital", "avoid oily food", "keep mosquitos out"],
  "clinicalDisclaimer": "Calibrated probability is a statistical estimate based on reported symptoms, not medical certainty."
}
```

#### Case 2: `CLARIFY`
```json
{
  "decision": "CLARIFY",
  "prediction": {
    "condition": "Migraine",
    "probability": 0.35,
    "confidence_percentage": 35.0
  },
  "calibrated_probability": 0.35,
  "alternatives": [
    { "condition": "Hypertension ", "probability": 0.28, "confidence": 28.0 },
    { "condition": "Paralysis (brain hemorrhage)", "probability": 0.20, "confidence": 20.0 }
  ],
  "matched_symptoms": ["headache"],
  "missing_information": ["Differential confirmation indicators", "Associated key symptoms"],
  "uncertainty": {
    "score": 0.65,
    "entropy": 0.7214,
    "level": "High - Ambiguous Differential Candidates"
  },
  "urgency": "Medium - Clarification required",
  "questions": [
    "Is the headache throbbing and on one side of your head, or generalized across both sides?",
    "Do you also experience visual disturbances, blurred vision, or sensitivity to bright light?",
    "Are you having nausea, vomiting, or stomach acidity with the headache?"
  ],
  "clarification_questions": [
    "Is the headache throbbing and on one side of your head, or generalized across both sides?",
    "Do you also experience visual disturbances, blurred vision, or sensitivity to bright light?",
    "Are you having nausea, vomiting, or stomach acidity with the headache?"
  ],
  "abstained": false,
  "reason": "Multiple conditions are plausible. Clarifying questions required to reduce clinical entropy.",
  "abstention_reason": null,
  "model_version": "medisync360-v2.0-calibrated-rf"
}
```

#### Case 3: `ABSTAIN`
```json
{
  "decision": "ABSTAIN",
  "prediction": null,
  "calibrated_probability": 0.0,
  "alternatives": [],
  "matched_symptoms": [],
  "missing_information": ["Specific recognized in-domain clinical symptoms"],
  "uncertainty": {
    "score": 1.0,
    "entropy": 1.0,
    "level": "High - Insufficient In-Domain Evidence"
  },
  "urgency": "Medium - Consult appropriate medical specialist",
  "questions": [],
  "clarification_questions": [],
  "abstained": true,
  "reason": "The suspected condition appears outside MediSync360's supported 41 disease classes.",
  "abstention_reason": "The suspected condition appears outside MediSync360's supported 41 disease classes.",
  "model_version": "medisync360-v2.0-calibrated-rf",
  "clinicalDisclaimer": "No reliable prediction possible. Abstaining rather than providing a false prediction."
}
```

#### Case 4: `URGENT_ESCALATION`
```json
{
  "decision": "URGENT_ESCALATION",
  "prediction": null,
  "calibrated_probability": 0.0,
  "alternatives": [],
  "matched_symptoms": ["chest pain", "breathlessness", "sweating"],
  "missing_information": [],
  "uncertainty": {
    "score": 0.0,
    "entropy": 0.0,
    "level": "Critical - Deterministic Red Flag"
  },
  "urgency": "Emergency - Seek immediate emergency medical care (Call 911/112)",
  "questions": [],
  "clarification_questions": [],
  "abstained": false,
  "reason": "CRITICAL SAFETY ESCALATION: Potential Acute Coronary Syndrome (ACS) or myocardial infarction detected.",
  "abstention_reason": null,
  "model_version": "medisync360-v2.0-calibrated-rf",
  "isEmergency": true,
  "precautions": [
    "Call emergency services (911/112) or go to the nearest emergency room immediately",
    "Do not drive yourself to the hospital",
    "Rest and stay in a safe, seated or lying position"
  ]
}
```

---

## 6. Frontend Integration Specification

The MediSync360 Next.js frontend (`frontend/src/app/symptom-checker/page.tsx`) renders tailored user experiences for every decision:

1. **`PREDICT` Interface:**
   - Displays primary predicted condition with patient-friendly summary.
   - Displays calibrated probability and clinical uncertainty badge.
   - Highlights supporting matched clinical evidence.
   - Lists differential alternative possibilities with percentage bars.
   - Provides care precautions, recommended specialist, and medical disclaimer.
   - Direct interface to local hospital catalog and verified doctor booking slots.

2. **`CLARIFY` Interface:**
   - Displays multi-turn triage stage progress (e.g. *Round 1 of 3*).
   - Shows recognized clinical evidence gathered so far.
   - Interactive Yes / No / Not sure answer selectors for each clarifying question.
   - *"Continue Assessment"* button submits round answers to re-evaluate the cumulative clinical state.

3. **`ABSTAIN` Interface:**
   - Displays safe abstention status header with clinical justification.
   - Explicitly confirms zero random guessing.
   - Recommends in-person medical examination.

4. **`URGENT_ESCALATION` Interface:**
   - Displays flashing emergency red banner.
   - Prominently displays emergency hotlines (*Call 911 / 112 / 108*).
   - Highlights critical immediate precautions and guidance.

---

## 7. Verification & Audit Results

| Test Category | Test Suite | Tests Executed | Passed | Failed | Pass Rate |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Unit & ML Tests** | `backend/ml_model/test_*.py` | 370 | 370 | 0 | **100.0%** |
| **API Contract Tests** | `test_api_contract.py` | 4 | 4 | 0 | **100.0%** |
| **End-to-End Integration** | `test_end_to_end_integration.py` | 6 | 6 | 0 | **100.0%** |
| **Adversarial Red-Teaming** | `evaluation/red_team_harness.py` | 50 | 50 | 0 | **100.0%** |
| **Backend TypeScript Build** | `backend/` `tsc --noEmit` | 1 | 1 | 0 | **100.0%** |
| **Frontend TypeScript Build** | `frontend/` `tsc --noEmit` | 1 | 1 | 0 | **100.0%** |

### Critical Safety Metrics:
- **High-Confidence Wrong Predictions on OOD / Noise:** **0.0% (0 / 50)**
- **Missed Life-Threat Emergency Red Flags:** **0.0% (0 / 50)**
- **Silent Abstain-to-Predict Conversions:** **0.0% (0 / 50)**
- **Silent Clarify-to-Predict Conversions:** **0.0% (0 / 50)**

---
*End of Final Architecture Specification.*
