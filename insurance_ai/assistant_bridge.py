"""
Generative AI Assistant Bridge — MediSync360.
Provides grounding contexts, prompt schemas, and explanation helpers for the future
conversational AI insurance assistant, strictly ensuring the LLM cannot fabricate rules.
"""
from typing import Dict, Any, List, Optional
from domain.models import CalculationResult, ClaimInput
from domain.status import CalculationStatus
from registry.product_registry import get_policy
from registry.source_registry import get_citation


def prepare_chatbot_grounding_context(result: CalculationResult) -> Dict[str, Any]:
    """
    Produces structured grounding data for the GenAI Assistant.
    Guarantees that the assistant references only verified financial outputs and official clauses.
    """
    return {
        "status": result.status.value,
        "product": result.product_identified,
        "uin": result.uin,
        "financial_summary": {
            "total_submitted": result.total_submitted_bill,
            "admissible_before_deductions": result.eligible_expense_amount,
            "final_payable": result.estimated_payable_amount,
            "total_deductions": result.excluded_expense_amount,
            "remaining_sum_insured": result.remaining_sum_insured,
            "recovery_efficiency_pct": result.claim_efficiency_pct,
        },
        "itemized_deductions": [
            {
                "item": d.item,
                "amount_deducted": d.deducted,
                "reason": d.reason,
                "clause_reference": d.clause,
            }
            for d in result.deductions
        ],
        "policy_checks": [
            {
                "factor": c.factor,
                "verdict": c.status,
                "detail": c.detail,
                "clause_reference": c.clause,
            }
            for c in result.approval_breakdown
        ],
        "missing_information": result.missing_information,
        "manual_review_needed": len(result.manual_review_requirements) > 0,
        "official_source_clauses": result.source_clauses,
        "verified_recommendations": result.recommendations,
    }


def get_term_explanation_context(company_name: str, term: str) -> Dict[str, str]:
    """Retrieves verified contractual clause context for explaining specific policy terms."""
    citation = get_citation(company_name, term)
    return {
        "insurer": citation.insurer,
        "product": citation.product_name,
        "uin": citation.uin,
        "clause": citation.clause_number,
        "document": citation.document_name,
        "page": str(citation.page_number),
        "url": citation.official_url,
    }

