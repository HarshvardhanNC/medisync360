"""
Strongly typed domain models for MediSync360 Insurance Engine.
Includes advanced underwriting parameters: Consumables Cover, Restoration Benefits,
Zone Co-pay, Implants, Ambulance Limits, and Proportionate Exemptions.
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from domain.status import CalculationStatus, ExpenseCategory, ItemCoverageStatus, RoomCategory


@dataclass
class SourceCitation:
    insurer: str
    product_name: str
    uin: str
    clause_number: str
    document_name: str
    page_number: int
    official_url: str
    verification_status: str = "VERIFIED"


@dataclass
class RoomEntitlement:
    category: RoomCategory
    per_day_limit_pct: Optional[float] = None       # E.g. 1.0 for New India (1% SI/day)
    icu_per_day_limit_pct: Optional[float] = None   # E.g. 2.0 for New India (2% SI/day)
    icu_absolute_cap: Optional[float] = None
    applies_proportionate_deduction: bool = False
    proportionate_exemptions: List[str] = field(default_factory=lambda: [
        "medicines", "implants", "stents", "diagnostics"
    ])
    citation: Optional[SourceCitation] = None


@dataclass
class WaitingPeriodRule:
    initial_waiting_days: int = 30
    specific_disease_months: int = 24
    pre_existing_disease_months: int = 36
    maternity_waiting_months: Optional[int] = None
    bariatric_waiting_months: int = 36
    specific_diseases_list: List[str] = field(default_factory=lambda: [
        "cataract", "hernia", "hydrocele", "piles", "fistula", "fissure",
        "joint replacement", "osteoarthritis", "internal congenital disease",
        "gallstones", "kidney stones", "urinary stones", "bph", "benign prostatic hypertrophy",
        "hysterectomy", "sinusitis", "tonsillectomy", "varicose veins"
    ])
    citation: Optional[SourceCitation] = None


@dataclass
class ProcedureSublimit:
    procedure_name: str
    cap_type: str  # 'ABSOLUTE' or 'PERCENTAGE_SI'
    cap_value: float
    per_eye: bool = False
    citation: Optional[SourceCitation] = None


@dataclass
class ProductPolicy:
    company_id: str
    insurer_name: str
    product_name: str
    variant: str
    uin: str
    wording_version: str
    room_entitlement: RoomEntitlement
    waiting_periods: WaitingPeriodRule
    procedure_sublimits: Dict[str, ProcedureSublimit] = field(default_factory=dict)
    standard_copay_pct: float = 0.0
    age_copay_bands: Dict[int, float] = field(default_factory=dict)
    has_zone_copay: bool = False
    zone_copay_pct: float = 0.0
    ambulance_sublimit: float = 3000.0
    mandatory_deductible: float = 0.0
    pre_hospitalization_days: int = 60
    post_hospitalization_days: int = 180
    ayush_covered_upto_si: bool = True
    daycare_covered: bool = True
    modern_treatments_covered_upto_si: bool = True
    restoration_benefit: bool = True
    cumulative_bonus_pct: float = 10.0
    source_citations: List[SourceCitation] = field(default_factory=list)


@dataclass
class BillItem:
    item_id: str
    name: str
    category: ExpenseCategory
    claimed_amount: float
    unit_cost: Optional[float] = None
    quantity: int = 1
    allowed_amount: float = 0.0
    deducted_amount: float = 0.0
    status: ItemCoverageStatus = ItemCoverageStatus.COVERED
    deduction_reason: str = ""
    clause_reference: str = ""


@dataclass
class ClaimInput:
    company_name: str
    product_name: Optional[str] = None
    uin: Optional[str] = None
    variant: Optional[str] = None
    patient_age: int = 40
    admitting_diagnosis: str = "General Illness / Hospitalization"
    treatment_type: str = "Medical Management"
    sum_insured: float = 500000.0
    remaining_sum_insured: Optional[float] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    length_of_stay_days: int = 1
    is_network_hospital: bool = True
    is_cashless: bool = True
    room_category_occupied: RoomCategory = RoomCategory.SINGLE_PRIVATE_AC
    room_daily_charge: float = 0.0
    continuous_coverage_months: int = 0
    is_declared_ped: bool = False
    # Add-on Riders
    has_consumables_cover: bool = False     # E.g. Safeguard / Care Shield / Consumable Rider
    has_ped_buyback_rider: bool = False     # Reduces PED waiting to 12 months
    has_room_waiver_rider: bool = False     # Waives proportionate deductions
    treatment_city_zone: str = "Zone 1"     # Zone 1 (Metro), Zone 2 (Tier 1), Zone 3 (Rest of India)
    is_organ_donor: bool = False
    voluntary_deductible: float = 0.0
    opted_copay_pct: float = 0.0
    bill_items: List[BillItem] = field(default_factory=list)


@dataclass
class ItemDeduction:
    item: str
    claimed: float
    allowed: float
    deducted: float
    reason: str
    clause: str = ""


@dataclass
class PolicyCheckResult:
    factor: str
    status: str
    impact: str  # "Positive", "Negative", "Neutral"
    detail: str
    clause: str = ""


@dataclass
class CalculationResult:
    status: CalculationStatus
    product_identified: str
    uin: str
    total_submitted_bill: float
    eligible_expense_amount: float
    excluded_expense_amount: float
    sub_limit_deductions: float
    room_rent_deductions: float
    proportionate_deductions: float
    ambulance_deductions: float = 0.0
    deductible_deduction: float = 0.0
    co_payment_deduction: float = 0.0
    other_applicable_deductions: float = 0.0
    estimated_payable_amount: float = 0.0
    remaining_sum_insured: float = 0.0
    claim_efficiency_pct: float = 0.0
    # Advanced benefit tracking
    is_restoration_triggered: bool = False
    restoration_amount_applied: float = 0.0
    consumables_waived_by_rider: float = 0.0
    deductions: List[ItemDeduction] = field(default_factory=list)
    approval_breakdown: List[PolicyCheckResult] = field(default_factory=list)
    rules_applied: List[str] = field(default_factory=list)
    source_clauses: List[str] = field(default_factory=list)
    missing_information: List[str] = field(default_factory=list)
    manual_review_requirements: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    executive_summary: str = ""
    # Forecasting metrics (decoupled from financial calculation)
    predictive_risk_score: int = 0
    predictive_risk_tier: str = "Low Risk"
    predictive_approval_probability: float = 0.0
