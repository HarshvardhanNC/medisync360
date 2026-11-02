"""
Deterministic Calculation Pipeline — MediSync360 Insurance Engine.
Orchestrates the 11-stage evaluation from claim intake to verified payable calculation and ledger generation.
Enhanced with Consumables Rider, Restoration Benefits, Ambulance sub-limits, and Zone Co-pay.
"""
from typing import List
from domain.models import ClaimInput, CalculationResult, BillItem, ItemDeduction, PolicyCheckResult
from domain.status import CalculationStatus, ExpenseCategory
from engine.validator import validate_claim_input
from engine.policy_resolver import resolve_policy
from engine.eligibility_checker import check_hospitalization_eligibility
from engine.waiting_period_checker import check_waiting_periods
from engine.expense_classifier import classify_and_filter_expenses
from engine.room_rent_evaluator import evaluate_room_rent_and_proportionate_deductions
from engine.sublimit_evaluator import evaluate_procedure_sublimits
from engine.financial_engine import apply_financial_rules
from engine.explanation_builder import build_explanation_and_summary


def calculate_claim(claim: ClaimInput) -> CalculationResult:
    """
    Executes the transparent, deterministic claim calculation pipeline.
    """
    # ── Stage 1: Input Validation ─────────────────────────────────────────────
    is_valid, missing_info, warnings = validate_claim_input(claim)
    if not is_valid:
        return CalculationResult(
            status=CalculationStatus.NEEDS_INFORMATION,
            product_identified="Unknown",
            uin="",
            total_submitted_bill=sum(it.claimed_amount for it in claim.bill_items),
            eligible_expense_amount=0.0,
            excluded_expense_amount=0.0,
            sub_limit_deductions=0.0,
            room_rent_deductions=0.0,
            proportionate_deductions=0.0,
            deductible_deduction=0.0,
            co_payment_deduction=0.0,
            other_applicable_deductions=0.0,
            estimated_payable_amount=0.0,
            remaining_sum_insured=claim.sum_insured,
            claim_efficiency_pct=0.0,
            missing_information=missing_info,
            executive_summary=f"Missing essential claim inputs: {', '.join(missing_info)}.",
        )

    # ── Stage 2: Policy Identification ────────────────────────────────────────
    policy, policy_status, status_msg = resolve_policy(claim)
    if policy_status == CalculationStatus.POLICY_NOT_VERIFIED or not policy:
        return CalculationResult(
            status=CalculationStatus.POLICY_NOT_VERIFIED,
            product_identified=claim.company_name,
            uin="",
            total_submitted_bill=sum(it.claimed_amount for it in claim.bill_items),
            eligible_expense_amount=0.0,
            excluded_expense_amount=0.0,
            sub_limit_deductions=0.0,
            room_rent_deductions=0.0,
            proportionate_deductions=0.0,
            deductible_deduction=0.0,
            co_payment_deduction=0.0,
            other_applicable_deductions=0.0,
            estimated_payable_amount=0.0,
            remaining_sum_insured=claim.sum_insured,
            claim_efficiency_pct=0.0,
            manual_review_requirements=["Requires manual underwriting review for unverified policy."],
            executive_summary=status_msg,
        )

    total_submitted_bill = sum(it.claimed_amount for it in claim.bill_items)
    all_deductions: List[ItemDeduction] = []
    all_checks: List[PolicyCheckResult] = []

    # ── Stage 3: Hospitalization Eligibility Check ────────────────────────────
    hosp_eligible, hosp_checks, hosp_rejections = check_hospitalization_eligibility(claim, policy)
    all_checks.extend(hosp_checks)

    if not hosp_eligible:
        summary, recs, r_score, r_tier = build_explanation_and_summary(
            status=CalculationStatus.REJECTED,
            policy=policy,
            total_bill=total_submitted_bill,
            payable=0.0,
            deductions=[],
            checks=all_checks,
            is_network=claim.is_network_hospital,
            missing_info=[],
        )
        return CalculationResult(
            status=CalculationStatus.REJECTED,
            product_identified=f"{policy.insurer_name} - {policy.product_name}",
            uin=policy.uin,
            total_submitted_bill=total_submitted_bill,
            eligible_expense_amount=0.0,
            excluded_expense_amount=total_submitted_bill,
            sub_limit_deductions=0.0,
            room_rent_deductions=0.0,
            proportionate_deductions=0.0,
            deductible_deduction=0.0,
            co_payment_deduction=0.0,
            other_applicable_deductions=0.0,
            estimated_payable_amount=0.0,
            remaining_sum_insured=claim.sum_insured,
            claim_efficiency_pct=0.0,
            approval_breakdown=all_checks,
            executive_summary=summary,
            recommendations=recs,
            predictive_risk_score=r_score,
            predictive_risk_tier=r_tier,
        )

    # ── Stage 4: Waiting Period Check ─────────────────────────────────────────
    wp_admissible, wp_checks, wp_rejections = check_waiting_periods(claim, policy)
    all_checks.extend(wp_checks)

    if not wp_admissible:
        summary, recs, r_score, r_tier = build_explanation_and_summary(
            status=CalculationStatus.REJECTED,
            policy=policy,
            total_bill=total_submitted_bill,
            payable=0.0,
            deductions=[],
            checks=all_checks,
            is_network=claim.is_network_hospital,
            missing_info=[],
        )
        return CalculationResult(
            status=CalculationStatus.REJECTED,
            product_identified=f"{policy.insurer_name} - {policy.product_name}",
            uin=policy.uin,
            total_submitted_bill=total_submitted_bill,
            eligible_expense_amount=0.0,
            excluded_expense_amount=total_submitted_bill,
            sub_limit_deductions=0.0,
            room_rent_deductions=0.0,
            proportionate_deductions=0.0,
            deductible_deduction=0.0,
            co_payment_deduction=0.0,
            other_applicable_deductions=0.0,
            estimated_payable_amount=0.0,
            remaining_sum_insured=claim.sum_insured,
            claim_efficiency_pct=0.0,
            approval_breakdown=all_checks,
            executive_summary=summary,
            recommendations=recs,
            predictive_risk_score=r_score,
            predictive_risk_tier=r_tier,
        )

    # ── Stage 5: Expense Classification & IRDAI Non-Payables (With Consumables Rider) ──
    (
        classified_items,
        non_payable_deds,
        consumable_checks,
        admissible_init,
        non_payable_total,
        consumables_waived,
    ) = classify_and_filter_expenses(claim.bill_items, has_consumables_cover=claim.has_consumables_cover)
    all_deductions.extend(non_payable_deds)
    all_checks.extend(consumable_checks)

    # ── Stage 6: Room Rent & Proportionate Deductions ─────────────────────────
    (
        room_items,
        room_deds,
        room_checks,
        total_room_excess,
        total_prop_ded,
    ) = evaluate_room_rent_and_proportionate_deductions(claim, policy, classified_items)
    all_deductions.extend(room_deds)
    all_checks.extend(room_checks)

    # ── Stage 7: Procedure Sub-limits ─────────────────────────────────────────
    (
        sublimit_items,
        sublimit_deds,
        sublimit_checks,
        total_sublimit_ded,
    ) = evaluate_procedure_sublimits(claim, policy, room_items)
    all_deductions.extend(sublimit_deds)
    all_checks.extend(sublimit_checks)

    # Total ambulance charges claimed
    ambulance_claimed = sum(
        it.claimed_amount for it in sublimit_items if it.category == ExpenseCategory.AMBULANCE
    )

    # Remaining admissible before deductible & co-payment
    current_admissible = sum(it.allowed_amount for it in sublimit_items)

    # ── Stage 8 & 9: Deductible, Co-pay, Restoration & Sum Insured Capping ───
    (
        estimated_payable,
        ambulance_deducted,
        deductible_amt,
        copay_amt,
        si_excess_amt,
        new_remaining_si,
        is_restoration_triggered,
        restoration_amount,
        fin_deds,
        fin_checks,
    ) = apply_financial_rules(
        claim,
        policy,
        current_admissible,
        ambulance_item_total=ambulance_claimed,
    )
    all_deductions.extend(fin_deds)
    all_checks.extend(fin_checks)

    # ── Stage 10 & 11: Final Aggregation & Explanations ───────────────────────
    total_excluded = (
        non_payable_total + total_room_excess + total_prop_ded +
        total_sublimit_ded + ambulance_deducted + deductible_amt +
        copay_amt + si_excess_amt
    )
    claim_efficiency = round((estimated_payable / total_submitted_bill * 100), 1) if total_submitted_bill > 0 else 0.0

    summary, recommendations, risk_score, risk_tier = build_explanation_and_summary(
        status=CalculationStatus.CALCULATED,
        policy=policy,
        total_bill=total_submitted_bill,
        payable=estimated_payable,
        deductions=all_deductions,
        checks=all_checks,
        is_network=claim.is_network_hospital,
        missing_info=[],
    )

    applied_clauses = list({d.clause for d in all_deductions if d.clause} | {c.clause for c in all_checks if c.clause})

    return CalculationResult(
        status=CalculationStatus.CALCULATED,
        product_identified=f"{policy.insurer_name} - {policy.product_name} ({policy.variant})",
        uin=policy.uin,
        total_submitted_bill=round(total_submitted_bill, 2),
        eligible_expense_amount=round(admissible_init, 2),
        excluded_expense_amount=round(total_excluded, 2),
        sub_limit_deductions=round(total_sublimit_ded, 2),
        room_rent_deductions=round(total_room_excess, 2),
        proportionate_deductions=round(total_prop_ded, 2),
        ambulance_deductions=round(ambulance_deducted, 2),
        deductible_deduction=round(deductible_amt, 2),
        co_payment_deduction=round(copay_amt, 2),
        other_applicable_deductions=round(si_excess_amt, 2),
        estimated_payable_amount=estimated_payable,
        remaining_sum_insured=new_remaining_si,
        claim_efficiency_pct=claim_efficiency,
        is_restoration_triggered=is_restoration_triggered,
        restoration_amount_applied=restoration_amount,
        consumables_waived_by_rider=consumables_waived,
        deductions=all_deductions,
        approval_breakdown=all_checks,
        rules_applied=[f"Verified Product Rule: {policy.product_name} ({policy.uin})"],
        source_clauses=applied_clauses,
        missing_information=[],
        manual_review_requirements=[],
        recommendations=recommendations,
        executive_summary=summary,
        predictive_risk_score=risk_score,
        predictive_risk_tier=risk_tier,
        predictive_approval_probability=round(min(max(claim_efficiency / 100.0, 0.05), 0.98), 4),
    )
