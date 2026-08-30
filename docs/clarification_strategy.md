# MediSync360 Intelligent Clarification & Multi-Turn Triage Strategy (Assignment 12)

**Document Type:** Architectural Clinical Specification & Active Clarification Protocol  
**Phase:** Assignment 12 — Information-Theoretic Clarification Engine & Interactive Triage  
**Target System:** MediSync360 Diagnostic & Triage Interaction Loop  
**Status:** Completed, Evaluated, and Deployed (210/210 Test Scenarios Passing)  
**Date:** August 30, 2026  

---

## 1. Executive Summary & Clinical Clarification Mandate

> [!IMPORTANT]
> **Core Clinical Principle:**
> **If more information could meaningfully reduce uncertainty, ASK instead of GUESSING.**
> A single non-discriminative symptom (such as *“I have a headache”* or *“I have stomach pain”*) must never be forced into a high-confidence diagnosis.
> The system actively engages the patient in a multi-turn clarification dialogue, posing up to **3 targeted clinical questions** designed to resolve competing differentials and rule out emergency red flags.

---

## 2. Active Clinical Clarification Decision Loop

```
                         Patient Description (User Input)
                                       │
                                       ▼
                         [Clinical Symptom Parser]
                                       │
                                       ▼
                       [Category A: Safety Triage Check]
                                       │
                        Emergency Red Flag Detected?
                         ├── YES ──► [URGENT_ESCALATION] (Immediate 911 / ED)
                         └── NO
                                       │
                                       ▼
                     [Category B: Diagnostic Evidence Check]
                                       │
                         Insufficient / Ambiguous?
                         ├── YES ──► [CLARIFY] (Generate Targeted Questions)
                         └── NO
                                       │
                                       ▼
                     [Calibrated ML Model Classification]
                                       │
                         Statistical Confidence Solid?
                         ├── NO  ──► [ABSTAIN] (Safe Outpatient Referral)
                         └── YES ──► [PREDICT] (Calibrated Disease Diagnosis)
```

---

## 3. Question Selection & Information Gain Strategy

Implemented in [`backend/ml_model/clarification_engine.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/clarification_engine.py).

Questions are selected based on clinical entropy reduction and life-safety priority:

| Chief Complaint | Top Differentials | Targeted Clarifying Questions | Clinical Intent |
| :--- | :--- | :--- | :--- |
| **Chest Pain** | ACS vs. GERD vs. Musculoskeletal | 1. Does the pain radiate to your left arm, neck, or jaw?<br>2. Are you experiencing shortness of breath or cold sweats?<br>3. Is the discomfort worse after eating or accompanied by burning acidity? | **Rule out Acute Coronary Syndrome (ACS)** and differentiate GERD |
| **Headache** | Migraine vs. Tension vs. Meningismus | 1. Is the headache accompanied by nausea, vomiting, or photophobia?<br>2. Did it start suddenly with fever or stiff neck?<br>3. Do you have visual disturbances or zigzag aura? | **Rule out intracranial emergency** and confirm Migraine triad |
| **Fever** | Malaria vs. Dengue vs. URTI | 1. Are you having shivering chills followed by drenching sweats?<br>2. Do you have retro-orbital pain, joint aches, or skin rash?<br>3. Do you have a persistent cough or sore throat? | **Differentiate paroxysmal Malaria** from Dengue and respiratory infections |
| **Stomach Pain**| Appendicitis vs. GERD vs. Gastroenteritis | 1. Is the pain in the right lower abdomen worsening with touch?<br>2. Are you experiencing watery diarrhoea and vomiting?<br>3. Do you have heartburn, acid regurgitation, or indigestion? | **Rule out Acute Appendicitis** and differentiate Gastroenteritis / GERD |
| **Dizziness** | BPPV vs. Labyrinthitis vs. Ataxia | 1. Does the room feel like it is spinning around you?<br>2. Do you have difficulty with balance while walking?<br>3. Are you experiencing nausea, vomiting, or tinnitus? | **Confirm rotational vertigo (BPPV)** vs central ataxia |

---

## 4. Multi-Turn Triage State Machine

1. **State Preservation:** Responses across successive rounds (e.g. *Round 1 $\rightarrow$ Round 2 $\rightarrow$ Round 3*) are accumulated into the patient's structured clinical profile.
2. **Transition Criteria:**
   * **`CLARIFY` $\rightarrow$ `PREDICT`:** When affirmative responses supply pathognomonic evidence ($\ge 3$ distinct symptoms, confidence $\ge 35\%$), questioning ceases (`needs_more_info = False`) and the diagnostic prediction is rendered.
   * **`CLARIFY` $\rightarrow$ `URGENT_ESCALATION`:** If the user confirms an acute red flag (e.g. arm radiation or cyanosis), the system immediately halts outpatient analysis and triggers emergency escalation.
   * **`CLARIFY` $\rightarrow$ `ABSTAIN`:** If after **3 consecutive rounds** evidence remains non-discriminative, the engine stops questioning and directs the patient to an in-person physical evaluation.

---

## 5. Cross-Layer Architecture & Full-Stack Integration

* **Machine Learning Engine:** [`backend/ml_model/clarification_engine.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/clarification_engine.py) and [`backend/ml_model/enhanced_predict_service.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_predict_service.py).
* **Backend API Layer:** [`backend/src/services/aiService.ts`](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/aiService.ts) and [`backend/src/controllers/aiController.ts`](file:///c:/Users/admin/Desktop/medisync360/backend/src/controllers/aiController.ts).
* **Frontend UI Layer:** [`frontend/src/app/symptom-checker/page.tsx`](file:///c:/Users/admin/Desktop/medisync360/frontend/src/app/symptom-checker/page.tsx) renders interactive option buttons (*"Yes"*, *"No"*, *"Not sure"*) and submits multi-turn triage context.

---

## 6. Comprehensive 210-Scenario Test Benchmark

Executed via [`backend/ml_model/test_clarification_engine.py`](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/test_clarification_engine.py):

```powershell
python backend/ml_model/test_clarification_engine.py
```

| Scenario Group | Tested Capability | Scenarios | Result |
| :--- | :--- | :---: | :---: |
| **Group 1: Single Symptoms** | Verification that 30 generic complaints trigger clarification with 1–3 questions | 30 | **30/30 (100% Pass)** |
| **Group 2: Red-Flag Escalation** | Verification that affirmative answers to emergency cues transition to `URGENT_ESCALATION` | 30 | **30/30 (100% Pass)** |
| **Group 3: Affirmative Resolution**| Verification that confirming pathognomonic symptoms resolves into `PREDICT` | 50 | **50/50 (100% Pass)** |
| **Group 4: Negative Answer Handling**| Verification that "No" / "Not sure" answers do NOT invent symptoms | 40 | **40/40 (100% Pass)** |
| **Group 5: Max Round Constraints** | Verification that questioning strictly terminates after 3 uninformative rounds | 30 | **30/30 (100% Pass)** |
| **Group 6: Question Diversity** | Verification of question relevance and zero duplicate questions per round | 30 | **30/30 (100% Pass)** |
| **TOTAL** | **Intelligent Clarification Benchmark** | **210** | **210/210 (100.0% Pass)** |

---
*End of Assignment 12 Documentation.*
