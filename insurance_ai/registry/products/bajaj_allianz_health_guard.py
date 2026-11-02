"""
Product definition for Bajaj Allianz Health Guard.
Verified from official Policy Wordings: UIN BAJHLIP21560V042021 / BAJHLIP22023V022122.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_bajaj_allianz_health_guard_policy() -> ProductPolicy:
    room_citation = get_citation("Bajaj Allianz", "room_rent")
    wp_citation = get_citation("Bajaj Allianz", "waiting_periods")

    return ProductPolicy(
        company_id="bajaj",
        insurer_name="Bajaj Allianz General Insurance Company Limited",
        product_name="Health Guard",
        variant="Gold / Platinum",
        uin="BAJHLIP21560V042021",
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
            maternity_waiting_months=72,
            citation=wp_citation,
        ),
        procedure_sublimits={
            "cataract": ProcedureSublimit(
                procedure_name="cataract",
                cap_type="ABSOLUTE",
                cap_value=40000.0,
                per_eye=True,
                citation=room_citation,
            ),
        },
        standard_copay_pct=0.0,
        age_copay_bands={},
        mandatory_deductible=0.0,
        pre_hospitalization_days=60,
        post_hospitalization_days=90,
        ayush_covered_upto_si=True,
        daycare_covered=True,
        modern_treatments_covered_upto_si=True,
        restoration_benefit=True,
        cumulative_bonus_pct=10.0,
        source_citations=[room_citation, wp_citation],
    )

