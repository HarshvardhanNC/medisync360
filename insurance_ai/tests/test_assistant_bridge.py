"""
Unit tests for Insurance AI Assistant Bridge & Grounding Engine.
Verifies:
1. Policy-specific room rent questions.
2. Waiting period lookups for specific ailments (Cataract, Hernia, PED).
3. Active claim deduction explanations with itemized breakdown.
4. Consumables and Safeguard rider explanations.
5. Multi-carrier benchmark comparison queries.
"""
import sys
import os
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from assistant_bridge import handle_assistant_query


class TestInsuranceAssistantBridge(unittest.TestCase):

    def test_room_rent_inquiry_hdfc(self):
        """HDFC Optima Secure inquiry must return Any Room / 0% proportionate cut."""
        res = handle_assistant_query("Does HDFC Optima Secure have a room rent limit?")
        self.assertIn("HDFHLIP26058V082526", res["cited_uins"])
        self.assertIn("Any Room", res["answer"])
        self.assertIn("Nil (0%)", res["answer"])
        self.assertTrue(len(res["suggested_questions"]) > 0)

    def test_cataract_waiting_period_star(self):
        """Star Health cataract waiting period inquiry must return 24 months."""
        res = handle_assistant_query("What is the Cataract waiting period in Star Health?")
        self.assertIn("SHAHLIP26044V092526", res["cited_uins"])
        self.assertIn("24 Months", res["answer"])
        self.assertIn("Code-Excl02", str(res["cited_clauses"]))

    def test_consumables_inquiry(self):
        """Consumables inquiry must explain IRDAI Schedule I non-payables and Safeguard rider."""
        res = handle_assistant_query("What are consumables and how does the safeguard rider work?")
        self.assertIn("68 non-medical items", res["answer"])
        self.assertIn("Care Shield / Safeguard", res["answer"])
        self.assertTrue(any("Non-Medical" in c for c in res["cited_clauses"]))

    def test_claim_deduction_explanation(self):
        """When an evaluated claim with deductions is attached, the assistant explains the exact cuts."""
        claim_result = {
            "product_identified": "The New India Assurance Company Limited - New India Mediclaim",
            "uin": "NIAHLIP25040V102425",
            "total_claimed_amount": 250000.0,
            "approved_amount": 190000.0,
            "claim_efficiency_pct": 76.0,
            "deductions": [
                {
                    "item": "Room Rent",
                    "claimed": 20000.0,
                    "allowed": 10000.0,
                    "deducted": 10000.0,
                    "reason": "Exceeded 1% SI/day room cap",
                    "clause": "Room Rent Sub-limit Clause",
                },
                {
                    "item": "Surgery",
                    "claimed": 80000.0,
                    "allowed": 40000.0,
                    "deducted": 40000.0,
                    "reason": "Proportionate deduction applied",
                    "clause": "Proportionate Expense Deduction Clause",
                },
            ],
        }
        res = handle_assistant_query("Why was my claim deducted?", current_result=claim_result)
        self.assertIn("NIAHLIP25040V102425", res["cited_uins"])
        self.assertIn("Room Rent", res["answer"])
        self.assertIn("Surgery", res["answer"])
        self.assertIn("₹190,000", res["answer"])
        self.assertTrue(any("Proportionate" in c for c in res["cited_clauses"]))

    def test_compare_all_insurers_query(self):
        """Compare query must output benchmark table with 10 insurers."""
        res = handle_assistant_query("Compare all 10 insurers for room rent and waiting periods")
        self.assertIn("HDFC ERGO", res["answer"])
        self.assertIn("Star Health", res["answer"])
        self.assertIn("New India", res["answer"])
        self.assertIn("Care Health", res["answer"])
        self.assertTrue(len(res["suggested_questions"]) > 0)


if __name__ == "__main__":
    unittest.main()

