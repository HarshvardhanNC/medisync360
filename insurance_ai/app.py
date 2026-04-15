"""
Flask API — MediSync360 Insurance Claim Intelligence System
Runs on port 5001 independently from the existing Express backend.

Endpoints:
  GET  /health             — health check
  POST /predict-claim      — full rule engine + ML prediction
  POST /train              — retrain model on demand
"""

import os
import sys

# Allow sibling imports when run directly
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS

from rules import INSURANCE_RULES, PRE_EXISTING_DISEASES, DISEASE_RISK_MAP
from model import predict as ml_predict, train_model, MODEL_PATH

app = Flask(__name__)
CORS(app, origins="*")   # Allow Next.js dev server on 3000

# ──────────────────────────────────────────────────────────────────────────────
#  Rule Engine
# ──────────────────────────────────────────────────────────────────────────────

def run_rule_engine(payload: dict) -> dict:
    """
    Applies insurance company rules and returns:
      - eligible_amount
      - deductions  (list of dicts)
      - approval_breakdown (list of factor checks)
    """
    company     = payload["company"]
    rules       = INSURANCE_RULES[company]
    disease     = payload["disease"].lower()

    # Raw bill items
    room_rent    = float(payload["room_rent"])
    surgery_cost = float(payload["surgery_cost"])
    medicines    = float(payload["medicines"])
    diagnostics  = float(payload["diagnostics"])
    ot_charges   = float(payload.get("ot_charges", 0))
    blood_bank   = float(payload.get("blood_bank", 0))
    miscellaneous= float(payload.get("miscellaneous", 0))
    sum_insured  = float(payload["sum_insured"])

    waiting_completed = bool(payload["waiting_completed"])
    network_hospital  = bool(payload["network_hospital"])

    total_claimed = room_rent + surgery_cost + medicines + diagnostics + ot_charges + blood_bank + miscellaneous

    deductions        = []
    approval_breakdown = []
    running_total     = total_claimed
    hard_reject       = False

    # ── 1. WAITING PERIOD ──────────────────────────────────────────────────
    is_pre_existing = disease in [d.lower() for d in PRE_EXISTING_DISEASES]
    wp_years = rules["waiting_period_years"]

    if is_pre_existing and not waiting_completed:
        hard_reject = True
        approval_breakdown.append({
            "factor": "Waiting Period",
            "status": "Failed",
            "impact": "Negative",
            "detail": (
                f"'{disease.title()}' is a pre-existing condition. "
                f"{company} requires {wp_years}-year waiting period. "
                "Claim is ineligible until waiting period is completed."
            ),
        })
    else:
        approval_breakdown.append({
            "factor": "Waiting Period",
            "status": "Passed",
            "impact": "Positive",
            "detail": (
                "Waiting period criteria met."
                if waiting_completed or not is_pre_existing
                else "Condition not classified as pre-existing."
            ),
        })

    # ── 2. SUM INSURED CHECK ──────────────────────────────────────────────
    if total_claimed > sum_insured:
        excess = total_claimed - sum_insured
        deductions.append({
            "item": "Excess over Sum Insured",
            "claimed": total_claimed,
            "allowed": sum_insured,
            "deducted": round(excess, 2),
            "reason": f"Total claim ₹{total_claimed:,.0f} exceeds sum insured ₹{sum_insured:,.0f}. Capped at SI.",
        })
        running_total -= excess
        approval_breakdown.append({
            "factor": "Sum Insured Adequacy",
            "status": "Partial",
            "impact": "Negative",
            "detail": f"Claim exceeds sum insured by ₹{excess:,.0f}. Amount capped.",
        })
    else:
        approval_breakdown.append({
            "factor": "Sum Insured Adequacy",
            "status": "Passed",
            "impact": "Positive",
            "detail": f"Total claim ₹{total_claimed:,.0f} is within sum insured ₹{sum_insured:,.0f}.",
        })

    # ── 3. ROOM RENT CAP ──────────────────────────────────────────────────
    daily_room_limit = sum_insured * rules["room_rent_limit_pct"] / 100
    if room_rent > daily_room_limit:
        excess_room = room_rent - daily_room_limit
        deductions.append({
            "item": "Room Rent",
            "claimed": round(room_rent, 2),
            "allowed": round(daily_room_limit, 2),
            "deducted": round(excess_room, 2),
            "reason": (
                f"Room rent limit for {company} is {rules['room_rent_limit_pct']}% of SI "
                f"= ₹{daily_room_limit:,.0f}/day. Excess of ₹{excess_room:,.0f} deducted."
            ),
        })
        running_total -= excess_room
        approval_breakdown.append({
            "factor": "Room Rent Cap",
            "status": "Exceeded",
            "impact": "Negative",
            "detail": f"Room rent ₹{room_rent:,.0f} exceeds allowed ₹{daily_room_limit:,.0f}.",
        })
    else:
        approval_breakdown.append({
            "factor": "Room Rent Cap",
            "status": "Passed",
            "impact": "Positive",
            "detail": f"Room rent ₹{room_rent:,.0f} within daily limit ₹{daily_room_limit:,.0f}.",
        })

    # ── 4. DIAGNOSTICS SUB-LIMIT ──────────────────────────────────────────
    diag_limit = sum_insured * rules["sub_limits"]["diagnostics_pct"] / 100
    if diagnostics > diag_limit:
        excess_diag = diagnostics - diag_limit
        deductions.append({
            "item": "Diagnostics",
            "claimed": round(diagnostics, 2),
            "allowed": round(diag_limit, 2),
            "deducted": round(excess_diag, 2),
            "reason": (
                f"Diagnostics sub-limit is {rules['sub_limits']['diagnostics_pct']}% of SI "
                f"= ₹{diag_limit:,.0f}. Excess ₹{excess_diag:,.0f} not payable."
            ),
        })
        running_total -= excess_diag
        approval_breakdown.append({
            "factor": "Diagnostics Sub-limit",
            "status": "Exceeded",
            "impact": "Negative",
            "detail": f"Diagnostics ₹{diagnostics:,.0f} exceeds sub-limit ₹{diag_limit:,.0f}.",
        })
    else:
        approval_breakdown.append({
            "factor": "Diagnostics Sub-limit",
            "status": "Passed",
            "impact": "Positive",
            "detail": f"Diagnostics ₹{diagnostics:,.0f} within sub-limit ₹{diag_limit:,.0f}.",
        })

    # ── 5. NON-PAYABLE ITEMS (flat deduction) ─────────────────────────────
    flat_ded = rules["non_payable_fixed_deduction"]
    deductions.append({
        "item": "Non-Payable Items",
        "claimed": flat_ded,
        "allowed": 0,
        "deducted": flat_ded,
        "reason": (
            f"Standard non-payable deduction of ₹{flat_ded:,} applied for: "
            + ", ".join(rules["non_payable_items"][:3]) + ", etc."
        ),
    })
    # Miscellaneous items deduction
    if miscellaneous > 0:
        misc_deduction = miscellaneous * 0.5  # 50% max capped for miscellaneous
        deductions.append({
            "item": "Miscellaneous / Consumables",
            "claimed": round(miscellaneous, 2),
            "allowed": round(miscellaneous - misc_deduction, 2),
            "deducted": round(misc_deduction, 2),
            "reason": f"Miscellaneous and consumable charges are capped. 50% deduction of ₹{misc_deduction:,.0f} applied."
        })
        running_total -= misc_deduction
        approval_breakdown.append({
            "factor": "Miscellaneous / Consumables",
            "status": "Partial Deduction",
            "impact": "Negative",
            "detail": f"50% deduction applied on miscellaneous charges of ₹{miscellaneous:,.0f}.",
        })

    running_total -= flat_ded
    approval_breakdown.append({
        "factor": "Non-Payable Items",
        "status": "Deducted",
        "impact": "Negative",
        "detail": (
            f"₹{flat_ded:,} deducted for consumables/misc items not covered under {company} policy."
        ),
    })

    # ── 6. NON-NETWORK PENALTY ────────────────────────────────────────────
    if not network_hospital:
        penalty_pct = rules["non_network_penalty_pct"]
        penalty_amt = running_total * penalty_pct / 100
        deductions.append({
            "item": "Non-Network Hospital Penalty",
            "claimed": round(running_total, 2),
            "allowed": round(running_total - penalty_amt, 2),
            "deducted": round(penalty_amt, 2),
            "reason": (
                f"{company} applies a {penalty_pct}% penalty for treatment at non-network hospitals. "
                f"₹{penalty_amt:,.0f} deducted from adjusted amount."
            ),
        })
        running_total -= penalty_amt
        approval_breakdown.append({
            "factor": "Hospital Network",
            "status": "Non-Network",
            "impact": "Negative",
            "detail": f"{penalty_pct}% penalty applied. Prefer network hospitals for full coverage.",
        })
    else:
        approval_breakdown.append({
            "factor": "Hospital Network",
            "status": "In-Network",
            "impact": "Positive",
            "detail": "Treatment at network hospital — no penalty applied.",
        })

    # ── 7. CO-PAY ─────────────────────────────────────────────────────────
    co_pay_pct = rules["co_pay_pct"]
    if co_pay_pct > 0:
        co_pay_amt = running_total * co_pay_pct / 100
        deductions.append({
            "item": "Co-Pay",
            "claimed": round(running_total, 2),
            "allowed": round(running_total - co_pay_amt, 2),
            "deducted": round(co_pay_amt, 2),
            "reason": (
                f"{company} policy requires {co_pay_pct}% co-pay by the insured. "
                f"₹{co_pay_amt:,.0f} is your out-of-pocket share."
            ),
        })
        running_total -= co_pay_amt
        approval_breakdown.append({
            "factor": "Co-Pay",
            "status": f"{co_pay_pct}% Applied",
            "impact": "Negative",
            "detail": f"You are responsible for {co_pay_pct}% of the approved amount.",
        })
    else:
        approval_breakdown.append({
            "factor": "Co-Pay",
            "status": "Nil",
            "impact": "Positive",
            "detail": f"{company} has zero co-pay for network hospital claims.",
        })

    eligible_amount = max(round(running_total, 2), 0)

    # Build final decision explanation
    if hard_reject:
        eligible_amount = 0
        explanation = (
            f"❌ Claim REJECTED — '{disease.title()}' is a pre-existing condition and the "
            f"{wp_years}-year waiting period for {company} has not been completed. "
            "No amount is payable under this policy at this time."
        )
    elif eligible_amount <= 0:
        eligible_amount = 0
        explanation = (
            "❌ Claim results in zero payable amount after applying all policy deductions. "
            "Review room rent, diagnostics sub-limits, and non-payable items."
        )
    elif eligible_amount < total_claimed * 0.5:
        explanation = (
            f"⚠️ Partial approval — Significant deductions applied. "
            f"₹{eligible_amount:,.0f} approved out of ₹{total_claimed:,.0f} claimed. "
            "Primary reductions are due to: "
            + ", ".join([d["item"] for d in deductions[:3]]) + "."
        )
    else:
        explanation = (
            f"✅ Claim approved with standard deductions. "
            f"₹{eligible_amount:,.0f} will be disbursed out of ₹{total_claimed:,.0f} claimed. "
            "Ensure documents are submitted within 30 days of discharge."
        )

    return {
        "total_claimed": round(total_claimed, 2),
        "eligible_amount": eligible_amount,
        "deductions": deductions,
        "approval_breakdown": approval_breakdown,
        "final_decision_explanation": explanation,
        "hard_reject": hard_reject,
    }


# ──────────────────────────────────────────────────────────────────────────────
#  Routes
# ──────────────────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MediSync360 Insurance AI", "port": 5001})


@app.route("/predict-claim", methods=["POST"])
def predict_claim():
    """
    POST /predict-claim
    Body (JSON):
      age, disease, treatment_type, company, sum_insured,
      waiting_completed (bool), network_hospital (bool),
      room_rent, surgery_cost, medicines, diagnostics,
      ot_charges, blood_bank, miscellaneous
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    required = [
        "age", "disease", "treatment_type", "company", "sum_insured",
        "waiting_completed", "network_hospital",
        "room_rent", "surgery_cost", "medicines", "diagnostics",
        "ot_charges", "blood_bank", "miscellaneous",
    ]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 422

    if data["company"] not in INSURANCE_RULES:
        return jsonify({"error": f"Unknown company: {data['company']}"}), 422

    try:
        # ── Rule Engine ────────────────────────────────────────────────────
        rule_result = run_rule_engine(data)

        # ── ML probability ─────────────────────────────────────────────────
        approval_probability = ml_predict(data)

        # If hard rejected by rule engine, override probability
        if rule_result["hard_reject"]:
            approval_probability = 0.0

        response = {
            "approval_probability": approval_probability,
            "total_claimed_amount": rule_result["total_claimed"],
            "approved_amount": rule_result["eligible_amount"],
            "deductions": rule_result["deductions"],
            "approval_breakdown": rule_result["approval_breakdown"],
            "final_decision_explanation": rule_result["final_decision_explanation"],
            "metadata": {
                "company": data["company"],
                "disease": data["disease"],
                "sum_insured": data["sum_insured"],
                "network_hospital": data["network_hospital"],
                "waiting_completed": data["waiting_completed"],
            },
        }
        return jsonify(response), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/train", methods=["POST"])
def retrain():
    """POST /train — Retrain model on fresh synthetic dataset."""
    try:
        stats = train_model()
        return jsonify({
            "status": "Model retrained successfully",
            "accuracy": round(stats["accuracy"], 4),
            "model_path": MODEL_PATH,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/companies", methods=["GET"])
def get_companies():
    """GET /companies — List supported insurers with key policy details."""
    result = []
    for name, rules in INSURANCE_RULES.items():
        result.append({
            "name": name,
            "room_rent_limit_pct": rules["room_rent_limit_pct"],
            "co_pay_pct": rules["co_pay_pct"],
            "waiting_period_years": rules["waiting_period_years"],
            "non_network_penalty_pct": rules["non_network_penalty_pct"],
        })
    return jsonify(result)


# ──────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    # Auto-train model on first run if not already saved
    if not os.path.exists(MODEL_PATH):
        print("🔄  First run — training ML model...")
        train_model()
    print("🚀  Insurance AI server starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
