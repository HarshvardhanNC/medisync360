import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
import joblib
import json
import os

class MedicalDiagnosisTrainer:
    def __init__(self):
        self.model = None
        self.label_encoder = LabelEncoder()
        self.symptom_columns = []
        self.all_symptoms = set()
        self.disease_descriptions = {}
        self.disease_precautions = {}
        self.symptom_severity = {}
        
    def load_data(self):
        """Load all CSV files and prepare data"""
        print("Loading dataset...")
        
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
        
    def preprocess_data(self):
        """Convert symptom data to binary features"""
        print("Preprocessing data...")
        
        # Get all unique symptoms
        symptom_cols = [col for col in self.df.columns if col.startswith('Symptom_')]
        
        for col in symptom_cols:
            symptoms = self.df[col].dropna().str.strip()
            symptoms = symptoms[symptoms != '']
            # Clean symptom names
            symptoms = symptoms.str.replace('_', ' ').str.lower()
            self.all_symptoms.update(symptoms.unique())
        
        self.all_symptoms = sorted(list(self.all_symptoms))
        print(f"Total unique symptoms: {len(self.all_symptoms)}")
        
        # Create binary feature matrix
        X = np.zeros((len(self.df), len(self.all_symptoms)))
        y = self.df['Disease'].values
        
        for idx, row in self.df.iterrows():
            for col in symptom_cols:
                if pd.notna(row[col]) and row[col].strip():
                    symptom = row[col].strip().replace('_', ' ').lower()
                    if symptom in self.all_symptoms:
                        symptom_idx = self.all_symptoms.index(symptom)
                        X[idx, symptom_idx] = 1
        
        # Encode diseases
        y_encoded = self.label_encoder.fit_transform(y)
        
        return X, y_encoded
    
    def train_model(self, X, y):
        """Train Random Forest model"""
        print("Training model...")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Random Forest
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        
        self.model.fit(X_train, y_train)
        
        # Evaluate
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"Model Accuracy: {accuracy:.4f}")
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, 
                                  target_names=self.label_encoder.classes_))
        
        return accuracy
    
    def save_model(self):
        """Save trained model and metadata"""
        print("Saving model...")
        
        # Create model directory
        os.makedirs('trained_model', exist_ok=True)
        
        # Save model
        joblib.dump(self.model, 'trained_model/disease_classifier.pkl')
        joblib.dump(self.label_encoder, 'trained_model/label_encoder.pkl')
        
        # Save metadata
        metadata = {
            'symptoms': self.all_symptoms,
            'diseases': self.label_encoder.classes_.tolist(),
            'disease_descriptions': self.disease_descriptions,
            'disease_precautions': self.disease_precautions,
            'symptom_severity': self.symptom_severity,
            'model_type': 'RandomForestClassifier',
            'features': len(self.all_symptoms),
            'classes': len(self.label_encoder.classes_)
        }
        
        with open('trained_model/metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print("Model saved successfully!")
        print(f"Features: {len(self.all_symptoms)}")
        print(f"Classes: {len(self.label_encoder.classes_)}")
    
    def run_training(self):
        """Complete training pipeline"""
        self.load_data()
        X, y = self.preprocess_data()
        accuracy = self.train_model(X, y)
        self.save_model()
        return accuracy

if __name__ == "__main__":
    trainer = MedicalDiagnosisTrainer()
    accuracy = trainer.run_training()
    print(f"\nTraining completed with accuracy: {accuracy:.4f}")