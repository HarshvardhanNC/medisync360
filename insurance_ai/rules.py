                                                """
Insurance Rules Engine — MediSync360: Insurance Claim Intelligence System
Defines hardcoded policy rules for each supported insurance company.
"""

INSURANCE_RULES: dict = {
    "ICICI Lombard": {
        "company_id": "icici",
        "room_rent_limit_pct": 1.0,          # 1% of sum insured per day
        "co_pay_pct": 10,                     # 10% co-pay on approved amount
        "waiting_period_years": 2,            # 2-year waiting period for pre-existing
        "network_discount_factor": 1.0,       # No extra penalty for non-network
        "non_network_penalty_pct": 20,        # 20% penalty for non-network hospital
        "non_payable_items": [
            "toiletries",
            "telephone charges",
            "attendant charges",
            "vitamin supplements",
            "registration/admission fees",
        ],
        "non_payable_fixed_deduction": 2000,  # Flat ₹2000 for miscellaneous non-payables
        "sub_limits": {
            "diagnostics_pct": 5,             # Diagnostics capped at 5% of sum insured
            "pre_post_hospitalization_days": 30,
        },
        "base_approval_rate": 0.78,
    },

    "HDFC ERGO": {
        "company_id": "hdfc",
        "room_rent_limit_pct": 1.5,           # 1.5% of sum insured per day (more generous)
        "co_pay_pct": 20,                     # 20% co-pay
        "waiting_period_years": 3,            # Stricter — 3-year waiting period
        "network_discount_factor": 1.0,
        "non_network_penalty_pct": 30,        # Heavy 30% penalty for non-network
        "non_payable_items": [
            "ambulance (local)",
            "disposables",
            "toiletries",
            "food for attendant",
            "television charges",
        ],
        "non_payable_fixed_deduction": 2500,
        "sub_limits": {
            "diagnostics_pct": 4,
            "pre_post_hospitalization_days": 60,
        },
        "base_approval_rate": 0.72,
    },

    "Star Health": {
        "company_id": "star",
        "room_rent_limit_pct": 2.0,           # Most generous room rent — 2% of SI
        "co_pay_pct": 0,                      # No co-pay for network hospitals!
        "waiting_period_years": 1,            # Most lenient — 1-year waiting period
        "network_discount_factor": 1.0,
        "non_network_penalty_pct": 15,
        "non_payable_items": [
            "cosmetic treatment",
            "dental (non-accidental)",
            "spectacles/contact lenses",
            "hearing aids",
        ],
        "non_payable_fixed_deduction": 1500,
        "sub_limits": {
            "diagnostics_pct": 6,
            "pre_post_hospitalization_days": 60,
        },
        "base_approval_rate": 0.85,
    },

    "Care Health": {
        "company_id": "care",
        "room_rent_limit_pct": 1.0,
        "co_pay_pct": 15,
        "waiting_period_years": 2,
        "network_discount_factor": 1.0,
        "non_network_penalty_pct": 25,
        "non_payable_items": [
            "registration fees",
            "admission kit",
            "pulse oximeter (consumables)",
            "gloves and syringes (routine)",
            "doctor visit charges beyond policy",
        ],
        "non_payable_fixed_deduction": 2000,
        "sub_limits": {
            "diagnostics_pct": 5,
            "pre_post_hospitalization_days": 45,
        },
        "base_approval_rate": 0.75,
    },
}

# Diseases that typically have extended waiting periods (flagged as pre-existing)
PRE_EXISTING_DISEASES = [
    "diabetes",
    "hypertension",
    "heart disease",
    "asthma",
    "arthritis",
    "kidney disease",
    "chronic kidney disease",
    "thyroid disorder",
    "obesity",
    "sleep apnea",
]

# Disease → base risk multiplier for ML model
DISEASE_RISK_MAP = {
    "diabetes": 0.70,
    "hypertension": 0.72,
    "heart disease": 0.60,
    "asthma": 0.80,
    "arthritis": 0.75,
    "kidney disease": 0.55,
    "chronic kidney disease": 0.52,
    "thyroid disorder": 0.82,
    "obesity": 0.78,
    "sleep apnea": 0.80,
    "fever": 0.95,
    "fracture": 0.90,
    "appendicitis": 0.92,
    "cancer": 0.50,
    "maternity": 0.70,
    "cataract": 0.85,
    "hernia": 0.88,
    "dengue": 0.93,
    "covid-19": 0.88,
    "other": 0.85,
}
