"""
Waiting Period Checker — MediSync360.
Evaluates Initial (30-day), Specific Disease (24-month), Pre-Existing Disease (36-month),
and Maternity waiting periods based on continuous coverage duration and riders.
"""
from typing import Tuple, List
from domain.models import ClaimInput, ProductPolicy, PolicyCheckResult


def check_waiting_periods(
    claim: ClaimInput,
    policy: ProductPolicy,
) -> Tuple[bool, List[PolicyCheckResult], List[str]]:
    """
    Evaluates waiting period admissibility.
    Returns: (is_admissible, check_results, rejection_reasons)
    """
    checks: List[PolicyCheckResult] = []
    rejections: List[str] = []
    is_admissible = True

    diagnosis = claim.admitting_diagnosis.strip().lower()
    treatment = claim.treatment_type.strip().lower()
    wp_rule = policy.waiting_periods
    months_active = claim.continuous_coverage_months
    is_accident = "accident" in diagnosis or "fracture" in diagnosis or "injury" in diagnosis or "trauma" in diagnosis

    # 1. Initial 30-Day Waiting Period (Code-Excl03)
    if is_accident:
        checks.append(PolicyCheckResult(
            factor="Initial Waiting Period (30 Days)",
            status="Waived (Accident)",
            impact="Positive",
            detail="Accidental injury covered from Day 1 without 30-day initial waiting period.",
            clause="Code-Excl03 (Initial Waiting Period - Accident Exception)",
        ))
    elif months_active < 1:  # Within first month
        is_admissible = False
        rejections.append("Treatment falls within the initial 30-day waiting period from policy inception.")
        checks.append(PolicyCheckResult(
            factor="Initial Waiting Period (30 Days)",
            status="Failed",
            impact="Negative",
            detail="Claim incurred within first 30 days of policy inception. Non-accidental claims are excluded.",
            clause="Code-Excl03 (Initial Waiting Period)",
        ))
    else:
        checks.append(PolicyCheckResult(
            factor="Initial Waiting Period (30 Days)",
            status="Satisfied",
            impact="Positive",
            detail=f"Continuous coverage of {months_active} month(s) exceeds initial 30-day waiting period.",
            clause="Code-Excl03 (Initial Waiting Period)",
        ))

    # 2. Specific Illness / Procedure Waiting Period (Code-Excl02)
    is_specific_disease = any(d in diagnosis for d in wp_rule.specific_diseases_list)
    if is_specific_disease:
        required_months = wp_rule.specific_disease_months
        if months_active < required_months:
            is_admissible = False
            rejections.append(
                f"'{claim.admitting_diagnosis}' is a listed 2-year specific procedure. "
                f"Requires {required_months} months of continuous coverage (current: {months_active} months)."
            )
            checks.append(PolicyCheckResult(
                factor="Specific Disease Waiting Period",
                status="Failed (Under 24 Months)",
                impact="Negative",
                detail=f"Condition '{claim.admitting_diagnosis}' is subject to a {required_months}-month waiting period. {months_active} months completed.",
                clause="Code-Excl02 (Specified Disease / Procedure Waiting Period)",
            ))
        else:
            checks.append(PolicyCheckResult(
                factor="Specific Disease Waiting Period",
                status="Satisfied",
                impact="Positive",
                detail=f"Continuous coverage of {months_active} months satisfies the {required_months}-month specific procedure waiting period.",
                clause="Code-Excl02 (Specified Disease / Procedure Waiting Period)",
            ))

    # 3. Pre-Existing Disease (PED) Waiting Period (Code-Excl01)
    if claim.is_declared_ped:
        ped_required = wp_rule.pre_existing_disease_months
        if claim.has_ped_buyback_rider:
            ped_required = min(ped_required, 12)  # Buyback rider reduces PED to 12 months

        if months_active < ped_required:
            is_admissible = False
            rejections.append(
                f"Declared Pre-Existing Disease requires {ped_required} months of continuous coverage "
                f"(current: {months_active} months). Ineligible under policy terms."
            )
            checks.append(PolicyCheckResult(
                factor="Pre-Existing Disease Waiting Period",
                status="Failed",
                impact="Negative",
                detail=f"Condition is pre-existing; policy requires {ped_required} months of continuous coverage. Current: {months_active} months.",
                clause="Code-Excl01 (Pre-Existing Disease Waiting Period)",
            ))
        else:
            checks.append(PolicyCheckResult(
                factor="Pre-Existing Disease Waiting Period",
                status="Satisfied",
                impact="Positive",
                detail=f"Continuous coverage of {months_active} months satisfies the {ped_required}-month PED waiting period requirement.",
                clause="Code-Excl01 (Pre-Existing Disease Waiting Period)",
            ))

    # 4. Maternity Waiting Period
    is_maternity = "maternity" in diagnosis or "delivery" in diagnosis or "cesarean" in diagnosis or "pregnancy" in diagnosis
    if is_maternity:
        mat_required = wp_rule.maternity_waiting_months or 36
        if months_active < mat_required:
            is_admissible = False
            rejections.append(f"Maternity coverage requires {mat_required} months of continuous coverage. Current: {months_active} months.")
            checks.append(PolicyCheckResult(
                factor="Maternity Waiting Period",
                status="Failed",
                impact="Negative",
                detail=f"Maternity requires {mat_required} months of continuous coverage. Current: {months_active} months.",
                clause="Maternity Expenses Waiting Period Clause",
            ))
        else:
            checks.append(PolicyCheckResult(
                factor="Maternity Waiting Period",
                status="Satisfied",
                impact="Positive",
                detail=f"Maternity waiting period of {mat_required} months satisfied.",
                clause="Maternity Expenses Waiting Period Clause",
            ))

    return is_admissible, checks, rejections

