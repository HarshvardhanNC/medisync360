import sys
import json
import numpy as np
import joblib
import os
from typing import List, Dict, Any, Optional
import re

class EnhancedMedicalPredictor:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.metadata = None
        self.symptoms = []
        self.diseases = []
        self.symptom_to_diseases = {}
        self.load_model()
    
    def load_model(self):
        """Load enhanced trained model and metadata"""
        try:
            model_dir = 'trained_model'
            
            # Load model components
            self.model = joblib.load(os.path.join(model_dir, 'disease_classifier.pkl'))
            self.label_encoder = joblib.load(os.path.join(model_dir, 'label_encoder.pkl'))
            
            # Load metadata
            with open(os.path.join(model_dir, 'metadata.json'), 'r') as f:
                self.metadata = json.load(f)
            
            self.symptoms = self.metadata['symptoms']
            self.diseases = self.metadata['diseases']
            self.symptom_to_diseases = self.metadata.get('symptom_to_diseases', {})
            
            print(f"Enhanced model loaded with {len(self.symptoms)} symptoms and {len(self.diseases)} diseases", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading enhanced model: {e}", file=sys.stderr)
            raise
    
    # ------------------------------------------------------------------ #
    #  NLP helpers – understand natural language from real patients       #
    # ------------------------------------------------------------------ #

    # Words/phrases to strip before symptom extraction
    STOPWORDS = {
        'i', 'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'feel', 'feeling', 'felt', 'get', 'getting', 'got',
        'experiencing', 'experience', 'suffer', 'suffering', 'noticed', 'notice',
        'having', 'my', 'me', 'the', 'a', 'an', 'some', 'bit',
        'little', 'lot', 'very', 'quite', 'really', 'so', 'much', 'many',
        'sometimes', 'often', 'always', 'lately', 'recently', 'since', 'for',
        'days', 'weeks', 'hours', 'today', 'yesterday', 'night', 'morning',
        'past', 'last', 'few', 'couple', 'of', 'in', 'on', 'at', 'from',
        'there', 'this', 'that', 'these', 'those', 'also', 'too', 'as', 'well',
        'but', 'not', 'no', 'yes', 'ok', 'okay', 'please', 'help', 'think',
        'kind', 'sort', 'type', 'slight', 'severe', 'mild',
        'moderate', 'bad', 'terrible', 'awful', 'horrible', 'constant', 'sharp',
        'dull', 'throbbing', 'keep', 'keeps',
        'cannot', "can't", 'cant', 'dont', "don't", 'doesnt', "doesn't",
    }

    # ── Critical symptom → disease overrides ──────────────────────────────────
    # When the matched symptoms clearly point to a specific condition, we skip
    # the ML model and return a high-confidence rule-based result instead.
    # Format: (required_symptoms_set, min_match_count, disease, confidence, specialist, urgency)
    CRITICAL_SYMPTOM_RULES = [
        # Cardiac
        ({'chest pain', 'chest tightness', 'heart pain', 'chest discomfort'},
         1, 'Heart attack', 88, 'Cardiologist', 'Emergency - Seek immediate care'),
        ({'chest pain', 'shortness of breath'}, 2, 'Heart attack', 90, 'Cardiologist', 'Emergency - Seek immediate care'),
        ({'chest pain', 'sweating', 'nausea'}, 2, 'Heart attack', 92, 'Cardiologist', 'Emergency - Seek immediate care'),
        # Migraine / Headache
        ({'headache', 'nausea', 'vomiting'}, 2, 'Migraine', 82, 'Neurologist', 'Medium - Schedule appointment soon'),
        ({'headache', 'blurred vision'}, 2, 'Migraine', 80, 'Neurologist', 'Medium - Schedule appointment soon'),
        # Common Cold / Flu
        ({'runny nose', 'sore throat', 'cough'}, 2, 'Common Cold', 85, 'General Practitioner', 'Low - Monitor symptoms'),
        ({'cough', 'high fever', 'fatigue'}, 2, 'Influenza', 80, 'General Practitioner', 'Medium - Schedule appointment soon'),
        # Gastro
        ({'nausea', 'vomiting', 'stomach pain'}, 2, 'Gastroenteritis', 85, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'stomach pain', 'acidity', 'nausea'}, 2, 'GERD', 80, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        # UTI
        ({'burning micturition', 'frequent urination'}, 1, 'Urinary tract infection', 85, 'Urologist', 'Medium - Schedule appointment soon'),
        # Dengue (needs fever + rash + joint pain together)
        ({'high fever', 'skin rash', 'joint pain'}, 3, 'Dengue', 85, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        ({'high fever', 'muscle pain', 'headache', 'skin rash'}, 3, 'Dengue', 88, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        # Asthma / Breathing
        ({'shortness of breath', 'wheezing', 'cough'}, 2, 'Bronchial Asthma', 85, 'Pulmonologist', 'High - See doctor within 24 hours'),
        # Diabetes
        ({'fatigue', 'weight loss', 'frequent urination'}, 2, 'Diabetes', 80, 'Endocrinologist', 'Medium - Schedule appointment soon'),
        # Malaria
        ({'high fever', 'chills', 'sweating', 'headache'}, 3, 'Malaria', 85, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        # Jaundice
        ({'yellowing of skin', 'fatigue'}, 1, 'Jaundice', 82, 'Hepatologist', 'High - See doctor within 24 hours'),
        # Hypertension
        ({'headache', 'dizziness', 'chest pain'}, 2, 'Hypertension', 75, 'Cardiologist', 'High - See doctor within 24 hours'),
    ]

    # Lay-person phrase → medical keyword mapping
    # IMPORTANT: Order matters - more specific patterns first.
    # Use word boundaries (\b) to avoid partial-word false positives.
    PHRASE_MAP = [
        # ── Head / neurological ──────────────────────────────────────────────
        (r'\b(migrain)\b', 'headache'),
        (r'\bhead\b.{0,15}\b(pound|hurt|ach|throb|split|bang|pain)\b', 'headache'),
        (r'\b(dizz|vertigo|lightheaded|light.headed)\b', 'dizziness'),
        (r'\broom.{0,6}spin\b', 'dizziness'),
        (r'\b(blur|double).{0,10}\b(vision|sight)\b', 'blurred vision'),
        (r'\b(insomni|cannot sleep|can.{0,3}t sleep|trouble sleeping|sleepless)\b', 'insomnia'),
        # ── Breathing / chest ────────────────────────────────────────────────
        # chest/heart pain — MUST come before generic pain patterns
        (r'\b(chest).{0,15}\b(pain|tight|press|heavy|ach|hurt|discomfort)\b', 'chest pain'),
        (r'\b(heart).{0,15}\b(pain|ach|hurt|paining|hurting)\b', 'chest pain'),
        (r'\b(paining|hurting).{0,10}\b(heart|chest)\b', 'chest pain'),
        (r'\b(breath).{0,10}\b(short|hard|difficult|problem|trouble|less)\b', 'shortness of breath'),
        (r'\b(short).{0,6}\b(breath|breathing)\b', 'shortness of breath'),
        (r'\bcan.{0,4}t.{0,6}breath\b', 'shortness of breath'),
        (r'\b(wheez)\b', 'wheezing'),
        # ── Stomach / GI ─────────────────────────────────────────────────────
        (r'\b(stomach|belly|tummy|abdomen|gut).{0,15}\b(pain|hurt|ach|cramp|upset|sore)\b', 'stomach pain'),
        (r'\b(throw.{0,5}up|threw.{0,5}up|puking|vomiting|retching)\b', 'vomiting'),
        (r'\b(sick.{0,6}stomach|sick.{0,6}tummy)\b', 'vomiting'),
        (r'\b(nausea|queasy|want.{0,6}vomit|feel.{0,6}sick)\b', 'nausea'),
        (r'\b(loose.{0,6}stool|loose.{0,6}motion|watery.{0,6}stool|diarr)\b', 'diarrhoea'),
        (r'\b(constip|cannot.{0,6}pass.{0,6}stool|hard.{0,6}stool)\b', 'constipation'),
        (r'\b(heartburn|heart.{0,4}burn|acid.{0,6}reflux|acidity)\b', 'acidity'),
        # ── Temperature / systemic ───────────────────────────────────────────
        (r'\b(fever|feverish|high.{0,6}temp|body.{0,6}hot|feel.{0,6}hot)\b', 'high fever'),
        (r'\b(chills|shivering|shaking|trembling)\b', 'chills'),
        (r'\b(sweating|perspiring|drenched.{0,6}sweat)\b', 'sweating'),
        (r'\b(tired|exhausted|fatigue|weakness|weak|no.{0,6}energy|lethargic|lethargy|worn.{0,6}out)\b', 'fatigue'),
        (r'\b(weight.{0,6}loss|losing.{0,6}weight|lost.{0,6}weight)\b', 'weight loss'),
        (r'\b(weight.{0,6}gain|gaining.{0,6}weight)\b', 'weight gain'),
        # ── Skin ─────────────────────────────────────────────────────────────
        (r'\b(skin.{0,10}rash|rash.{0,10}skin|hives|skin.{0,6}irrit|dermatitis)\b', 'skin rash'),
        (r'\b(itching|itchy.{0,6}skin|itchy)\b', 'itching'),
        (r'\b(yellow.{0,6}skin|yellow.{0,6}eye|jaundice)\b', 'yellowing of skin'),
        # ── ENT ──────────────────────────────────────────────────────────────
        (r'\b(runny.{0,6}nose|blocked.{0,6}nose|stuffy.{0,6}nose|nasal.{0,6}congestion|rhinorrhea)\b', 'runny nose'),
        (r'\b(sore.{0,6}throat|throat.{0,6}pain|throat.{0,6}hurt|scratchy.{0,6}throat|throat.{0,6}ach)\b', 'throat irritation'),
        (r'\b(coughing|cough|hacking)\b', 'cough'),
        (r'\b(ear.{0,6}pain|ear.{0,6}ach|earache|ear.{0,6}ring|tinnitus)\b', 'earache'),
        # ── Muscles / joints ─────────────────────────────────────────────────
        (r'\b(muscle.{0,10}pain|muscle.{0,6}ache|muscle.{0,6}sore|myalgia|body.{0,6}ache)\b', 'muscle pain'),
        (r'\b(joint.{0,10}pain|joint.{0,6}ache|stiff.{0,6}joint|joint.{0,6}stiff|arthritis)\b', 'joint pain'),
        (r'\b(back.{0,10}pain|backache|lumbar.{0,6}pain|spine.{0,6}pain|back.{0,6}ache)\b', 'back pain'),
        (r'\b(neck.{0,10}pain|neck.{0,6}ache|stiff.{0,6}neck|neck.{0,6}stiff)\b', 'neck pain'),
        # ── Urinary ──────────────────────────────────────────────────────────
        (r'\b(burning.{0,6}urin|pain.{0,6}urin|painful.{0,6}urin|burning.{0,6}pee)\b', 'burning micturition'),
        (r'\b(frequent.{0,6}urinat|urinate.{0,6}often|pee.{0,6}lot|pee.{0,6}frequently)\b', 'frequent urination'),
        # ── Eyes ─────────────────────────────────────────────────────────────
        (r'\b(red.{0,6}eye|eye.{0,6}red|pink.{0,6}eye|eye.{0,6}irrit|redness.{0,6}eye)\b', 'redness of eyes'),
        (r'\b(watery.{0,6}eye|eye.{0,6}water|watering.{0,6}eye)\b', 'watering from eyes'),
        # ── Appetite ─────────────────────────────────────────────────────────
        (r'\b(no.{0,6}appetite|loss.{0,6}appetite|not.{0,6}hungry|don.{0,4}t.{0,6}want.{0,6}eat)\b', 'loss of appetite'),
        # ── Mental ───────────────────────────────────────────────────────────
        (r'\b(anxious|anxiety|panic.{0,6}attack|panic)\b', 'anxiety'),
        (r'\b(depress|hopeless|low.{0,6}mood|very.{0,6}sad)\b', 'depression'),
    ]

    def extract_symptoms_from_text(self, text: str) -> List[str]:
        """
        Convert free-form natural language into a list of medical symptom keywords.
        Three-pass approach:
          1. Phrase mapping (regex patterns → known keywords)
          2. Tokenise + stopword removal → n-gram fuzzy matching
          3. Deduplicate & return
        """
        text_lower = text.lower().strip()

        extracted = []
        consumed_spans = []  # track char positions already matched by phrase map

        # ── Pass 1: phrase map ────────────────────────────────────────────────
        for pattern, keyword in self.PHRASE_MAP:
            for m in re.finditer(pattern, text_lower):
                extracted.append(keyword)
                consumed_spans.append((m.start(), m.end()))

        # ── Pass 2: tokenise remaining text and do n-gram fuzzy matching ──────
        # Mask already-matched regions so we don't double-count
        masked = list(text_lower)
        for start, end in consumed_spans:
            for i in range(start, min(end, len(masked))):
                masked[i] = ' '
        remaining = ''.join(masked)

        # Split on common natural-language delimiters
        delimiters = r'[,;.!?\n]|\band\b|\balso\b|\bplus\b|\bwith\b|\bas well as\b'
        parts = re.split(delimiters, remaining)

        for part in parts:
            # Remove stopwords word-by-word
            words = part.strip().split()
            filtered_words = [w for w in words if w not in self.STOPWORDS and len(w) > 1]

            if not filtered_words:
                continue

            # Try 3-gram, 2-gram, 1-gram n-grams against the known symptom list
            n = len(filtered_words)
            matched_any = False
            for size in [3, 2, 1]:
                if matched_any:
                    break
                for start in range(n - size + 1):
                    ngram = ' '.join(filtered_words[start:start + size])
                    # Check against known symptoms with fuzzy matching
                    best_score = 0
                    best_sym = None
                    for sym in self.symptoms:
                        score = self.calculate_symptom_similarity(ngram, sym)
                        if score > best_score:
                            best_score = score
                            best_sym = sym
                    if best_sym and best_score >= 0.6:
                        extracted.append(best_sym)
                        matched_any = True
                        break

        # ── Pass 3: deduplicate while preserving order ────────────────────────
        seen = set()
        unique = []
        for s in extracted:
            key = s.replace('_', ' ').strip()
            if key and key not in seen:
                seen.add(key)
                unique.append(key)

        return unique if unique else [text_lower]  # fallback: return original

    def preprocess_symptoms(self, user_symptoms: str) -> tuple:
        """Enhanced symptom preprocessing with NLP + fuzzy matching"""
        # ── NLP extraction: convert natural language → symptom keyword list ──
        # Check if it looks like plain comma-separated keywords already
        looks_like_keywords = all(
            len(s.strip().split()) <= 3
            for s in user_symptoms.split(',') if s.strip()
        )
        if looks_like_keywords and ',' in user_symptoms:
            # Already structured as keyword list — use directly
            symptom_list = [s.strip().lower() for s in user_symptoms.split(',')]
        else:
            # Natural language → extract symptoms first
            symptom_list = self.extract_symptoms_from_text(user_symptoms)

        symptom_list = [s for s in symptom_list if s and len(s) > 1]
        
        # Create feature vector
        feature_vector = np.zeros(len(self.symptoms))
        matched_symptoms = []
        confidence_boost = 0
        
        for user_symptom in symptom_list:
            # Direct exact match
            if user_symptom in self.symptoms:
                idx = self.symptoms.index(user_symptom)
                feature_vector[idx] = 1
                matched_symptoms.append(user_symptom)
                confidence_boost += 0.2
                continue
            
            # Fuzzy matching with enhanced logic
            best_match = None
            best_score = 0
            
            for i, model_symptom in enumerate(self.symptoms):
                score = self.calculate_symptom_similarity(user_symptom, model_symptom)
                if score > best_score and score > 0.6:  # Threshold for matching
                    best_score = score
                    best_match = (i, model_symptom)
            
            if best_match:
                feature_vector[best_match[0]] = best_score
                matched_symptoms.append(best_match[1])
                confidence_boost += best_score * 0.1
        
        return feature_vector, matched_symptoms, confidence_boost
    
    def calculate_symptom_similarity(self, user_symptom: str, model_symptom: str) -> float:
        """Calculate similarity between user symptom and model symptom"""
        # Direct substring match
        if user_symptom in model_symptom or model_symptom in user_symptom:
            return 1.0
        
        # Enhanced synonym mapping
        synonyms = {
            'headache': ['head pain', 'migraine', 'head ache', 'cranial pain', 'cephalgia'],
            'stomach pain': ['abdominal pain', 'belly pain', 'tummy ache', 'gut pain', 'gastric pain'],
            'fever': ['high temperature', 'pyrexia', 'hot', 'feverish', 'hyperthermia'],
            'nausea': ['feeling sick', 'queasy', 'stomach upset', 'queasiness', 'sick feeling'],
            'fatigue': ['tired', 'exhausted', 'weakness', 'tiredness', 'worn out', 'lethargy'],
            'shortness of breath': ['difficulty breathing', 'breathlessness', 'dyspnea', 'breathing problems'],
            'chest pain': ['heart pain', 'chest discomfort', 'thoracic pain', 'chest tightness'],
            'joint pain': ['arthritis', 'joint ache', 'stiff joints', 'joint stiffness', 'arthritic pain'],
            'skin rash': ['rash', 'skin irritation', 'skin eruption', 'dermatitis'],
            'dizziness': ['lightheaded', 'vertigo', 'spinning sensation', 'unsteady'],
            'cough': ['coughing', 'hack', 'persistent cough', 'dry cough', 'wet cough'],
            'vomiting': ['throwing up', 'puking', 'emesis', 'retching'],
            'diarrhea': ['loose stool', 'watery stool', 'loose bowel movement'],
            'constipation': ['difficulty passing stool', 'hard stool', 'blocked bowel'],
            'muscle pain': ['muscle ache', 'myalgia', 'sore muscles', 'muscle soreness'],
            'back pain': ['backache', 'spinal pain', 'lumbar pain'],
            'sore throat': ['throat pain', 'pharyngitis', 'throat irritation'],
            'runny nose': ['nasal discharge', 'rhinorrhea', 'nasal congestion'],
            'weight loss': ['losing weight', 'unexplained weight loss', 'weight reduction'],
            'blurred vision': ['vision problems', 'unclear vision', 'visual disturbance']
        }
        
        # Check synonyms
        for key, values in synonyms.items():
            if ((key in user_symptom or user_symptom in key) and 
                any(v in model_symptom or model_symptom in v for v in values)):
                return 0.9
            if ((key in model_symptom or model_symptom in key) and 
                any(v in user_symptom or user_symptom in v for v in values)):
                return 0.9
        
        # Word overlap scoring
        user_words = set(user_symptom.split())
        model_words = set(model_symptom.split())
        
        if user_words & model_words:  # Common words
            overlap = len(user_words & model_words)
            total = len(user_words | model_words)
            return overlap / total
        
        return 0.0
    
    def apply_critical_rules(self, matched_symptoms: List[str]) -> Optional[Dict[str, Any]]:
        """
        Check matched symptoms against hard-coded critical rules.
        Returns a result dict if a rule fires, else None.
        The rules encode well-known medical knowledge that the ML model sometimes misses.
        """
        matched_set = set(s.lower().strip() for s in matched_symptoms)
        for (rule_symptoms, min_count, disease, confidence, specialist, urgency) in self.CRITICAL_SYMPTOM_RULES:
            overlap = rule_symptoms & matched_set
            if len(overlap) >= min_count:
                return {
                    'predictedCondition': disease,
                    'recommendedSpecialist': specialist,
                    'urgencyLevel': urgency,
                    'description': self.metadata['disease_descriptions'].get(
                        disease, f'Medical condition: {disease}'
                    ),
                    'confidence': float(confidence),
                    'matchedSymptoms': list(matched_symptoms),
                    'alternativePossibilities': [],
                    'precautions': self.metadata['disease_precautions'].get(disease, []),
                    'dataSource': 'Critical Symptom Rules + ML Model',
                    'modelType': 'Rule-Based Override'
                }
        return None

    def predict_disease(self, user_symptoms: str) -> Dict[str, Any]:
        """Enhanced disease prediction"""
        try:
            # Preprocess symptoms
            feature_vector, matched_symptoms, confidence_boost = self.preprocess_symptoms(user_symptoms)
            
            # ── Critical rule override (runs BEFORE ML model) ────────────────
            if matched_symptoms:
                rule_result = self.apply_critical_rules(matched_symptoms)
                if rule_result:
                    return rule_result

            if np.sum(feature_vector) == 0:
                # Try direct symptom-to-disease mapping for single symptoms
                user_symptom_list = [s.strip().lower() for s in user_symptoms.split(',')]
                if len(user_symptom_list) == 1:
                    single_symptom = user_symptom_list[0]
                    possible_diseases = self.get_diseases_for_symptom(single_symptom)
                    
                    if possible_diseases:
                        # Return most common disease for this symptom
                        primary_disease = possible_diseases[0]
                        return {
                            'predictedCondition': primary_disease,
                            'recommendedSpecialist': self.get_specialist(primary_disease),
                            'urgencyLevel': self.get_urgency(primary_disease, 60),
                            'description': self.metadata['disease_descriptions'].get(
                                primary_disease, f'Medical condition: {primary_disease}'
                            ),
                            'confidence': 60.0,
                            'matchedSymptoms': [single_symptom],
                            'alternativePossibilities': [
                                {'condition': d, 'confidence': 50 - i*10} 
                                for i, d in enumerate(possible_diseases[1:3])
                            ],
                            'precautions': self.metadata['disease_precautions'].get(primary_disease, []),
                            'dataSource': 'Enhanced ML Model - Single Symptom Mapping',
                            'modelType': 'Gradient Boosting Classifier'
                        }
                
                return {
                    'predictedCondition': 'No clear match found',
                    'recommendedSpecialist': 'General Practitioner',
                    'urgencyLevel': 'Low - Consult a doctor for proper evaluation',
                    'description': 'Symptoms don\'t match conditions in our database',
                    'confidence': 0,
                    'matchedSymptoms': [],
                    'alternativePossibilities': [],
                    'precautions': ['Consult a healthcare professional', 'Monitor symptoms'],
                    'dataSource': 'Enhanced ML Model',
                    'modelType': 'Gradient Boosting Classifier'
                }
            
            # Get predictions with probabilities
            probabilities = self.model.predict_proba([feature_vector])[0]
            
            # Apply confidence boost
            probabilities = probabilities * (1 + confidence_boost)
            probabilities = probabilities / np.sum(probabilities)  # Renormalize
            
            # Get top predictions
            top_indices = np.argsort(probabilities)[::-1][:5]
            top_diseases = []
            
            for idx in top_indices:
                disease = self.label_encoder.inverse_transform([idx])[0]
                confidence = probabilities[idx] * 100
                if confidence > 1:  # Lower threshold
                    top_diseases.append({
                        'disease': disease,
                        'confidence': round(confidence, 1)
                    })
            
            if not top_diseases:
                return {
                    'predictedCondition': 'Low confidence prediction',
                    'recommendedSpecialist': 'General Practitioner',
                    'urgencyLevel': 'Low - Consult a doctor for proper evaluation',
                    'description': 'Multiple conditions possible with low confidence',
                    'confidence': 0,
                    'matchedSymptoms': matched_symptoms,
                    'alternativePossibilities': [],
                    'precautions': ['Consult a healthcare professional']
                }
            
            # Primary prediction
            primary_disease = top_diseases[0]['disease']
            primary_confidence = top_diseases[0]['confidence']
            
            # Get disease info
            description = self.metadata['disease_descriptions'].get(
                primary_disease, f'Medical condition: {primary_disease}'
            )
            precautions = self.metadata['disease_precautions'].get(primary_disease, [])
            
            # Determine specialist and urgency
            specialist = self.get_specialist(primary_disease)
            urgency = self.get_urgency(primary_disease, primary_confidence)
            
            # Alternative possibilities
            alternatives = [
                {'condition': d['disease'], 'confidence': d['confidence']} 
                for d in top_diseases[1:4]
            ]
            
            return {
                'predictedCondition': primary_disease,
                'recommendedSpecialist': specialist,
                'urgencyLevel': urgency,
                'description': description,
                'confidence': primary_confidence,
                'matchedSymptoms': matched_symptoms,
                'alternativePossibilities': alternatives,
                'precautions': precautions,
                'dataSource': 'Enhanced ML Model on Kaggle Dataset',
                'modelType': 'Gradient Boosting Classifier'
            }
            
        except Exception as e:
            print(f"Enhanced prediction error: {e}", file=sys.stderr)
            raise
    
    def get_diseases_for_symptom(self, symptom: str) -> List[str]:
        """Get possible diseases for a single symptom"""
        # Direct mapping
        if symptom in self.symptom_to_diseases:
            return self.symptom_to_diseases[symptom]
        
        # Fuzzy search in mappings
        for mapped_symptom, diseases in self.symptom_to_diseases.items():
            if self.calculate_symptom_similarity(symptom, mapped_symptom) > 0.7:
                return diseases
        
        return []
    
    def get_specialist(self, disease: str) -> str:
        """Map disease to specialist"""
        specialist_mapping = {
            'Fungal infection': 'Dermatologist',
            'Allergy': 'Allergist',
            'GERD': 'Gastroenterologist',
            'Chronic cholestasis': 'Hepatologist',
            'Drug Reaction': 'Emergency Medicine',
            'Peptic ulcer diseae': 'Gastroenterologist',
            'AIDS': 'Infectious Disease Specialist',
            'Diabetes': 'Endocrinologist',
            'Gastroenteritis': 'Gastroenterologist',
            'Bronchial Asthma': 'Pulmonologist',
            'Hypertension': 'Cardiologist',
            'Migraine': 'Neurologist',
            'Cervical spondylosis': 'Orthopedist',
            'Paralysis (brain hemorrhage)': 'Neurologist',
            'Jaundice': 'Hepatologist',
            'Malaria': 'Infectious Disease Specialist',
            'Chicken pox': 'Dermatologist',
            'Dengue': 'Infectious Disease Specialist',
            'Typhoid': 'Infectious Disease Specialist',
            'hepatitis A': 'Hepatologist',
            'Hepatitis B': 'Hepatologist',
            'Hepatitis C': 'Hepatologist',
            'Hepatitis D': 'Hepatologist',
            'Hepatitis E': 'Hepatologist',
            'Alcoholic hepatitis': 'Hepatologist',
            'Tuberculosis': 'Pulmonologist',
            'Common Cold': 'General Practitioner',
            'Pneumonia': 'Pulmonologist',
            'Dimorphic hemmorhoids(piles)': 'Proctologist',
            'Heart attack': 'Cardiologist',
            'Varicose veins': 'Vascular Surgeon',
            'Hypothyroidism': 'Endocrinologist',
            'Hyperthyroidism': 'Endocrinologist',
            'Hypoglycemia': 'Endocrinologist',
            'Osteoarthristis': 'Rheumatologist',
            'Arthritis': 'Rheumatologist',
            'Paroymsal Positional Vertigo': 'ENT Specialist',
            'Acne': 'Dermatologist',
            'Urinary tract infection': 'Urologist',
            'Psoriasis': 'Dermatologist',
            'Impetigo': 'Dermatologist'
        }
        return specialist_mapping.get(disease, 'General Practitioner')
    
    def get_urgency(self, disease: str, confidence: float) -> str:
        """Determine urgency level"""
        critical_conditions = [
            'Heart attack', 'Paralysis (brain hemorrhage)', 'Drug Reaction',
            'hepatitis A', 'Hepatitis B', 'Malaria', 'Dengue', 'Typhoid'
        ]
        
        high_priority = [
            'Pneumonia', 'Bronchial Asthma', 'AIDS', 'Tuberculosis',
            'Hepatitis C', 'Hepatitis D', 'Hepatitis E', 'Alcoholic hepatitis'
        ]
        
        if disease in critical_conditions and confidence > 40:
            return 'Emergency - Seek immediate care'
        elif disease in critical_conditions and confidence > 20:
            return 'High - See doctor within 24 hours'
        elif disease in high_priority and confidence > 30:
            return 'High - See doctor within 24 hours'
        elif confidence > 50:
            return 'Medium - Schedule appointment soon'
        else:
            return 'Low - Monitor symptoms'

def main():
    """Main function to handle command line prediction"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python enhanced_predict_service.py "symptoms"'}))
        sys.exit(1)
    
    symptoms = sys.argv[1]
    
    try:
        predictor = EnhancedMedicalPredictor()
        result = predictor.predict_disease(symptoms)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()