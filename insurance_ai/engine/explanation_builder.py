"""
Explanation Builder — MediSync360.
Generates clause-cited executive summaries, recommendations, missing info alerts,
and computes predictive forecasting metrics without impacting financial calculations.
"""
from typing import List, Tuple
from domain.models import ProductPolicy, ItemDeduction, PolicyCheckResult
from domain.status import CalculationStatus


def build_explanation_and_summary(
    status: CalculationStatus,
    policy: ProductPolicy,
    total_bill: float,
    payable: float,
    deductions: List[ItemDeduction],
    checks: List[PolicyCheckResult],
    is_network: bool,
    missing_info: List[str],
) -> Tuple[str, List[str], int, str]:
    """
    Constructs executive summary, recommendations, risk score, and risk tier.
    Returns: (summary, recommendations, risk_score, risk_tier)
    """
    efficiency = round((payable / total_bill * 100), 1) if total_bill > 0 else 0.0

    # 1. Executive Summary
    if status == CalculationStatus.REJECTED:
        reasons = [c.detail for c in checks if c.impact == "Negative"]
        summary = (
            f"Claim Ineligible under {policy.product_name} terms. "
            f"Primary reason: {reasons[0] if reasons else 'Policy waiting periods or admission criteria not met'}. "
            f"Estimated payable amount is ₹0."
        )
    elif status == CalculationStatus.NEEDS_INFORMATION:
        summary = (
            f"Calculation Incomplete — Essential policy details missing: {', '.join(missing_info)}. "
            f"Claim cannot be conclusively calculated without this information."
        )
    elif payable <= 0:
        summary = (
            f"Zero payable amount after contractual policy deductions. "
            f"Total bill ₹{total_bill:,.0f} absorbed by policy sub-limits, deductibles, or non-medical exclusions."
        )
    elif efficiency < 60:
        major_deductions = [d.item for d in deductions[:3]]
        summary = (
            f"Claim approved with substantial contractual deductions ({efficiency}% recoverable). "
            f"Estimated reimbursement: ₹{payable:,.0f} of ₹{total_bill:,.0f} claimed. "
            f"Key reductions: {', '.join(major_deductions)}. "
            f"Pre/post hospitalization expenses covered for {policy.pre_hospitalization_days} days pre "
            f"and {policy.post_hospitalization_days} days post discharge."
        )
    else:
        summary = (
            f"Claim approved with standard deductions ({efficiency}% recoverable). "
            f"Estimated reimbursement: ₹{payable:,.0f} of ₹{total_bill:,.0f} claimed. "
            f"Submit final bills and discharge summary within {policy.post_hospitalization_days} days of discharge."
        )

    # 2. Policy-Grounded Actionable Recommendations
    recommendations: List[str] = []
    if not is_network:
        recommendations.append(
            f"Treatment was at a non-network hospital. File for reimbursement within 30 days of discharge with "
            f"original final bill, receipt, break-up, and discharge summary."
        )

    has_room_cut = any("Room Rent" in d.item or "Proportionate" in d.item for d in deductions)
    if has_room_cut:
        recommendations.append(
            f"Selecting a room within your eligible category ({policy.room_entitlement.category.value.replace('_', ' ')}) "
            f"eliminates proportionate deductions on surgeon, OT, and doctor charges."
        )

    has_sublimit = any("Sub-limit" in d.item for d in deductions)
    if has_sublimit:
        recommendations.append(
            "Negotiate procedure packages with the hospital network before admission to align with policy sub-limits."
        )

    has_non_payable = any("Non-Medical" in d.reason or "IRDAI" in d.reason for d in deductions)
    if has_non_payable:
        recommendations.append(
            "Request the hospital to review billing for consumables and non-medical items (Schedule I) to minimize out-of-pocket costs."
        )

    if not recommendations:
        recommendations.append(
            f"Claim profile is clean. File post-hospitalization bills (valid up to {policy.post_hospitalization_days} days) for follow-up medications."
        )

    # 3. Decoupled Forecasting Risk Metric
    risk_points = 0
    if not is_network:
        risk_points += 15
    if any(c.status == "Failed" for c in checks):
        risk_points += 50
    if any(c.impact == "Negative" for c in checks):
        risk_points += 10 * sum(1 for c in checks if c.impact == "Negative")
    if efficiency < 50 and status != CalculationStatus.REJECTED:
        risk_points += 25

    risk_score = min(100, max(0, risk_points))
    if risk_score >= 60:
        risk_tier = "Critical"
    elif risk_score >= 40:
        risk_tier = "High Risk"
    elif risk_score >= 20:
        risk_tier = "Moderate Risk"
    else:
        risk_tier = "Low Risk"

    return summary, recommendations[:4], risk_score, risk_tier

