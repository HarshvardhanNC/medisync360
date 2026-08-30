import sys
import json
import numpy as np  # type: ignore[import-untyped]
import joblib  # type: ignore[import-untyped]
import os
from itertools import islice as _islice
from typing import Any, cast, ClassVar, Dict, List, Optional, Set, Tuple
import re

class EnhancedMedicalPredictor:
    def __init__(self) -> None:
        self.model: Any = None
        self.label_encoder: Any = None
        self.metadata: Dict[str, Any] = {}
        self.symptoms: List[str] = []
        self.diseases: List[str] = []
        self.symptom_to_diseases: Dict[str, List[str]] = {}
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
    STOPWORDS: ClassVar[Set[str]] = {
        'i', 'have', 'has', 'had', 'am', 'is', 'are', 'was', 'were', 'be',
        'been', 'being', 'feel', 'feeling', 'felt', 'get', 'getting', 'got',
        'experiencing', 'experience', 'suffer', 'suffering', 'noticed', 'notice',
        'having', 'my', 'me', 'the', 'a', 'an', 'some', 'bit',
        'little', 'lot', 'very', 'quite', 'really', 'so', 'much', 'many',
        'sometimes', 'often', 'always', 'lately', 'recently', 'since', 'for',
        'days', 'weeks', 'hours', 'today', 'yesterday', 'night', 'morning',
        'past', 'last', 'few', 'couple', 'of', 'in', 'on', 'at', 'from',
        'there', 'this', 'that', 'these', 'those', 'also', 'too', 'as', 'well',
        'yes', 'ok', 'okay', 'please', 'help', 'think',
        'kind', 'sort', 'type', 'slight', 'severe', 'mild',
        'moderate', 'bad', 'terrible', 'awful', 'horrible', 'constant', 'sharp',
        'dull', 'throbbing', 'keep', 'keeps',
    }

    # Negation triggers for clause-level NegEx processing
    NEGATION_PATTERNS: ClassVar[List[str]] = [
        r'\b(no|not|denies|denied|without|free of|no history of|rules out|absent)\b',
        r'\b(doesn\'t have|does not have|didn\'t have|did not have|don\'t have|do not have)\b',
        r'\b(haven\'t|hasn\'t|never|no sign of|no evidence of|negative for|neither|nor)\b',
        r'\b(dont have|doesnt have|didnt have|cant see|no symptoms of)\b',
    ]

    # ── Critical symptom → disease overrides ──────────────────────────────────
    CRITICAL_SYMPTOM_RULES: ClassVar[List[Tuple[Set[str], int, str, int, str, str]]] = [
        # Cardiac (Highest priority emergency overrides)
        ({'chest pain', 'shortness of breath'}, 2, 'Heart attack', 96, 'Cardiologist', 'Emergency - Seek immediate care'),
        ({'chest pain', 'sweating', 'nausea'}, 2, 'Heart attack', 97, 'Cardiologist', 'Emergency - Seek immediate care'),
        ({'chest pain', 'breathlessness'}, 2, 'Heart attack', 96, 'Cardiologist', 'Emergency - Seek immediate care'),
        ({'chest pain', 'sweating'}, 2, 'Heart attack', 96, 'Cardiologist', 'Emergency - Seek immediate care'),
        # Stroke / Hemorrhage
        ({'weakness of one body side', 'slurred speech'}, 2, 'Paralysis (brain hemorrhage)', 98, 'Neurologist', 'Emergency - Seek immediate care'),
        ({'altered sensorium', 'slurred speech'}, 2, 'Paralysis (brain hemorrhage)', 96, 'Neurologist', 'Emergency - Seek immediate care'),
        ({'blurred and distorted vision', 'slurred speech'}, 2, 'Paralysis (brain hemorrhage)', 97, 'Neurologist', 'Emergency - Seek immediate care'),
        # Asthma / Airway Constriction
        ({'wheezing'}, 1, 'Bronchial Asthma', 96, 'Pulmonologist', 'High - See doctor within 24 hours'),
        ({'wheezing', 'shortness of breath'}, 1, 'Bronchial Asthma', 96, 'Pulmonologist', 'High - See doctor within 24 hours'),
        ({'breathlessness'}, 1, 'Bronchial Asthma', 95, 'Pulmonologist', 'High - See doctor within 24 hours'),
        # Gastro / Appendicitis
        ({'lower right abdominal pain'}, 1, 'Appendicitis', 97, 'General Surgeon', 'Emergency - Seek immediate care'),
        ({'nausea', 'vomiting', 'diarrhoea'}, 2, 'Gastroenteritis', 96, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'nausea', 'vomiting', 'stomach pain'}, 2, 'Gastroenteritis', 94, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'stomach pain', 'acidity', 'nausea'}, 2, 'GERD', 93, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'acidity'}, 1, 'GERD', 95, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'stomach pain'}, 1, 'GERD', 93, 'Gastroenterologist', 'Medium - Schedule appointment soon'),
        ({'burning micturition'}, 1, 'Urinary tract infection', 96, 'Urologist', 'Medium - Schedule appointment soon'),
        # Malaria / Mosquito-Borne Infection
        ({'high fever', 'chills', 'sweating'}, 2, 'Malaria', 96, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        ({'high fever', 'chills'}, 2, 'Malaria', 96, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        ({'high fever', 'sweating', 'headache'}, 2, 'Malaria', 96, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        ({'high fever', 'sweating'}, 2, 'Malaria', 95, 'Infectious Disease Specialist', 'Emergency - Seek immediate care'),
        # Diabetes & Hypoglycemia
        ({'excessive hunger', 'sweating'}, 2, 'Hypoglycemia', 97, 'Endocrinologist', 'Emergency - Consume fast-acting sugar immediately'),
        ({'excessive hunger', 'altered sensorium'}, 2, 'Hypoglycemia', 97, 'Endocrinologist', 'Emergency - Consume fast-acting sugar immediately'),
        ({'excessive hunger', 'shivering'}, 2, 'Hypoglycemia', 96, 'Endocrinologist', 'Emergency - Consume fast-acting sugar immediately'),
        ({'increased thirst', 'frequent urination'}, 2, 'Diabetes', 96, 'Endocrinologist', 'Medium - Schedule appointment soon'),
        ({'increased thirst', 'polyuria'}, 2, 'Diabetes', 96, 'Endocrinologist', 'Medium - Schedule appointment soon'),
        ({'increased thirst', 'weight loss'}, 2, 'Diabetes', 96, 'Endocrinologist', 'Medium - Schedule appointment soon'),
        ({'polyuria'}, 1, 'Diabetes', 94, 'Endocrinologist', 'Medium - Schedule appointment soon'),
        # Migraine / Headache
        ({'headache', 'nausea', 'vomiting'}, 2, 'Migraine', 95, 'Neurologist', 'Medium - Schedule appointment soon'),
        ({'headache', 'blurred and distorted vision'}, 2, 'Migraine', 93, 'Neurologist', 'Medium - Schedule appointment soon'),
        ({'headache'}, 1, 'Migraine', 95, 'Neurologist', 'Medium - Schedule appointment soon'),
        # Autoimmune & Rheumatology / Arthritis
        ({'joint pain', 'skin rash'}, 2, 'Arthritis', 96, 'Rheumatologist', 'High - See Rheumatologist within 24 hours'),
        ({'joint pain', 'skin rash', 'mild fever'}, 2, 'Arthritis', 97, 'Rheumatologist', 'High - See Rheumatologist within 24 hours'),
        ({'joint pain', 'skin rash', 'high fever'}, 2, 'Arthritis', 97, 'Rheumatologist', 'High - See Rheumatologist within 24 hours'),
        # Vertigo
        ({'spinning movements'}, 1, '(vertigo) Paroymsal  Positional Vertigo', 97, 'ENT Specialist', 'Medium - Schedule appointment soon'),
        ({'spinning movements', 'loss of balance'}, 1, '(vertigo) Paroymsal  Positional Vertigo', 97, 'ENT Specialist', 'Medium - Schedule appointment soon'),
        # Jaundice / Liver
        ({'yellowing of skin'}, 1, 'Jaundice', 95, 'Hepatologist', 'High - See doctor within 24 hours'),
        ({'yellowish skin'}, 1, 'Jaundice', 95, 'Hepatologist', 'High - See doctor within 24 hours'),
        ({'yellowing of eyes'}, 1, 'Jaundice', 95, 'Hepatologist', 'High - See doctor within 24 hours'),
        # ENT / Ear
        ({'earache'}, 1, 'Ear Infection', 96, 'ENT Specialist', 'Medium - Schedule appointment soon'),
        # Joint / Knee
        ({'joint pain'}, 1, 'Osteoarthristis', 95, 'Rheumatologist', 'Medium - Schedule appointment soon'),
        ({'painful walking'}, 1, 'Osteoarthristis', 95, 'Rheumatologist', 'Medium - Schedule appointment soon'),
        ({'knee pain'}, 1, 'Osteoarthristis', 95, 'Rheumatologist', 'Medium - Schedule appointment soon'),
    ]

    # Lay-person phrase → exact dataset canonical symptom mapping
    PHRASE_MAP: ClassVar[List[Tuple[str, str]]] = [
        # ── Neurological & Vertigo ─────────────────────────────────────────────
        (r'\b(room.{0,15}spin|room.{0,15}moving|head.{0,15}spin|spinning.{0,15}sensation|spinning)\b', 'spinning movements'),
        (r'\b(loss.{0,15}balance|losing.{0,15}balance|off.{0,15}balance|unsteadiness|unsteady|cannot.{0,15}balance)\b', 'loss of balance'),
        (r'\b(unsteadiness)\b', 'unsteadiness'),
        (r'\b(altered.{0,10}sensorium|confused|confusion|disorient|disorientation|brain.{0,10}fog)\b', 'altered sensorium'),
        (r'\b(slurred.{0,10}speech|speech.{0,10}slurred|trouble.{0,15}(speaking|talk|speech)|difficulty.{0,15}(speaking|talk|speech)|hard.{0,15}to.{0,15}speak|speech.{0,10}problem)\b', 'slurred speech'),
        (r'\b(weakness.{0,15}(side|arm|leg|body)|(right|left).{0,10}side.{0,10}weak|one.{0,10}side.{0,10}weak|hemiparesis)\b', 'weakness of one body side'),
        (r'\b(weakness.{0,10}in.{0,10}limbs|arm.{0,10}weakness|leg.{0,10}weakness|weak.{0,10}limbs)\b', 'weakness in limbs'),
        (r'\b(migrain|throbb|throb|pulsat|photophobia|phonophobia|sensitivity.{0,10}(light|sound))\b', 'headache'),
        (r'\b(head|temple).{0,15}(pound|hurt|ach|throb|split|bang|pain|press|throbbing)', 'headache'),
        (r'\b(dizz|vertigo|lightheaded|light.headed)\b', 'dizziness'),
        (r'\b(blur|double|lost|loss.{0,10}of).{0,10}\b(vision|sight)|visual.{0,10}disturbance|cannot.{0,10}see\b', 'blurred and distorted vision'),
        (r'\b(stiff.{0,10}neck|neck.{0,10}stiff)\b', 'stiff neck'),

        # ── Urinary & Renal ───────────────────────────────────────────────────
        (r'\b(burn|burning|pain|painful).{0,35}\b(pee|urin|micturition|pass.{0,10}urine)\b', 'burning micturition'),
        (r'\b(pass.{0,10}urine|urinat|pee).{0,35}\b(burn|burning|pain|painful)\b', 'burning micturition'),
        (r'\b(continuous.{0,15}urine|urge.{0,15}urin|pee.{0,15}all.{0,10}time|feel.{0,15}like.{0,10}peeing)\b', 'continuous feel of urine'),
        (r'\b(frequent.{0,10}urinat|excessive.{0,10}urinat|urinate.{0,10}often|polyuria|urinate.{0,25}(night|time|multiple)|night.{0,25}urinate)\b', 'polyuria'),
        (r'\b(bladder.{0,10}discomfort|bladder.{0,10}pain|pelvic.{0,10}discomfort)\b', 'bladder discomfort'),
        (r'\b(foul.{0,10}smell.{0,10}urine|smelly.{0,10}urine|bad.{0,10}smell.{0,10}urine)\b', 'foul smell of urine'),
        (r'\b(dark.{0,10}urine|brown.{0,10}urine|tea.{0,10}colored.{0,10}urine)\b', 'dark urine'),
        (r'\b(yellow.{0,10}urine)\b', 'yellow urine'),

        # ── ENT / Nasal / Throat ──────────────────────────────────────────────
        (r'\b(nostril|nasal|sinus|rhinitis|mucus|stuffy.{0,10}nose|runny.{0,10}nose|rhinorrhea)\b', 'runny nose'),
        (r'\b(continuous.{0,10}sneezing|sneezing.{0,10}constantly|sneezing)\b', 'continuous sneezing'),
        (r'\b(throat.{0,10}irritat|sore.{0,10}throat|scratchy.{0,10}throat|throat.{0,10}pain|painful.{0,10}swallow)\b', 'throat irritation'),
        (r'\b(coughing|cough|hacking)\b', 'cough'),
        (r'\b(patches.{0,10}in.{0,10}throat|white.{0,10}patches.{0,10}throat)\b', 'patches in throat'),
        (r'\b(sinus.{0,10}pressure|sinus.{0,10}pain)\b', 'sinus pressure'),
        (r'\b(loss.{0,10}of.{0,10}smell|cannot.{0,10}smell|no.{0,10}smell|anosmia)\b', 'loss of smell'),

        # ── Breathing / Chest ────────────────────────────────────────────────
        (r'\b(chest).{0,25}\b(pain|tight|press|heavy|ach|hurt|discomfort|squeezing)\b', 'chest pain'),
        (r'\b(shortness.{0,10}of.{0,10}breath|breathlessness|difficulty.{0,10}breath|hard.{0,15}breathe|catch.{0,10}breath|dyspnea)\b', 'breathlessness'),
        (r'\b(rapid.{0,10}heart|fast.{0,10}heart|palpitations|racing.{0,10}heart|heart.{0,10}racing)\b', 'palpitations'),

        # ── Stomach / Gastrointestinal ───────────────────────────────────────
        (r'\b(lower.{0,15}right.{0,15}(side|abdominal|abdomen|stomach|quadrant)|appendix|appendicitis)\b', 'lower right abdominal pain'),
        (r'\b(stomach|belly|tummy|abdomen|gut).{0,25}\b(pain|hurt|ach|cramp|upset|sore|burn|burning)\b', 'stomach pain'),
        (r'\b(burning.{0,20}(stomach|belly|tummy|gut))\b', 'stomach pain'),
        (r'\b(abdominal.{0,10}pain|cramp.{0,10}abdomen)\b', 'abdominal pain'),
        (r'\b(belly.{0,10}pain)\b', 'belly pain'),
        (r'\b(throw.{0,10}up|threw.{0,10}up|puking|vomiting|retching)\b', 'vomiting'),
        (r'\b(nausea|queasy|want.{0,10}vomit|feel.{0,10}sick)\b', 'nausea'),
        (r'\b(loose.{0,10}stool|loose.{0,10}motion|watery.{0,10}stool|diarrhea|diarrhoea)\b', 'diarrhoea'),
        (r'\b(constip|cannot.{0,10}pass.{0,10}stool|hard.{0,10}stool)\b', 'constipation'),
        (r'\b(heartburn|acid.{0,10}reflux|acidity|gastric|acid.{0,10}feeling|indigestion)\b', 'acidity'),
        (r'\b(indigestion)\b', 'indigestion'),
        (r'\b(bloody.{0,10}stool|blood.{0,10}in.{0,10}stool|rectal.{0,10}bleeding)\b', 'bloody stool'),
        (r'\b(passage.{0,10}of.{0,10}gases|gas|flatulence|burping)\b', 'passage of gases'),

        # ── Temperature & Systemic ───────────────────────────────────────────
        (r'\b(high.{0,10}fever|feverish|fever|high.{0,10}temp|10[0-5].{0,5}f|hot.{0,10}body)\b', 'high fever'),
        (r'\b(mild.{0,10}fever|low.{0,10}grade.{0,10}fever)\b', 'mild fever'),
        (r'\b(chills|shivering|shaking|shaky|tremor|trembling)\b', 'shivering'),
        (r'\b(shivering)\b', 'shivering'),
        (r'\b(sweat|sweating|sweaty|cold.{0,10}sweat|perspiring|drenched.{0,10}sweat)\b', 'sweating'),
        (r'\b(tired|exhausted|fatigue|weakness|no.{0,10}energy|lethargy|worn.{0,10}out)\b', 'fatigue'),
        (r'\b(lethargy)\b', 'lethargy'),
        (r'\b(malaise|feeling.{0,10}unwell)\b', 'malaise'),
        (r'\b(weight.{0,10}loss|losing.{0,10}weight|lost.{0,10}weight)\b', 'weight loss'),
        (r'\b(weight.{0,10}gain|gaining.{0,10}weight)\b', 'weight gain'),
        (r'\b(increased.{0,10}thirst|excessive.{0,10}thirst|thirsty|polydipsia)\b', 'increased thirst'),
        (r'\b(excessive.{0,10}hunger|extremely.{0,10}hungry|very.{0,10}hungry|ravenous|uncontrollable.{0,10}hunger|hungry)\b', 'excessive hunger'),
        (r'\b(dehydration|dry.{0,10}mouth)\b', 'dehydration'),
        (r'\b(loss.{0,10}of.{0,10}appetite|no.{0,10}appetite|not.{0,10}hungry)\b', 'loss of appetite'),

        # ── Skin & Eyes & Jaundice ───────────────────────────────────────────
        (r'\b(yellow.{0,30}(skin|body)|yellowish.{0,30}skin|(skin|body).{0,30}yellow)\b', 'yellowish skin'),
        (r'\b(yellow.{0,30}(eye|eyes)|yellowing.{0,30}eye|yellowing.{0,30}of.{0,30}eyes|(eye|eyes).{0,30}yellow)\b', 'yellowing of eyes'),
        (r'\b(skin.{0,10}rash|rash|hives|dermatitis|malar.{0,10}rash|butterfly.{0,10}rash|rash.{0,15}(cheek|cheeks|face|nose))\b', 'skin rash'),
        (r'\b(itching|itchy)\b', 'itching'),
        (r'\b(blister|blisters)\b', 'blister'),
        (r'\b(redness.{0,15}eyes|red.{0,15}eyes|eye.{0,15}red|eyes.{0,15}red)\b', 'redness of eyes'),
        (r'\b(watering.{0,10}from.{0,10}eyes|watery.{0,10}eyes|(burn|burning|pain|painful|sting|stinging|irritat).{0,15}(eye|eyes)|(eye|eyes).{0,15}(burn|burning|pain|painful|sting|stinging|irritat))\b', 'watering from eyes'),
        (r'\b(sunken.{0,10}eyes)\b', 'sunken eyes'),
        (r'\b(puffy.{0,10}face|puffy.{0,10}eyes)\b', 'puffy face and eyes'),
        (r'\b(red.{0,10}spots.{0,10}over.{0,10}body|red.{0,10}spots)\b', 'red spots over body'),

        # ── Muscles & Joints ─────────────────────────────────────────────────
        (r'\b(painful.{0,10}walking|pain.{0,10}when.{0,10}walk|hurts.{0,10}to.{0,10}walk|difficulty.{0,10}walking)\b', 'painful walking'),
        (r'\b(knee.{0,10}pain|pain.{0,10}in.{0,10}knee)\b', 'knee pain'),
        (r'\b(joint.{0,10}pain|joint.{0,10}ache|stiff.{0,10}joint|arthritis)\b', 'joint pain'),
        (r'\b(swelling.{0,10}joints|swollen.{0,10}joint)\b', 'swelling joints'),
        (r'\b(muscle.{0,10}pain|muscle.{0,10}ache|body.{0,10}ache|myalgia)\b', 'muscle pain'),
        (r'\b(back.{0,10}pain|backache|lumbar.{0,10}pain)\b', 'back pain'),
        (r'\b(neck.{0,10}pain|neck.{0,10}ache)\b', 'neck pain'),
        (r'\b(swollen.{0,10}legs|leg.{0,10}swelling)\b', 'swollen legs'),

        # ── Mental & Mood ─────────────────────────────────────────────────────
        (r'\b(anxious|anxiety|panic)\b', 'anxiety'),
        (r'\b(depress|depression|hopeless)\b', 'depression'),
        (r'\b(irritability|irritable)\b', 'irritability'),
        (r'\b(restlessness|restless)\b', 'restlessness'),
    ]

    def is_negated_clause(self, clause: str) -> bool:
        """Check if a clause or sentence contains a negation pattern"""
        for pattern in self.NEGATION_PATTERNS:
            if re.search(pattern, clause, re.IGNORECASE):
                return True
        return False

    def extract_symptoms_from_text(self, text: str) -> List[str]:
        """
        Advanced Multi-Stage NLP Extractor with NegEx Clause Negation Detection.
        Handles multi-line, multi-clause, conversational user inputs.
        """
        text_lower = text.lower().strip()

        # Split text into distinct logical clauses based on punctuation and contrastive conjunctions
        clause_delimiters = r'[;\n.!?]|\bbut\b|\bhowever\b|\bexcept\b|\balthough\b|\bnonetheless\b'
        clauses = re.split(clause_delimiters, text_lower)

        positive_symptoms: Set[str] = set()
        negated_symptoms: Set[str] = set()

        for clause in clauses:
            clause_str = clause.strip()
            if not clause_str:
                continue

            is_negated = self.is_negated_clause(clause_str)
            clause_extracted: List[str] = []

            # Pass 1: Phrase mapping against layperson regexes
            for pattern, canonical_symptom in self.PHRASE_MAP:
                if re.search(pattern, clause_str, re.IGNORECASE):
                    clause_extracted.append(canonical_symptom)

            # Pass 2: Direct matching against canonical symptom strings
            for sym in self.symptoms:
                sym_clean = sym.replace('_', ' ').strip()
                pattern = r'\b' + re.escape(sym_clean) + r'\b'
                if re.search(pattern, clause_str, re.IGNORECASE):
                    clause_extracted.append(sym)

            # Categorize into positive or negated sets
            for extracted_sym in clause_extracted:
                if is_negated:
                    negated_symptoms.add(extracted_sym)
                else:
                    positive_symptoms.add(extracted_sym)

        # Remove explicitly negated symptoms from positive set
        final_symptoms = positive_symptoms - negated_symptoms

        if final_symptoms:
            return list(final_symptoms)

        # Fallback to direct tokenization if phrase maps found nothing
        for sym in self.symptoms:
            if sym in text_lower or sym.replace('_', ' ') in text_lower:
                return [sym]

        return [text_lower]

    def preprocess_symptoms(self, user_symptoms: str) -> Tuple[Any, List[str], float]:
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
        confidence_boost: float = 0.0
        
        for user_symptom in symptom_list:
            matched_symptoms.append(user_symptom)
            # Direct exact match
            if user_symptom in self.symptoms:
                idx = self.symptoms.index(user_symptom)
                feature_vector[idx] = 1  # type: ignore[index]
                confidence_boost += 0.2
                continue
            
            # Fuzzy matching with enhanced logic
            best_match: Optional[Tuple[int, str]] = None
            best_score: float = 0.0
            
            for i, model_symptom in enumerate(self.symptoms):
                score = self.calculate_symptom_similarity(user_symptom, model_symptom)
                if score > best_score and score > 0.6:  # Threshold for matching
                    best_score = score
                    best_match = (i, model_symptom)
            
            if best_match:
                feature_vector[best_match[0]] = best_score  # type: ignore[index]
                confidence_boost += best_score * 0.1
        
        return feature_vector, matched_symptoms, confidence_boost
    
    def calculate_symptom_similarity(self, user_symptom: str, model_symptom: str) -> float:
        """Calculate similarity between user symptom and model symptom"""
        u_sym = user_symptom.strip().lower()
        m_sym = model_symptom.strip().lower()

        if len(u_sym) < 4 or len(m_sym) < 4 or u_sym in self.STOPWORDS:
            return 0.0

        # Direct substring match for meaningful medical terms
        if u_sym == m_sym:
            return 1.0
        if u_sym in m_sym or m_sym in u_sym:
            return 0.85
        
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
        normalized_matched = set(matched_set)
        for s in matched_set:
            for pattern, std_symptom in self.PHRASE_MAP:
                if re.search(pattern, s, re.IGNORECASE):
                    normalized_matched.add(std_symptom)

        for (rule_symptoms, min_count, disease, confidence, specialist, urgency) in self.CRITICAL_SYMPTOM_RULES:
            overlap = rule_symptoms & normalized_matched
            if len(overlap) >= min_count:
                clean_matched = [s for s in matched_symptoms if 'anus' not in s.lower() and 'hemmorhoid' not in s.lower()]
                return {
                    'predictedCondition': disease,
                    'recommendedSpecialist': specialist,
                    'urgencyLevel': urgency,
                    'description': self.metadata['disease_descriptions'].get(
                        disease, f'Medical condition: {disease}'
                    ),
                    'confidence': float(confidence),
                    'matchedSymptoms': clean_matched if clean_matched else list(matched_symptoms),
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
                                for i, d in enumerate(_islice(possible_diseases, 1, 3))  # type: ignore[arg-type]
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
            probabilities = self.model.predict_proba([feature_vector])[0]  # type: ignore[index]
            
            # Apply confidence boost
            probabilities = probabilities * (1 + confidence_boost)  # type: ignore[operator]
            probabilities = probabilities / np.sum(probabilities)  # type: ignore[operator]  # Renormalize
            
            # Get top predictions
            top_indices = np.argsort(probabilities)[::-1][:5]  # type: ignore[index]
            top_diseases: List[Dict[str, Any]] = []
            
            for idx in top_indices:
                disease = self.label_encoder.inverse_transform([idx])[0]  # type: ignore[index]
                confidence = probabilities[idx] * 100  # type: ignore[index]
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
            
            # Alternative possibilities (skip index 0 = primary, take up to 3 more)
            alternatives: List[Dict[str, Any]] = [
                {'condition': d['disease'], 'confidence': d['confidence']}
                for d in _islice(top_diseases, 1, 4)
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

def run_flask_server():
    """Run Flask HTTP server for sub-millisecond API predictions on port 5002"""
    try:
        from flask import Flask, request, jsonify
        from flask_cors import CORS
    except ImportError:
        print("Flask or flask-cors not installed. Running in CLI mode.", file=sys.stderr)
        return False

    app = Flask(__name__)
    CORS(app)
    predictor = EnhancedMedicalPredictor()

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({"status": "ok", "service": "MediSync360 Symptom AI Predictor", "port": 5002})

    @app.route('/predict', methods=['POST'])
    def predict():
        try:
            data = request.get_json() or {}
            symptoms = data.get('symptoms') or data.get('symptom') or data.get('text') or ''
            if not symptoms:
                return jsonify({"error": "No symptoms provided"}), 400
            
            result = predictor.predict_disease(symptoms)
            return jsonify(result)
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    print("🚀 Starting MediSync360 Symptom AI Flask Server on http://127.0.0.1:5002 ...", file=sys.stderr)
    app.run(host='0.0.0.0', port=5002, debug=False)
    return True

def main():
    """Main function to handle Flask server or CLI prediction"""
    if len(sys.argv) == 1:
        # No CLI arguments provided -> Run Flask API Server
        run_flask_server()
        return

    # 1 CLI argument provided -> Run single CLI prediction
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
