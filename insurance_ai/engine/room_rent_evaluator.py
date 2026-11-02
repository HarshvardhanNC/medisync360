"""
Room Rent & Proportionate Deduction Evaluator — MediSync360.
Evaluates room daily rate, length of stay, room category compliance, ICU limit compliance,
and calculates proportionate deductions on associated medical expenses with official IRDAI exemptions.
"""
from typing import List, Tuple
from domain.models import ClaimInput, ProductPolicy, BillItem, ItemDeduction, PolicyCheckResult
from domain.status import RoomCategory, ExpenseCategory, ItemCoverageStatus


def evaluate_room_rent_and_proportionate_deductions(
    claim: ClaimInput,
    policy: ProductPolicy,
    items: List[BillItem],
) -> Tuple[List[BillItem], List[ItemDeduction], List[PolicyCheckResult], float, float]:
    """
    Evaluates room rent limits and associated proportionate deductions.
    Returns:
        updated_items: Bill items with adjusted allowed/deducted amounts
        deductions: Deduction records created
        checks: PolicyCheckResult entries for transparency
        total_room_excess: Direct room rent deduction amount
        total_proportionate_deduction: Proportionate deduction on associated charges
    """
    deductions: List[ItemDeduction] = []
    checks: List[PolicyCheckResult] = []
    total_room_excess = 0.0
    total_proportionate_deduction = 0.0

    room_rule = policy.room_entitlement
    days = max(claim.length_of_stay_days, 1)
    sum_insured = claim.sum_insured

    # Associated medical expense categories subject to proportionate deductions
    # (Surgeon, Doctor, OT, Nursing)
    ASSOCIATED_CATEGORIES = {
        ExpenseCategory.SURGEON_FEES,
        ExpenseCategory.DOCTOR_CONSULTATION,
        ExpenseCategory.OPERATION_THEATRE,
        ExpenseCategory.NURSING,
    }

    # Locate Room Rent and ICU items
    room_item = next((it for it in items if it.category == ExpenseCategory.ROOM_RENT), None)
    icu_item = next((it for it in items if it.category == ExpenseCategory.ICU_CHARGES), None)

    # ─────────────────────────────────────────────────────────────────────────
    # 1. Room Rent Direct Limit Evaluation
    # ─────────────────────────────────────────────────────────────────────────
    daily_room_limit: float = float("inf")
    is_room_capped = False

    if room_rule.category == RoomCategory.PERCENTAGE_CAP and room_rule.per_day_limit_pct:
        daily_room_limit = sum_insured * room_rule.per_day_limit_pct / 100.0
        is_room_capped = True
    elif room_rule.category == RoomCategory.ANY_ROOM:
        daily_room_limit = float("inf")
        is_room_capped = False
    elif room_rule.category == RoomCategory.SINGLE_PRIVATE_AC:
        # Single Private AC is standard; capping applies only if occupied room is higher (Deluxe/Suite)
        if claim.room_category_occupied in [RoomCategory.ANY_ROOM] and not claim.has_room_waiver_rider:
            # Insured upgraded to Deluxe/Suite room
            is_room_capped = True
            # In single private room policies, benchmark is Single Private AC daily charge
            daily_room_limit = sum_insured * 0.015  # Benchmark 1.5% SI if not explicitly specified

    if room_item and is_room_capped and not claim.has_room_waiver_rider:
        room_claimed = room_item.claimed_amount
        actual_daily_charge = room_claimed / days
        total_eligible_room = daily_room_limit * days

        if room_claimed > total_eligible_room:
            excess = room_claimed - total_eligible_room
            room_item.allowed_amount = total_eligible_room
            room_item.deducted_amount = excess
            room_item.status = ItemCoverageStatus.PARTIALLY_COVERED
            room_item.deduction_reason = (
                f"Room rent of ₹{actual_daily_charge:,.0f}/day exceeds eligible limit of "
                f"₹{daily_room_limit:,.0f}/day ({room_rule.per_day_limit_pct or 1.0}% of SI). "
                f"Excess for {days} day(s) deducted."
            )
            room_item.clause_reference = room_rule.citation.clause_number if room_rule.citation else "Room Rent Capping Clause"

            deductions.append(ItemDeduction(
                item=room_item.name,
                claimed=room_claimed,
                allowed=total_eligible_room,
                deducted=excess,
                reason=room_item.deduction_reason,
                clause=room_item.clause_reference,
            ))
            total_room_excess += excess

            checks.append(PolicyCheckResult(
                factor="Room Rent Cap",
                status="Exceeded (Direct Cap)",
                impact="Negative",
                detail=f"Room rent ₹{actual_daily_charge:,.0f}/day exceeds limit ₹{daily_room_limit:,.0f}/day. ₹{excess:,.0f} deducted.",
                clause=room_item.clause_reference,
            ))

            # ─────────────────────────────────────────────────────────────────
            # 2. Proportionate Deductions on Associated Medical Expenses
            # ─────────────────────────────────────────────────────────────────
            if room_rule.applies_proportionate_deduction:
                # Proportionate deduction ratio = 1 - (Eligible Daily Limit / Actual Daily Rate)
                proportionate_factor = max(0.0, 1.0 - (daily_room_limit / actual_daily_charge))
                
                checks.append(PolicyCheckResult(
                    factor="Proportionate Deduction Clause",
                    status=f"Active ({proportionate_factor * 100:.1f}%)",
                    impact="Negative",
                    detail=(
                        f"Room category violation triggers {proportionate_factor * 100:.1f}% proportionate deduction "
                        f"on associated medical expenses (Surgeon, Doctor, OT, Nursing). "
                        f"Medicines, implants, and diagnostics are explicitly exempted under policy wording."
                    ),
                    clause=room_rule.citation.clause_number if room_rule.citation else "Proportionate Deduction Clause",
                ))

                for it in items:
                    if it.category in ASSOCIATED_CATEGORIES and it.allowed_amount > 0:
                        prop_ded = round(it.allowed_amount * proportionate_factor, 2)
                        if prop_ded > 0:
                            it.deducted_amount += prop_ded
                            it.allowed_amount -= prop_ded
                            it.status = ItemCoverageStatus.PARTIALLY_COVERED
                            it.deduction_reason = (
                                f"Proportionate deduction of {proportionate_factor * 100:.1f}% applied due to room rent breach "
                                f"(₹{actual_daily_charge:,.0f} vs limit ₹{daily_room_limit:,.0f}/day)."
                            )
                            it.clause_reference = "Proportionate Deduction Clause (Associated Medical Expenses)"

                            deductions.append(ItemDeduction(
                                item=f"{it.name} (Proportionate Cut)",
                                claimed=it.claimed_amount,
                                allowed=it.allowed_amount,
                                deducted=prop_ded,
                                reason=it.deduction_reason,
                                clause=it.clause_reference,
                            ))
                            total_proportionate_deduction += prop_ded
        else:
            checks.append(PolicyCheckResult(
                factor="Room Rent Cap",
                status="Passed",
                impact="Positive",
                detail=f"Daily room rent ₹{actual_daily_charge:,.0f}/day within limit ₹{daily_room_limit:,.0f}/day. No proportionate deductions.",
                clause="In-Patient Room Rent Clause",
            ))
    elif room_item:
        checks.append(PolicyCheckResult(
            factor="Room Rent Entitlement",
            status="No Cap / At Actuals",
            impact="Positive",
            detail=f"{policy.product_name} provides room rent at actuals with no sub-limits or proportionate deductions.",
            clause=room_rule.citation.clause_number if room_rule.citation else "Room Rent Clause",
        ))

    # ─────────────────────────────────────────────────────────────────────────
    # 3. ICU Daily Limit Check (No Proportionate Deductions on other items)
    # ─────────────────────────────────────────────────────────────────────────
    if icu_item and room_rule.icu_per_day_limit_pct:
        daily_icu_limit = sum_insured * room_rule.icu_per_day_limit_pct / 100.0
        icu_claimed = icu_item.claimed_amount
        actual_icu_rate = icu_claimed / days
        total_eligible_icu = daily_icu_limit * days

        if icu_claimed > total_eligible_icu:
            icu_excess = icu_claimed - total_eligible_icu
            icu_item.allowed_amount = total_eligible_icu
            icu_item.deducted_amount += icu_excess
            icu_item.status = ItemCoverageStatus.PARTIALLY_COVERED
            icu_item.deduction_reason = (
                f"ICU charges of ₹{actual_icu_rate:,.0f}/day exceed policy limit of "
                f"₹{daily_icu_limit:,.0f}/day ({room_rule.icu_per_day_limit_pct}% of SI). Excess deducted."
            )
            icu_item.clause_reference = "ICU Daily Limit Clause"

            deductions.append(ItemDeduction(
                item=icu_item.name,
                claimed=icu_claimed,
                allowed=total_eligible_icu,
                deducted=icu_excess,
                reason=icu_item.deduction_reason,
                clause=icu_item.clause_reference,
            ))
            total_room_excess += icu_excess

            checks.append(PolicyCheckResult(
                factor="ICU Daily Cap",
                status="Exceeded",
                impact="Negative",
                detail=f"ICU rate ₹{actual_icu_rate:,.0f}/day exceeds limit ₹{daily_icu_limit:,.0f}/day. ₹{icu_excess:,.0f} deducted.",
                clause="ICU Charges Clause",
            ))
        else:
            checks.append(PolicyCheckResult(
                factor="ICU Daily Cap",
                status="Passed",
                impact="Positive",
                detail=f"ICU charges within policy limit of ₹{daily_icu_limit:,.0f}/day.",
                clause="ICU Charges Clause",
            ))

    return items, deductions, checks, total_room_excess, total_proportionate_deduction

