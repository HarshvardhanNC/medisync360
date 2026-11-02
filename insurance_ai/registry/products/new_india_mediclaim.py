"""
Product definition for New India Mediclaim Policy (The New India Assurance Co. Ltd.).
Verified from official Policy Wording: UIN NIAHLIP25040V102425 / NIAHLIP20194V021920.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_new_india_mediclaim_policy() -> ProductPolicy:
    room_citation = get_citation("New India Assurance", "room_rent")
    prop_citation = get_citation("New India Assurance", "proportionate_deduction")
    wp_citation = get_citation("New India Assurance", "waiting_periods")

    return ProductPolicy(
        company_id="newIndia",
        insurer_name="The New India Assurance Company Limited",
        product_name="New India Mediclaim Policy",
        variant="Retail Mediclaim (Revised)",
        uin="NIAHLIP25040V102425",
        wording_version="2024.1",
        room_entitlement=RoomEntitlement(
            category=RoomCategory.PERCENTAGE_CAP,
            per_day_limit_pct=1.0,  # 1.0% of Sum Insured per day (Clause 3.1)
            icu_per_day_limit_pct=2.0,  # 2.0% of Sum Insured per day (Clause 3.1)
            icu_absolute_cap=None,
            applies_proportionate_deduction=True,  # Clause 3.2
            proportionate_exemptions=["medicines", "implants", "stents", "diagnostics"],
            citation=room_citation,
        ),
        waiting_periods=WaitingPeriodRule(
            initial_waiting_days=30,
            specific_disease_months=24,
            pre_existing_disease_months=36,  # Revised to 36 months under IRDAI Master Circular
            maternity_waiting_months=None,
            citation=wp_citation,
        ),
        procedure_sublimits={
            "cataract": ProcedureSublimit(
                procedure_name="cataract",
                cap_type="ABSOLUTE",
                cap_value=50000.0,
                per_eye=True,
                citation=room_citation,
            ),
        },
        standard_copay_pct=0.0,
        age_copay_bands={},
        mandatory_deductible=0.0,
        pre_hospitalization_days=30,
        post_hospitalization_days=60,
        ayush_covered_upto_si=True,  # AYUSH hospitalisation covered
        daycare_covered=True,
        modern_treatments_covered_upto_si=True,
        restoration_benefit=False,
        cumulative_bonus_pct=5.0,
        source_citations=[room_citation, prop_citation, wp_citation],
    )

