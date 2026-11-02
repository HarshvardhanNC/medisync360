"""
Legacy Adapter — MediSync360.
Translates legacy flat JSON payloads from the frontend/Express proxy to the new
strongly typed ClaimInput, invokes calculate_claim(), and formats the response for backward compatibility.
Now supports advanced parameters: Length of Stay, Room Category, Consumables Cover,
PED Buyback, Room Waiver, Implants, Ambulance, and Restoration Benefit.
"""
from typing import Dict, Any, List
from domain.models import ClaimInput, BillItem, CalculationResult
from domain.status import ExpenseCategory, RoomCategory, CalculationStatus
from engine.pipeline import calculate_claim


def adapt_legacy_payload_to_claim(payload: Dict[str, Any]) -> ClaimInput:
    """Converts legacy/rich dictionary into domain ClaimInput with BillItems."""
    company = payload.get("company", "Star Health")
    disease = payload.get("disease", "Other")
    treatment = payload.get("treatment_type", "Medical Management")
    age = int(payload.get("age", 40) or 40)
    si = float(payload.get("sum_insured", 500000) or 500000)
    remaining_si = float(payload["remaining_sum_insured"]) if payload.get("remaining_sum_insured") is not None and str(payload.get("remaining_sum_insured")).strip() != "" else None
    is_network = bool(payload.get("network_hospital", True))
    waiting_done = bool(payload.get("waiting_completed", True))

    # Continuous coverage months
    if "continuous_coverage_months" in payload and payload["continuous_coverage_months"] is not None and str(payload["continuous_coverage_months"]).strip() != "":
        continuous_months = int(payload["continuous_coverage_months"])
    else:
        continuous_months = 36 if waiting_done else 0

    # Length of Stay (days)
    if "length_of_stay_days" in payload and payload["length_of_stay_days"] is not None and str(payload["length_of_stay_days"]).strip() != "":
        los = max(1, int(payload["length_of_stay_days"]))
    else:
        # Heuristic estimation if omitted
        room_val = float(payload.get("room_rent", 0) or 0)
        if room_val > 15000:
            los = max(2, int(room_val / 5000))
        elif room_val > 5000:
            los = max(1, int(room_val / 4000))
        else:
            los = 1

    # Room Category Occupied
    room_cat_str = str(payload.get("room_category_occupied", "SINGLE_PRIVATE_AC")).strip().upper()
    if "ANY" in room_cat_str or "DELUXE" in room_cat_str or "SUITE" in room_cat_str:
        room_cat = RoomCategory.ANY_ROOM
    elif "TWIN" in room_cat_str or "SHARING" in room_cat_str:
        room_cat = RoomCategory.TWIN_SHARING
    elif "WARD" in room_cat_str or "GENERAL" in room_cat_str:
        room_cat = RoomCategory.GENERAL_WARD
    else:
        room_cat = RoomCategory.SINGLE_PRIVATE_AC

    # Riders
    has_consumables = bool(payload.get("has_consumables_cover", False))
    has_ped_buyback = bool(payload.get("has_ped_buyback_rider", False))
    has_room_waiver = bool(payload.get("has_room_waiver_rider", False))
    city_zone = str(payload.get("treatment_city_zone", "Zone 1"))

    bill_items: List[BillItem] = []

    def add_if_present(key: str, name: str, cat: ExpenseCategory):
        val = float(payload.get(key, 0) or 0)
        if val > 0:
            bill_items.append(BillItem(
                item_id=key,
                name=name,
                category=cat,
                claimed_amount=val,
                allowed_amount=val,
                deducted_amount=0.0,
            ))

    add_if_present("room_rent", "Room Rent & Boarding", ExpenseCategory.ROOM_RENT)
    add_if_present("surgery_cost", "Surgery / Procedure Charges", ExpenseCategory.SURGEON_FEES)
    add_if_present("medicines", "Inpatient Pharmacy & Medicines", ExpenseCategory.MEDICINES)
    add_if_present("diagnostics", "Diagnostic & Laboratory Tests", ExpenseCategory.DIAGNOSTICS)
    add_if_present("ot_charges", "Operation Theatre Charges", ExpenseCategory.OPERATION_THEATRE)
    add_if_present("blood_bank", "Blood Transfusion & Blood Bank", ExpenseCategory.BLOOD_BANK)
    add_if_present("implants_cost", "Implants / Stents / Medical Devices", ExpenseCategory.IMPLANTS)
    add_if_present("ambulance_cost", "Road Ambulance Charges", ExpenseCategory.AMBULANCE)
    add_if_present("miscellaneous", "Non-Medical Items / Consumables", ExpenseCategory.NON_MEDICAL_ITEMS)

    return ClaimInput(
        company_name=company,
        product_name=payload.get("product_name"),
        uin=payload.get("uin"),
        patient_age=age,
        admitting_diagnosis=disease,
        treatment_type=treatment,
        sum_insured=si,
        remaining_sum_insured=remaining_si,
        length_of_stay_days=los,
        is_network_hospital=is_network,
        is_cashless=is_network,
        room_category_occupied=room_cat,
        continuous_coverage_months=continuous_months,
        is_declared_ped=not waiting_done,
        has_consumables_cover=has_consumables,
        has_ped_buyback_rider=has_ped_buyback,
        has_room_waiver_rider=has_room_waiver,
        treatment_city_zone=city_zone,
        bill_items=bill_items,
    )


def adapt_result_to_legacy_response(res: CalculationResult, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Converts modern CalculationResult to the exact legacy response format expected by UI."""
    deductions_fmt = [
        {
            "item": d.item,
            "claimed": round(d.claimed, 2),
            "allowed": round(d.allowed, 2),
            "deducted": round(d.deducted, 2),
            "reason": d.reason,
            "clause": d.clause,
        }
        for d in res.deductions
    ]

    breakdown_fmt = [
        {
            "factor": c.factor,
            "status": c.status,
            "impact": c.impact,
            "detail": c.detail,
            "clause": c.clause,
        }
        for c in res.approval_breakdown
    ]

    prob = res.predictive_approval_probability
    if res.status == CalculationStatus.REJECTED or res.estimated_payable_amount <= 0:
        prob = 0.0

    low_band = round(max(0.0, prob - 0.08), 4)
    high_band = round(min(1.0, prob + 0.08), 4)

    return {
        "status": res.status.value,
        "product_identified": res.product_identified,
        "uin": res.uin,
        "total_claimed_amount": res.total_submitted_bill,
        "approved_amount": res.estimated_payable_amount,
        "eligible_amount": res.estimated_payable_amount,
        "claim_efficiency_pct": res.claim_efficiency_pct,
        "deductions": deductions_fmt,
        "approval_breakdown": breakdown_fmt,
        "final_decision_explanation": res.executive_summary,
        "risk_score": res.predictive_risk_score,
        "risk_tier": res.predictive_risk_tier,
        "recommendations": res.recommendations,
        "approval_probability": prob,
        "confidence_band": {"low": low_band, "high": high_band},
        "source_clauses": res.source_clauses,
        "rules_applied": res.rules_applied,
        # Advanced tracking flags
        "is_restoration_triggered": res.is_restoration_triggered,
        "restoration_amount_applied": res.restoration_amount_applied,
        "consumables_waived_by_rider": res.consumables_waived_by_rider,
        "remaining_sum_insured": res.remaining_sum_insured,
        "metadata": {
            "company": payload.get("company"),
            "disease": payload.get("disease"),
            "sum_insured": payload.get("sum_insured"),
            "network_hospital": payload.get("network_hospital"),
            "waiting_completed": payload.get("waiting_completed"),
            "post_hosp_days": 180,
        },
    }


def execute_claim_evaluation(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Top-level entrypoint for evaluating a claim dict."""
    claim = adapt_legacy_payload_to_claim(payload)
    result = calculate_claim(claim)
    return adapt_result_to_legacy_response(result, payload)
