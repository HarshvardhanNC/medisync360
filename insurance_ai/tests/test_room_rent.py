"""
Unit tests for Room Rent & Proportionate Deductions in MediSync360 Insurance Engine.
"""
import unittest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.models import ClaimInput, BillItem
from domain.status import ExpenseCategory, CalculationStatus, RoomCategory
from engine.pipeline import calculate_claim


class TestRoomRent(unittest.TestCase):
    def test_new_india_room_cap_and_proportionate_deduction(self):
        """
        New India Mediclaim has 1.0% SI/day room rent cap.
        On ₹5,00,000 SI, limit is ₹5,000/day.
        If patient spends ₹10,000/day for 2 days (total ₹20,000):
          - Room rent allowed = ₹10,000; excess ₹10,000 deducted.
          - Proportionate factor = 1 - (5,000 / 10,000) = 50%.
          - Surgeon fee of ₹60,000 suffers 50% cut = ₹30,000 deducted.
          - Medicines of ₹20,000 must be EXEMPT from proportionate deduction!
        """
        claim = ClaimInput(
            company_name="New India Assurance",
            admitting_diagnosis="Cholecystitis - Laparoscopic Cholecystectomy",
            treatment_type="Surgery",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            length_of_stay_days=2,
            bill_items=[
                BillItem(item_id="1", name="Room Rent", category=ExpenseCategory.ROOM_RENT, claimed_amount=20000.0),
                BillItem(item_id="2", name="Surgeon Charges", category=ExpenseCategory.SURGEON_FEES, claimed_amount=60000.0),
                BillItem(item_id="3", name="Pharmacy Medicines", category=ExpenseCategory.MEDICINES, claimed_amount=20000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.room_rent_deductions, 10000.0)
        self.assertEqual(res.proportionate_deductions, 30000.0)
        # Total bill = 100,000; Deductions: 10,000 room + 30,000 prop = 40,000.
        # Payable = 60,000.
        self.assertEqual(res.estimated_payable_amount, 60000.0)

    def test_hdfc_optima_secure_no_room_rent_cap(self):
        """HDFC my:Optima Secure has Any Room / No room rent cap; ₹15,000/day room rent must be 100% covered."""
        claim = ClaimInput(
            company_name="HDFC ERGO",
            admitting_diagnosis="Dengue Fever with Thrombocytopenia",
            treatment_type="Medical Management",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            length_of_stay_days=3,
            bill_items=[
                BillItem(item_id="1", name="Single Private Room", category=ExpenseCategory.ROOM_RENT, claimed_amount=45000.0),  # 15,000/day
                BillItem(item_id="2", name="Doctor Consultation", category=ExpenseCategory.DOCTOR_CONSULTATION, claimed_amount=15000.0),
                BillItem(item_id="3", name="Inpatient Medicines", category=ExpenseCategory.MEDICINES, claimed_amount=20000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.room_rent_deductions, 0.0)
        self.assertEqual(res.proportionate_deductions, 0.0)
        self.assertEqual(res.estimated_payable_amount, 80000.0)


if __name__ == "__main__":
    unittest.main()

