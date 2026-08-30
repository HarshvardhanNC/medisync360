# MediSync360 Rule Engine Redesign & Safety Audit (Assignment 8)

**Document Type:** Architecture Specification & Clinical Safety Audit  
**Phase:** Assignment 8 — Redesign of Hard-Coded Rule System  
**Target System:** MediSync360 Triage & Diagnostic Inference Pipeline  
**Status:** Audited, Redesigned, and Validated (18/18 Regression Tests Passing)  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Core Safety Mandate

> [!CAUTION]
> **Core Clinical Mandate:**
> **Rules must NEVER turn generic symptoms into highly confident disease diagnoses.**
> Diagnostic rules must not manually assign arbitrary probabilities (e.g., $95\%$ or $93\%$).
> When a patient presents with generic or non-discriminative symptoms, the system must recognize clinical ambiguity, present differential possibilities with calibrated confidences, and route to **`CLARIFY`** or **`ABSTAIN`**.

---

## 2. Audit of Legacy Rule System (Category C: Unsafe Overrides)

During the Assignment 0 audit and subsequent investigations, the legacy system was found to contain hard-coded override rules (`CRITICAL_SYMPTOM_RULES`) that intercepted incoming symptoms before ML inference and assigned arbitrary $>90\%$ confidence percentages to single symptoms:

```
[LEGACY UNSAFE RULE] headache           ──► Migraine 95%       (UNSAFE: 15+ conditions cause headache)
[LEGACY UNSAFE RULE] stomach pain       ──► GERD 93%           (UNSAFE: Dozens of GI conditions cause stomach pain)
[LEGACY UNSAFE RULE] wheezing           ──► Asthma 96%         (UNSAFE: Heart failure, anaphylaxis, COPD, bronchitis)
[LEGACY UNSAFE RULE] joint pain         ──► Osteoarthritis 95% (UNSAFE: Viral arthralgia, rheumatoid, dengue, gout)
[LEGACY UNSAFE RULE] acidity            ──► GERD 95%           (UNSAFE: Peptic ulcer, gastritis, cardiac ischemia)
[LEGACY UNSAFE RULE] yellowing of skin  ──► Jaundice 95%       (UNSAFE: Hepatitis A/B/C/E, biliary obstruction, cirrhosis)
```

### Action Taken:
**All hardcoded disease overrides and arbitrary manual confidence assignments were completely excised from the system.**

---

## 3. Redesigned Rule Architecture

The rule system has been cleanly split into two decoupled, principled modules:

```
                                  Incoming Clinical Input
                                             │
             ┌───────────────────────────────┴───────────────────────────────┐
             ▼                                                               ▼
    [Category A: Safety Engine]                                     [Category B: Evidence Engine]
     (backend/ml_model/safety_rules.py)                             (backend/ml_model/diagnostic_evidence.py)
             │                                                               │
     Detects Life-Threatening Red Flags                              Calibrates Syndromic Evidence
     (ACS, Stroke, Coma, Hemorrhage, Peritonitis)                    (Multi-symptom triads / tetrads)
             │                                                               │
             ▼                                                               ▼
    URGENT_ESCALATION                                               PREDICT / CLARIFY / ABSTAIN
    (Emergency Triage + 911 Guidance)                              (Calibrated probabilities, NO manual overrides)
```

---

## 4. Category A: Safety & Red-Flag Triage Engine

Implemented in [`backend/ml_model/safety_rules.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/safety_rules.py).

Rules in this module evaluate acute, life-threatening clinical cues. They **NEVER** assign disease probabilities. Instead, they output an emergency triage alert and direct the patient to urgent emergency care:

| Red-Flag Protocol | Target Clinical Risk | Triggering Symptom Clusters | Triage Level | Recommended Action |
| :--- | :--- | :--- | :---: | :--- |
| **`RF_ACS_CARDIAC`** | Acute Coronary Syndrome / MI | Substernal/crushing chest pain + diaphoresis / left arm radiation / dyspnea | **EMERGENCY** | **`URGENT_ESCALATION`**<br>Call 911/112 immediately |
| **`RF_STROKE_FAST`** | Acute Ischemic Stroke / ICH | Facial drooping, unilateral limb weakness, slurred speech | **EMERGENCY** | **`URGENT_ESCALATION`**<br>Emergency stroke center |
| **`RF_COMA_UNRESPONSIVE`**| Neurological Failure / Coma | Coma, unresponsiveness, acute loss of consciousness | **EMERGENCY** | **`URGENT_ESCALATION`**<br>Emergency life support |
| **`RF_MASSIVE_HEMORRHAGE`**| Severe GI / Pulmonary Bleed | Vomiting blood (hematemesis), active stomach bleeding | **EMERGENCY** | **`URGENT_ESCALATION`**<br>Emergency endoscopy / ICU |
| **`RF_ACUTE_ABDOMEN`** | Peritonitis / Appendicitis | Localized right lower quadrant pain + vomiting / high fever | **EMERGENCY** | **`URGENT_ESCALATION`**<br>Urgent surgical assessment |
| **`RF_RESPIRATORY_FAILURE`**| Acute Respiratory Distress | Severe dyspnea + tachycardia / rusty sputum + high fever | **URGENT** | Urgent pulmonology / ED |

---

## 5. Category B: Calibrated Diagnostic Evidence Engine

Implemented in [`backend/ml_model/diagnostic_evidence.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/diagnostic_evidence.py).

Rules in this module contribute evidence to candidate disease ranking without overriding ML statistical models:
1. **Single Generic Symptoms:** Generic complaints (`headache`, `stomach pain`, `fatigue`) receive $0.0$ artificial boost, confidence is capped at $\le 50.0\%$, and `decisionAction` defaults to **`CLARIFY`**.
2. **Pathognomonic Multi-Symptom Triads:** Classic clinical combinations (e.g. fever + chills + sweating + myalgia for Malaria; icterus + dark urine for Jaundice) receive gentle likelihood adjustments ($1.15\times\text{--}1.35\times$).
3. **Ambiguity Detection:** If the top-1 and top-2 candidate diseases have a confidence margin $<20\%$, the system flags `is_ambiguous = True` and prompts for clarifying clinical discriminators.

---

## 6. Regression Testing & Validation Results (18/18 Tests Passing)

Executed via [`backend/ml_model/test_rule_engine.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/test_rule_engine.py):

```powershell
python backend/ml_model/test_rule_engine.py
```

### Test Suite Results

| Test Group | Validated Capability | Tests | Result |
| :--- | :--- | :---: | :---: |
| **Group 1: Generic Symptoms** | Verification that single symptoms do NOT output 93–96% confidence | 8 | **8/8 (100% Pass)** |
| **Group 2: Safety Red-Flags** | Verification of immediate `URGENT_ESCALATION` for acute emergencies | 6 | **6/6 (100% Pass)** |
| **Group 3: Diagnostic Evidence** | Verification of calibrated multi-symptom support and ambiguity handling | 4 | **4/4 (100% Pass)** |
| **TOTAL** | **Rule Engine Regression Benchmark** | **18** | **18/18 (100.0% Pass)** |

---

## 7. Cross-Layer System Consistency

* **Python Service:** [`backend/ml_model/enhanced_predict_service.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_predict_service.py) outputs clean structured JSON with `decisionAction`, `safetyEscalation`, and `evidenceNotes`.
* **TypeScript Layer:** `backend/src/services/aiService.ts` and `mlModelService.ts` verified with `npx tsc --noEmit` (**0 errors**).
* **Frontend Compatibility:** All existing contracts (`predictedCondition`, `confidence`, `urgencyLevel`, `alternativePossibilities`) are fully preserved.

---
*End of Assignment 8 Documentation.*
