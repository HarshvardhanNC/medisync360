"""
Unit tests for Waiting Period evaluation in MediSync360 Insurance Engine.
"""
import unittest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.models import ClaimInput, BillItem
from domain.status import ExpenseCategory, CalculationStatus
from engine.pipeline import calculate_claim


class TestWaitingPeriods(unittest.TestCase):
    def test_accident_day_one_waiver(self):
        """Accidental injury must be covered from Day 1 without 30-day waiting period."""
        claim = ClaimInput(
            company_name="HDFC ERGO",
            admitting_diagnosis="Road Traffic Accident - Fracture Femur",
            treatment_type="Surgery",
            sum_insured=500000.0,
            continuous_coverage_months=0,  # Day 1 of policy
            bill_items=[
                BillItem(item_id="1", name="Surgery Charges", category=ExpenseCategory.SURGEON_FEES, claimed_amount=80000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertGreater(res.estimated_payable_amount, 0)
        self.assertTrue(any("Accident" in c.factor or "Waived" in c.status for c in res.approval_breakdown))

    def test_initial_waiting_period_rejection(self):
        """Illness diagnosed within first 30 days must be rejected."""
        claim = ClaimInput(
            company_name="HDFC ERGO",
            admitting_diagnosis="Acute Viral Fever",
            treatment_type="Medical Management",
            sum_insured=500000.0,
            continuous_coverage_months=0,  # 0 months (< 30 days)
            bill_items=[
                BillItem(item_id="1", name="Hospitalization", category=ExpenseCategory.ROOM_RENT, claimed_amount=30000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.REJECTED)
        self.assertEqual(res.estimated_payable_amount, 0)
        self.assertTrue(any("30 Days" in c.factor and c.status == "Failed" for c in res.approval_breakdown))

    def test_specific_disease_under_24_months_rejection(self):
        """Cataract surgery requires 24 months waiting period."""
        claim = ClaimInput(
            company_name="Star Health",
            admitting_diagnosis="Senile Cataract - Phacoemulsification",
            treatment_type="Daycare",
            sum_insured=500000.0,
            continuous_coverage_months=12,  # Only 12 months completed
            bill_items=[
                BillItem(item_id="1", name="Cataract Surgery", category=ExpenseCategory.SURGEON_FEES, claimed_amount=45000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.REJECTED)
        self.assertEqual(res.estimated_payable_amount, 0)
        self.assertTrue(any("Specific Disease" in c.factor and "Failed" in c.status for c in res.approval_breakdown))

    def test_specific_disease_passed_after_24_months(self):
        """Cataract surgery must be approved after 24 months."""
        claim = ClaimInput(
            company_name="Star Health",
            admitting_diagnosis="Senile Cataract - Phacoemulsification",
            treatment_type="Daycare",
            sum_insured=500000.0,
            continuous_coverage_months=26,  # 26 months > 24 months
            bill_items=[
                BillItem(item_id="1", name="Cataract Surgery", category=ExpenseCategory.SURGEON_FEES, claimed_amount=45000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertGreater(res.estimated_payable_amount, 0)


if __name__ == "__main__":
    unittest.main()

