"""
Expense Classifier — MediSync360.
Classifies bill items into Room, ICU, Nursing, Doctor/Surgeon, OT, Medicines, Diagnostics,
Implants, Ambulance, and Non-Medical Items according to IRDAI Guidelines.
Supports Consumables Cover / Safeguard Rider to reimburse non-medical items.
"""
from typing import List, Tuple
from domain.models import BillItem, ItemDeduction, PolicyCheckResult
from domain.status import ExpenseCategory, ItemCoverageStatus
from domain.irdai_expenses import is_irdai_non_payable


def classify_and_filter_expenses(
    items: List[BillItem],
    has_consumables_cover: bool = False,
) -> Tuple[List[BillItem], List[ItemDeduction], List[PolicyCheckResult], float, float, float]:
    """
    Evaluates item admissibility against the IRDAI Non-Medical Expenses list.
    Supports Consumables Cover (Safeguard / Shield) rider.
    Returns:
        classified_items: updated list with statuses and allowed amounts
        deductions: list of item deductions made
        checks: policy checks for consumable coverage
        total_admissible_initial: admissible expense total before sub-limits/co-pay
        total_non_payable: total non-payable deductions
        consumables_waived: amount saved by consumables rider
    """
    classified: List[BillItem] = []
    deductions: List[ItemDeduction] = []
    checks: List[PolicyCheckResult] = []
    total_admissible = 0.0
    total_non_payable = 0.0
    consumables_waived = 0.0

    for item in items:
        claimed = item.claimed_amount
        name = item.name.strip().lower()

        # Check against IRDAI Non-Medical Consumables
        is_consumable = is_irdai_non_payable(name) or item.category in [
            ExpenseCategory.NON_MEDICAL_ITEMS,
            ExpenseCategory.CONSUMABLES,
        ]

        if is_consumable:
            if has_consumables_cover:
                # Covered under Consumables Add-on (Safeguard / Shield)
                item.status = ItemCoverageStatus.COVERED
                item.allowed_amount = claimed
                item.deducted_amount = 0.0
                item.deduction_reason = "Covered under Consumables Cover (Safeguard/Shield Rider)."
                item.clause_reference = "Consumables Benefit Rider"
                total_admissible += claimed
                consumables_waived += claimed
            else:
                item.status = ItemCoverageStatus.NOT_COVERED
                item.allowed_amount = 0.0
                item.deducted_amount = claimed
                item.deduction_reason = "Excluded as Non-Medical item / Consumable under IRDAI Non-Payables Guidelines."
                item.clause_reference = "IRDAI Guidelines on Standardization - List of Non-Medical Expenses"

                deductions.append(ItemDeduction(
                    item=item.name,
                    claimed=claimed,
                    allowed=0.0,
                    deducted=claimed,
                    reason=item.deduction_reason,
                    clause=item.clause_reference,
                ))
                total_non_payable += claimed
        else:
            item.status = ItemCoverageStatus.COVERED
            item.allowed_amount = claimed
            item.deducted_amount = 0.0
            total_admissible += claimed

        classified.append(item)

    if has_consumables_cover and consumables_waived > 0:
        checks.append(PolicyCheckResult(
            factor="Consumables Cover Rider",
            status="Active (100% Reimbursed)",
            impact="Positive",
            detail=f"Consumables Cover rider active. ₹{consumables_waived:,.0f} of non-medical consumables approved for reimbursement.",
            clause="Consumables Benefit Rider Clause",
        ))

    return classified, deductions, checks, total_admissible, total_non_payable, consumables_waived
