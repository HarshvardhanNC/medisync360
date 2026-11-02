"""
IRDAI Standardized List of Non-Medical Expenses (Guidelines on Standardization in Health Insurance).
Defines standard non-payable consumable items, items subsumed into room charges, procedure charges, and nursing.
"""
from typing import Dict, Set

# Schedule I: Inadmissible Non-Medical Items (Strictly Non-Payable)
IRDAI_SCHEDULE_I_NON_PAYABLE: Set[str] = {
    "baby food",
    "baby utilities charges",
    "beauty services",
    "belts/braces",
    "buds",
    "bar of soap",
    "comb",
    "creams and lotions",
    "deodorants",
    "disposable slippers",
    "dry cell batteries",
    "extra bed for attendant",
    "extra diet charges",
    "guest services",
    "housekeeping charges",
    "internet charges",
    "laundry charges",
    "mineral water",
    "mouthwash",
    "newspaper",
    "phone charges",
    "slippers",
    "telephone charges",
    "tissue paper",
    "tooth paste",
    "tooth brush",
    "toiletries",
    "towel",
    "tv rental",
    "visitor pass",
    "admission kit",
    "registration fee",
    "admission fee",
    "administrative charges",
    "discharge card charges",
    "folder for report",
    "medical records fee",
    "documentation charges",
    "file opening charges",
    "thermometer",
    "pulse oximeter charges",
    "weighing machine",
    "diapers",
    "crepe bandage",
    "cotton",
    "sanitary pads",
    "eye mask",
}

# Schedule II: Items Subsumed into Room Charges
IRDAI_SCHEDULE_II_ROOM_SUBSUMED: Set[str] = {
    "bed pan",
    "urinal pot",
    "linen charges",
    "housekeeping",
    "routine room sanitization",
    "iv stand charges",
    "room cleaner charges",
}

# Schedule III: Items Subsumed into Procedure / OT Charges
IRDAI_SCHEDULE_III_PROCEDURE_SUBSUMED: Set[str] = {
    "ot gown",
    "surgeon gown",
    "surgical blade",
    "cotton tape",
    "spirit / savlon routine",
    "gauze piece routine",
    "apron",
    "disposable gloves routine",
}

# Schedule IV: Items Subsumed into Nursing / Doctor Charges
IRDAI_SCHEDULE_IV_NURSING_SUBSUMED: Set[str] = {
    "nursing chart charges",
    "routine injection administration",
    "vital monitoring kit",
}

def is_irdai_non_payable(item_name: str) -> bool:
    """Checks whether an item name matches standard IRDAI Schedule I non-payable list."""
    name_clean = item_name.strip().lower()
    return any(np in name_clean for np in IRDAI_SCHEDULE_I_NON_PAYABLE)

