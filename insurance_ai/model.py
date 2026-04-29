"""
ML Model — MediSync360 Insurance Claim Intelligence System
Uses Gradient Boosting Classifier on 5000 synthetic rows with 15 engineered
features. Returns approval probability + confidence band (low, mid, high).
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, accuracy_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer

# ── Paths ──────────────────────────────────────────────────────────────────────
MODEL_DIR  = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "claim_model.pkl")

CATEGORICAL_FEATURES = ["disease", "treatment_type", "company"]
NUMERICAL_FEATURES = [
    "age", "sum_insured", "waiting_completed", "network_hospital",
    "total_claimed", "room_rent", "surgery_cost", "medicines",
    "diagnostics", "ot_charges", "blood_bank", "miscellaneous",
    "claim_utilization", "surgery_ratio", "medicines_ratio",
    "disease_risk_score", "is_pre_existing", "age_bucket",
    "co_pay_pct", "waiting_period_years",
]
ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure all derived columns exist on the dataframe."""
    from rules import DISEASE_RISK_MAP, PRE_EXISTING_DISEASES, INSURANCE_RULES
    df = df.copy()
    if "total_claimed" not in df.columns:
        bill_cols = ["room_rent", "surgery_cost", "medicines", "diagnostics",
                     "ot_charges", "blood_bank", "miscellaneous"]
        df["total_claimed"] = df[[c for c in bill_cols if c in df.columns]].sum(axis=1)
    if "claim_utilization" not in df.columns:
        df["claim_utilization"] = (df["total_claimed"] / df["sum_insured"]).round(4)
    if "surgery_ratio" not in df.columns:
        df["surgery_ratio"] = (df.get("surgery_cost", 0) / df["sum_insured"]).round(4)
    if "medicines_ratio" not in df.columns:
        df["medicines_ratio"] = (df.get("medicines", 0) / df["sum_insured"]).round(4)
    if "disease_risk_score" not in df.columns:
        df["disease_risk_score"] = df["disease"].str.lower().map(
            lambda d: DISEASE_RISK_MAP.get(d, 0.85))
    if "is_pre_existing" not in df.columns:
        pre = [d.lower() for d in PRE_EXISTING_DISEASES]
        df["is_pre_existing"] = df["disease"].str.lower().isin(pre).astype(int)
    if "age_bucket" not in df.columns:
        df["age_bucket"] = pd.cut(
            df["age"], bins=[0, 30, 45, 60, 100], labels=[0, 1, 2, 3]
        ).astype(int)
    if "co_pay_pct" not in df.columns:
        df["co_pay_pct"] = df["company"].map(
            lambda c: INSURANCE_RULES.get(c, {}).get("co_pay_pct", 0))
    if "waiting_period_years" not in df.columns:
        df["waiting_period_years"] = df["company"].map(
            lambda c: INSURANCE_RULES.get(c, {}).get("waiting_period_years", 2))
    return df


# ── Train ──────────────────────────────────────────────────────────────────────
def train_model(df: pd.DataFrame = None) -> dict:
    if df is None:
        from data_generator import generate_dataset
        df = generate_dataset(5000)

    df = _build_features(df)

    # Ensure all numeric columns exist (fill 0 for missing bill items)
    for col in NUMERICAL_FEATURES:
        if col not in df.columns:
            df[col] = 0

    X = df[ALL_FEATURES]
    y = df["approved"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.20, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(transformers=[
        ("num", StandardScaler(), NUMERICAL_FEATURES),
        ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
    ])

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", GradientBoostingClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.08,
            subsample=0.85,
            min_samples_leaf=10,
            random_state=42,
        )),
    ])

    pipeline.fit(X_train, y_train)

    y_pred  = pipeline.predict(X_test)
    y_prob  = pipeline.predict_proba(X_test)[:, 1]
    acc     = accuracy_score(y_test, y_pred)
    auc     = roc_auc_score(y_test, y_prob)
    report  = classification_report(y_test, y_pred, output_dict=True)

    # 5-fold cross-val for confidence
    cv_scores = cross_val_score(pipeline, X, y, cv=5, scoring="roc_auc")

    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"GBM Model — Accuracy: {acc:.2%}  AUC: {auc:.4f}")
    print(f"CV AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(classification_report(y_test, y_pred))
    return {"accuracy": acc, "auc": auc, "cv_auc_mean": cv_scores.mean(),
            "cv_auc_std": cv_scores.std(), "report": report}


# ── Load ───────────────────────────────────────────────────────────────────────
def load_model():
    if not os.path.exists(MODEL_PATH):
        print("No saved model found — training now …")
        train_model()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


# ── Predict ────────────────────────────────────────────────────────────────────
def predict(payload: dict) -> dict:
    """
    Returns:
        probability  float   mid-point approval probability
        low          float   conservative estimate (prob - 0.08)
        high         float   optimistic estimate  (prob + 0.08)
    """
    from rules import DISEASE_RISK_MAP, PRE_EXISTING_DISEASES, INSURANCE_RULES

    model = load_model()

    bill_keys = ["room_rent", "surgery_cost", "medicines", "diagnostics",
                 "ot_charges", "blood_bank", "miscellaneous"]
    total_claimed = sum(float(payload.get(k, 0)) for k in bill_keys)
    sum_insured   = float(payload["sum_insured"])
    disease       = payload["disease"].lower()
    company       = payload["company"]
    age           = int(payload["age"])
    surgery_cost  = float(payload.get("surgery_cost", 0))
    medicines     = float(payload.get("medicines", 0))

    rules_for_company = INSURANCE_RULES.get(company, {})

    is_pre_existing = int(disease in [d.lower() for d in PRE_EXISTING_DISEASES])
    age_bucket = 0 if age <= 30 else (1 if age <= 45 else (2 if age <= 60 else 3))

    row = pd.DataFrame([{
        "age":                age,
        "disease":            disease,
        "treatment_type":     payload["treatment_type"].lower(),
        "company":            company,
        "sum_insured":        sum_insured,
        "waiting_completed":  int(payload["waiting_completed"]),
        "network_hospital":   int(payload["network_hospital"]),
        "room_rent":          float(payload.get("room_rent", 0)),
        "surgery_cost":       surgery_cost,
        "medicines":          medicines,
        "diagnostics":        float(payload.get("diagnostics", 0)),
        "ot_charges":         float(payload.get("ot_charges", 0)),
        "blood_bank":         float(payload.get("blood_bank", 0)),
        "miscellaneous":      float(payload.get("miscellaneous", 0)),
        "total_claimed":      total_claimed,
        "claim_utilization":  round(total_claimed / sum_insured, 4) if sum_insured else 0,
        "surgery_ratio":      round(surgery_cost / sum_insured, 4) if sum_insured else 0,
        "medicines_ratio":    round(medicines / sum_insured, 4) if sum_insured else 0,
        "disease_risk_score": DISEASE_RISK_MAP.get(disease, 0.85),
        "is_pre_existing":    is_pre_existing,
        "age_bucket":         age_bucket,
        "co_pay_pct":         rules_for_company.get("co_pay_pct", 0),
        "waiting_period_years": rules_for_company.get("waiting_period_years", 2),
    }])

    prob = float(model.predict_proba(row)[0][1])
    # Simulate confidence band (±8%, clamped)
    low  = round(max(prob - 0.08, 0.0), 4)
    high = round(min(prob + 0.08, 1.0), 4)
    return {"probability": round(prob, 4), "low": low, "high": high}


# ── Entrypoint ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    stats = train_model()
    print("Model saved to:", MODEL_PATH)
