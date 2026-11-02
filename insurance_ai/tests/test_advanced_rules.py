"""
Unit and Regression Test Suite for Advanced Underwriting Rules (Phase 4 & 5).
Verifies:
1. Consumables Cover / Safeguard Rider waiving Schedule I non-payables.
2. Automatic Sum Insured Restoration Benefit when remaining SI is exhausted.
3. IRDAI Medical Devices & Implants protection against proportionate room rent deductions.
4. Road Ambulance sub-limit capping.
5. PED Buyback / JumpStart rider reducing waiting period from 36m to 12m.
6. Room Rent Sub-limit Waiver rider eliminating proportionate room penalties.
7. End-to-end legacy adapter serialization of advanced underwriting flags.
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.models import ClaimInput, BillItem
from domain.status import ExpenseCategory, RoomCategory, CalculationStatus
from engine.pipeline import calculate_claim
from legacy_adapter import execute_claim_evaluation


class TestAdvancedUnderwritingRules(unittest.TestCase):

    def test_consumables_cover_rider_waives_non_payables(self):
        """Without rider, miscellaneous non-medical items are 100% deducted.
        With rider, non-payables are allowed and tracked in consumables_waived_by_rider."""
        bill = [
            BillItem("surg", "Surgery", ExpenseCategory.SURGEON_FEES, 100000.0, 100000.0, 0.0),
            BillItem("misc", "Consumables & PPE", ExpenseCategory.NON_MEDICAL_ITEMS, 25000.0, 25000.0, 0.0),
        ]

        # Case A: Without consumables rider
        claim_standard = ClaimInput(
            company_name="Care Health",
            patient_age=45,
            admitting_diagnosis="Heart Disease",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            has_consumables_cover=False,
            bill_items=[b for b in bill],
        )
        res_standard = calculate_claim(claim_standard)
        self.assertEqual(res_standard.status, CalculationStatus.CALCULATED)
        self.assertEqual(res_standard.consumables_waived_by_rider, 0.0)
        # 25,000 must be deducted
        misc_ded = [d for d in res_standard.deductions if "Consumables" in d.item or "Non-Medical" in d.item]
        self.assertTrue(len(misc_ded) > 0)
        self.assertEqual(misc_ded[0].deducted, 25000.0)
        self.assertEqual(res_standard.estimated_payable_amount, 100000.0)

        # Case B: With consumables rider
        claim_with_rider = ClaimInput(
            company_name="Care Health",
            patient_age=45,
            admitting_diagnosis="Heart Disease",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            has_consumables_cover=True,
            bill_items=[b for b in bill],
        )
        res_with_rider = calculate_claim(claim_with_rider)
        self.assertEqual(res_with_rider.status, CalculationStatus.CALCULATED)
        self.assertEqual(res_with_rider.consumables_waived_by_rider, 25000.0)
        self.assertEqual(res_with_rider.estimated_payable_amount, 125000.0)

    def test_automatic_sum_insured_restoration(self):
        """When claim exceeds remaining SI, policies with restoration automatically
        recharge the SI and settle the remaining admissible claim."""
        bill = [
            BillItem("surg", "Cardiac Procedure", ExpenseCategory.SURGEON_FEES, 300000.0, 300000.0, 0.0),
        ]
        # Base SI = 5,00,000. Prior claims used 4,50,000. Remaining = 50,000.
        claim = ClaimInput(
            company_name="Care Health",
            product_name="Care Supreme",
            patient_age=45,
            admitting_diagnosis="Heart Disease",
            sum_insured=500000.0,
            remaining_sum_insured=50000.0,
            continuous_coverage_months=36,
            bill_items=bill,
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertTrue(res.is_restoration_triggered)
        self.assertEqual(res.restoration_amount_applied, 250000.0)
        self.assertEqual(res.estimated_payable_amount, 300000.0)

    def test_implants_protected_from_proportionate_deduction(self):
        """Under IRDAI circular, medical devices, implants, and stents are NOT subject
        to proportionate room rent deductions even when patient chooses a higher room category."""
        # New India Assurance has 1% SI room rent limit = 5,000/day for 5L SI.
        # Length of stay = 2 days. Room rent = 20,000 (10,000/day).
        # Proportionate ratio = 5000 / 10000 = 0.50.
        bill = [
            BillItem("room", "Room Rent", ExpenseCategory.ROOM_RENT, 20000.0, 20000.0, 0.0),
            BillItem("surg", "Surgery Fees", ExpenseCategory.SURGEON_FEES, 80000.0, 80000.0, 0.0),
            BillItem("stent", "Cardiac Stent (Device)", ExpenseCategory.IMPLANTS, 120000.0, 120000.0, 0.0),
        ]
        claim = ClaimInput(
            company_name="New India Assurance",
            patient_age=45,
            admitting_diagnosis="Heart Disease",
            sum_insured=500000.0,
            length_of_stay_days=2,
            room_category_occupied=RoomCategory.ANY_ROOM,
            continuous_coverage_months=36,
            bill_items=bill,
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        # Room: Claimed 20,000, 10,000 cut (5,000/day limit)
        self.assertEqual(res.room_rent_deductions, 10000.0)
        # Surgery: Claimed 80,000, 40,000 cut (0.50 ratio)
        self.assertEqual(res.proportionate_deductions, 40000.0)
        # Implants: Zero deduction! (Exempt from room ratio)
        implants_ded = [d for d in res.deductions if "Implant" in d.item or "Stent" in d.item]
        self.assertEqual(len(implants_ded), 0)
        # Payable: 10,000 (room) + 40,000 (surg) + 120,000 (stent) = 170,000
        self.assertEqual(res.estimated_payable_amount, 170000.0)

    def test_road_ambulance_sublimit_capping(self):
        """Ambulance charges exceeding the policy sub-limit (e.g. ₹3,000) are capped."""
        bill = [
            BillItem("amb", "Road Ambulance", ExpenseCategory.AMBULANCE, 7500.0, 7500.0, 0.0),
            BillItem("med", "Medicines", ExpenseCategory.MEDICINES, 20000.0, 20000.0, 0.0),
        ]
        claim = ClaimInput(
            company_name="Star Health",
            patient_age=45,
            admitting_diagnosis="General Illness",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            bill_items=bill,
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.ambulance_deductions, 4500.0)
        amb_ded = [d for d in res.deductions if "Ambulance" in d.item][0]
        self.assertEqual(amb_ded.deducted, 4500.0)
        self.assertEqual(res.estimated_payable_amount, 23000.0)  # 3000 amb + 20000 med

    def test_ped_buyback_rider_reduces_waiting_period(self):
        """A pre-existing condition at 14 months of coverage is rejected under standard 36m waiting period,
        but fully covered when PED Buyback rider is active."""
        bill = [
            BillItem("med", "Dialysis & Management", ExpenseCategory.MEDICINES, 60000.0, 60000.0, 0.0),
        ]
        # Standard: 14 months coverage vs 36/48m PED requirement -> REJECTED
        claim_std = ClaimInput(
            company_name="HDFC ERGO",
            patient_age=45,
            admitting_diagnosis="Chronic Kidney Disease",
            sum_insured=500000.0,
            continuous_coverage_months=14,
            is_declared_ped=True,
            has_ped_buyback_rider=False,
            bill_items=bill,
        )
        res_std = calculate_claim(claim_std)
        self.assertEqual(res_std.status, CalculationStatus.REJECTED)
        self.assertEqual(res_std.estimated_payable_amount, 0.0)

        # With PED Buyback rider: waiting period is reduced to 12 months -> APPROVED
        claim_rider = ClaimInput(
            company_name="HDFC ERGO",
            patient_age=45,
            admitting_diagnosis="Chronic Kidney Disease",
            sum_insured=500000.0,
            continuous_coverage_months=14,
            is_declared_ped=True,
            has_ped_buyback_rider=True,
            bill_items=bill,
        )
        res_rider = calculate_claim(claim_rider)
        self.assertEqual(res_rider.status, CalculationStatus.CALCULATED)
        self.assertEqual(res_rider.estimated_payable_amount, 60000.0)

    def test_room_rent_waiver_rider_eliminates_penalties(self):
        """Room rent waiver rider allows admission to any room category without proportionate cut."""
        bill = [
            BillItem("room", "Suite Room", ExpenseCategory.ROOM_RENT, 30000.0, 30000.0, 0.0),
            BillItem("surg", "Surgery", ExpenseCategory.SURGEON_FEES, 90000.0, 90000.0, 0.0),
        ]
        claim = ClaimInput(
            company_name="New India Assurance",
            patient_age=45,
            admitting_diagnosis="Surgery Treatment",
            sum_insured=500000.0,
            length_of_stay_days=2,
            room_category_occupied=RoomCategory.ANY_ROOM,
            continuous_coverage_months=36,
            has_room_waiver_rider=True,
            bill_items=bill,
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.room_rent_deductions, 0.0)
        self.assertEqual(res.proportionate_deductions, 0.0)
        self.assertEqual(res.estimated_payable_amount, 120000.0)

    def test_legacy_adapter_end_to_end_payload(self):
        """Tests that full UI-shaped payload executes cleanly through execute_claim_evaluation."""
        payload = {
            "company": "Care Health",
            "age": 52,
            "disease": "Heart Disease",
            "treatment_type": "Surgery",
            "sum_insured": 500000,
            "remaining_sum_insured": 80000,
            "length_of_stay_days": 4,
            "room_category_occupied": "Single Private AC",
            "continuous_coverage_months": 48,
            "treatment_city_zone": "Zone 1 (Metro / Tier 1)",
            "waiting_completed": True,
            "network_hospital": True,
            "has_consumables_cover": True,
            "has_ped_buyback_rider": False,
            "has_room_waiver_rider": False,
            "room_rent": 32000,
            "surgery_cost": 150000,
            "medicines": 40000,
            "diagnostics": 20000,
            "ot_charges": 30000,
            "blood_bank": 10000,
            "implants_cost": 75000,
            "ambulance_cost": 3000,
            "miscellaneous": 18000,
        }
        res = execute_claim_evaluation(payload)
        self.assertEqual(res["status"], "CALCULATED")
        self.assertTrue(res["is_restoration_triggered"])
        self.assertEqual(res["consumables_waived_by_rider"], 18000.0)
        self.assertGreater(res["approved_amount"], 80000.0)  # Restoration kicked in!
        self.assertIn("Care Supreme", res["product_identified"])
        self.assertIn("CHIHLIP23128V022223", res["uin"])


if __name__ == "__main__":
    unittest.main()
