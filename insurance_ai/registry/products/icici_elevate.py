"""
Product definition for ICICI Lombard Elevate.
Verified from official Policy Terms: UIN ICIHLIP24103V012324 / ICIHLIP25026V012425.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_icici_elevate_policy() -> ProductPolicy:
    room_citation = get_citation("ICICI Lombard", "room_rent")
    wp_citation = get_citation("ICICI Lombard", "waiting_periods")

    return ProductPolicy(
        company_id="icici",
        insurer_name="ICICI Lombard General Insurance Company Limited",
        product_name="Elevate",
        variant="Elevate (Base)",
        uin="ICIHLIP24103V012324",
        wording_version="2024.1",
        room_entitlement=RoomEntitlement(
            category=RoomCategory.SINGLE_PRIVATE_AC,
            per_day_limit_pct=None,
            icu_per_day_limit_pct=None,
            icu_absolute_cap=None,
            applies_proportionate_deduction=True,
            citation=room_citation,
        ),
        waiting_periods=WaitingPeriodRule(
            initial_waiting_days=30,
            specific_disease_months=24,
            pre_existing_disease_months=36,
            maternity_waiting_months=24,
            citation=wp_citation,
        ),
        procedure_sublimits={
            "cataract": ProcedureSublimit(
                procedure_name="cataract",
                cap_type="ABSOLUTE",
                cap_value=100000.0,
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
        restoration_benefit=True,  # Reset benefit unlimited
        cumulative_bonus_pct=10.0,
        source_citations=[room_citation, wp_citation],
    )

