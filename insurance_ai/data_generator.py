"""
Synthetic Dataset Generator — MediSync360 Insurance AI
Generates 500 rows of realistic insurance claim training data.
"""

import random
import pandas as pd
import numpy as np
from rules import INSURANCE_RULES, PRE_EXISTING_DISEASES, DISEASE_RISK_MAP

random.seed(42)
np.random.seed(42)

COMPANIES = list(INSURANCE_RULES.keys())
DISEASES = list(DISEASE_RISK_MAP.keys())
TREATMENT_TYPES = ["surgery", "medical management", "daycare", "icu", "emergency"]


def generate_dataset(n: int = 500) -> pd.DataFrame:
    records = []

    for _ in range(n):
        company = random.choice(COMPANIES)
        rules = INSURANCE_RULES[company]
        disease = random.choice(DISEASES)
        treatment = random.choice(TREATMENT_TYPES)

        age = random.randint(18, 80)
        sum_insured = random.choice([300000, 500000, 700000, 1000000, 1500000])
        waiting_completed = random.choice([0, 1])
        network_hospital = random.choice([0, 1])

        # Bill components (in ₹)
        room_rent = random.randint(1000, 15000)
        surgery_cost = random.randint(0, 200000) if treatment in ["surgery", "icu", "emergency"] else 0
        medicines = random.randint(2000, 50000)
        diagnostics = random.randint(1000, 30000)
        total_claimed = room_rent + surgery_cost + medicines + diagnostics

        # ─── Rule-based approval logic ─────────────────────────────────────
        base_prob = rules["base_approval_rate"]
        disease_risk = DISEASE_RISK_MAP.get(disease, 0.85)

        # Waiting period check
        is_pre_existing = disease.lower() in [d.lower() for d in PRE_EXISTING_DISEASES]
        if is_pre_existing and not waiting_completed:
            base_prob *= 0.30   # Heavy penalty

        # Network hospital boost/penalty
        if not network_hospital:
            base_prob *= (1 - rules["non_network_penalty_pct"] / 100)
        else:
            base_prob *= 1.05

        # Sum insured adequacy
        if total_claimed > sum_insured:
            base_prob *= 0.50
        elif total_claimed > sum_insured * 0.80:
            base_prob *= 0.80

        # Room rent cap check
        daily_room_limit = sum_insured * rules["room_rent_limit_pct"] / 100
        if room_rent > daily_room_limit * 1.5:
            base_prob *= 0.90

        # Disease risk
        base_prob *= disease_risk

        # Age factor (older → slightly higher risk of partial denial)
        if age > 60:
            base_prob *= 0.92
        elif age < 25:
            base_prob *= 1.02

        final_prob = min(base_prob, 0.99)
        approved = 1 if random.random() < final_prob else 0

        records.append({
            "age": age,
            "disease": disease,
            "treatment_type": treatment,
            "company": company,
            "sum_insured": sum_insured,
            "waiting_completed": waiting_completed,
            "network_hospital": network_hospital,
            "room_rent": room_rent,
            "surgery_cost": surgery_cost,
            "medicines": medicines,
            "diagnostics": diagnostics,
            "total_claimed": total_claimed,
            "approved": approved,
            "true_probability": round(final_prob, 4),
        })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    df = generate_dataset(500)
    df.to_csv("insurance_ai/training_data.csv", index=False)
    print(f"✅ Generated {len(df)} rows. Approval rate: {df['approved'].mean():.2%}")
    print(df.head())
