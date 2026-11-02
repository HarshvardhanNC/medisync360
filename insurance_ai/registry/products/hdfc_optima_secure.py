"""
Product definition for HDFC ERGO my:Optima Secure.
Verified from official Policy Wording: UIN HDFHLIP26058V082526 / HDFHLIP24092V032324.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_hdfc_optima_secure_policy() -> ProductPolicy:
    room_citation = get_citation("HDFC ERGO", "room_rent")
    wp_citation = get_citation("HDFC ERGO", "waiting_periods")

    return ProductPolicy(
        company_id="hdfc",
        insurer_name="HDFC ERGO General Insurance Company Limited",
        product_name="my:Optima Secure",
        variant="Optima Secure (Base)",
        uin="HDFHLIP26058V082526",
        wording_version="2024.1",
        room_entitlement=RoomEntitlement(
            category=RoomCategory.ANY_ROOM,
            per_day_limit_pct=None,  # No room rent cap
            icu_per_day_limit_pct=None,  # No ICU cap
            icu_absolute_cap=None,
            applies_proportionate_deduction=False,
            citation=room_citation,
        ),
        waiting_periods=WaitingPeriodRule(
            initial_waiting_days=30,
            specific_disease_months=24,
            pre_existing_disease_months=36,
            maternity_waiting_months=None,  # Maternity not covered in standard base
            citation=wp_citation,
        ),
        procedure_sublimits={
            "cataract": ProcedureSublimit(
                procedure_name="cataract",
                cap_type="ABSOLUTE",
                cap_value=100000.0,  # Up to SI or generous procedural cap
                per_eye=True,
                citation=room_citation,
            ),
        },
        standard_copay_pct=0.0,
        age_copay_bands={},
        mandatory_deductible=0.0,
        pre_hospitalization_days=60,
        post_hospitalization_days=180,
        ayush_covered_upto_si=True,
        daycare_covered=True,
        modern_treatments_covered_upto_si=True,
        restoration_benefit=True,  # 100% Secure benefit
        cumulative_bonus_pct=50.0,  # Plus benefit: doubles SI in 2 claim-free years
        source_citations=[room_citation, wp_citation],
    )

