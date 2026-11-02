"""
Central Product Registry — MediSync360.
Resolves insurance policies by insurer name, company id, product name, or UIN.
"""
from typing import Dict, Optional, List
from domain.models import ProductPolicy

from registry.products.hdfc_optima_secure import get_hdfc_optima_secure_policy
from registry.products.star_comprehensive import get_star_comprehensive_policy
from registry.products.icici_elevate import get_icici_elevate_policy
from registry.products.care_supreme import get_care_supreme_policy
from registry.products.niva_reassure import get_niva_reassure_policy
from registry.products.new_india_mediclaim import get_new_india_mediclaim_policy
from registry.products.tata_aig_medicare import get_tata_aig_medicare_policy
from registry.products.aditya_birla_activ_one import get_aditya_birla_activ_one_policy
from registry.products.manipal_cigna_prohealth import get_manipal_cigna_prohealth_policy
from registry.products.bajaj_allianz_health_guard import get_bajaj_allianz_health_guard_policy

# Factory mappings
_PRODUCT_FACTORIES = [
    get_hdfc_optima_secure_policy,
    get_star_comprehensive_policy,
    get_icici_elevate_policy,
    get_care_supreme_policy,
    get_niva_reassure_policy,
    get_new_india_mediclaim_policy,
    get_tata_aig_medicare_policy,
    get_aditya_birla_activ_one_policy,
    get_manipal_cigna_prohealth_policy,
    get_bajaj_allianz_health_guard_policy,
]

_PRODUCTS: Dict[str, ProductPolicy] = {}
for factory in _PRODUCT_FACTORIES:
    p = factory()
    _PRODUCTS[p.company_id.lower()] = p


# Alias mapping for company names as sent from UI / external callers
COMPANY_ALIASES = {
    "hdfc ergo": "hdfc",
    "hdfc": "hdfc",
    "optima secure": "hdfc",
    "star health": "star",
    "star": "star",
    "icici lombard": "icici",
    "icici": "icici",
    "elevate": "icici",
    "care health": "care",
    "care": "care",
    "care supreme": "care",
    "niva bupa": "niva",
    "niva": "niva",
    "reassure": "niva",
    "max bupa": "niva",
    "new india assurance": "newindia",
    "new india": "newindia",
    "newindia": "newindia",
    "tata aig": "tata_aig",
    "tata_aig": "tata_aig",
    "aditya birla": "aditya_birla",
    "aditya_birla": "aditya_birla",
    "activ one": "aditya_birla",
    "manipal cigna": "manipal_cigna",
    "manipalcigna": "manipal_cigna",
    "prohealth": "manipal_cigna",
    "bajaj allianz": "bajaj",
    "bajaj": "bajaj",
    "health guard": "bajaj",
}


def get_policy(company_identifier: str, product_name: Optional[str] = None, uin: Optional[str] = None) -> Optional[ProductPolicy]:
    """
    Resolves the exact verified policy model.
    Looks up by UIN first, then product name, then company identifier/alias.
    """
    clean_id = (company_identifier or "").strip().lower()

    # 1. Match by UIN
    if uin:
        clean_uin = uin.strip().upper()
        for p in _PRODUCTS.values():
            if p.uin.upper() == clean_uin:
                return p

    # 2. Match by exact alias
    if clean_id in COMPANY_ALIASES:
        target_key = COMPANY_ALIASES[clean_id]
        if target_key in _PRODUCTS:
            return _PRODUCTS[target_key]

    # 3. Match by partial company or product name
    for key, p in _PRODUCTS.items():
        if key in clean_id or p.insurer_name.lower() in clean_id or p.product_name.lower() in clean_id:
            return p

    return None


def list_supported_policies() -> List[ProductPolicy]:
    """Returns list of all verified policies currently in the registry."""
    return list(_PRODUCTS.values())

