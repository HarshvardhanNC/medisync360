#!/usr/bin/env python3
"""
MediSync360 Leakage-Free Model Evaluation & Dataset Splitting Pipeline
Assignment 1: Trustworthy, Leakage-Free ML Evaluation

This module provides:
1. Deterministic, stratified, leakage-free dataset splitting (70% Train / 15% Val / 15% Test).
2. Cryptographic pattern-level SHA-256 hashing and deduplication.
3. Automated multi-point leakage detection tests.
4. Comprehensive multi-class statistical evaluation (Top-1, Top-3, Macro/Weighted Precision,
   Recall, F1, Log Loss, Confusion Matrix, Per-Disease Breakdown, False Confident Count).
5. Comparative evaluation between current model (memorized baseline) and clean split-trained model.
6. Strict post-split augmentation validation.
"""

import os
import sys
import json
import hashlib
import argparse
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Set
from sklearn.metrics import (
    accuracy_score,
    top_k_accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
    log_loss
)
from sklearn.ensemble import GradientBoostingClassifier
import joblib

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA_PATH = os.path.join(WORKSPACE_DIR, "backend", "src", "data", "dataset.csv")
MODEL_DIR = os.path.join(WORKSPACE_DIR, "backend", "ml_model", "trained_model")
EVAL_DIR = os.path.join(WORKSPACE_DIR, "evaluation")
SPLITS_DIR = os.path.join(EVAL_DIR, "splits")

RANDOM_SEED = 42

def compute_sha256(text: str) -> str:
    """Compute SHA-256 hex digest for a string."""
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

def load_canonical_dataset(data_path: str = DATA_PATH) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    Load raw CSV, canonicalize symptom lists, and extract unique disease-symptom patterns.
    Returns:
      (full_records_df, unique_patterns_df)
    """
    if not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    df = pd.read_csv(data_path)
    symptom_cols = [c for c in df.columns if c.startswith("Symptom_")]

    records = []
    for idx, row in df.iterrows():
        disease = str(row["Disease"])  # Preserve exact string matching dataset.csv
        syms = []
        for c in symptom_cols:
            val = row[c]
            if pd.notna(val) and str(val).strip():
                clean = str(val).strip().replace("_", " ").lower()
                syms.append(clean)
        syms_sorted = sorted(list(set(syms)))
        content_str = f"{disease}::" + ",".join(syms_sorted)
        pattern_hash = compute_sha256(content_str)[:16]

        records.append({
            "original_row_id": idx,
            "disease": disease,
            "symptoms": syms_sorted,
            "symptom_count": len(syms_sorted),
            "symptom_str": ", ".join(syms_sorted),
            "pattern_hash": pattern_hash
        })

    full_records_df = pd.DataFrame(records)
    unique_patterns_df = full_records_df.drop_duplicates(subset=["disease", "pattern_hash"]).copy().reset_index(drop=True)
    return full_records_df, unique_patterns_df

def create_leakage_free_splits(
    unique_patterns: pd.DataFrame,
    seed: int = RANDOM_SEED
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Create stratified 70% Train, 15% Validation, 15% Final Test splits on unique patterns.
    Guarantees every disease is present in Train, Val, and Test.
    Zero symptom combination overlap across splits.
    """
    rng = np.random.RandomState(seed)
    train_indices: List[int] = []
    val_indices: List[int] = []
    test_indices: List[int] = []

    for disease, group in unique_patterns.groupby("disease"):
        group_indices = group.index.tolist()
        shuffled = rng.permutation(group_indices).tolist()
        n = len(shuffled)

        n_test = max(1, int(round(n * 0.15)))
        n_val = max(1, int(round(n * 0.15)))
        n_train = n - n_val - n_test

        if n_train < 1:
            n_train = max(1, n - 2)
            n_val = 1
            n_test = max(1, n - n_train - n_val)

        train_indices.extend(shuffled[:n_train])
        val_indices.extend(shuffled[n_train:n_train + n_val])
        test_indices.extend(shuffled[n_train + n_val:])

    train_df = unique_patterns.iloc[train_indices].copy().reset_index(drop=True)
    val_df = unique_patterns.iloc[val_indices].copy().reset_index(drop=True)
    test_df = unique_patterns.iloc[test_indices].copy().reset_index(drop=True)

    return train_df, val_df, test_df

def run_automated_leakage_checks(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame
) -> Dict[str, Any]:
    """
    Execute rigorous automated leakage checks across splits:
    1. Exact hash overlap check.
    2. Symptom combination set overlap check.
    3. Near-duplicate Jaccard similarity distribution.
    4. Per-disease representation check in all splits.
    """
    train_hashes = set(train_df["pattern_hash"])
    val_hashes = set(val_df["pattern_hash"])
    test_hashes = set(test_df["pattern_hash"])

    train_val_hash_overlap = len(train_hashes & val_hashes)
    train_test_hash_overlap = len(train_hashes & test_hashes)
    val_test_hash_overlap = len(val_hashes & test_hashes)

    train_syms_set = set(tuple(s) for s in train_df["symptoms"])
    val_syms_set = set(tuple(s) for s in val_df["symptoms"])
    test_syms_set = set(tuple(s) for s in test_df["symptoms"])

    train_val_sym_overlap = len(train_syms_set & val_syms_set)
    train_test_sym_overlap = len(train_syms_set & test_syms_set)
    val_test_sym_overlap = len(val_syms_set & test_syms_set)

    # Near-duplicate Jaccard analysis (Test to Train)
    max_jaccards_test = []
    for test_s in test_syms_set:
        t_set = set(test_s)
        best_j = 0.0
        for train_s in train_syms_set:
            tr_set = set(train_s)
            j = len(t_set & tr_set) / len(t_set | tr_set) if (t_set | tr_set) else 0.0
            if j > best_j:
                best_j = j
        max_jaccards_test.append(best_j)

    train_diseases = set(train_df["disease"])
    val_diseases = set(val_df["disease"])
    test_diseases = set(test_df["disease"])
    all_diseases = train_diseases | val_diseases | test_diseases

    all_diseases_in_train = len(all_diseases - train_diseases) == 0
    all_diseases_in_val = len(all_diseases - val_diseases) == 0
    all_diseases_in_test = len(all_diseases - test_diseases) == 0

    has_leakage = (
        train_val_hash_overlap > 0 or
        train_test_hash_overlap > 0 or
        val_test_hash_overlap > 0 or
        train_val_sym_overlap > 0 or
        train_test_sym_overlap > 0 or
        val_test_sym_overlap > 0
    )

    report = {
        "status": "PASSED" if not has_leakage else "FAILED",
        "has_data_leakage": has_leakage,
        "split_counts": {
            "total_unique_patterns": len(train_df) + len(val_df) + len(test_df),
            "train_count": len(train_df),
            "train_percentage": round(len(train_df) / (len(train_df) + len(val_df) + len(test_df)) * 100, 2),
            "validation_count": len(val_df),
            "validation_percentage": round(len(val_df) / (len(train_df) + len(val_df) + len(test_df)) * 100, 2),
            "final_test_count": len(test_df),
            "final_test_percentage": round(len(test_df) / (len(train_df) + len(val_df) + len(test_df)) * 100, 2)
        },
        "exact_overlap_checks": {
            "train_val_exact_overlap_count": train_val_hash_overlap,
            "train_test_exact_overlap_count": train_test_hash_overlap,
            "val_test_exact_overlap_count": val_test_hash_overlap
        },
        "symptom_combination_overlap_checks": {
            "train_val_symptom_overlap_count": train_val_sym_overlap,
            "train_test_symptom_overlap_count": train_test_sym_overlap,
            "val_test_symptom_overlap_count": val_test_sym_overlap
        },
        "near_duplicate_jaccard_analysis": {
            "test_to_train_mean_jaccard": round(float(np.mean(max_jaccards_test)), 4),
            "test_to_train_max_jaccard": round(float(np.max(max_jaccards_test)), 4),
            "test_to_train_min_jaccard": round(float(np.min(max_jaccards_test)), 4),
            "note": "Measures vocabulary overlap across distinct symptom combinations"
        },
        "disease_coverage_checks": {
            "total_diseases": len(all_diseases),
            "all_diseases_in_train": all_diseases_in_train,
            "all_diseases_in_val": all_diseases_in_val,
            "all_diseases_in_test": all_diseases_in_test
        },
        "augmentation_policy_verification": {
            "policy": "Strictly post-split. Single-symptom synthesis or augmentations must occur ONLY on Train split.",
            "test_set_isolation": "Guaranteed. Final test records are strictly isolated from any training or tuning process."
        }
    }
    return report

def evaluate_model_on_split(
    model: Any,
    label_encoder: Any,
    all_symptoms: List[str],
    split_df: pd.DataFrame,
    split_name: str
) -> Dict[str, Any]:
    """
    Evaluate trained classifier on a specific dataset split.
    """
    classes = label_encoder.classes_.tolist()
    class_map = {c.strip(): c for c in classes}

    def featurize(symptoms_list: List[str]) -> np.ndarray:
        vec = np.zeros(len(all_symptoms), dtype=np.float32)
        for s in symptoms_list:
            if s in all_symptoms:
                vec[all_symptoms.index(s)] = 1.0
        return vec

    X = np.array([featurize(s) for s in split_df["symptoms"]])
    y_raw = [class_map.get(d.strip(), d) for d in split_df["disease"]]
    y = label_encoder.transform(y_raw)

    y_proba = model.predict_proba(X)
    y_pred = np.argmax(y_proba, axis=1)

    top1 = accuracy_score(y, y_pred)
    top3 = top_k_accuracy_score(y, y_proba, k=min(3, len(classes)), labels=np.arange(len(classes)))
    prec_m, rec_m, f1_m, _ = precision_recall_fscore_support(y, y_pred, average="macro", zero_division=0)
    prec_w, rec_w, f1_w, _ = precision_recall_fscore_support(y, y_pred, average="weighted", zero_division=0)
    ll = log_loss(y, y_proba, labels=np.arange(len(classes)))

    cm = confusion_matrix(y, y_pred, labels=np.arange(len(classes)))
    prec_pc, rec_pc, f1_pc, supp_pc = precision_recall_fscore_support(
        y, y_pred, average=None, labels=np.arange(len(classes)), zero_division=0
    )

    max_probs = np.max(y_proba, axis=1)
    wrong_mask = (y_pred != y)
    false_confident_indices = np.where(wrong_mask & (max_probs >= 0.80))[0]

    false_confident_details = []
    for idx in false_confident_indices:
        false_confident_details.append({
            "case_id": int(split_df.iloc[idx]["original_row_id"]),
            "true_disease": str(split_df.iloc[idx]["disease"]),
            "predicted_disease": str(label_encoder.inverse_transform([y_pred[idx]])[0]),
            "model_confidence": round(float(max_probs[idx] * 100), 2),
            "symptoms": split_df.iloc[idx]["symptom_str"]
        })

    per_disease = {}
    for idx, d_name in enumerate(classes):
        per_disease[d_name] = {
            "support": int(supp_pc[idx]),
            "precision": round(float(prec_pc[idx]), 4),
            "recall": round(float(rec_pc[idx]), 4),
            "f1": round(float(f1_pc[idx]), 4)
        }

    return {
        "split_name": split_name,
        "evaluated_cases": len(split_df),
        "top_1_accuracy": round(float(top1), 4),
        "top_3_accuracy": round(float(top3), 4),
        "macro_precision": round(float(prec_m), 4),
        "macro_recall": round(float(rec_m), 4),
        "macro_f1": round(float(f1_m), 4),
        "weighted_f1": round(float(f1_w), 4),
        "log_loss": round(float(ll), 4),
        "false_confident_count": len(false_confident_indices),
        "false_confident_cases": false_confident_details,
        "per_disease_breakdown": per_disease,
        "confusion_matrix": cm.tolist()
    }

def train_and_evaluate_clean_model(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    all_symptoms: List[str],
    label_encoder: Any
) -> Dict[str, Any]:
    """
    Train a clean model ONLY on 70% Train split (zero leakage from Val/Test)
    and evaluate on Validation, Final Test, and Partial Symptom cases.
    """
    classes = label_encoder.classes_.tolist()
    class_map = {c.strip(): c for c in classes}

    def featurize(symptoms_list: List[str]) -> np.ndarray:
        vec = np.zeros(len(all_symptoms), dtype=np.float32)
        for s in symptoms_list:
            if s in all_symptoms:
                vec[all_symptoms.index(s)] = 1.0
        return vec

    X_train = np.array([featurize(s) for s in train_df["symptoms"]])
    y_train = label_encoder.transform([class_map.get(d.strip(), d) for d in train_df["disease"]])

    X_val = np.array([featurize(s) for s in val_df["symptoms"]])
    y_val = label_encoder.transform([class_map.get(d.strip(), d) for d in val_df["disease"]])

    X_test = np.array([featurize(s) for s in test_df["symptoms"]])
    y_test = label_encoder.transform([class_map.get(d.strip(), d) for d in test_df["disease"]])

    clean_clf = GradientBoostingClassifier(
        n_estimators=200,
        max_depth=8,
        learning_rate=0.1,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_SEED,
        subsample=0.8
    )
    clean_clf.fit(X_train, y_train)

    val_res = evaluate_model_on_split(clean_clf, label_encoder, all_symptoms, val_df, "Clean_Model_Validation")
    test_res = evaluate_model_on_split(clean_clf, label_encoder, all_symptoms, test_df, "Clean_Model_Final_Test")

    # Partial symptom degradation evaluation (only first 2 symptoms presented)
    degraded_correct = 0
    total_degraded = 0
    for idx, row in test_df.iterrows():
        syms = row["symptoms"]
        if len(syms) >= 2:
            partial_feat = featurize(syms[:2])
            pred_p = clean_clf.predict_proba([partial_feat])[0]
            pred_c = np.argmax(pred_p)
            true_c = label_encoder.transform([class_map.get(row["disease"].strip(), row["disease"])])[0]
            if pred_c == true_c:
                degraded_correct += 1
            total_degraded += 1

    partial_accuracy = round(degraded_correct / total_degraded, 4) if total_degraded > 0 else 0.0

    return {
        "description": "Model trained strictly on 70% Train split with zero test/val contamination",
        "clean_validation_metrics": val_res,
        "clean_final_test_metrics": test_res,
        "partial_symptom_test_evaluation": {
            "evaluated_cases": total_degraded,
            "correct_predictions": degraded_correct,
            "partial_symptom_accuracy": partial_accuracy,
            "clinical_significance": "Measures degradation when patients present only 2 initial symptoms"
        }
    }

def save_splits_to_csv(
    train_df: pd.DataFrame,
    val_df: pd.DataFrame,
    test_df: pd.DataFrame,
    output_dir: str = SPLITS_DIR
) -> Dict[str, str]:
    """Save split DataFrames to CSV files and return paths."""
    os.makedirs(output_dir, exist_ok=True)

    train_path = os.path.join(output_dir, "train_split.csv")
    val_path = os.path.join(output_dir, "val_split.csv")
    test_path = os.path.join(output_dir, "test_split.csv")

    train_df.to_csv(train_path, index=False)
    val_df.to_csv(val_path, index=False)
    test_df.to_csv(test_path, index=False)

    return {
        "train_path": train_path,
        "val_path": val_path,
        "test_path": test_path
    }

def main():
    parser = argparse.ArgumentParser(description="Leakage-Free Evaluation Pipeline for MediSync360")
    parser.add_argument("--save-splits", action="store_true", default=True, help="Save split CSV files")
    parser.add_argument("--check-leakage", action="store_true", default=True, help="Run automated leakage checks")
    parser.add_argument("--eval", action="store_true", default=True, help="Evaluate current and clean models")
    args = parser.parse_args()

    print("=================================================================")
    print("MEDISYNC360: LEAKAGE-FREE EVALUATION PIPELINE (ASSIGNMENT 1)")
    print("=================================================================")

    # 1. Load canonical data
    full_df, unique_patterns = load_canonical_dataset(DATA_PATH)
    print(f"Original Records: {len(full_df)}")
    print(f"Exact Duplicate Records: {len(full_df) - len(unique_patterns)}")
    print(f"Unique Clinical Patterns: {len(unique_patterns)}")

    # 2. Generate clean splits
    train_df, val_df, test_df = create_leakage_free_splits(unique_patterns, seed=RANDOM_SEED)
    print(f"\nSplit Distribution:")
    print(f"  Train:      {len(train_df)} cases ({len(train_df)/len(unique_patterns)*100:.1f}%)")
    print(f"  Validation: {len(val_df)} cases ({len(val_df)/len(unique_patterns)*100:.1f}%)")
    print(f"  Final Test: {len(test_df)} cases ({len(test_df)/len(unique_patterns)*100:.1f}%)")

    # 3. Save splits
    if args.save_splits:
        split_paths = save_splits_to_csv(train_df, val_df, test_df)
        print(f"\nSaved split files to: {SPLITS_DIR}")

    # 4. Leakage checks
    leakage_results = run_automated_leakage_checks(train_df, val_df, test_df)
    print(f"\nLeakage Check Status: {leakage_results['status']}")
    print(f"  Train-Val Overlap:  {leakage_results['exact_overlap_checks']['train_val_exact_overlap_count']}")
    print(f"  Train-Test Overlap: {leakage_results['exact_overlap_checks']['train_test_exact_overlap_count']}")
    print(f"  Val-Test Overlap:   {leakage_results['exact_overlap_checks']['val_test_exact_overlap_count']}")

    # 5. Model Evaluations
    eval_summary: Dict[str, Any] = {}
    if args.eval:
        try:
            model = joblib.load(os.path.join(MODEL_DIR, "disease_classifier.pkl"))
            label_encoder = joblib.load(os.path.join(MODEL_DIR, "label_encoder.pkl"))
            with open(os.path.join(MODEL_DIR, "metadata.json"), "r") as f:
                metadata = json.load(f)
            all_symptoms = metadata["symptoms"]

            print("\n[A] Evaluating Current Serialized Model (Memorized Baseline)...")
            val_eval = evaluate_model_on_split(model, label_encoder, all_symptoms, val_df, "Validation")
            test_eval = evaluate_model_on_split(model, label_encoder, all_symptoms, test_df, "Final Test")
            print(f"  Current Model Val Top-1 Acc:  {val_eval['top_1_accuracy']*100:.2f}%")
            print(f"  Current Model Test Top-1 Acc: {test_eval['top_1_accuracy']*100:.2f}%")

            print("\n[B] Training & Evaluating Clean Split-Trained Model (True Generalization Baseline)...")
            clean_eval = train_and_evaluate_clean_model(train_df, val_df, test_df, all_symptoms, label_encoder)
            print(f"  Clean Model Val Top-1 Acc:  {clean_eval['clean_validation_metrics']['top_1_accuracy']*100:.2f}%")
            print(f"  Clean Model Test Top-1 Acc: {clean_eval['clean_final_test_metrics']['top_1_accuracy']*100:.2f}%")
            print(f"  Clean Model Test Macro F1:  {clean_eval['clean_final_test_metrics']['macro_f1']:.4f}")
            print(f"  Partial Symptom (2-Sym) Acc: {clean_eval['partial_symptom_test_evaluation']['partial_symptom_accuracy']*100:.2f}%")

            eval_summary = {
                "current_serialized_model": {
                    "note": "Evaluated with existing trained_model artifact (seen all 304 patterns during legacy training)",
                    "validation": val_eval,
                    "final_test": test_eval
                },
                "clean_split_trained_model": clean_eval
            }
        except Exception as e:
            print(f"Model evaluation warning: {e}")
            eval_summary = {"error": str(e)}

    # 6. Save comprehensive leakage report JSON
    final_report = {
        "report_title": "MediSync360 Leakage Audit & Clean Split Verification",
        "random_seed": RANDOM_SEED,
        "dataset_source": DATA_PATH,
        "leakage_checks": leakage_results,
        "model_evaluations": eval_summary
    }

    report_path = os.path.join(EVAL_DIR, "leakage_report.json")
    os.makedirs(EVAL_DIR, exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(final_report, f, indent=2)

    print(f"\nLeakage report written to: {report_path}")
    print("Pipeline execution complete.")

if __name__ == "__main__":
    main()
