"""
CLI interface for MediSync360 Insurance Rule Engine.
Enables Node.js / Express backend to execute claim evaluation directly in-process
without requiring a live network microservice port.
"""
import sys
import os
import json

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from legacy_adapter import execute_claim_evaluation
from registry.product_registry import list_supported_policies
from assistant_bridge import handle_assistant_query


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "predict"
    raw_input = sys.stdin.read()
    try:
        payload = json.loads(raw_input) if raw_input else {}
    except Exception as e:
        sys.stderr.write(f"JSON Parse Error: {e}\n")
        sys.exit(1)

    if mode in ("chat", "assistant"):
        query = payload.get("query", "")
        claim_data = payload.get("claimData")
        claim_result = payload.get("claimResult")
        result = handle_assistant_query(query, current_claim=claim_data, current_result=claim_result)
        sys.stdout.write(json.dumps(result))
    elif mode == "compare":
        results = []
        for p in list_supported_policies():
            comp_payload = {**payload, "company": p.insurer_name}
            try:
                r = execute_claim_evaluation(comp_payload)
                results.append({
                    "company": p.insurer_name,
                    "approved_amount": r["approved_amount"],
                    "total_deducted": round(r["total_claimed_amount"] - r["approved_amount"], 2),
                    "claim_efficiency_pct": r["claim_efficiency_pct"],
                    "approval_probability": r["approval_probability"],
                    "risk_score": r["risk_score"],
                    "risk_tier": r["risk_tier"],
                    "co_pay_pct": p.standard_copay_pct,
                    "hard_reject": r["status"] == "REJECTED",
                    "top_recommendation": r["recommendations"][0] if r["recommendations"] else "",
                })
            except Exception:
                continue
        results.sort(key=lambda x: x["approved_amount"], reverse=True)
        out = {"total_claimed": payload.get("sum_insured", 0), "comparison": results}
        sys.stdout.write(json.dumps(out))
    else:
        result = execute_claim_evaluation(payload)
        sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
