"""
ML Model — MediSync360 Insurance Claim Intelligence System
Trains a Logistic Regression classifier on synthetic data and exposes
a predict() function used by the Flask API.
"""

import os
import pickle
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder

# ── Paths ──────────────────────────────────────────────────────────────────
MODEL_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(MODEL_DIR, "claim_model.pkl")

CATEGORICAL_FEATURES = ["disease", "treatment_type", "company"]
NUMERICAL_FEATURES   = [
    "age", "sum_insured", "waiting_completed",
    "network_hospital", "total_claimed",
]
ALL_FEATURES = NUMERICAL_FEATURES + CATEGORICAL_FEATURES


# ── Train ──────────────────────────────────────────────────────────────────
def train_model(df: pd.DataFrame = None) -> dict:
    """Train model on provided dataframe (or generate data if none given)."""
    if df is None:
        from data_generator import generate_dataset
        df = generate_dataset(500)

    X = df[ALL_FEATURES]
    y = df["approved"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), NUMERICAL_FEATURES),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), CATEGORICAL_FEATURES),
        ]
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", LogisticRegression(max_iter=1000, random_state=42, C=1.0)),
    ])

    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, output_dict=True)

    # Persist
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(pipeline, f)

    print(f"✅ Model trained — Accuracy: {acc:.2%}")
    print(classification_report(y_test, y_pred))
    return {"accuracy": acc, "report": report}


# ── Load ───────────────────────────────────────────────────────────────────
def load_model():
    if not os.path.exists(MODEL_PATH):
        print("⚠️  No saved model found — training now...")
        train_model()
    with open(MODEL_PATH, "rb") as f:
        return pickle.load(f)


# ── Predict ────────────────────────────────────────────────────────────────
def predict(payload: dict) -> float:
    """
    Returns approval probability (0.0 – 1.0) for a claim.

    Expected keys:
        age, disease, treatment_type, company,
        sum_insured, waiting_completed, network_hospital,
        room_rent, surgery_cost, medicines, diagnostics,
        ot_charges, blood_bank, miscellaneous
    """
    model = load_model()

    total_claimed = (
        payload.get("room_rent", 0)
        + payload.get("surgery_cost", 0)
        + payload.get("medicines", 0)
        + payload.get("diagnostics", 0)
        + payload.get("ot_charges", 0)
        + payload.get("blood_bank", 0)
        + payload.get("miscellaneous", 0)
    )

    row = pd.DataFrame([{
        "age":                payload["age"],
        "disease":            payload["disease"].lower(),
        "treatment_type":     payload["treatment_type"].lower(),
        "company":            payload["company"],
        "sum_insured":        payload["sum_insured"],
        "waiting_completed":  int(payload["waiting_completed"]),
        "network_hospital":   int(payload["network_hospital"]),
        "total_claimed":      total_claimed,
    }])

    prob = model.predict_proba(row)[0][1]
    return round(float(prob), 4)


# ── Entrypoint ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    stats = train_model()
    print("Model saved to:", MODEL_PATH)
