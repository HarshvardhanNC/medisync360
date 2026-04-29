"""
Synthetic Dataset Generator — MediSync360 Insurance AI
Generates 5000 rows of realistic insurance claim training data.
"""

import random
import pandas as pd
import numpy as np
from rules import INSURANCE_RULES, PRE_EXISTING_DISEASES, DISEASE_RISK_MAP

random.seed(42)
np.random.seed(42)

COMPANIES = list(INSURANCE_RULES.keys())
DISEASES  = list(DISEASE_RISK_MAP.keys())
TREATMENT_TYPES = ["surgery", "medical management", "daycare", "icu", "emergency"]
SUM_INSURED_OPTIONS = [200000, 300000, 500000, 700000, 1000000, 1500000, 2000000]


def _bill_for_treatment(treatment: str, sum_insured: int) -> dict:
    t = treatment.lower()
    if t == "surgery":
        return dict(
            room_rent=random.randint(3000, 15000),
            surgery_cost=random.randint(30000, min(int(sum_insured * 0.60), 500000)),
            medicines=random.randint(5000, 60000),
            diagnostics=random.randint(3000, 25000),
            ot_charges=random.randint(5000, 50000),
            blood_bank=random.randint(0, 8000),
            miscellaneous=random.randint(1000, 8000),
        )
    elif t == "icu":
        return dict(
            room_rent=random.randint(8000, 30000),
            surgery_cost=random.randint(0, 80000),
            medicines=random.randint(20000, 100000),
            diagnostics=random.randint(10000, 40000),
            ot_charges=random.randint(0, 20000),
            blood_bank=random.randint(2000, 15000),
            miscellaneous=random.randint(3000, 15000),
        )
    elif t == "emergency":
        return dict(
            room_rent=random.randint(2000, 12000),
            surgery_cost=random.randint(0, 100000),
            medicines=random.randint(3000, 40000),
            diagnostics=random.randint(5000, 30000),
            ot_charges=random.randint(0, 15000),
            blood_bank=random.randint(0, 5000),
            miscellaneous=random.randint(1000, 6000),
        )
    elif t == "daycare":
        return dict(
            room_rent=random.randint(500, 3000),
            surgery_cost=random.randint(5000, 60000),
            medicines=random.randint(1000, 15000),
            diagnostics=random.randint(1000, 10000),
            ot_charges=random.randint(2000, 20000),
            blood_bank=0,
            miscellaneous=random.randint(500, 3000),
        )
    else:  # medical management
        return dict(
            room_rent=random.randint(1000, 8000),
            surgery_cost=0,
            medicines=random.randint(5000, 50000),
            diagnostics=random.randint(2000, 20000),
            ot_charges=0,
            blood_bank=0,
            miscellaneous=random.randint(500, 4000),
        )


def generate_dataset(n: int = 5000) -> pd.DataFrame:
    records = []
    for _ in range(n):
        company  = random.choice(COMPANIES)
        rules    = INSURANCE_RULES[company]
        disease  = random.choice(DISEASES)
        treatment = random.choice(TREATMENT_TYPES)
        age      = random.randint(18, 80)
        sum_insured = random.choice(SUM_INSURED_OPTIONS)
        waiting_completed = random.choice([0, 1])
        network_hospital  = random.choice([0, 1])

        bill = _bill_for_treatment(treatment, sum_insured)
        total_claimed = sum(bill.values())

        # Engineered features
        claim_utilization  = round(total_claimed / sum_insured, 4)
        surgery_ratio      = round(bill["surgery_cost"] / sum_insured, 4)
        medicines_ratio    = round(bill["medicines"] / sum_insured, 4)
        disease_risk_score = DISEASE_RISK_MAP.get(disease.lower(), 0.85)
        is_pre_existing    = int(disease.lower() in [d.lower() for d in PRE_EXISTING_DISEASES])
        age_bucket = 0 if age <= 30 else (1 if age <= 45 else (2 if age <= 60 else 3))

        # Rule-based approval logic
        bp = rules["base_approval_rate"]
        if is_pre_existing and not waiting_completed:
            bp *= 0.20
        bp *= (1 - rules["non_network_penalty_pct"] / 100) if not network_hospital else 1.05
        if total_claimed > sum_insured:
            bp *= 0.45
        elif total_claimed > sum_insured * 0.85:
            bp *= 0.75
        if bill["room_rent"] > sum_insured * rules["room_rent_limit_pct"] / 100 * 2:
            bp *= 0.85
        if bill["surgery_cost"] > sum_insured * rules["surgery_sub_limit_pct"] / 100:
            bp *= 0.82
        if bill["medicines"] > sum_insured * rules["medicines_sub_limit_pct"] / 100:
            bp *= 0.90
        if rules["deductible_amount"] > 0 and total_claimed < rules["deductible_amount"] * 2:
            bp *= 0.70
        if bill["blood_bank"] > 0 and not rules["blood_bank_covered"]:
            bp *= 0.93
        icu_cap = rules.get("icu_per_day_limit", 0)
        if treatment == "icu" and icu_cap > 0 and bill["room_rent"] > icu_cap:
            bp *= 0.88
        bp *= disease_risk_score
        if age > 70:   bp *= 0.85
        elif age > 60: bp *= 0.92
        elif age < 25: bp *= 1.03
        if treatment in ["icu", "emergency"]:
            bp *= 0.93
        if disease.lower() == "cancer" and rules["cancer_oncology_limit"] > 0:
            if total_claimed > rules["cancer_oncology_limit"]:
                bp *= 0.65

        effective_co_pay = rules["co_pay_pct"]
        for age_thresh in sorted(rules["age_co_pay_bands"].keys()):
            if age > age_thresh:
                effective_co_pay += rules["age_co_pay_bands"][age_thresh]
        if effective_co_pay > 20:
            bp *= 0.95

        final_prob = min(max(bp, 0.02), 0.99)
        approved   = 1 if random.random() < final_prob else 0

        records.append({
            "age": age, "disease": disease, "treatment_type": treatment,
            "company": company, "sum_insured": sum_insured,
            "waiting_completed": waiting_completed, "network_hospital": network_hospital,
            **bill,
            "total_claimed": total_claimed,
            "claim_utilization": claim_utilization, "surgery_ratio": surgery_ratio,
            "medicines_ratio": medicines_ratio,
            "disease_risk_score": disease_risk_score, "is_pre_existing": is_pre_existing,
            "age_bucket": age_bucket, "co_pay_pct": rules["co_pay_pct"],
            "waiting_period_years": rules["waiting_period_years"],
            "approved": approved, "true_probability": round(final_prob, 4),
        })

    return pd.DataFrame(records)


if __name__ == "__main__":
    df = generate_dataset(5000)
    df.to_csv("training_data.csv", index=False)
    print(f"Generated {len(df)} rows. Approval rate: {df['approved'].mean():.2%}")
    print(df.head(3))
