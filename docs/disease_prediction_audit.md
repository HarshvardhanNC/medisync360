# MediSync360 Disease Prediction System: Comprehensive System & ML Audit (Assignment 0)

**Document Type:** Technical & Clinical Audit Report  
**Audit Scope:** End-to-End Diagnostic Pipeline (Dataset, ML Model, Feature Engineering, Rule Overrides, NLP/Parser, Backend, API, Frontend, UI)  
**System Status:** AUDIT ONLY (Zero code modifications made in Assignment 0)  
**Date of Audit:** August 30, 2026  

---

## Executive Summary

The MediSync360 disease prediction platform was subjected to a comprehensive, multi-layered audit across its entire stack. The core product mandate is: **"A wrong disease prediction is worse than no prediction. The system must NOT be forced to select one of its supported diseases."** The system must ultimately support four distinct decision policies: `PREDICT`, `CLARIFY`, `ABSTAIN`, and `URGENT_ESCALATION`.

The audit revealed severe architectural, algorithmic, dataset, and clinical safety vulnerabilities across all layers:
1. **Severe Data Leakage & Artificial Redundancy:** 4,616 out of 4,920 records (93.82%) in the primary dataset (`dataset.csv`) are exact duplicates. The training script splits train/test after expansion without deduplication, producing ~100% synthetic accuracy via test-set contamination.
2. **Closed-World Forcing & Lack of Abstention:** The ML classifier is a standard closed-world 41-class softmax/tree ensemble. For any out-of-scope illness (e.g., Dental abscess, COVID-19, Parkinson's, Pancreatitis, Pregnancy, Bone fracture, or Non-medical queries), the system is mathematically forced to select one of its 41 diseases.
3. **Manufactured & Misleading Confidence:** Hardcoded rule overrides in `enhanced_predict_service.py` intercept single vague symptoms (e.g., `"headache"`, `"fatigue"`, `"joint pain"`) and assign arbitrary 93%–97% confidence scores to arbitrary diseases (Migraine, Diabetes, Osteoarthritis).
4. **Negation & Entity Incompetence:** The NLP regex parser removes negation words (`"not"`, `"no"`, `"never"`) as stopwords. An input of *"I do NOT have chest pain, no fever, no cough"* is parsed as having chest pain, fever, and cough, triggering an emergency cardiac/respiratory prediction.
5. **High Failure Rate on Free-Form Input:** Across a 60-case benchmark of diverse clinical inputs (colloquial, spelling errors, negation, historical, family history, third-party, out-of-scope), the system failed **78.33%** of cases, with **31 high-confidence wrong predictions (>=90%)**.

---

## Task 1: Complete Architectural Flow & File Inventory

### End-to-End Execution Trace

```
User Free-form Text / UI Form Input
       │
       ▼
[Frontend UI] (frontend/src/app/symptom-checker/page.tsx)
  - Captures text in `<textarea>`
  - Manages multi-round triage state (`TriageRound[]`, `answers`)
       │
       ▼ [HTTP POST /api/ai/symptoms via frontend/src/utils/api.ts]
[API Route] (backend/src/routes/aiRoutes.ts)
  - `router.post('/symptoms', analyzeSymptoms)`
       │
       ▼
[Backend Controller] (backend/src/controllers/aiController.ts)
  - `analyzeSymptoms(req, res)` extracts `symptoms` & `triageContext`
       │
       ▼
[Backend Orchestration Service] (backend/src/services/aiService.ts)
  - `predictDiseaseFromSymptoms(symptoms, triageContext)`
  - Branch A: If `GEMINI_API_KEY` present:
      * Checks `broadSymptomKey` (`chest pain`, `fever`, `headache`, `my leg hurts`)
      * Checks hardcoded cardiac override rules (`buildChestPainTriageOverride`)
      * Calls Gemini LLM (`gemini-flash-latest`) for triage / question generation or extraction
      * Strips negated symptoms via `stripNegatedSymptoms()`
      * Normalizes strings via `normalizeExtractedSymptomsForModel()`
  - Branch B: If Gemini fails / disabled / absent:
      * Forwards raw string to Python child process
       │
       ▼ [Child Process Spawn: `python backend/ml_model/enhanced_predict_service.py "<symptoms>"`]
[Python ML Bridge Service] (backend/src/services/mlModelService.ts)
  - `MLModelService.predictDisease()` spawns sub-process with JSON stdin/stdout
       │
       ▼
[Python Predictor] (backend/ml_model/enhanced_predict_service.py)
  1. `preprocess_symptoms()`: 
     - Pass 1: Regex `PHRASE_MAP` matching against 131 symptom phrases.
     - Pass 2: Stopword removal (`STOPWORDS`) + n-gram fuzzy matching (`calculate_symptomSimilarity` >= 0.6).
     - Pass 3: Deduplication.
  2. `apply_critical_rules()`:
     - Hardcoded `CRITICAL_SYMPTOM_RULES` intercepts keyword matches.
     - If rule matches, immediately returns hardcoded disease + 93%–97% confidence, completely bypassing ML model.
  3. Feature Vector Generation:
     - 131-element numpy float vector (1.0 for exact, 0.6–1.0 for fuzzy).
  4. ML Model Inference:
     - If non-zero vector: `model.predict_proba([vector])[0]`
     - Multiplies probabilities by `(1 + confidence_boost)` and renormalizes.
     - Selects `np.argmax()` as primary prediction.
  5. Fallbacks:
     - If zero vector & single token: returns first disease from `symptom_to_diseases` dictionary with 60% confidence.
     - If zero vector & multi-token: returns `"No clear match found"` with 0% confidence.
       │
       ▼ [JSON Output to stdout]
[Backend Post-Processing] (backend/src/services/aiService.ts)
  - Attaches plain-language layman explanations from `backend/src/utils/laymanConditions.ts`.
  - Determines urgency, precautions, and specialist recommendation.
       │
       ▼ [HTTP 200 JSON Response]
[Frontend Resolution & Provider Referral] (frontend/src/app/symptom-checker/page.tsx)
  - Displays predicted disease, triage directive, specialist, and layman explanation.
  - Automatically queries `/api/ai/hospitals` to recommend doctor/clinic booking.
```

### Complete Inventory of Files Involved

| Component | File Path | Primary Responsibility |
| :--- | :--- | :--- |
| **Frontend UI** | [symptom-checker/page.tsx](file:///c:/Users/admin/Desktop/medisync360/frontend/src/app/symptom-checker/page.tsx) | User symptom input, multi-round triage question display, resolution cards, hospital/doctor booking trigger. |
| **Frontend API** | [api.ts](file:///c:/Users/admin/Desktop/medisync360/frontend/src/utils/api.ts) | Wrapper around `fetch()` configuring base API URL, headers, and error handling. |
| **Backend Router** | [aiRoutes.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/routes/aiRoutes.ts) | Express routing for `/ai/symptoms`, `/ai/recommend`, `/ai/hospitals`, `/ai/book-generated-slot`. |
| **Backend Controller** | [aiController.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/controllers/aiController.ts) | HTTP request extraction, error parsing, and JSON response serialization. |
| **AI Orchestrator** | [aiService.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/aiService.ts) | LLM triage prompts, broad-symptom question fallbacks, cardiac triage rules, layman mapping attachment. |
| **ML Bridge** | [mlModelService.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/mlModelService.ts) | Spawns `python enhanced_predict_service.py` via Node.js `child_process.spawn`. |
| **Python Predictor** | [enhanced_predict_service.py](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_predict_service.py) | NLP regex tokenization, stopword filtering, fuzzy similarity, rule overrides, ML feature vectorization, `predict_proba`. |
| **Python Trainer** | [enhanced_train_model.py](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_train_model.py) | Dataset loader, single-symptom synthesizer, train/test split, GradientBoostingClassifier training, artifact serialization. |
| **Model Artifact** | [disease_classifier.pkl](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/disease_classifier.pkl) | Serialized Scikit-Learn `GradientBoostingClassifier` model (46.8 MB). |
| **Encoder Artifact** | [label_encoder.pkl](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/label_encoder.pkl) | Serialized Scikit-Learn `LabelEncoder` (41 classes). |
| **Model Metadata** | [metadata.json](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/metadata.json) | 131 symptoms list, 41 disease classes, descriptions, precautions, severity weights, and symptom-to-disease reverse lookup. |
| **Primary Dataset** | [dataset.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/dataset.csv) | 4,920 disease-symptom rows across 17 symptom slots (Kaggle disease dataset). |
| **Dataset Auxiliary** | [symptom_Description.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/symptom_Description.csv) | Text descriptions for 41 diseases. |
| **Dataset Auxiliary** | [symptom_precaution.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/symptom_precaution.csv) | 4 precaution guidelines per disease. |
| **Dataset Auxiliary** | [Symptom-severity.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/Symptom-severity.csv) | Severity weight (1 to 7) per symptom. |
| **Layman Knowledge** | [laymanConditions.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/utils/laymanConditions.ts) | Plain-language translations and summaries for clinical condition names. |
| **Doctor Recommender** | [doctorRecommendation.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/utils/doctorRecommendation.ts) | Disease to specialist extraction and mapping utilities. |
| **Provider Catalog** | [providerCatalogService.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/providerCatalogService.ts) | Provider lookup and slot booking logic. |

---

## Task 2: Dataset Audit

A deep statistical and structural audit of `backend/src/data/dataset.csv` and its companion files produced the following findings:

### 1. Dataset Dimensions & Class Distribution
* **Total Records:** 4,920 rows.
* **Total Columns:** 18 (`Disease`, `Symptom_1` to `Symptom_17`).
* **Total Distinct Disease Classes:** Exactly **41 diseases**.
* **Class Balance:** Exactly **120 rows per disease** across all 41 classes (standard deviation = 0.0). This indicates a completely synthetic, artificially balanced Kaggle benchmark that bears no relation to real-world epidemiological disease prevalence.
* **Total Unique Symptoms in Dataset:** Exactly **131 unique symptoms**.

### 2. Extreme Redundancy & Duplicate Analysis
* **Exact Duplicate Rows:** **4,616 rows** (93.82% of the entire dataset) are exact byte-for-byte duplicates of other rows across all columns.
* **Unique Disease-Symptom Patterns:** There are only **304 unique symptom-combination patterns** in the entire dataset.
* **Pattern-to-Record Ratio:** Each true unique pattern is repeated approximately 16 times in the CSV.

### 3. Missing Values & Sparsity
* `Disease`, `Symptom_1`, `Symptom_2`, `Symptom_3`: 0 missing values.
* `Symptom_4`: 348 missing values (7.07%).
* `Symptom_5`: 1,206 missing values (24.51%).
* `Symptom_6` to `Symptom_17`: Increasing sparsity, reaching 4,848 missing values (98.54%) in `Symptom_17`.

### 4. Label Anomalies, Typos & String Inconsistencies
* **Trailing Whitespace in Labels:**
  * `'Diabetes '` has a trailing space in `dataset.csv`.
  * `'Hypertension '` has a trailing space in `dataset.csv`.
* **Typographical Errors in Disease Names:**
  * `'Peptic ulcer diseae'` (misspelling of disease).
  * `'Osteoarthristis'` (misspelling with extra "is").
  * `'(vertigo) Paroymsal  Positional Vertigo'` (misspelling of "Paroxysmal", double space, parenthetical prefix).
  * `'Dimorphic hemmorhoids(piles)'` (misspelling of hemorrhoids).
* **Cross-File Misalignment:**
  * `'Dimorphic hemmorhoids(piles)'` in `dataset.csv` is missing from `symptom_Description.csv`.
  * Symptoms present in `dataset.csv` but missing from `Symptom-severity.csv`: `{'dischromic  patches', 'foul smell of urine', 'spotting  urination'}` due to whitespace/formatting discrepancies (e.g. `foul smell ofurine`).

### 5. Exact Disease Classes Supported (41 Classes)
The current model can only predict the following 41 conditions:
1. `(vertigo) Paroymsal Positional Vertigo`
2. `AIDS`
3. `Acne`
4. `Alcoholic hepatitis`
5. `Allergy`
6. `Arthritis`
7. `Bronchial Asthma`
8. `Cervical spondylosis`
9. `Chicken pox`
10. `Chronic cholestasis`
11. `Common Cold`
12. `Dengue`
13. `Diabetes `
14. `Dimorphic hemmorhoids(piles)`
15. `Drug Reaction`
16. `Fungal infection`
17. `GERD`
18. `Gastroenteritis`
19. `Heart attack`
20. `Hepatitis B`
21. `Hepatitis C`
22. `Hepatitis D`
23. `Hepatitis E`
24. `Hypertension `
25. `Hyperthyroidism`
26. `Hypoglycemia`
27. `Hypothyroidism`
28. `Impetigo`
29. `Jaundice`
30. `Malaria`
31. `Migraine`
32. `Osteoarthristis`
33. `Paralysis (brain hemorrhage)`
34. `Peptic ulcer diseae`
35. `Pneumonia`
36. `Psoriasis`
37. `Tuberculosis`
38. `Typhoid`
39. `Urinary tract infection`
40. `Varicose veins`
41. `hepatitis A`

---

## Task 3: Training Pipeline Audit

An inspection of `backend/ml_model/enhanced_train_model.py` revealed fatal machine learning design flaws:

### 1. Data Augmentation & Single-Symptom Synthesizer
* The script constructs a `symptom_to_diseases` dictionary mapping each of the 131 symptoms to every disease where it has ever co-occurred in the dataset.
* It synthesizes single-symptom rows `{'symptoms': [symptom], 'disease': disease, 'weight': 0.7}`.
* **Flaw:** This creates massive label ambiguity. For a non-specific symptom like `"headache"`, it generates artificial training rows for 10+ different diseases with equal feature representation (all zeros except the headache index), forcing tree splits on noise.

### 2. Catastrophic Train-Test Data Leakage
* The script calls `train_test_split(X, y, sample_weights, test_size=0.2, random_state=42, stratify=y)` **after** loading the 4,920 rows (containing 4,616 duplicate rows) and appending the synthetic single-symptom rows.
* Because duplicate rows exist in both the train and test partitions, the test set is an exact copy of the training set.
* The reported accuracy (~100%) is completely invalid and measures training memory rather than generalizable clinical predictive capability.

### 3. Model Architecture & Hyperparameters
* **Model Type:** Scikit-Learn `GradientBoostingClassifier`.
* **Hyperparameters:** `n_estimators=200, max_depth=8, learning_rate=0.1, min_samples_split=5, min_samples_leaf=2, subsample=0.8, random_state=42`.
* **Weakness:** A tree depth of `max_depth=8` on a 131-dimensional binary feature space allows the ensemble to memorize exact combinatorial paths, causing extreme overfitting to synthetic Kaggle patterns while failing on real-world partial or noisy patient presentations.

---

## Task 4 & 5: Prediction Pipeline & Confidence Calibration Audit

### 1. NLP Extraction & Regex Brittleness
* `enhanced_predict_service.py` uses regex pattern matching (`PHRASE_MAP`) followed by stopword removal and n-gram fuzzy matching (`calculate_symptom_similarity` with threshold 0.6).
* **Negation Erasure:** The stopword set explicitly contains `'not'`, `'no'`, `'cannot'`, `'can\'t'`, `'dont'`, `'don\'t'`, `'doesnt'`, `'doesn\'t'`. When a patient states: *"I have no fever and no headache"*, the words "no" and "and" are stripped, leaving `"fever"` and `"headache"`, which are extracted as confirmed positive symptoms!
* **False Positive Overlap:** Substring matches in `calculate_symptom_similarity` cause severe false matches. For example, `"toothache"` or `"gum swelling"` matches `"swollen legs"` or `"headache"`.

### 2. Hardcoded Critical Rule Overrides
* `enhanced_predict_service.py` contains 30+ hardcoded rules in `CRITICAL_SYMPTOM_RULES`.
* If a single symptom matches (e.g. `{'wheezing'}: 1`, `{'headache'}: 1`, `{'increased thirst'}: 1`, `{'joint pain'}: 1`, `{'acidity'}: 1`), the system **completely bypasses the ML model** and returns a hardcoded condition with **93% to 97% confidence**.
* **Clinical Hazard:** A user typing simply `"headache"` is told with 95% confidence they have **Migraine**. A user typing `"fatigue"` is told with 95% confidence they have **Diabetes**.

### 3. Probability Distortion & Manufactured Confidence
* In cases where the ML model does execute, the output probabilities are modified:
  $$\text{probabilities} = \text{probabilities} \times (1 + \text{confidence\_boost})$$
  where `confidence_boost` adds $+0.2$ for every exact match and $+\text{score} \times 0.1$ for fuzzy matches.
* This arbitrary mathematical manipulation violates the probabilistic properties of the classifier, artificially inflating confidence scores.

### 4. Forcing In-Scope Predictions on Out-Of-Scope Cases
* If `np.sum(feature_vector) == 0` and a single word is provided, `predict_disease()` performs a fallback to `get_diseases_for_symptom()` and assigns **60.0% confidence** to the first disease found in the dictionary.
* If any feature vector element is non-zero, `predict_disease()` sorts probabilities and **always picks index 0**, even if the top probability is 12% and all other classes are 11%.
* **Zero Abstention / Rejection Mechanism:** The standalone ML predictor has no mechanism to return `ABSTAIN` or `CLARIFY` when uncertainty is high or an out-of-scope disease is presented.

---

## Task 6 & 7: Free-Form Input Benchmark & Failure Taxonomy

We evaluated 60 realistic, challenging clinical test cases against the current prediction engine. The detailed individual predictions are recorded in `evaluation/baseline_predictions.csv` and summary metrics in `evaluation/baseline_metrics.json`.

### Quantitative Benchmark Results

```json
{
  "total_test_cases": 60,
  "in_scope_test_cases": 27,
  "out_of_scope_or_vague_test_cases": 33,
  "successful_clinical_evaluations": 13,
  "total_failures": 47,
  "failure_rate_percentage": 78.33,
  "high_confidence_wrong_predictions_count": 31,
  "forced_in_scope_on_out_of_domain_cases": 19,
  "abstention_support_in_predictor": false,
  "clarification_support_in_predictor": false,
  "rule_override_activation_count": 25
}
```

### Failure Taxonomy Breakdown

| Taxonomy Category | Count | Failure Mechanism & Clinical Risk |
| :--- | :---: | :--- |
| **Clarification Failure** | 13 | Single vague complaints (`"headache"`, `"fever"`, `"fatigue"`, `"chest pain"`) are forced into specific diagnosis with up to 95% confidence instead of asking clarifying questions. |
| **Unknown / OOD Failure** | 9 | Closed-world forcing on diseases outside the 41 supported classes (e.g. COVID-19, Parkinson's, Alzheimer's, Pancreatitis, Pregnancy, Bone Fracture) without rejection capability. |
| **Rules Override Failure** | 7 | Rigid single-symptom rules in `CRITICAL_SYMPTOM_RULES` fire falsely on isolated words, suppressing differential diagnosis. |
| **Classifier Misclassification** | 8 | GradientBoosting model outputs wrong condition due to tree overfitting and synthetic Kaggle feature distribution. |
| **Parser & Negation Failure** | 5 | Negation stopwords are stripped, treating denied symptoms as active findings; family history and 3rd-party queries are attributed to the patient. |
| **Decision Policy Failure** | 5 | Educational questions (`"What causes headache?"`), medication questions, or nonsense strings are treated as active patient diagnostic encounters. |
| **None (Clinically Correct)** | 13 | Classic multi-symptom in-scope presentations correctly matched. |

---

## Task 8: Answers to the 10 Core Audit Questions

### 1. What diseases can the current model predict?
The trained model can predict exactly **41 disease classes** from the Kaggle dataset. It has zero knowledge of thousands of other medical conditions, including common presentations like appendicitis, pancreatitis, dental abscesses, trauma/fractures, COVID-19, depression, or pregnancy.

### 2. What does the model do when the input does not belong to those diseases?
The system **forces an in-scope prediction**. Because the model uses closed-world multiclass classification (`predict_proba`), the probability distribution is constrained to sum to 1.0 across the 41 supported diseases. An input describing Parkinson's disease, toothache, or bone fractures is forcibly mapped to one of the 41 diseases (e.g., Heart attack, Psoriasis, or Diabetes).

### 3. Can it currently abstain?
**No.** In the core Python prediction service, there is no statistically grounded abstention policy. If any symptom token matches, it always returns a primary prediction. It only returns `"No clear match found"` (confidence 0%) when the input produces an entirely empty feature vector that cannot be matched to any keyword in the 131-symptom dictionary.

### 4. Can it currently ask for clarification?
**No within the ML service; Partially/brittle in the Node.js backend.**
The Python prediction script cannot clarify; it always predicts. In `backend/src/services/aiService.ts`, a triage flow exists only if `GEMINI_API_KEY` is active and only if the input matches four hardcoded regular expressions: `"chest pain"`, `"fever"`, `"headache"`, or `"my leg hurts"`. For all other vague inputs (e.g., `"dizziness"`, `"fatigue"`, `"nausea"`, `"stomach ache"`), it does not ask for clarification and forces an immediate prediction.

### 5. Where can it confidently make a wrong prediction?
In at least five major scenarios:
1. **Single Vague Symptoms:** Inputting `"headache"` triggers a rule override yielding **Migraine with 95% confidence**. Inputting `"fatigue"` yields **Diabetes with 95% confidence**.
2. **Explicit Negation:** Inputting `"I have NO fever, NO chest pain, NO cough"` extracts all three symptoms and predicts **Bronchial Asthma with 96% confidence**.
3. **Family History / Third Party:** Inputting `"My father died of heart attack, mother has diabetes"` yields **Diabetes with 95% confidence**.
4. **Out-of-Scope Illnesses:** Inputting acute bone fracture or dental abscess yields **Heart attack or Psoriasis with 98%+ confidence**.
5. **Severe Acute Emergencies:** Inputting crushing chest pain with cold sweat, radiating to jaw, and vomiting matched cold hands and vomiting first, triggering **Migraine with 95% confidence** while ignoring the lethal cardiac presentation.

### 6. What are the biggest dataset weaknesses?
* **Extreme Duplication:** 93.82% of records are duplicate rows (4,616 out of 4,920).
* **Sparse Unique Patterns:** Only 304 unique clinical patterns across 41 diseases (~7 patterns per disease).
* **Artificial Balance:** Exactly 120 rows per disease, failing to capture true clinical baseline priors.
* **Label Noise & Typos:** Trailing spaces (`'Diabetes '`, `'Hypertension '`) and misspelled disease names (`'Peptic ulcer diseae'`, `'Osteoarthristis'`).
* **Closed-world limitation:** Only 131 symptom features and 41 disease classes.

### 7. What are the biggest ML weaknesses?
* **Severe Train-Test Contamination:** Train/test split performed on duplicate-heavy data, producing 100% illusory accuracy.
* **Overfitting:** `max_depth=8` tree ensembles memorize exact synthetic combinations.
* **Synthetic Single-Symptom Pollution:** Adding single-symptom rows with equal weights creates conflicting gradient steps across multi-class trees.
* **No Open-Set / Out-of-Distribution (OOD) Detection:** Lack of distance-based rejection, conformal prediction, or energy-based OOD gating.
* **Arbitrary Confidence Heuristics:** Multiplying probabilities by ad-hoc boost factors destroys probability calibration (Brier score / Expected Calibration Error).

### 8. What are the biggest backend/API weaknesses?
* **Fragile Subprocess Spawning:** Spawning a fresh Python process (`python enhanced_predict_service.py`) per request creates significant latency, memory thrashing, and unhandled child-process timeout risks under load.
* **Hardcoded Keyword Triage Rules:** Backend triage logic in `aiService.ts` is limited to four hardcoded regex strings rather than dynamic uncertainty quantification.
* **Tight Coupling to Gemini LLM:** If the Gemini API key is missing, expired, or rate-limited, intelligent triage collapses into raw regex matching.
* **Lossy Data Transformation:** Intermediate symptom string normalization drops severity, duration, and onset attributes.

### 9. What are the biggest frontend/UI weaknesses?
* **Forced Diagnostic Resolution:** The UI expects every completed analysis to resolve into a single `predictedCondition` and immediately displays hospital/doctor booking cards, even for low-confidence or nonsensical predictions.
* **Lack of Multi-Intent UI States:** The interface has no native visual state for `ABSTAIN` (explaining why a diagnosis cannot be safely made) or `URGENT_ESCALATION` (red emergency banner directing immediate emergency room care).
* **Unvalidated User Input:** The UI accepts arbitrary non-medical text or single-word fragments without pre-submission validation.

### 10. What must change to achieve our final goal?
To fulfill the core requirement—where wrong predictions are treated as worse than no prediction and the system supports `PREDICT`, `CLARIFY`, `ABSTAIN`, and `URGENT_ESCALATION`—the following multi-stage overhaul is required:
1. **Dataset Curation & Deduplication:** Clean all 4,616 duplicate rows, fix label typos and trailing spaces, expand clinical ontology, and establish leakage-free cross-validation splits.
2. **Clinical Entity & Negation NLP Pipeline:** Implement true clinical NLP (negation detection, temporal analysis, family vs. patient attribution) replacing regex stopword stripping.
3. **Calibrated ML Architecture with OOD Rejection:** Train a well-calibrated probabilistic model equipped with out-of-distribution uncertainty thresholds (e.g. Mahalanobis distance / Conformal Prediction / Open-Set classifier).
4. **Four-Branch Decision Engine:**
   - **`URGENT_ESCALATION`**: Immediate emergency routing if red-flag symptoms are detected (chest pain + radiation, stroke signs, anaphylaxis).
   - **`PREDICT`**: Output prediction ONLY when confidence and top-1/top-2 margin exceed strict clinical certainty thresholds.
   - **`CLARIFY`**: Trigger interactive follow-up questions when evidence is ambiguous or non-specific.
   - **`ABSTAIN`**: Explicitly decline prediction when symptoms are out-of-scope, non-medical, or contradictory.
5. **Persistent Backend Inference Service:** Replace per-request `spawn()` with an in-memory FastAPI/gRPC or resident inference server.
6. **Frontend Multi-Intent State Management:** Redesign the UI to render distinct views for emergency escalation, clarification dialogs, abstention notices, and high-confidence diagnostic summaries.

---

## Recommended Implementation Order for Multi-Stage Improvement

```
Stage 1: Dataset Remediation & Clean Validation Foundation
  ├── Deduplicate dataset.csv (remove 4,616 duplicate rows)
  ├── Clean label typos, trailing spaces, and align description/severity CSVs
  ├── Establish strict group-stratified train/validation/test splits (Zero Leakage)
  └── Create baseline evaluation benchmark script

Stage 2: Clinical NLP Parser & Entity/Negation Engine
  ├── Implement negation detection (e.g., NegEx algorithm / dependency parsing)
  ├── Implement entity & subject attribution (patient vs family vs pet vs history)
  ├── Build clinical synonym & ontology mapping covering medical terminology
  └── Add input validation & intent classifier (medical vs educational vs conversational)

Stage 3: ML Model Architecture, Uncertainty & OOD Detection
  ├── Train calibrated probabilistic model (e.g., Logistic Regression / Calibrated XGBoost / Multi-label Classifier)
  ├── Implement Out-of-Distribution (OOD) / Open-Set rejection scoring
  ├── Calibrate class probabilities (Isotonic Regression / Platt Scaling)
  └── Evaluate using Brier score, ECE (Expected Calibration Error), and rejection curves

Stage 4: Four-Branch Decision Policy Engine (Predict / Clarify / Abstain / Escalate)
  ├── Red-flag Emergency Detection Policy (`URGENT_ESCALATION`)
  ├── High-Certainty Prediction Threshold Policy (`PREDICT`)
  ├── Dynamic Ambiguity Resolution Policy (`CLARIFY`)
  └── Out-of-Scope Rejection Policy (`ABSTAIN`)

Stage 5: Backend Service Refactoring & Persistent Inference Server
  ├── Convert Python prediction engine to long-running API microservice (FastAPI / gRPC)
  ├── Refactor Express backend to interact with persistent ML service
  └── Update API contracts to support 4-branch response schema

Stage 6: Frontend / UI Modernization for Safety
  ├── Implement dynamic UI states: Emergency Banner, Clarification Q&A Flow, Abstention Notice, Verified Diagnosis Card
  └── Connect doctor/hospital referral exclusively to validated predictions
```

---

## Files Inspected

* [backend/ml_model/enhanced_train_model.py](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_train_model.py)
* [backend/ml_model/enhanced_predict_service.py](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/enhanced_predict_service.py)
* [backend/ml_model/trained_model/metadata.json](file:///c:/Users/admin/Desktop/medisync360/backend/ml_model/trained_model/metadata.json)
* [backend/src/data/dataset.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/dataset.csv)
* [backend/src/data/symptom_Description.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/symptom_Description.csv)
* [backend/src/data/symptom_precaution.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/symptom_precaution.csv)
* [backend/src/data/Symptom-severity.csv](file:///c:/Users/admin/Desktop/medisync360/backend/src/data/Symptom-severity.csv)
* [backend/src/services/aiService.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/aiService.ts)
* [backend/src/services/mlModelService.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/mlModelService.ts)
* [backend/src/services/kaggleMedicalKB.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/kaggleMedicalKB.ts)
* [backend/src/services/csvDataLoader.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/services/csvDataLoader.ts)
* [backend/src/controllers/aiController.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/controllers/aiController.ts)
* [backend/src/routes/aiRoutes.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/routes/aiRoutes.ts)
* [backend/src/utils/laymanConditions.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/utils/laymanConditions.ts)
* [backend/src/utils/doctorRecommendation.ts](file:///c:/Users/admin/Desktop/medisync360/backend/src/utils/doctorRecommendation.ts)
* [frontend/src/app/symptom-checker/page.tsx](file:///c:/Users/admin/Desktop/medisync360/frontend/src/app/symptom-checker/page.tsx)
* [frontend/src/utils/api.ts](file:///c:/Users/admin/Desktop/medisync360/frontend/src/utils/api.ts)

---
*End of Assignment 0 Audit Report.*
