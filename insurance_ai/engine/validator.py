"""
Input Validator — MediSync360 Insurance Rule Engine.
Validates input claim payloads, checks for essential policy information, and detects ambiguities.
"""
from typing import List, Tuple
from domain.models import ClaimInput


def validate_claim_input(claim: ClaimInput) -> Tuple[bool, List[str], List[str]]:
    """
    Validates claim input.
    Returns: (is_valid, missing_fields, validation_warnings)
    """
    missing: List[str] = []
    warnings: List[str] = []

    if not claim.company_name:
        missing.append("company_name (Insurance Carrier)")
    if claim.sum_insured <= 0:
        missing.append("sum_insured (Sum Insured must be positive)")
    if claim.patient_age <= 0 or claim.patient_age > 120:
        missing.append("patient_age (Valid age required)")
    if not claim.admitting_diagnosis:
        missing.append("admitting_diagnosis (Diagnosis required)")

    if claim.length_of_stay_days <= 0:
        claim.length_of_stay_days = 1
        warnings.append("Length of stay unspecified; defaulted to 1 day.")

    if not claim.bill_items:
        warnings.append("No itemized bill lines provided; running on total claim headers.")

    is_valid = len(missing) == 0
    return is_valid, missing, warnings

