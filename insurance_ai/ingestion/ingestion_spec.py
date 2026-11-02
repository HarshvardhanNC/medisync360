"""
Policy Document Ingestion Specification & Candidate Rule Schema — MediSync360.
Defines the pipeline for parsing official policy PDFs, extracting tables and clauses,
and requiring explicit human verification before activating any rule in the production registry.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum


class RuleCandidateStatus(str, Enum):
    EXTRACTED_BY_AI = "EXTRACTED_BY_AI"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    AMBIGUOUS_FLAGGED = "AMBIGUOUS_FLAGGED"
    VERIFIED_APPROVED = "VERIFIED_APPROVED"
    REJECTED = "REJECTED"


@dataclass
class ExtractedClauseCandidate:
    insurer: str
    product_name: str
    uin: str
    rule_category: str          # "ROOM_RENT", "WAITING_PERIOD", "COPAY", "SUBLIMIT", "DEDUCTIBLE"
    raw_clause_text: str
    clause_number: str
    page_number: int
    source_pdf_filename: str
    extracted_parameters: Dict[str, str] = field(default_factory=dict)
    confidence_score: float = 0.0
    status: RuleCandidateStatus = RuleCandidateStatus.PENDING_VERIFICATION
    ambiguity_flags: List[str] = field(default_factory=list)
    verifier_notes: Optional[str] = None
    verified_by: Optional[str] = None
    verification_timestamp: Optional[str] = None


@dataclass
class PolicyIngestionAuditLog:
    document_id: str
    file_path: str
    file_hash_sha256: str
    total_pages_scanned: int
    extracted_candidates_count: int
    verified_rules_count: int = 0
    rejected_rules_count: int = 0

