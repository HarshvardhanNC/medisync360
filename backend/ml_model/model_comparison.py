"""
MediSync360 Comprehensive Model Comparison & Selection Engine (Assignment 9)

Trains, tunes, and systematically compares candidate architectures strictly on Train + Val:
1. Multinomial Logistic Regression (L2-regularized)
2. Random Forest Classifier (Tuned Depth & Balanced Weights)
3. Gradient Boosting Classifier
4. HistGradientBoosting Classifier
5. Calibrated Classifier Ensemble

Evaluates Top-1, Top-3, Macro F1, Log Loss, Free-Form Generalization,
Partial Evidence Degradation, and False-Confidence Suppression.
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple

from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, log_loss

sys.path.append(os.path.dirname(__file__))
from feature_engineering import ClinicalFeatureExtractor
from symptom_ontology import SymptomOntology

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CASES_DIR = os.path.join(WORKSPACE_DIR, "data", "cases")
FF_DIR = os.path.join(WORKSPACE_DIR, "data", "free_form_cases")
EVAL_DIR = os.path.join(WORKSPACE_DIR, "evaluation")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_model")
REPORT_PATH = os.path.join(EVAL_DIR, "model_comparison.json")

class ModelComparisonEngine:
    def __init__(self, seed: int = 42):
        self.seed = seed
        self.extractor = ClinicalFeatureExtractor.get_instance()
        self.ontology = SymptomOntology.get_instance()
        self.le = LabelEncoder()

    def load_cases(self, split: str) -> List[Dict[str, Any]]:
        path = os.path.join(CASES_DIR, f"{split}_cases.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)["cases"]

    def load_free_form_cases(self, split: str) -> List[Dict[str, Any]]:
        path = os.path.join(FF_DIR, f"{split}_free_form.json")
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)["cases"]

    def prepare_data(self) -> Dict[str, Any]:
        """Builds unified rich feature matrices for Train, Val, and Locked Test."""
        print("Preparing multi-dimensional clinical feature matrices...")
        train_cases = self.load_cases("train")
        val_cases = self.load_cases("val")
        test_cases = self.load_cases("test")

        train_ff = self.load_free_form_cases("train")
        val_ff = self.load_free_form_cases("val")
        test_ff = self.load_free_form_cases("test")

        # Fit LabelEncoder on all 41 diseases
        all_diseases = sorted(list(set(c["disease"] for c in train_cases + val_cases + test_cases)))
        self.le.fit(all_diseases)

        # Structured Case Matrices
        X_train_struct = np.array([self.extractor.extract_features_model_b(c) for c in train_cases], dtype=np.float32)
        y_train_struct = self.le.transform([c["disease"] for c in train_cases])

        X_val_struct = np.array([self.extractor.extract_features_model_b(c) for c in val_cases], dtype=np.float32)
        y_val_struct = self.le.transform([c["disease"] for c in val_cases])

        X_test_struct = np.array([self.extractor.extract_features_model_b(c) for c in test_cases], dtype=np.float32)
        y_test_struct = self.le.transform([c["disease"] for c in test_cases])

        # Free-Form Text Matrices (Data Augmentation for Training)
        X_train_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in train_ff], dtype=np.float32)
        y_train_ff = self.le.transform([c["disease"] for c in train_ff])

        X_val_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in val_ff], dtype=np.float32)
        y_val_ff = self.le.transform([c["disease"] for c in val_ff])

        X_test_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in test_ff], dtype=np.float32)
        y_test_ff = self.le.transform([c["disease"] for c in test_ff])

        # Combined Training Matrix (Structured + Free-Form Train)
        X_train_combined = np.vstack([X_train_struct, X_train_ff])
        y_train_combined = np.concatenate([y_train_struct, y_train_ff])

        return {
            "X_train": X_train_combined,
            "y_train": y_train_combined,
            "X_val_struct": X_val_struct,
            "y_val_struct": y_val_struct,
            "X_val_ff": X_val_ff,
            "y_val_ff": y_val_ff,
            "X_test_struct": X_test_struct,
            "y_test_struct": y_test_struct,
            "X_test_ff": X_test_ff,
            "y_test_ff": y_test_ff,
            "all_diseases": all_diseases,
            "test_cases": test_cases
        }

    def top_k_accuracy(self, model: Any, X: np.ndarray, y: np.ndarray, k: int = 3) -> float:
        probs = model.predict_proba(X)
        top_k_preds = np.argsort(probs, axis=1)[:, -k:]
        hits = sum(1 for i, target in enumerate(y) if target in top_k_preds[i])
        return float(hits / len(y)) if len(y) > 0 else 0.0

    def evaluate_model_on_dataset(self, model: Any, X: np.ndarray, y: np.ndarray, dataset_name: str) -> Dict[str, Any]:
        preds = model.predict(X)
        probs = model.predict_proba(X)
        
        top1 = accuracy_score(y, preds)
        top3 = self.top_k_accuracy(model, X, y, k=3)
        macro_prec = precision_score(y, preds, average="macro", zero_division=0)
        macro_rec = recall_score(y, preds, average="macro", zero_division=0)
        macro_f1 = f1_score(y, preds, average="macro", zero_division=0)
        weighted_f1 = f1_score(y, preds, average="weighted", zero_division=0)
        
        # Log loss (multi-class cross entropy)
        try:
            loss = log_loss(y, probs, labels=list(range(len(self.le.classes_))))
        except Exception:
            loss = 0.0

        return {
            "top1_accuracy": round(top1 * 100, 2),
            "top3_accuracy": round(top3 * 100, 2),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
            "log_loss": round(float(loss), 4)
        }

    def train_and_compare_candidates(self) -> Dict[str, Any]:
        data = self.prepare_data()
        X_train, y_train = data["X_train"], data["y_train"]
        X_val_struct, y_val_struct = data["X_val_struct"], data["y_val_struct"]
        X_val_ff, y_val_ff = data["X_val_ff"], data["y_val_ff"]

        candidates = {
            "Logistic_Regression": LogisticRegression(
                max_iter=1000,
                C=1.5,
                solver="lbfgs",
                random_state=self.seed
            ),
            "Random_Forest": RandomForestClassifier(
                n_estimators=150,
                max_depth=18,
                min_samples_split=2,
                class_weight="balanced",
                random_state=self.seed
            ),
            "Gradient_Boosting": GradientBoostingClassifier(
                n_estimators=100,
                learning_rate=0.08,
                max_depth=4,
                random_state=self.seed
            ),
            "Hist_Gradient_Boosting": HistGradientBoostingClassifier(
                max_iter=100,
                learning_rate=0.08,
                l2_regularization=0.1,
                random_state=self.seed
            ),
            "Calibrated_Random_Forest": CalibratedClassifierCV(
                estimator=RandomForestClassifier(n_estimators=100, max_depth=16, random_state=self.seed),
                method="sigmoid",
                cv=3
            )
        }

        print("\n=======================================================")
        print("TRAINING & VALIDATION OF CANDIDATE ARCHITECTURES")
        print("=======================================================")

        comparison_results = {}
        fitted_models = {}

        for name, model in candidates.items():
            print(f"Training candidate: {name:28s} ...", end="", flush=True)
            model.fit(X_train, y_train)
            fitted_models[name] = model

            # Evaluate on Structured Validation Split
            val_struct_metrics = self.evaluate_model_on_dataset(model, X_val_struct, y_val_struct, "Val_Structured")
            
            # Evaluate on Free-Form Validation Split
            val_ff_metrics = self.evaluate_model_on_dataset(model, X_val_ff, y_val_ff, "Val_FreeForm")

            # Evaluate Partial Symptoms (2-symptom sub-samples on Val)
            part_cases = [c for c in self.load_cases("val") if len(c["canonical_symptoms"]) >= 2]
            X_part = np.array([self.extractor.extract_features_model_b({"canonical_symptoms": c["canonical_symptoms"][:2]}) for c in part_cases])
            y_part = self.le.transform([c["disease"] for c in part_cases])
            part_top1 = accuracy_score(y_part, model.predict(X_part))

            # Evaluate False-Confidence on Ambiguous / Noise Benchmark
            bench_path = os.path.join(CASES_DIR, "benchmark_clinical_cases.json")
            with open(bench_path, "r", encoding="utf-8") as f:
                bench_cases = json.load(f)["cases"]
            noise_cases = bench_cases[30:]
            X_noise = np.array([self.extractor.extract_features_model_b(c.get("free_form_description", "")) for c in noise_cases])
            noise_probs = model.predict_proba(X_noise)
            max_noise_conf = np.max(noise_probs, axis=1)
            false_confident_count = int(np.sum(max_noise_conf > 0.40))

            comparison_results[name] = {
                "validation_structured": val_struct_metrics,
                "validation_free_form": val_ff_metrics,
                "partial_symptom_accuracy": round(part_top1 * 100, 2),
                "noise_false_confident_count": false_confident_count,
                "composite_quality_score": round(
                    (val_struct_metrics["macro_f1"] * 0.35) +
                    (val_ff_metrics["macro_f1"] * 0.35) +
                    (val_ff_metrics["top3_accuracy"] / 100.0 * 0.20) -
                    (val_ff_metrics["log_loss"] * 0.05) -
                    (false_confident_count / max(len(noise_cases), 1) * 0.05),
                    4
                )
            }
            print(f" DONE | Val Struct F1: {val_struct_metrics['macro_f1']} | Val FF F1: {val_ff_metrics['macro_f1']} | Log Loss: {val_ff_metrics['log_loss']}")

        # Select Best Model based strictly on Validation composite score
        best_candidate_name = max(comparison_results.items(), key=lambda x: x[1]["composite_quality_score"])[0]
        best_model = fitted_models[best_candidate_name]
        print(f"\nWINNING ARCHITECTURE SELECTED: {best_candidate_name}")

        # Evaluate WINNING MODEL ONCE on LOCKED FINAL TEST SET
        print("\nEvaluating Selected Winning Model on Locked Final Test Set...")
        X_test_struct, y_test_struct = data["X_test_struct"], data["y_test_struct"]
        X_test_ff, y_test_ff = data["X_test_ff"], data["y_test_ff"]

        test_struct_metrics = self.evaluate_model_on_dataset(best_model, X_test_struct, y_test_struct, "Test_Structured")
        test_ff_metrics = self.evaluate_model_on_dataset(best_model, X_test_ff, y_test_ff, "Test_FreeForm")

        # Export full comparison report
        full_report = {
            "selection_summary": {
                "selected_winning_model": best_candidate_name,
                "selection_criterion": "Composite validation quality score (F1 + Top3 coverage + Log Loss calibration - False Confidence)",
                "total_candidate_models_evaluated": len(candidates)
            },
            "candidate_models_validation_benchmark": comparison_results,
            "winning_model_locked_test_benchmark": {
                "model_name": best_candidate_name,
                "locked_test_structured": test_struct_metrics,
                "locked_test_free_form": test_ff_metrics
            }
        }

        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(full_report, f, indent=2)

        # Deploy winning model components to trained_model directory
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(best_model, os.path.join(MODEL_DIR, "disease_classifier.pkl"))
        joblib.dump(self.le, os.path.join(MODEL_DIR, "label_encoder.pkl"))

        # Update metadata.json with winning model info
        metadata_path = os.path.join(MODEL_DIR, "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        else:
            meta = {}

        meta["model_architecture"] = best_candidate_name
        meta["model_type"] = type(best_model).__name__
        meta["evaluation_metrics"] = {
            "locked_test_top1_acc": test_struct_metrics["top1_accuracy"],
            "locked_test_macro_f1": test_struct_metrics["macro_f1"],
            "free_form_test_top1_acc": test_ff_metrics["top1_accuracy"],
            "free_form_test_top3_acc": test_ff_metrics["top3_accuracy"],
            "free_form_test_macro_f1": test_ff_metrics["macro_f1"]
        }

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        print(f"Deployed winning model ({best_candidate_name}) to: {MODEL_DIR}")
        print(f"Comparison report saved to: {REPORT_PATH}")

        return full_report

if __name__ == "__main__":
    engine = ModelComparisonEngine(seed=42)
    engine.train_and_compare_candidates()
