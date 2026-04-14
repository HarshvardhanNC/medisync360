import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
from sklearn.feature_extraction.text import TfidfVectorizer
import joblib
import json
import os
import re

class EnhancedMedicalDiagnosisTrainer:
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.symptom_columns = []
        self.all_symptoms = set()
        self.disease_descriptions = {}
        self.disease_precautions = {}
        self.symptom_severity = {}
        self.symptom_to_diseases = {}  # Map symptoms to possible diseases
        
    def load_data(self):
        """Load all CSV files and prepare data"""
        print("Loading enhanced dataset...")
        
        # Load main dataset
        dataset_path = os.path.join('..', 'src', 'data', 'dataset.csv')
        self.df = pd.read_csv(dataset_path)
        
        # Load descriptions
        desc_path = os.path.join('..', 'src', 'data', 'symptom_Description.csv')
        desc_df = pd.read_csv(desc_path)
        self.disease_descriptions = dict(zip(desc_df['Disease'], desc_df['Description']))
        
        # Load precautions
        prec_path = os.path.join('..', 'src', 'data', 'symptom_precaution.csv')
        prec_df = pd.read_csv(prec_path)
        for _, row in prec_df.iterrows():
            precautions = [row[f'Precaution_{i}'] for i in range(1, 5) 
                          if pd.notna(row[f'Precaution_{i}']) and row[f'Precaution_{i}'].strip()]
            self.disease_precautions[row['Disease']] = precautions
        
        # Load symptom severity
        sev_path = os.path.join('..', 'src', 'data', 'Symptom-severity.csv')
        sev_df = pd.read_csv(sev_path)
        self.symptom_severity = dict(zip(sev_df['Symptom'], sev_df['weight']))
        
        print(f"Loaded {len(self.df)} records")
        print(f"Diseases: {self.df['Disease'].nunique()}")
        
    def create_enhanced_symptom_mapping(self):
        """Create comprehensive symptom to disease mapping"""
        print("Creating enhanced symptom mappings...")
        
        # Get all unique symptoms and clean them
        symptom_cols = [col for col in self.df.columns if col.startswith('Symptom_')]
        
        for col in symptom_cols:
            symptoms = self.df[col].dropna().str.strip()
            symptoms = symptoms[symptoms != '']
            # Clean symptom names
            symptoms = symptoms.str.replace('_', ' ').str.lower().str.strip()
            self.all_symptoms.update(symptoms.unique())
        
        # Remove empty strings
        self.all_symptoms = {s for s in self.all_symptoms if s and len(s.strip()) > 1}
        self.all_symptoms = sorted(list(self.all_symptoms))
        
        # Create symptom to diseases mapping
        for _, row in self.df.iterrows():
            disease = row['Disease']
            for col in symptom_cols:
                if pd.notna(row[col]) and row[col].strip():
                    symptom = row[col].strip().replace('_', ' ').lower()
                    if symptom not in self.symptom_to_diseases:
                        self.symptom_to_diseases[symptom] = set()
                    self.symptom_to_diseases[symptom].add(disease)
        
        # Convert sets to lists for JSON serialization
        for symptom in self.symptom_to_diseases:
            self.symptom_to_diseases[symptom] = list(self.symptom_to_diseases[symptom])
        
        print(f"Total unique symptoms: {len(self.all_symptoms)}")
        print(f"Symptom-disease mappings: {len(self.symptom_to_diseases)}")
        
    def create_expanded_dataset(self):
        """Create expanded dataset with single symptom entries"""
        print("Creating expanded dataset...")
        
        expanded_data = []
        symptom_cols = [col for col in self.df.columns if col.startswith('Symptom_')]
        
        # Original multi-symptom entries
        for _, row in self.df.iterrows():
            symptoms = []
            for col in symptom_cols:
                if pd.notna(row[col]) and row[col].strip():
                    symptom = row[col].strip().replace('_', ' ').lower()
                    symptoms.append(symptom)
            
            if symptoms:
                expanded_data.append({
                    'symptoms': symptoms,
                    'disease': row['Disease'],
                    'weight': 1.0
                })
        
        # Add single symptom entries with lower weight
        for symptom, diseases in self.symptom_to_diseases.items():
            for disease in diseases:
                expanded_data.append({
                    'symptoms': [symptom],
                    'disease': disease,
                    'weight': 0.7  # Lower weight for single symptoms
                })
        
        print(f"Expanded dataset size: {len(expanded_data)}")
        return expanded_data
        
    def preprocess_data(self):
        """Convert symptom data to binary features with expanded dataset"""
        print("Preprocessing enhanced data...")
        
        expanded_data = self.create_expanded_dataset()
        
        # Create binary feature matrix
        X = np.zeros((len(expanded_data), len(self.all_symptoms)))
        y = []
        sample_weights = []
        
        for idx, entry in enumerate(expanded_data):
            # Set symptom features
            for symptom in entry['symptoms']:
                if symptom in self.all_symptoms:
                    symptom_idx = self.all_symptoms.index(symptom)
                    X[idx, symptom_idx] = 1
            
            y.append(entry['disease'])
            sample_weights.append(entry['weight'])
        
        # Encode diseases
        y_encoded = self.label_encoder.fit_transform(y)
        
        return X, y_encoded, np.array(sample_weights)
    
    def train_model(self, X, y, sample_weights):
        """Train enhanced model with sample weights"""
        print("Training enhanced model...")
        
        # Split data
        X_train, X_test, y_train, y_test, weights_train, weights_test = train_test_split(
            X, y, sample_weights, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Gradient Boosting Classifier (better for imbalanced data)
        self.model = GradientBoostingClassifier(
            n_estimators=200,
            max_depth=8,
            learning_rate=0.1,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            subsample=0.8
        )
        
        self.model.fit(X_train, y_train, sample_weight=weights_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"Enhanced Model Accuracy: {accuracy:.4f}")
        
        # Test with single symptoms
        print("\nTesting single symptoms:")
        test_symptoms = ['headache', 'fever', 'cough', 'chest pain', 'nausea']
        for symptom in test_symptoms:
            if symptom in self.all_symptoms:
                test_vector = np.zeros(len(self.all_symptoms))
                test_vector[self.all_symptoms.index(symptom)] = 1
                pred_proba = self.model.predict_proba([test_vector])[0]
                top_pred = np.argmax(pred_proba)
                confidence = pred_proba[top_pred] * 100
                disease = self.label_encoder.inverse_transform([top_pred])[0]
                print(f"  {symptom} -> {disease} ({confidence:.1f}%)")
        
        return accuracy
    
    def save_model(self):
        """Save enhanced model and metadata"""
        print("Saving enhanced model...")
        
        # Create model directory
        os.makedirs('trained_model', exist_ok=True)
        
        # Save model
        joblib.dump(self.model, 'trained_model/disease_classifier.pkl')
        joblib.dump(self.label_encoder, 'trained_model/label_encoder.pkl')
        
        # Enhanced metadata
        metadata = {
            'symptoms': self.all_symptoms,
            'diseases': self.label_encoder.classes_.tolist(),
            'disease_descriptions': self.disease_descriptions,
            'disease_precautions': self.disease_precautions,
            'symptom_severity': self.symptom_severity,
            'symptom_to_diseases': self.symptom_to_diseases,
            'model_type': 'GradientBoostingClassifier',
            'features': len(self.all_symptoms),
            'classes': len(self.label_encoder.classes_),
            'enhanced_version': True,
            'single_symptom_support': True
        }
        
        with open('trained_model/metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("Enhanced model saved successfully!")
        print(f"Features: {len(self.all_symptoms)}")
        print(f"Classes: {len(self.label_encoder.classes_)}")
        print(f"Single symptom mappings: {len(self.symptom_to_diseases)}")
    
    def run_training(self):
        """Complete enhanced training pipeline"""
        self.load_data()
        self.create_enhanced_symptom_mapping()
        X, y, sample_weights = self.preprocess_data()
        accuracy = self.train_model(X, y, sample_weights)
        self.save_model()
        return accuracy

if __name__ == "__main__":
    trainer = EnhancedMedicalDiagnosisTrainer()
    accuracy = trainer.run_training()
    print(f"\nEnhanced training completed with accuracy: {accuracy:.4f}")