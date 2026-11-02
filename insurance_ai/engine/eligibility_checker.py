"""
Hospitalization Eligibility Checker — MediSync360.
Evaluates 24-hour minimum duration, daycare exemptions, emergency admissions, and AYUSH eligibility.
"""
from typing import Tuple, List
from domain.models import ClaimInput, ProductPolicy, PolicyCheckResult

# Common daycare procedures exempt from 24-hour minimum hospitalization rule under IRDAI
STANDARD_DAYCARE_PROCEDURES = {
    "cataract", "dialysis", "chemotherapy", "radiotherapy", "lithotripsy",
    "tonsillectomy", "appendectomy (laparoscopic)", "hydrocele", "hernia repair",
    "piles", "fistula", "fissure", "colonoscopy", "endoscopy", "angiography",
    "tympanoplasty", "d&c", "coronary angiography", "dental surgery (accidental)"
}


def check_hospitalization_eligibility(
    claim: ClaimInput,
    policy: ProductPolicy,
) -> Tuple[bool, List[PolicyCheckResult], List[str]]:
    """
    Evaluates whether the hospitalization event is admissible.
    Returns: (is_eligible, check_results, rejection_reasons)
    """
    checks: List[PolicyCheckResult] = []
    rejections: List[str] = []
    is_eligible = True

    diagnosis = claim.admitting_diagnosis.strip().lower()
    treatment = claim.treatment_type.strip().lower()

    # 1. 24-Hour Hospitalization vs Daycare Exemption
    is_daycare_proc = any(proc in diagnosis for proc in STANDARD_DAYCARE_PROCEDURES) or treatment == "daycare"
    is_emergency = treatment == "emergency"

    if claim.length_of_stay_days < 1:
        if is_daycare_proc:
            checks.append(PolicyCheckResult(
                factor="Hospitalization Duration",
                status="Admissible (Day Care)",
                impact="Positive",
                detail=f"Duration < 24 hours, but '{claim.admitting_diagnosis}' is a recognized Day Care procedure exempt from 24-hr rule.",
                clause="Day Care Treatment Clause",
            ))
        elif is_emergency:
            checks.append(PolicyCheckResult(
                factor="Hospitalization Duration",
                status="Admissible (Emergency)",
                impact="Positive",
                detail="Emergency room admission covered without formal 24-hour stay requirement.",
                clause="Emergency Care Clause",
            ))
        else:
            is_eligible = False
            rejections.append("Hospitalization duration is under 24 hours and the procedure is not a listed Day Care procedure.")
            checks.append(PolicyCheckResult(
                factor="Hospitalization Duration",
                status="Ineligible (< 24 hrs)",
                impact="Negative",
                detail="Under 24 hours stay required without qualifying daycare procedure.",
                clause="Minimum 24-hour Hospitalization Clause",
            ))
    else:
        checks.append(PolicyCheckResult(
            factor="Hospitalization Duration",
            status="Passed",
            impact="Positive",
            detail=f"Hospitalization duration of {claim.length_of_stay_days} day(s) satisfies 24-hour minimum duration requirement.",
            clause="In-Patient Hospitalization Clause",
        ))

    # 2. AYUSH Eligibility
    if "ayush" in treatment or "ayurved" in treatment or "homeopath" in treatment:
        if policy.ayush_covered_upto_si:
            checks.append(PolicyCheckResult(
                factor="AYUSH Treatment",
                status="Covered",
                impact="Positive",
                detail=f"{policy.insurer_name} covers AYUSH treatments up to the Sum Insured in government/accredited hospitals.",
                clause="AYUSH Coverage Clause",
            ))
        else:
            checks.append(PolicyCheckResult(
                factor="AYUSH Treatment",
                status="Subject to Sub-limit",
                impact="Neutral",
                detail="AYUSH treatment subject to policy specific conditions.",
                clause="AYUSH Coverage Clause",
            ))

    return is_eligible, checks, rejections

