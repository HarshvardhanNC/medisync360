import sys
import json
import numpy as np
import joblib
import os
from typing import List, Dict, Any

class MedicalPredictor:
    def __init__(self):
        self.model = None
        self.label_encoder = None
        self.metadata = None
        self.symptoms = []
        self.diseases = []
        self.load_model()
    
    def load_model(self):
        """Load trained model and metadata"""
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
            
            print(f"Model loaded successfully with {len(self.symptoms)} symptoms and {len(self.diseases)} diseases", file=sys.stderr)
            
        except Exception as e:
            print(f"Error loading model: {e}", file=sys.stderr)
            raise
    
    def preprocess_symptoms(self, user_symptoms: str) -> np.ndarray:
        """Convert user symptoms to feature vector"""
        # Parse user input
        symptom_list = [s.strip().lower() for s in user_symptoms.split(',')]
        symptom_list = [s for s in symptom_list if s]
        
        # Create feature vector
        feature_vector = np.zeros(len(self.symptoms))
        
        matched_symptoms = []
        for user_symptom in symptom_list:
            # Direct match
            for i, model_symptom in enumerate(self.symptoms):
                if (user_symptom in model_symptom or 
                    model_symptom in user_symptom or
                    self.fuzzy_match(user_symptom, model_symptom)):
                    feature_vector[i] = 1
                    matched_symptoms.append(model_symptom)
        
        return feature_vector, matched_symptoms
    
    def fuzzy_match(self, user_symptom: str, model_symptom: str) -> bool:
        """Fuzzy matching for symptoms"""
        # Synonym mapping
        synonyms = {
            'stomach pain': ['abdominal pain', 'belly pain', 'tummy ache'],
            'headache': ['head pain', 'migraine'],
            'fever': ['high temperature', 'pyrexia'],
            'nausea': ['feeling sick', 'queasy'],
            'fatigue': ['tired', 'exhausted', 'weakness'],
            'shortness of breath': ['difficulty breathing', 'breathlessness'],
            'chest pain': ['heart pain', 'chest discomfort'],
            'joint pain': ['arthritis', 'joint ache'],
            'skin rash': ['rash', 'skin irritation'],
            'dizziness': ['lightheaded', 'vertigo']
        }
        
        # Check synonyms
        for key, values in synonyms.items():
            if ((key in user_symptom or user_symptom in key) and 
                any(v in model_symptom or model_symptom in v for v in values)):
                return True
            if ((key in model_symptom or model_symptom in key) and 
                any(v in user_symptom or user_symptom in v for v in values)):
                return True
        
        return False
    
    def predict_disease(self, user_symptoms: str) -> Dict[str, Any]:
        """Predict disease from symptoms"""
        try:
            # Preprocess symptoms
            feature_vector, matched_symptoms = self.preprocess_symptoms(user_symptoms)
            
            if np.sum(feature_vector) == 0:
                return {
                    'predictedCondition': 'No clear match found',
                    'recommendedSpecialist': 'General Practitioner',
                    'urgencyLevel': 'Low - Consult a doctor for proper evaluation',
                    'description': 'Symptoms don\'t match conditions in our database',
                    'confidence': 0,
                    'matchedSymptoms': [],
                    'alternativePossibilities': [],
                    'precautions': ['Consult a healthcare professional', 'Monitor symptoms']
                }
            
            # Get predictions with probabilities
            probabilities = self.model.predict_proba([feature_vector])[0]
            predicted_class = self.model.predict([feature_vector])[0]
            
            # Get top predictions
            top_indices = np.argsort(probabilities)[::-1][:3]
            top_diseases = []
            
            for idx in top_indices:
                disease = self.label_encoder.inverse_transform([idx])[0]
                confidence = probabilities[idx] * 100
                if confidence > 5:  # Only include if confidence > 5%
                    top_diseases.append({
                        'disease': disease,
                        'confidence': round(confidence, 1)
                    })
            
            if not top_diseases:
                return {
                    'predictedCondition': 'No clear match found',
                    'recommendedSpecialist': 'General Practitioner',
                    'urgencyLevel': 'Low - Consult a doctor for proper evaluation',
                    'description': 'Low confidence in predictions',
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
                for d in top_diseases[1:]
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
                'dataSource': 'Trained ML Model on Kaggle Dataset',
                'modelType': 'Random Forest Classifier'
            }
            
        except Exception as e:
            print(f"Prediction error: {e}", file=sys.stderr)
            raise
    
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
        
        if disease in critical_conditions and confidence > 60:
            return 'Emergency - Seek immediate care'
        elif disease in critical_conditions and confidence > 30:
            return 'High - See doctor within 24 hours'
        elif disease in high_priority and confidence > 50:
            return 'High - See doctor within 24 hours'
        elif confidence > 70:
            return 'Medium - Schedule appointment soon'
        else:
            return 'Low - Monitor symptoms'

def main():
    """Main function to handle command line prediction"""
    if len(sys.argv) != 2:
        print(json.dumps({'error': 'Usage: python predict_service.py "symptoms"'}))
        sys.exit(1)
    
    symptoms = sys.argv[1]
    
    try:
        predictor = MedicalPredictor()
        result = predictor.predict_disease(symptoms)
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()