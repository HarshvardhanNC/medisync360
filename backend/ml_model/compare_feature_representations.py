"""
MediSync360 Feature Representation Comparative Evaluation (Assignment 7)
Compares Model A (Baseline Binary) vs Model B (Enhanced Multi-Dimensional)
across identical leakage-free splits and clinical benchmarks.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Tuple
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

sys.path.append(os.path.dirname(__file__))
from feature_engineering import ClinicalFeatureExtractor

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
CASES_DIR = os.path.join(WORKSPACE_DIR, "data", "cases")
FREE_FORM_TEST_SET = os.path.join(WORKSPACE_DIR, "evaluation", "free_form_test_set.json")
REPORT_OUTPUT = os.path.join(WORKSPACE_DIR, "evaluation", "feature_comparison_report.json")

class FeatureComparisonEvaluator:
    def __init__(self):
        self.extractor = ClinicalFeatureExtractor.get_instance()
        self.le = LabelEncoder()

    def load_case_split(self, split_name: str) -> List[Dict[str, Any]]:
        file_path = os.path.join(CASES_DIR, f"{split_name}_cases.json")
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)["cases"]

    def build_matrices(self, cases: List[Dict[str, Any]], model_type: str = "A") -> Tuple[np.ndarray, List[str]]:
        X_list = []
        y_list = []
        for c in cases:
            if model_type == "A":
                feat = self.extractor.extract_features_model_a(c)
            else:
                feat = self.extractor.extract_features_model_b(c)
            X_list.append(feat)
            y_list.append(c["disease"])
        return np.array(X_list, dtype=np.float32), y_list

    def top_k_accuracy(self, model: RandomForestClassifier, X: np.ndarray, y_indices: np.ndarray, k: int = 3) -> float:
        probs = model.predict_proba(X)
        top_k_preds = np.argsort(probs, axis=1)[:, -k:]
        hits = 0
        for i, target_idx in enumerate(y_indices):
            if target_idx in top_k_preds[i]:
                hits += 1
        return float(hits / len(y_indices)) if len(y_indices) > 0 else 0.0

    def run_comparison(self) -> Dict[str, Any]:
        print("Loading sealed splits for comparative evaluation...")
        train_cases = self.load_case_split("train")
        val_cases = self.load_case_split("val")
        test_cases = self.load_case_split("test")

        # Fit label encoder
        all_diseases = sorted(list(set(c["disease"] for c in train_cases + val_cases + test_cases)))
        self.le.fit(all_diseases)

        # Build feature matrices
        X_train_A, y_train = self.build_matrices(train_cases, "A")
        X_train_B, _ = self.build_matrices(train_cases, "B")
        y_train_idx = self.le.transform(y_train)

        X_val_A, y_val = self.build_matrices(val_cases, "A")
        X_val_B, _ = self.build_matrices(val_cases, "B")
        y_val_idx = self.le.transform(y_val)

        X_test_A, y_test = self.build_matrices(test_cases, "A")
        X_test_B, _ = self.build_matrices(test_cases, "B")
        y_test_idx = self.le.transform(y_test)

        print("\nTraining Model A (Baseline Binary Features, 131-dim)...")
        model_A = RandomForestClassifier(n_estimators=100, random_state=42)
        model_A.fit(X_train_A, y_train_idx)

        print("Training Model B (Enhanced Clinical Features, 154-dim)...")
        model_B = RandomForestClassifier(n_estimators=100, random_state=42)
        model_B.fit(X_train_B, y_train_idx)

        # 1. Validation Set Metrics
        pred_val_A = model_A.predict(X_val_A)
        pred_val_B = model_B.predict(X_val_B)

        val_acc_A = accuracy_score(y_val_idx, pred_val_A)
        val_acc_B = accuracy_score(y_val_idx, pred_val_B)

        val_top3_A = self.top_k_accuracy(model_A, X_val_A, y_val_idx, k=3)
        val_top3_B = self.top_k_accuracy(model_B, X_val_B, y_val_idx, k=3)

        # 2. Final Locked Test Set Metrics
        pred_test_A = model_A.predict(X_test_A)
        pred_test_B = model_B.predict(X_test_B)

        test_acc_A = accuracy_score(y_test_idx, pred_test_A)
        test_acc_B = accuracy_score(y_test_idx, pred_test_B)

        test_top3_A = self.top_k_accuracy(model_A, X_test_A, y_test_idx, k=3)
        test_top3_B = self.top_k_accuracy(model_B, X_test_B, y_test_idx, k=3)

        test_prec_A = precision_score(y_test_idx, pred_test_A, average="macro", zero_division=0)
        test_prec_B = precision_score(y_test_idx, pred_test_B, average="macro", zero_division=0)

        test_rec_A = recall_score(y_test_idx, pred_test_A, average="macro", zero_division=0)
        test_rec_B = recall_score(y_test_idx, pred_test_B, average="macro", zero_division=0)

        test_f1_A = f1_score(y_test_idx, pred_test_A, average="macro", zero_division=0)
        test_f1_B = f1_score(y_test_idx, pred_test_B, average="macro", zero_division=0)

        # 3. Free-Form Test Benchmark Evaluation
        print("Evaluating on Free-Form locked evaluation test set...")
        with open(FREE_FORM_TEST_SET, "r", encoding="utf-8") as f:
            ff_test_cases = json.load(f)["cases"]

        X_ff_A = np.array([self.extractor.extract_features_model_a(c["free_form_text"]) for c in ff_test_cases])
        X_ff_B = np.array([self.extractor.extract_features_model_b(c["free_form_text"]) for c in ff_test_cases])
        y_ff_idx = self.le.transform([c["disease"] for c in ff_test_cases])

        ff_acc_A = accuracy_score(y_ff_idx, model_A.predict(X_ff_A))
        ff_acc_B = accuracy_score(y_ff_idx, model_B.predict(X_ff_B))
        ff_top3_A = self.top_k_accuracy(model_A, X_ff_A, y_ff_idx, k=3)
        ff_top3_B = self.top_k_accuracy(model_B, X_ff_B, y_ff_idx, k=3)

        # 4. Partial Symptom Evaluation (2-symptom sub-samples)
        partial_cases = []
        for c in test_cases:
            if len(c["canonical_symptoms"]) >= 2:
                partial_cases.append({"canonical_symptoms": c["canonical_symptoms"][:2], "disease": c["disease"]})

        X_part_A = np.array([self.extractor.extract_features_model_a(c) for c in partial_cases])
        X_part_B = np.array([self.extractor.extract_features_model_b(c) for c in partial_cases])
        y_part_idx = self.le.transform([c["disease"] for c in partial_cases])

        part_acc_A = accuracy_score(y_part_idx, model_A.predict(X_part_A))
        part_acc_B = accuracy_score(y_part_idx, model_B.predict(X_part_B))

        # 5. False Confident Prediction Rate on Challenging Benchmark Cases
        bench_file = os.path.join(CASES_DIR, "benchmark_clinical_cases.json")
        with open(bench_file, "r", encoding="utf-8") as f:
            bench_cases = json.load(f)["cases"]

        noise_ambig_cases = [c for c in bench_cases if c.get("disease") in ["ABSTAIN", "CLARIFY", "Noise / Off-Topic", "Out-of-Scope Condition"]]
        if not noise_ambig_cases:
            # Check for non-predict cases
            noise_ambig_cases = bench_cases[30:]

        X_noise_A = np.array([self.extractor.extract_features_model_a(c.get("free_form_description", "")) for c in noise_ambig_cases])
        probs_noise_A = model_A.predict_proba(X_noise_A)
        max_probs_A = np.max(probs_noise_A, axis=1)
        false_conf_A = int(np.sum(max_probs_A > 0.40))

        X_noise_B = np.array([self.extractor.extract_features_model_b(c.get("free_form_description", "")) for c in noise_ambig_cases])
        probs_noise_B = model_B.predict_proba(X_noise_B)
        max_probs_B = np.max(probs_noise_B, axis=1)
        false_conf_B = int(np.sum(max_probs_B > 0.40))

        results = {
            "validation_metrics": {
                "model_A_top1_acc": round(val_acc_A * 100, 2),
                "model_B_top1_acc": round(val_acc_B * 100, 2),
                "model_A_top3_acc": round(val_top3_A * 100, 2),
                "model_B_top3_acc": round(val_top3_B * 100, 2),
            },
            "locked_test_metrics": {
                "model_A_top1_acc": round(test_acc_A * 100, 2),
                "model_B_top1_acc": round(test_acc_B * 100, 2),
                "model_A_top3_acc": round(test_top3_A * 100, 2),
                "model_B_top3_acc": round(test_top3_B * 100, 2),
                "model_A_macro_precision": round(test_prec_A, 4),
                "model_B_macro_precision": round(test_prec_B, 4),
                "model_A_macro_recall": round(test_rec_A, 4),
                "model_B_macro_recall": round(test_rec_B, 4),
                "model_A_macro_f1": round(test_f1_A, 4),
                "model_B_macro_f1": round(test_f1_B, 4)
            },
            "free_form_test_metrics": {
                "total_eval_cases": len(ff_test_cases),
                "model_A_top1_acc": round(ff_acc_A * 100, 2),
                "model_B_top1_acc": round(ff_acc_B * 100, 2),
                "model_A_top3_acc": round(ff_top3_A * 100, 2),
                "model_B_top3_acc": round(ff_top3_B * 100, 2),
            },
            "partial_symptom_metrics": {
                "total_cases": len(partial_cases),
                "model_A_top1_acc": round(part_acc_A * 100, 2),
                "model_B_top1_acc": round(part_acc_B * 100, 2)
            },
            "noise_and_false_confidence": {
                "evaluated_ambiguous_noise_cases": len(noise_ambig_cases),
                "model_A_false_confident_count": false_conf_A,
                "model_B_false_confident_count": false_conf_B,
                "confidence_suppression_improvement": f"{round((false_conf_A - false_conf_B) / max(false_conf_A, 1) * 100, 1)}%"
            }
        }

        with open(REPORT_OUTPUT, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)

        print("\n=======================================================")
        print("COMPARATIVE EVALUATION SUMMARY (Assignment 7)")
        print("=======================================================")
        print(f"Validation Top-1 Acc:  Model A = {results['validation_metrics']['model_A_top1_acc']}% | Model B = {results['validation_metrics']['model_B_top1_acc']}%")
        print(f"Locked Test Top-1 Acc: Model A = {results['locked_test_metrics']['model_A_top1_acc']}% | Model B = {results['locked_test_metrics']['model_B_top1_acc']}%")
        print(f"Locked Test Macro F1:  Model A = {results['locked_test_metrics']['model_A_macro_f1']} | Model B = {results['locked_test_metrics']['model_B_macro_f1']}")
        print(f"Free-Form Top-1 Acc:   Model A = {results['free_form_test_metrics']['model_A_top1_acc']}% | Model B = {results['free_form_test_metrics']['model_B_top1_acc']}%")
        print(f"Free-Form Top-3 Acc:   Model A = {results['free_form_test_metrics']['model_A_top3_acc']}% | Model B = {results['free_form_test_metrics']['model_B_top3_acc']}%")
        print(f"Partial Sym (2-Sym):   Model A = {results['partial_symptom_metrics']['model_A_top1_acc']}% | Model B = {results['partial_symptom_metrics']['model_B_top1_acc']}%")
        print(f"False Confident Preds: Model A = {false_conf_A} cases | Model B = {false_conf_B} cases (Improved by {results['noise_and_false_confidence']['confidence_suppression_improvement']})")
        print(f"\nDetailed report saved to: {REPORT_OUTPUT}")

        return results

if __name__ == "__main__":
    evaluator = FeatureComparisonEvaluator()
    evaluator.run_comparison()
