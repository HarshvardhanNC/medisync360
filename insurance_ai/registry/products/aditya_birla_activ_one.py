"""
Product definition for Aditya Birla Activ One.
Verified from official Policy Document: UIN ADIHLIP24097V012324.
"""
from domain.models import ProductPolicy, RoomEntitlement, WaitingPeriodRule, ProcedureSublimit
from domain.status import RoomCategory
from registry.source_registry import get_citation

def get_aditya_birla_activ_one_policy() -> ProductPolicy:
    room_citation = get_citation("Aditya Birla", "room_rent")
    wp_citation = get_citation("Aditya Birla", "waiting_periods")

    return ProductPolicy(
        company_id="aditya_birla",
        insurer_name="Aditya Birla Health Insurance Co. Limited",
        product_name="Activ One",
        variant="Activ One MAX",
        uin="ADIHLIP24097V012324",
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
            maternity_waiting_months=24,
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
        restoration_benefit=True,
        cumulative_bonus_pct=50.0,
        source_citations=[room_citation, wp_citation],
    )

