"""
MediSync360 Statistical Probability Calibration Engine (Assignment 10)

Implements rigorous post-hoc probability calibration:
1. Platt Scaling (Sigmoid Logistic Calibration)
2. Non-Parametric Isotonic Regression Calibration

Computes:
- Multi-class Expected Calibration Error (ECE)
- Maximum Calibration Error (MCE)
- Multi-class Brier Score
- Log Loss (Cross-Entropy)
- 10-Bin Reliability Diagrams

Strictly tunes and selects calibration method on Train + Val.
Final Test remains untouched until final verification.
"""

import os
import sys
import json
import joblib
import numpy as np
from typing import Dict, List, Any, Tuple

from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import log_loss, brier_score_loss, accuracy_score

sys.path.append(os.path.dirname(__file__))
from feature_engineering import ClinicalFeatureExtractor

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CASES_DIR = os.path.join(WORKSPACE_DIR, "data", "cases")
FF_DIR = os.path.join(WORKSPACE_DIR, "data", "free_form_cases")
EVAL_DIR = os.path.join(WORKSPACE_DIR, "evaluation")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "trained_model")
METRICS_PATH = os.path.join(EVAL_DIR, "calibration_metrics.json")

class ProbabilityCalibrationEngine:
    def __init__(self, n_bins: int = 10, seed: int = 42):
        self.n_bins = n_bins
        self.seed = seed
        self.extractor = ClinicalFeatureExtractor.get_instance()
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
        """Loads and vectorizes Train, Val, and Locked Test matrices."""
        train_cases = self.load_cases("train")
        val_cases = self.load_cases("val")
        test_cases = self.load_cases("test")

        train_ff = self.load_free_form_cases("train")
        val_ff = self.load_free_form_cases("val")
        test_ff = self.load_free_form_cases("test")

        all_diseases = sorted(list(set(c["disease"] for c in train_cases + val_cases + test_cases)))
        self.le.fit(all_diseases)

        # Feature matrices
        X_train_struct = np.array([self.extractor.extract_features_model_b(c) for c in train_cases], dtype=np.float32)
        y_train_struct = self.le.transform([c["disease"] for c in train_cases])

        X_train_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in train_ff], dtype=np.float32)
        y_train_ff = self.le.transform([c["disease"] for c in train_ff])

        X_train = np.vstack([X_train_struct, X_train_ff])
        y_train = np.concatenate([y_train_struct, y_train_ff])

        # Validation (Structured + Free-Form)
        X_val_struct = np.array([self.extractor.extract_features_model_b(c) for c in val_cases], dtype=np.float32)
        y_val_struct = self.le.transform([c["disease"] for c in val_cases])

        X_val_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in val_ff], dtype=np.float32)
        y_val_ff = self.le.transform([c["disease"] for c in val_ff])

        X_val = np.vstack([X_val_struct, X_val_ff])
        y_val = np.concatenate([y_val_struct, y_val_ff])

        # Locked Test
        X_test_struct = np.array([self.extractor.extract_features_model_b(c) for c in test_cases], dtype=np.float32)
        y_test_struct = self.le.transform([c["disease"] for c in test_cases])

        X_test_ff = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in test_ff], dtype=np.float32)
        y_test_ff = self.le.transform([c["disease"] for c in test_ff])

        X_test = np.vstack([X_test_struct, X_test_ff])
        y_test = np.concatenate([y_test_struct, y_test_ff])

        return {
            "X_train": X_train,
            "y_train": y_train,
            "X_val": X_val,
            "y_val": y_val,
            "X_test": X_test,
            "y_test": y_test,
            "all_diseases": all_diseases
        }

    def compute_calibration_metrics(self, probs: np.ndarray, y_true: np.ndarray) -> Dict[str, Any]:
        """
        Computes multi-class ECE, MCE, multi-class Brier score, log loss, and reliability bins.
        """
        N = len(y_true)
        K = probs.shape[1]
        preds = np.argmax(probs, axis=1)
        confidences = np.max(probs, axis=1)
        accuracies = (preds == y_true).astype(float)

        # 1. Multi-class Brier Score: 1/N * sum_i sum_k (p_ik - y_ik)^2
        y_one_hot = np.zeros((N, K), dtype=np.float32)
        for i, label in enumerate(y_true):
            y_one_hot[i, label] = 1.0
        brier_score = float(np.mean(np.sum((probs - y_one_hot) ** 2, axis=1)))

        # 2. Log Loss (Cross Entropy)
        loss = float(log_loss(y_true, probs, labels=list(range(K))))

        # 3. Expected Calibration Error (ECE) & Maximum Calibration Error (MCE)
        bin_boundaries = np.linspace(0.0, 1.0, self.n_bins + 1)
        bin_data = []
        ece = 0.0
        mce = 0.0

        for i in range(self.n_bins):
            bin_lower = bin_boundaries[i]
            bin_upper = bin_boundaries[i + 1]
            in_bin = (confidences > bin_lower) & (confidences <= bin_upper) if i > 0 else (confidences >= bin_lower) & (confidences <= bin_upper)
            bin_size = int(np.sum(in_bin))

            if bin_size > 0:
                bin_acc = float(np.mean(accuracies[in_bin]))
                bin_conf = float(np.mean(confidences[in_bin]))
                gap = abs(bin_acc - bin_conf)
                ece += (bin_size / N) * gap
                if gap > mce:
                    mce = gap

                bin_data.append({
                    "bin_range": f"{round(bin_lower, 2)}-{round(bin_upper, 2)}",
                    "sample_count": bin_size,
                    "mean_confidence": round(bin_conf, 4),
                    "mean_accuracy": round(bin_acc, 4),
                    "calibration_gap": round(gap, 4)
                })
            else:
                bin_data.append({
                    "bin_range": f"{round(bin_lower, 2)}-{round(bin_upper, 2)}",
                    "sample_count": 0,
                    "mean_confidence": 0.0,
                    "mean_accuracy": 0.0,
                    "calibration_gap": 0.0
                })

        return {
            "expected_calibration_error": round(float(ece), 4),
            "max_calibration_error": round(float(mce), 4),
            "multi_class_brier_score": round(brier_score, 4),
            "log_loss": round(loss, 4),
            "top1_accuracy": round(float(np.mean(accuracies) * 100), 2),
            "reliability_bins": bin_data
        }

    def train_and_calibrate(self) -> Dict[str, Any]:
        print("Starting Statistical Probability Calibration Benchmark...")
        data = self.prepare_data()
        X_train, y_train = data["X_train"], data["y_train"]
        X_val, y_val = data["X_val"], data["y_val"]
        X_test, y_test = data["X_test"], data["y_test"]

        # 1. Train Base Classifier (Uncalibrated Random Forest)
        base_rf = RandomForestClassifier(
            n_estimators=150,
            max_depth=18,
            min_samples_split=2,
            class_weight="balanced",
            random_state=self.seed
        )
        base_rf.fit(X_train, y_train)

        # 2. Platt Scaling (Sigmoid Calibration)
        platt_calibrator = CalibratedClassifierCV(
            estimator=RandomForestClassifier(n_estimators=100, max_depth=16, random_state=self.seed),
            method="sigmoid",
            cv=3
        )
        platt_calibrator.fit(X_train, y_train)

        # 3. Isotonic Regression Calibration
        isotonic_calibrator = CalibratedClassifierCV(
            estimator=RandomForestClassifier(n_estimators=100, max_depth=16, random_state=self.seed),
            method="isotonic",
            cv=3
        )
        isotonic_calibrator.fit(X_train, y_train)

        # Evaluate on Validation Split
        probs_uncal = base_rf.predict_proba(X_val)
        probs_platt = platt_calibrator.predict_proba(X_val)
        probs_iso = isotonic_calibrator.predict_proba(X_val)

        val_metrics_uncal = self.compute_calibration_metrics(probs_uncal, y_val)
        val_metrics_platt = self.compute_calibration_metrics(probs_platt, y_val)
        val_metrics_iso = self.compute_calibration_metrics(probs_iso, y_val)

        print("\n=======================================================")
        print("PROBABILITY CALIBRATION VALIDATION BENCHMARK")
        print("=======================================================")
        print(f"Uncalibrated Base RF: ECE = {val_metrics_uncal['expected_calibration_error']:.4f} | Brier = {val_metrics_uncal['multi_class_brier_score']:.4f} | LogLoss = {val_metrics_uncal['log_loss']:.4f}")
        print(f"Platt Scaling (Sigmoid): ECE = {val_metrics_platt['expected_calibration_error']:.4f} | Brier = {val_metrics_platt['multi_class_brier_score']:.4f} | LogLoss = {val_metrics_platt['log_loss']:.4f}")
        print(f"Isotonic Calibration:  ECE = {val_metrics_iso['expected_calibration_error']:.4f} | Brier = {val_metrics_iso['multi_class_brier_score']:.4f} | LogLoss = {val_metrics_iso['log_loss']:.4f}")

        # Choose best method based on Validation ECE & Brier Score
        candidates = {
            "platt_sigmoid": (platt_calibrator, val_metrics_platt),
            "isotonic": (isotonic_calibrator, val_metrics_iso)
        }
        best_name = min(candidates.keys(), key=lambda k: candidates[k][1]["expected_calibration_error"] + candidates[k][1]["multi_class_brier_score"])
        best_calibrator, best_val_metrics = candidates[best_name]

        print(f"\nSELECTED CALIBRATION METHOD: {best_name.upper()}")

        # Evaluate on Sealed Final Test Set (Only after selection)
        probs_test_uncal = base_rf.predict_proba(X_test)
        probs_test_cal = best_calibrator.predict_proba(X_test)

        test_metrics_uncal = self.compute_calibration_metrics(probs_test_uncal, y_test)
        test_metrics_cal = self.compute_calibration_metrics(probs_test_cal, y_test)

        report = {
            "calibration_protocol": {
                "selected_method": best_name,
                "n_bins": self.n_bins,
                "calibration_cv_folds": 3,
                "disclaimer": "Calibrated probabilities represent statistical confidence given presented symptoms and do NOT constitute definitive medical diagnosis."
            },
            "validation_comparison": {
                "uncalibrated_base_rf": val_metrics_uncal,
                "platt_sigmoid_calibration": val_metrics_platt,
                "isotonic_calibration": val_metrics_iso
            },
            "final_test_calibration_impact": {
                "uncalibrated_test_metrics": test_metrics_uncal,
                "calibrated_test_metrics": test_metrics_cal,
                "ece_improvement_percent": round((test_metrics_uncal["expected_calibration_error"] - test_metrics_cal["expected_calibration_error"]) / max(test_metrics_uncal["expected_calibration_error"], 1e-6) * 100, 2),
                "brier_score_improvement_percent": round((test_metrics_uncal["multi_class_brier_score"] - test_metrics_cal["multi_class_brier_score"]) / max(test_metrics_uncal["multi_class_brier_score"], 1e-6) * 100, 2),
                "log_loss_improvement_percent": round((test_metrics_uncal["log_loss"] - test_metrics_cal["log_loss"]) / max(test_metrics_uncal["log_loss"], 1e-6) * 100, 2)
            }
        }

        with open(METRICS_PATH, "w", encoding="utf-8") as f:
            json.dump(report, f, indent=2)

        # Deploy calibrated model to production directory
        os.makedirs(MODEL_DIR, exist_ok=True)
        joblib.dump(best_calibrator, os.path.join(MODEL_DIR, "disease_classifier.pkl"))
        joblib.dump(self.le, os.path.join(MODEL_DIR, "label_encoder.pkl"))

        # Update metadata.json with calibration details
        metadata_path = os.path.join(MODEL_DIR, "metadata.json")
        if os.path.exists(metadata_path):
            with open(metadata_path, "r", encoding="utf-8") as f:
                meta = json.load(f)
        else:
            meta = {}

        meta["probability_calibration"] = {
            "method": best_name,
            "validation_ece": best_val_metrics["expected_calibration_error"],
            "validation_brier": best_val_metrics["multi_class_brier_score"],
            "test_ece": test_metrics_cal["expected_calibration_error"],
            "test_brier": test_metrics_cal["multi_class_brier_score"],
            "clinical_disclaimer": "Calibrated probability reflects statistical likelihood over observed clinical cohort, not certainty."
        }

        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, indent=2)

        print(f"Calibration metrics saved to: {METRICS_PATH}")
        print(f"Calibrated model deployed to: {MODEL_DIR}")

        return report

if __name__ == "__main__":
    engine = ProbabilityCalibrationEngine(n_bins=10, seed=42)
    engine.train_and_calibrate()
