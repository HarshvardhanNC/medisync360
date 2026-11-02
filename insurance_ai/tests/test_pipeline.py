"""
End-to-End Integration Tests for Pipeline & Legacy Adapter — MediSync360.
"""
import unittest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from legacy_adapter import execute_claim_evaluation


class TestPipelineIntegration(unittest.TestCase):
    def test_legacy_payload_compatibility_hdfc(self):
        """Tests that a standard payload from the Next.js frontend runs cleanly on HDFC Optima Secure."""
        payload = {
            "age": 35,
            "disease": "Dengue",
            "treatment_type": "Medical Management",
            "company": "HDFC ERGO",
            "sum_insured": 500000,
            "waiting_completed": True,
            "network_hospital": True,
            "room_rent": 24000,
            "surgery_cost": 0,
            "medicines": 18000,
            "diagnostics": 8000,
            "ot_charges": 0,
            "blood_bank": 0,
            "miscellaneous": 2000,
        }
        res = execute_claim_evaluation(payload)
        self.assertEqual(res["status"], "CALCULATED")
        self.assertIn("HDFC ERGO", res["product_identified"])
        self.assertEqual(res["total_claimed_amount"], 52000.0)
        # Non-medical miscellaneous (2,000) excluded; 50,000 admissible and approved
        self.assertEqual(res["approved_amount"], 50000.0)
        self.assertGreater(res["approval_probability"], 0.7)
        self.assertTrue(len(res["deductions"]) >= 1)
        self.assertTrue(len(res["approval_breakdown"]) >= 3)
        self.assertTrue(len(res["recommendations"]) >= 1)

    def test_compare_across_all_insurers(self):
        """Tests evaluating the same claim bill across all registered products."""
        from registry.product_registry import list_supported_policies
        policies = list_supported_policies()
        self.assertGreaterEqual(len(policies), 6)

        payload = {
            "age": 42,
            "disease": "Appendicitis",
            "treatment_type": "Surgery",
            "company": "Star Health",
            "sum_insured": 500000,
            "waiting_completed": True,
            "network_hospital": True,
            "room_rent": 15000,
            "surgery_cost": 45000,
            "medicines": 12000,
            "diagnostics": 6000,
            "ot_charges": 10000,
            "blood_bank": 0,
            "miscellaneous": 1500,
        }
        for p in policies:
            test_payload = {**payload, "company": p.insurer_name}
            res = execute_claim_evaluation(test_payload)
            self.assertIn(res["status"], ["CALCULATED", "REJECTED"])
            self.assertIsInstance(res["approved_amount"], (int, float))


if __name__ == "__main__":
    unittest.main()

