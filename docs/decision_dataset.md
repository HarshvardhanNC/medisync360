# MediSync360 Decision Dataset & Triage Routing Architecture (Assignment 5)

**Document Type:** Technical Specification & Clinical Decision Protocol  
**Phase:** Assignment 5 — Dataset for Knowing When NOT to Predict  
**Target System:** MediSync360 Disease Prediction Engine  
**Status:** Implemented, Validated, and Policy-Enforced  
**Date:** August 30, 2026  

---

## 1. Core Clinical Mandate & Safety Philosophy

> [!CAUTION]
> **Fundamental Medical AI Requirement:**
> **A wrong disease prediction is far worse than no prediction.**
> An AI diagnostic assistant must **NEVER** be forced to select one of its supported diseases when evidence is insufficient, ambiguous, out-of-scope, or contradictory.

The system is explicitly engineered to support four distinct clinical decision outcomes:
1. **`PREDICT`**: Strong, pathognomonic evidence for a single in-scope condition.
2. **`CLARIFY`**: Plausible in-scope candidates exist, but additional clinical discriminators are required.
3. **`ABSTAIN`**: Evidence is insufficient, unsupported, out-of-scope, or non-applicable.
4. **`URGENT_ESCALATION`**: Immediate red-flag emergency symptoms detected requiring urgent life-safety triage.

---

## 2. The Nine Decision Taxonomy Categories

```
                                    Incoming Patient Query
                                               │
             ┌─────────────────────────┬───────┴────────┬─────────────────────────┐
             ▼                         ▼                ▼                         ▼
      CLEAR_IN_DOMAIN         AMBIGUOUS_IN_DOMAIN  OUT_OF_SCOPE / NOISE    URGENT_ESCALATION
       (High Evidence)       (Multiple Candidates)  (Insufficient/Vague)     (Emergency Red Flags)
             │                         │                │                         │
             ▼                         ▼                ▼                         ▼
          PREDICT                   CLARIFY          ABSTAIN              URGENT_ESCALATION
```

### Taxonomy Definitions & Action Matrix

| Category | Definition & Clinical Characteristics | Example Query | Expected Action | Safety Tier |
| :--- | :--- | :--- | :---: | :---: |
| **1. `CLEAR_IN_DOMAIN`** | Complete, pathognomonic symptom cluster matching a supported condition | *"High fever, chills, profuse sweating, muscle pain, and vomiting for 3 days."* | **`PREDICT`** | Routine / Urgent |
| **2. `AMBIGUOUS_IN_DOMAIN`** | Shared non-discriminatory symptoms spanning multiple supported conditions | *"I have fever and headache."* *(Could be Malaria, Dengue, Typhoid, or Cold)* | **`CLARIFY`** | Routine |
| **3. `INSUFFICIENT_INFORMATION`** | Ultra-vague or non-informative text lacking extractable symptoms | *"I feel sick."*, *"I don't feel well today."*, *"I feel weird."* | **`ABSTAIN`** | Routine |
| **4. `OUT_OF_SCOPE`** | Symptoms characteristic of a condition outside the 41 supported classes | *"Sharp lower right abdominal pain with rebound tenderness and fever."* *(Appendicitis)* | **`ABSTAIN`** | Routine |
| **5. `UNSUPPORTED_SYMPTOMS`** | Symptoms not present in the 131-symptom ontology | *"I have loud ringing in both ears constantly."* *(Tinnitus)* | **`ABSTAIN`** | Routine |
| **6. `CONTRADICTORY_INPUT`** | Logically conflicting or mutually exclusive assertions | *"I have a high fever but my temperature is completely normal with no fever."* | **`CLARIFY`** | Routine |
| **7. `NEGATED_INFORMATION`** | Review of systems consisting exclusively of denied/absent symptoms | *"I have no fever, no cough, and no chest pain."* | **`ABSTAIN`** | Routine |
| **8. `THIRD_PARTY_FAMILY_HISTORY`** | Symptoms attributed to relatives, friends, or domestic animals | *"My mother has diabetes and takes insulin daily."* | **`ABSTAIN`** | Routine |
| **9. `URGENT_ESCALATION`** | Acute life-threatening red flags (ACS, stroke, coma, massive hemorrhage) | *"Crushing chest pain radiating to left arm with cold sweats and shortness of breath."* | **`URGENT_ESCALATION`** | **EMERGENCY** |

---

## 3. Decision Dataset Schema Specification

Exported in [`data/decision_cases/decision_cases_master.json`](file:///c:/Users/admin/Desktop/medisync360/data/decision_cases/decision_cases_master.json):

```json
{
  "case_id": "DEC_0001_CLEAR_01",
  "category": "CLEAR_IN_DOMAIN",
  "expected_action": "PREDICT",
  "safety_escalation": "ROUTINE",
  "user_input": "I have high fever, chills, sweating profusely, muscle pain, and vomiting.",
  "target_disease": "Malaria",
  "extracted_symptoms": [
    "chills",
    "high fever",
    "muscle pain",
    "sweating",
    "vomiting"
  ],
  "plausible_conditions": [
    "Malaria"
  ],
  "decision_rationale": "Classical triad of paroxysmal fever, chills, and diaphoresis strongly indicative of Malaria.",
  "evidence_quality": "HIGH",
  "clarification_questions": [],
  "provenance": {
    "source": "CLINICAL_CONSENSUS_PANEL",
    "split_eligible": true
  }
}
```

---

## 4. Policy Configuration & Routing Thresholds

Defined in [`data/decision_cases/decision_policy.json`](file:///c:/Users/admin/Desktop/medisync360/data/decision_cases/decision_policy.json):

* **`PREDICT` Thresholds:**
  * Minimum Extracted Symptoms: $\ge 2$ canonical symptoms.
  * Top-1 vs. Top-2 Confidence Gap: $\ge 25\%$.
  * Evidence Quality: `HIGH`.
* **`CLARIFY` Thresholds:**
  * $1 \le \text{Symptoms} < 3$ or Top-1 vs Top-2 Confidence Gap $< 25\%$.
  * Max Candidate Diseases: $\le 4$.
* **`ABSTAIN` Thresholds:**
  * Zero positive extractable symptoms, or out-of-scope/unsupported presentation.
* **`URGENT_ESCALATION` Thresholds:**
  * Immediate override when cardiac, stroke, coma, or acute respiratory distress flags are matched.

---

## 5. Dataset Validation & Integrity Checks

Executed via [`backend/ml_model/build_decision_dataset.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/build_decision_dataset.py):

```powershell
python backend/ml_model/build_decision_dataset.py
```

### Dataset Breakdown

| Category | Cases | Primary Action | Safety Status |
| :--- | :---: | :---: | :---: |
| **CLEAR_IN_DOMAIN** | 40 | `PREDICT` | Verified |
| **AMBIGUOUS_IN_DOMAIN** | 15 | `CLARIFY` | Verified |
| **INSUFFICIENT_INFORMATION** | 20 | `ABSTAIN` | Verified |
| **OUT_OF_SCOPE** | 10 | `ABSTAIN` | Verified |
| **UNSUPPORTED_SYMPTOMS** | 7 | `ABSTAIN` | Verified |
| **CONTRADICTORY_INPUT** | 5 | `CLARIFY` | Verified |
| **NEGATED_INFORMATION** | 5 | `ABSTAIN` | Verified |
| **THIRD_PARTY_FAMILY_HISTORY** | 5 | `ABSTAIN` | Verified |
| **URGENT_ESCALATION** | 5 | `URGENT_ESCALATION` | Verified |
| **TOTAL** | **112** | — | **100% Validated** |

### Automated Safety Verification Checks
* **Zero Illegal Predictions:** $0$ cases in `INSUFFICIENT_INFORMATION`, `OUT_OF_SCOPE`, or `THIRD_PARTY` are allowed to output `PREDICT`.
* **Schema Integrity:** 100% of cases contain required clinical rationale, evidence scores, and safety escalation tags.

---
*End of Assignment 5 Documentation.*
