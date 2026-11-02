"""
Product definition for Star Health Comprehensive Insurance Policy.
Verified from official Policy Wording: UIN SHAHLIP26044V092526 / SHAHLIP22028V072122.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_star_comprehensive_policy() -> ProductPolicy:
    room_citation = get_citation("Star Health", "room_rent")
    wp_citation = get_citation("Star Health", "waiting_periods")
    mat_citation = get_citation("Star Health", "maternity")

    return ProductPolicy(
        company_id="star",
        insurer_name="Star Health and Allied Insurance Company Limited",
        product_name="Star Comprehensive Insurance Policy",
        variant="Comprehensive (Individual/Floater)",
        uin="SHAHLIP26044V092526",
        wording_version="2024.2",
        room_entitlement=RoomEntitlement(
            category=RoomCategory.SINGLE_PRIVATE_AC,
            per_day_limit_pct=None,
            icu_per_day_limit_pct=None,
            icu_absolute_cap=None,
            applies_proportionate_deduction=True,  # Applies if room higher than Single Private AC occupied
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
                cap_value=50000.0,
                per_eye=True,
                citation=room_citation,
            ),
            "maternity": ProcedureSublimit(
                procedure_name="maternity",
                cap_type="ABSOLUTE",
                cap_value=50000.0,
                per_eye=False,
                citation=mat_citation,
            ),
            "bariatric surgery": ProcedureSublimit(
                procedure_name="bariatric surgery",
                cap_type="ABSOLUTE",
                cap_value=250000.0,
                per_eye=False,
                citation=wp_citation,
            ),
        },
        standard_copay_pct=0.0,
        age_copay_bands={65: 10.0},  # Co-pay of 10% for entry age over 65
        mandatory_deductible=0.0,
        pre_hospitalization_days=60,
        post_hospitalization_days=90,
        ayush_covered_upto_si=True,
        daycare_covered=True,
        modern_treatments_covered_upto_si=True,
        restoration_benefit=True,
        cumulative_bonus_pct=50.0,
        source_citations=[room_citation, wp_citation, mat_citation],
    )

