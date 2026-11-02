"""
Policy Resolver — MediSync360.
Resolves the exact ProductPolicy model from the registry or flags unverified status.
"""
from typing import Optional, Tuple
from domain.models import ClaimInput, ProductPolicy
from domain.status import CalculationStatus
from registry.product_registry import get_policy


def resolve_policy(claim: ClaimInput) -> Tuple[Optional[ProductPolicy], CalculationStatus, str]:
    """
    Resolves the exact policy model.
    Returns: (ProductPolicy, CalculationStatus, status_message)
    """
    policy = get_policy(
        company_identifier=claim.company_name,
        product_name=claim.product_name,
        uin=claim.uin,
    )

    if not policy:
        return (
            None,
            CalculationStatus.POLICY_NOT_VERIFIED,
            f"No verified policy definition found for carrier '{claim.company_name}' (product: {claim.product_name or 'Default'}). "
            f"Adjudication cannot proceed with unverified synthetic rules."
        )

    return policy, CalculationStatus.CALCULATED, "Policy verified successfully."

