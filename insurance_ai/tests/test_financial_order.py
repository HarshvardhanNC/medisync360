"""
Unit tests for Financial Deduction Ordering in MediSync360 Insurance Engine.
"""
import unittest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from domain.models import ClaimInput, BillItem
from domain.status import ExpenseCategory, CalculationStatus
from engine.pipeline import calculate_claim


class TestFinancialOrder(unittest.TestCase):
    def test_irdai_non_payable_consumable_deduction(self):
        """IRDAI Schedule I items (admission kit, toiletries, diapers) must be 100% excluded."""
        claim = ClaimInput(
            company_name="Care Health",
            admitting_diagnosis="Pneumonia",
            treatment_type="Medical Management",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            bill_items=[
                BillItem(item_id="1", name="Inpatient Care", category=ExpenseCategory.ROOM_RENT, claimed_amount=30000.0),
                BillItem(item_id="2", name="Admission Kit & Toiletries", category=ExpenseCategory.NON_MEDICAL_ITEMS, claimed_amount=2500.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.excluded_expense_amount, 2500.0)
        self.assertEqual(res.estimated_payable_amount, 30000.0)

    def test_deductible_and_copay_order(self):
        """
        Deductible must be subtracted BEFORE co-payment!
        If bill is ₹1,00,000, Deductible is ₹10,000, Co-pay is 10%:
          - After Deductible: ₹90,000.
          - Co-pay (10% of 90,000): ₹9,000.
          - Payable: ₹81,000.
        (Incorrect old logic took co-pay before deductible or deducted SI excess first).
        """
        claim = ClaimInput(
            company_name="Star Health",
            admitting_diagnosis="Viral Fever",
            treatment_type="Medical Management",
            sum_insured=500000.0,
            continuous_coverage_months=36,
            voluntary_deductible=10000.0,
            opted_copay_pct=10.0,
            bill_items=[
                BillItem(item_id="1", name="Hospitalization", category=ExpenseCategory.ROOM_RENT, claimed_amount=100000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.deductible_deduction, 10000.0)
        self.assertEqual(res.co_payment_deduction, 9000.0)
        self.assertEqual(res.estimated_payable_amount, 81000.0)

    def test_sum_insured_ceiling(self):
        """When net admissible exceeds remaining Sum Insured, claim is capped cleanly at SI."""
        claim = ClaimInput(
            company_name="Care Health",
            admitting_diagnosis="Coronary Artery Bypass Grafting (CABG)",
            treatment_type="Surgery",
            sum_insured=400000.0,
            continuous_coverage_months=36,
            bill_items=[
                BillItem(item_id="1", name="Cardiac Surgery", category=ExpenseCategory.SURGEON_FEES, claimed_amount=600000.0),
            ]
        )
        res = calculate_claim(claim)
        self.assertEqual(res.status, CalculationStatus.CALCULATED)
        self.assertEqual(res.estimated_payable_amount, 400000.0)
        self.assertEqual(res.remaining_sum_insured, 0.0)
        self.assertEqual(res.other_applicable_deductions, 200000.0)


if __name__ == "__main__":
    unittest.main()

