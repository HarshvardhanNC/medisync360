"""
Procedure & Disease Sub-limit Evaluator — MediSync360.
Applies verified sub-limits for specific surgeries/conditions (Cataract, Maternity, Bariatric, etc.)
on remaining admissible surgical and hospital amounts.
"""
from typing import List, Tuple
from domain.models import ClaimInput, ProductPolicy, BillItem, ItemDeduction, PolicyCheckResult
from domain.status import ExpenseCategory, ItemCoverageStatus


def evaluate_procedure_sublimits(
    claim: ClaimInput,
    policy: ProductPolicy,
    items: List[BillItem],
) -> Tuple[List[BillItem], List[ItemDeduction], List[PolicyCheckResult], float]:
    """
    Evaluates disease and procedure sub-limits against admissible expenses.
    Returns: (updated_items, deductions, checks, total_sublimit_deductions)
    """
    deductions: List[ItemDeduction] = []
    checks: List[PolicyCheckResult] = []
    total_sublimit_deductions = 0.0

    diagnosis = claim.admitting_diagnosis.strip().lower()

    for proc_name, sublimit in policy.procedure_sublimits.items():
        if proc_name in diagnosis:
            cap_limit = sublimit.cap_value
            if sublimit.cap_type == "PERCENTAGE_SI":
                cap_limit = claim.sum_insured * sublimit.cap_value / 100.0

            # Sum of currently admissible expenses directly associated with procedure
            admissible_procedure_total = sum(
                it.allowed_amount for it in items
                if it.category in [ExpenseCategory.SURGEON_FEES, ExpenseCategory.OPERATION_THEATRE]
            )

            if admissible_procedure_total > cap_limit:
                excess = admissible_procedure_total - cap_limit
                total_sublimit_deductions += excess

                # Prorate deduction across surgical/OT items
                for it in items:
                    if it.category in [ExpenseCategory.SURGEON_FEES, ExpenseCategory.OPERATION_THEATRE] and it.allowed_amount > 0:
                        item_share = excess * (it.allowed_amount / admissible_procedure_total)
                        it.allowed_amount -= item_share
                        it.deducted_amount += item_share
                        it.status = ItemCoverageStatus.SUBJECT_TO_SUBLIMIT

                reason = (
                    f"Procedure '{proc_name.title()}' is subject to policy sub-limit of "
                    f"₹{cap_limit:,.0f} {'per eye' if sublimit.per_eye else ''}. "
                    f"Excess ₹{excess:,.0f} deducted."
                )
                clause_ref = sublimit.citation.clause_number if sublimit.citation else "Specific Procedure Sub-limit Clause"

                deductions.append(ItemDeduction(
                    item=f"{proc_name.title()} Sub-limit",
                    claimed=admissible_procedure_total,
                    allowed=cap_limit,
                    deducted=excess,
                    reason=reason,
                    clause=clause_ref,
                ))

                checks.append(PolicyCheckResult(
                    factor=f"{proc_name.title()} Sub-limit",
                    status="Capped at Sub-limit",
                    impact="Negative",
                    detail=reason,
                    clause=clause_ref,
                ))
            else:
                checks.append(PolicyCheckResult(
                    factor=f"{proc_name.title()} Sub-limit",
                    status="Within Limit",
                    impact="Positive",
                    detail=f"Procedure expenses (₹{admissible_procedure_total:,.0f}) are within the ₹{cap_limit:,.0f} sub-limit.",
                    clause=sublimit.citation.clause_number if sublimit.citation else "Specific Procedure Sub-limit Clause",
                ))

    return items, deductions, checks, total_sublimit_deductions

