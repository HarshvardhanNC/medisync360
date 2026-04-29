"""
Insurance Rules Engine — MediSync360: Insurance Claim Intelligence System
Defines comprehensive policy rules for each supported insurance company.

Rule dimensions per company (15+):
  - room_rent_limit_pct          % of SI per day for room rent
  - surgery_sub_limit_pct        % of SI cap on surgery/procedure
  - icu_per_day_limit            Absolute ₹ cap for ICU per day (0 = no cap)
  - medicines_sub_limit_pct      % of SI cap on IPD medicines
  - ot_charges_sub_limit_pct     % of SI cap on OT charges
  - diagnostics_pct              % of SI cap on diagnostics
  - blood_bank_covered           Whether blood bank charges are covered
  - co_pay_pct                   Standard co-pay %
  - age_co_pay_bands             Extra co-pay % for age brackets
  - waiting_period_years         Pre-existing disease waiting period
  - non_network_penalty_pct      % penalty for non-network hospital
  - non_payable_items            List of excluded item categories
  - non_payable_fixed_deduction  Flat ₹ deduction for consumables/misc
  - deductible_amount            Annual deductible (first ₹X not payable)
  - cancer_oncology_limit        Oncology disease-specific cap (0 = standard SI)
  - maternity_limit              Maternity benefit cap (0 = no maternity cover)
  - pre_hospitalization_days     Pre-hospitalisation expense coverage window
  - post_hospitalization_days    Post-hospitalisation expense coverage window
  - ayush_coverage_pct           % of SI covered for AYUSH treatments
  - daycare_covered              Daycare procedures allowed
  - emergency_room_covered       Emergency room covered without admission
  - annual_bonus_pct             No-claim bonus % added per claim-free year
  - base_approval_rate           Base probability for synthetic data generation
"""

INSURANCE_RULES: dict = {
    # ─────────────────────────────────────────────────────────────────────────
    "ICICI Lombard": {
        "company_id": "icici",
        "room_rent_limit_pct": 1.0,             # 1% of SI/day
        "surgery_sub_limit_pct": 50,            # Surgery capped at 50% of SI
        "icu_per_day_limit": 5000,              # ICU absolute ₹5000/day cap (0 = no cap)
        "medicines_sub_limit_pct": 10,          # Medicines ≤ 10% of SI
        "ot_charges_sub_limit_pct": 5,          # OT ≤ 5% of SI
        "co_pay_pct": 10,                       # 10% co-pay on approved amount
        "age_co_pay_bands": {                   # Additional co-pay by age
            60: 5,                              # age > 60 → +5% co-pay
            70: 10,                             # age > 70 → +10% co-pay
        },
        "waiting_period_years": 2,
        "non_network_penalty_pct": 20,
        "non_payable_items": [
            "toiletries", "telephone charges", "attendant charges",
            "vitamin supplements", "registration/admission fees",
            "personal comfort items", "TV rental",
        ],
        "non_payable_fixed_deduction": 2000,
        "sub_limits": {
            "diagnostics_pct": 5,
            "pre_post_hospitalization_days": 30,
        },
        "deductible_amount": 0,                 # No annual deductible
        "cancer_oncology_limit": 0,             # 0 = covered under standard SI
        "maternity_limit": 50000,               # Maternity capped at ₹50,000
        "pre_hospitalization_days": 30,
        "post_hospitalization_days": 60,
        "ayush_coverage_pct": 0,                # AYUSH not covered
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": True,
        "annual_bonus_pct": 5,                  # 5% bonus per claim-free year
        "base_approval_rate": 0.78,
    },

    # ─────────────────────────────────────────────────────────────────────────
    "HDFC ERGO": {
        "company_id": "hdfc",
        "room_rent_limit_pct": 1.5,             # More generous room rent
        "surgery_sub_limit_pct": 60,
        "icu_per_day_limit": 7500,
        "medicines_sub_limit_pct": 12,
        "ot_charges_sub_limit_pct": 6,
        "co_pay_pct": 20,                       # Higher 20% co-pay
        "age_co_pay_bands": {
            60: 10,                             # age > 60 → +10% extra co-pay
            70: 15,
        },
        "waiting_period_years": 3,              # Strict 3-year waiting period
        "non_network_penalty_pct": 30,          # Heavy 30% non-network penalty
        "non_payable_items": [
            "ambulance (local)", "disposables", "toiletries",
            "food for attendant", "television charges", "bed charges above entitlement",
        ],
        "non_payable_fixed_deduction": 2500,
        "sub_limits": {
            "diagnostics_pct": 4,
            "pre_post_hospitalization_days": 60,
        },
        "deductible_amount": 5000,              # ₹5000 annual deductible
        "cancer_oncology_limit": 200000,        # Oncology capped at ₹2 lakh
        "maternity_limit": 30000,
        "pre_hospitalization_days": 60,
        "post_hospitalization_days": 90,
        "ayush_coverage_pct": 25,               # 25% of SI for AYUSH
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": True,
        "annual_bonus_pct": 10,
        "base_approval_rate": 0.72,
    },

    # ─────────────────────────────────────────────────────────────────────────
    "Star Health": {
        "company_id": "star",
        "room_rent_limit_pct": 2.0,             # Most generous: 2% of SI/day
        "surgery_sub_limit_pct": 70,            # Very generous surgery limit
        "icu_per_day_limit": 0,                 # No ICU per-day cap
        "medicines_sub_limit_pct": 15,
        "ot_charges_sub_limit_pct": 8,
        "co_pay_pct": 0,                        # Zero co-pay for network hospitals!
        "age_co_pay_bands": {
            65: 5,                              # age > 65 only
        },
        "waiting_period_years": 1,              # Shortest: 1-year waiting
        "non_network_penalty_pct": 15,          # Gentler non-network penalty
        "non_payable_items": [
            "cosmetic treatment", "dental (non-accidental)",
            "spectacles/contact lenses", "hearing aids",
        ],
        "non_payable_fixed_deduction": 1500,
        "sub_limits": {
            "diagnostics_pct": 6,
            "pre_post_hospitalization_days": 60,
        },
        "deductible_amount": 0,
        "cancer_oncology_limit": 0,             # Full SI for cancer
        "maternity_limit": 75000,
        "pre_hospitalization_days": 30,
        "post_hospitalization_days": 60,
        "ayush_coverage_pct": 50,               # Best AYUSH coverage: 50% of SI
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": True,
        "annual_bonus_pct": 5,
        "base_approval_rate": 0.85,
    },

    # ─────────────────────────────────────────────────────────────────────────
    "Care Health": {
        "company_id": "care",
        "room_rent_limit_pct": 1.0,
        "surgery_sub_limit_pct": 55,
        "icu_per_day_limit": 6000,
        "medicines_sub_limit_pct": 10,
        "ot_charges_sub_limit_pct": 5,
        "co_pay_pct": 15,
        "age_co_pay_bands": {
            60: 5,
            70: 10,
        },
        "waiting_period_years": 2,
        "non_network_penalty_pct": 25,
        "non_payable_items": [
            "registration fees", "admission kit", "pulse oximeter (consumables)",
            "gloves and syringes (routine)", "doctor visit charges beyond policy",
        ],
        "non_payable_fixed_deduction": 2000,
        "sub_limits": {
            "diagnostics_pct": 5,
            "pre_post_hospitalization_days": 45,
        },
        "deductible_amount": 2500,
        "cancer_oncology_limit": 150000,
        "maternity_limit": 60000,
        "pre_hospitalization_days": 30,
        "post_hospitalization_days": 60,
        "ayush_coverage_pct": 30,
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": True,
        "annual_bonus_pct": 7,
        "base_approval_rate": 0.75,
    },

    # ─────────────────────────────────────────────────────────────────────────
    "Niva Bupa": {
        "company_id": "niva",
        "room_rent_limit_pct": 2.0,             # Matches Star Health room generosity
        "surgery_sub_limit_pct": 65,
        "icu_per_day_limit": 0,                 # No ICU cap
        "medicines_sub_limit_pct": 12,
        "ot_charges_sub_limit_pct": 7,
        "co_pay_pct": 0,                        # No co-pay for under-60
        "age_co_pay_bands": {
            60: 10,                             # age > 60 → 10% co-pay kicks in
            70: 20,
        },
        "waiting_period_years": 2,
        "non_network_penalty_pct": 20,
        "non_payable_items": [
            "toiletries", "slippers", "diaper", "food (attendant)",
            "telephone", "cosmetic treatment",
        ],
        "non_payable_fixed_deduction": 1800,
        "sub_limits": {
            "diagnostics_pct": 6,
            "pre_post_hospitalization_days": 60,
        },
        "deductible_amount": 0,
        "cancer_oncology_limit": 0,
        "maternity_limit": 100000,              # Best maternity: ₹1 lakh
        "pre_hospitalization_days": 60,
        "post_hospitalization_days": 90,
        "ayush_coverage_pct": 40,
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": True,
        "annual_bonus_pct": 10,
        "base_approval_rate": 0.80,
    },

    # ─────────────────────────────────────────────────────────────────────────
    "New India Assurance": {
        "company_id": "newIndia",
        "room_rent_limit_pct": 1.0,
        "surgery_sub_limit_pct": 50,
        "icu_per_day_limit": 4000,              # Strict government insurer caps
        "medicines_sub_limit_pct": 8,           # Conservative medicines cap
        "ot_charges_sub_limit_pct": 4,
        "co_pay_pct": 5,
        "age_co_pay_bands": {
            60: 10,
            70: 20,
        },
        "waiting_period_years": 4,              # Longest waiting period (PSU insurer)
        "non_network_penalty_pct": 10,          # Low non-network penalty (empanelled hospitals)
        "non_payable_items": [
            "diaper", "cosmetics", "vitamins", "hearing aids",
            "spectacles", "dental (non-accidental)",
        ],
        "non_payable_fixed_deduction": 1500,
        "sub_limits": {
            "diagnostics_pct": 4,
            "pre_post_hospitalization_days": 30,
        },
        "deductible_amount": 0,
        "cancer_oncology_limit": 0,
        "maternity_limit": 25000,               # Low maternity benefit
        "pre_hospitalization_days": 30,
        "post_hospitalization_days": 30,
        "ayush_coverage_pct": 50,               # Good AYUSH (govt mandate)
        "daycare_covered": True,
        "emergency_room_covered": True,
        "blood_bank_covered": False,            # Blood bank charges NOT covered
        "annual_bonus_pct": 5,
        "base_approval_rate": 0.70,
    },
}


# ─── Pre-existing Diseases ────────────────────────────────────────────────────
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
    "copd",
    "epilepsy",
    "psoriasis",
    "liver disease",
    "parkinson's disease",
]


# ─── Disease Risk Map ─────────────────────────────────────────────────────────
# Base risk multiplier used by the data generator (higher = more likely approved)
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
    "copd": 0.65,
    "epilepsy": 0.73,
    "psoriasis": 0.82,
    "liver disease": 0.58,
    "parkinson's disease": 0.62,
    "fever": 0.95,
    "fracture": 0.90,
    "appendicitis": 0.92,
    "cancer": 0.50,
    "maternity": 0.70,
    "cataract": 0.85,
    "hernia": 0.88,
    "dengue": 0.93,
    "covid-19": 0.88,
    "pneumonia": 0.89,
    "gallstones": 0.86,
    "piles/hemorrhoids": 0.84,
    "urinary tract infection": 0.92,
    "other": 0.85,
}


# ─── Disease-Specific Policy Overrides ────────────────────────────────────────
# Some diseases trigger alternative coverage logic beyond the base rules.
DISEASE_SPECIFIC_OVERRIDES = {
    "cancer": {
        "note": "Oncology limit applies if cancer_oncology_limit > 0; else standard SI.",
        "requires_special_approval": True,
    },
    "maternity": {
        "note": "Uses maternity_limit instead of SI. Both partners must be covered 9 months.",
        "requires_special_approval": False,
    },
    "chronic kidney disease": {
        "note": "Dialysis sessions covered under daycare; limit = 50% of SI.",
        "requires_special_approval": True,
    },
    "heart disease": {
        "note": "Cardiac procedures may require pre-authorisation. Stent cost capped at MRP.",
        "requires_special_approval": True,
    },
}
