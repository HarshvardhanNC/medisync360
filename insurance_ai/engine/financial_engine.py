"""
Financial Engine — MediSync360.
Applies the rigorous legal order of financial deductions:
Admissible Expenses -> Ambulance Sub-limit -> Procedure Sub-limits -> Deductibles -> Co-payments -> Restoration -> Sum Insured Capping.
"""
from typing import Tuple, List
from domain.models import ClaimInput, ProductPolicy, ItemDeduction, PolicyCheckResult
from domain.status import ExpenseCategory, ItemCoverageStatus


def apply_financial_rules(
    claim: ClaimInput,
    policy: ProductPolicy,
    admissible_before_financials: float,
    ambulance_item_total: float = 0.0,
) -> Tuple[float, float, float, float, float, float, bool, float, List[ItemDeduction], List[PolicyCheckResult]]:
    """
    Applies Deductible, Co-payment, Ambulance limits, Restoration Benefit, and Sum Insured restrictions in sequence.
    Returns:
        estimated_payable: Final payable amount
        ambulance_deducted: Amount deducted under ambulance cap
        deductible_deducted: Amount deducted under deductible
        copay_deducted: Amount deducted under co-payment
        si_excess_deducted: Amount trimmed by Sum Insured cap
        remaining_si: Remaining available Sum Insured
        is_restoration_triggered: Whether restoration benefit fired
        restoration_amount: Amount restored
        deductions: Deduction records created
        checks: PolicyCheckResult entries for transparency
    """
    deductions: List[ItemDeduction] = []
    checks: List[PolicyCheckResult] = []

    running_amount = max(0.0, admissible_before_financials)
    effective_si = claim.remaining_sum_insured if claim.remaining_sum_insured is not None else claim.sum_insured
    base_si = claim.sum_insured

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 1: Ambulance Charges Sub-limit
    # ─────────────────────────────────────────────────────────────────────────
    ambulance_deducted = 0.0
    if ambulance_item_total > policy.ambulance_sublimit:
        ambulance_deducted = ambulance_item_total - policy.ambulance_sublimit
        running_amount = max(0.0, running_amount - ambulance_deducted)
        deductions.append(ItemDeduction(
            item="Road Ambulance Sub-limit",
            claimed=ambulance_item_total,
            allowed=policy.ambulance_sublimit,
            deducted=ambulance_deducted,
            reason=f"Ambulance charges capped at policy limit of ₹{policy.ambulance_sublimit:,.0f} per hospitalization.",
            clause="Road Ambulance Cover Clause",
        ))
        checks.append(PolicyCheckResult(
            factor="Ambulance Cover",
            status="Capped at Sub-limit",
            impact="Negative",
            detail=f"Ambulance ₹{ambulance_item_total:,.0f} capped at limit ₹{policy.ambulance_sublimit:,.0f}. ₹{ambulance_deducted:,.0f} deducted.",
            clause="Road Ambulance Cover Clause",
        ))
    elif ambulance_item_total > 0:
        checks.append(PolicyCheckResult(
            factor="Ambulance Cover",
            status="Covered",
            impact="Positive",
            detail=f"Ambulance expenses of ₹{ambulance_item_total:,.0f} are within the ₹{policy.ambulance_sublimit:,.0f} limit.",
            clause="Road Ambulance Cover Clause",
        ))

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 2: Annual / Voluntary Deductible
    # ─────────────────────────────────────────────────────────────────────────
    deductible_amount = max(policy.mandatory_deductible, claim.voluntary_deductible)
    deductible_deducted = 0.0

    if deductible_amount > 0:
        if running_amount <= deductible_amount:
            deductible_deducted = running_amount
            running_amount = 0.0
            checks.append(PolicyCheckResult(
                factor="Annual / Voluntary Deductible",
                status="Absorbed by Deductible",
                impact="Negative",
                detail=f"Admissible claim of ₹{admissible_before_financials:,.0f} falls within ₹{deductible_amount:,.0f} deductible. Payable is ₹0.",
                clause="Deductible Clause",
            ))
            deductions.append(ItemDeduction(
                item="Annual Deductible",
                claimed=admissible_before_financials,
                allowed=0.0,
                deducted=deductible_deducted,
                reason=f"Claim absorbed under policy deductible of ₹{deductible_amount:,.0f}.",
                clause="Deductible Clause",
            ))
        else:
            deductible_deducted = deductible_amount
            running_amount -= deductible_amount
            checks.append(PolicyCheckResult(
                factor="Annual / Voluntary Deductible",
                status="Applied",
                impact="Negative",
                detail=f"₹{deductible_amount:,.0f} annual deductible deducted from admissible expenses.",
                clause="Deductible Clause",
            ))
            deductions.append(ItemDeduction(
                item="Annual Deductible",
                claimed=deductible_amount,
                allowed=0.0,
                deducted=deductible_amount,
                reason=f"First ₹{deductible_amount:,.0f} of admissible expenses borne by policyholder as annual deductible.",
                clause="Deductible Clause",
            ))
    else:
        checks.append(PolicyCheckResult(
            factor="Deductible",
            status="Nil",
            impact="Positive",
            detail="No mandatory or voluntary deductible applicable to this claim.",
            clause="Deductible Clause",
        ))

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 3: Co-Payment (Standard + Age + Zone + Opted)
    # ─────────────────────────────────────────────────────────────────────────
    base_copay = policy.standard_copay_pct
    age_copay = 0.0
    for threshold_age, extra in sorted(policy.age_copay_bands.items()):
        if claim.patient_age >= threshold_age:
            age_copay = extra

    zone_copay = 0.0
    if policy.has_zone_copay and claim.treatment_city_zone == "Zone 1":
        zone_copay = policy.zone_copay_pct

    effective_copay_pct = base_copay + age_copay + zone_copay + claim.opted_copay_pct
    copay_deducted = 0.0

    if effective_copay_pct > 0 and running_amount > 0:
        copay_deducted = round(running_amount * (effective_copay_pct / 100.0), 2)
        running_amount = max(0.0, running_amount - copay_deducted)

        copay_desc = f"{effective_copay_pct:.0f}% Co-Pay"
        if age_copay > 0:
            copay_desc += f" (includes {age_copay:.0f}% senior entry co-pay at age {claim.patient_age})"
        if zone_copay > 0:
            copay_desc += f" (includes {zone_copay:.0f}% Zone 1 treatment co-pay)"

        checks.append(PolicyCheckResult(
            factor="Co-Payment Clause",
            status=f"{effective_copay_pct:.0f}% Applied",
            impact="Negative",
            detail=f"Insured bears {effective_copay_pct:.0f}% co-payment (₹{copay_deducted:,.0f}) on net admissible claim.",
            clause="Co-Payment Clause",
        ))
        deductions.append(ItemDeduction(
            item="Co-Payment Share",
            claimed=running_amount + copay_deducted,
            allowed=running_amount,
            deducted=copay_deducted,
            reason=f"Patient cost-sharing under {copay_desc}: ₹{copay_deducted:,.0f}.",
            clause="Co-Payment Clause",
        ))
    else:
        checks.append(PolicyCheckResult(
            factor="Co-Payment Clause",
            status="Nil (0%)",
            impact="Positive",
            detail="Zero co-pay policy. 100% admissible claim reimbursed up to Sum Insured.",
            clause="Co-Payment Clause",
        ))

    # ─────────────────────────────────────────────────────────────────────────
    # Stage 4: Restoration Benefit & Sum Insured Capping
    # ─────────────────────────────────────────────────────────────────────────
    is_restoration_triggered = False
    restoration_amount = 0.0

    # In Indian retail health insurance, Restoration Benefit restores SI exhausted by prior claims.
    # Total admissible amount on any single claim cannot exceed Base Sum Insured (IRDAI Limit of Indemnity).
    if running_amount > effective_si and policy.restoration_benefit and effective_si < base_si:
        deficit = running_amount - effective_si
        restorable_capacity = max(0.0, base_si - effective_si)
        restoration_amount = min(deficit, restorable_capacity)
        if restoration_amount > 0:
            effective_si += restoration_amount
            is_restoration_triggered = True

        checks.append(PolicyCheckResult(
            factor="Sum Insured Restoration Benefit",
            status="Triggered (100% Restored)",
            impact="Positive",
            detail=f"Remaining SI was insufficient. Automatic restoration benefit triggered: ₹{restoration_amount:,.0f} added to available coverage.",
            clause="Automatic Restoration / Reset Benefit Clause",
        ))

    si_excess_deducted = 0.0
    if running_amount > effective_si:
        si_excess_deducted = round(running_amount - effective_si, 2)
        checks.append(PolicyCheckResult(
            factor="Sum Insured Ceiling",
            status="Exceeded SI",
            impact="Negative",
            detail=f"Admissible claim (₹{running_amount:,.0f}) exceeds total available Sum Insured (₹{effective_si:,.0f}). Capped at Sum Insured.",
            clause="Limit of Indemnity Clause",
        ))
        deductions.append(ItemDeduction(
            item="Excess over Sum Insured",
            claimed=running_amount,
            allowed=effective_si,
            deducted=si_excess_deducted,
            reason=f"Claim reaches available Sum Insured cap (₹{effective_si:,.0f}). Excess ₹{si_excess_deducted:,.0f} not payable.",
            clause="Limit of Indemnity Clause",
        ))
        running_amount = effective_si
    else:
        checks.append(PolicyCheckResult(
            factor="Sum Insured Adequacy",
            status="Adequate",
            impact="Positive",
            detail=f"Admissible claim of ₹{running_amount:,.0f} is within available Sum Insured (₹{effective_si:,.0f}).",
            clause="Limit of Indemnity Clause",
        ))

    estimated_payable = round(running_amount, 2)
    new_remaining_si = max(0.0, round(effective_si - estimated_payable, 2))

    return (
        estimated_payable,
        ambulance_deducted,
        deductible_deducted,
        copay_deducted,
        si_excess_deducted,
        new_remaining_si,
        is_restoration_triggered,
        restoration_amount,
        deductions,
        checks,
    )
