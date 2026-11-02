"""
Product definition for Niva Bupa ReAssure 2.0.
Verified from official Policy Terms: UIN NBHHLIP23169V012223 / NBHHLIP27054V032627.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_niva_reassure_policy() -> ProductPolicy:
    room_citation = get_citation("Niva Bupa", "room_rent")
    wp_citation = get_citation("Niva Bupa", "waiting_periods")

    return ProductPolicy(
        company_id="niva",
        insurer_name="Niva Bupa Health Insurance Company Limited",
        product_name="ReAssure 2.0",
        variant="Titanium+ / Platinum+",
        uin="NBHHLIP23169V012223",
        wording_version="2024.1",
        room_entitlement=RoomEntitlement(
            category=RoomCategory.ANY_ROOM,
            per_day_limit_pct=None,
            icu_per_day_limit_pct=None,
            icu_absolute_cap=None,
            applies_proportionate_deduction=False,
            citation=room_citation,
        ),
        waiting_periods=WaitingPeriodRule(
            initial_waiting_days=30,
            specific_disease_months=24,
            pre_existing_disease_months=36,
            maternity_waiting_months=None,
            citation=wp_citation,
        ),
        procedure_sublimits={},
        standard_copay_pct=0.0,
        age_copay_bands={},
        mandatory_deductible=0.0,
        pre_hospitalization_days=60,
        post_hospitalization_days=180,
        ayush_covered_upto_si=True,
        daycare_covered=True,
        modern_treatments_covered_upto_si=True,
        restoration_benefit=True,  # ReAssure benefit (unlimited forever)
        cumulative_bonus_pct=50.0,  # Booster benefit
        source_citations=[room_citation, wp_citation],
    )

