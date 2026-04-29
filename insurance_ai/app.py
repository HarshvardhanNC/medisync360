"""
Flask API — MediSync360 Insurance Claim Intelligence System
Port 5001. Advanced rule engine with 12 checks, Risk Score (0-100),
AI Recommendations, confidence bands, and multi-company comparison.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify
from flask_cors import CORS
from rules import INSURANCE_RULES, PRE_EXISTING_DISEASES, DISEASE_SPECIFIC_OVERRIDES
from model import predict as ml_predict, train_model, MODEL_PATH

app = Flask(__name__)
CORS(app, origins="*")

# ── Helpers ────────────────────────────────────────────────────────────────────
def _float(payload, key, default=0.0):
    return float(payload.get(key, default) or default)

def _int(payload, key, default=0):
    return int(payload.get(key, default) or default)

def _age_copay(age: int, bands: dict) -> int:
    extra = 0
    for thresh in sorted(bands.keys()):
        if age > thresh:
            extra = bands[thresh]
    return extra

# ── Advanced Rule Engine ───────────────────────────────────────────────────────
def run_rule_engine(payload: dict) -> dict:
    company   = payload["company"]
    rules     = INSURANCE_RULES[company]
    disease   = payload["disease"].lower()
    treatment = payload.get("treatment_type", "").lower()
    age       = _int(payload, "age")

    room_rent    = _float(payload, "room_rent")
    surgery_cost = _float(payload, "surgery_cost")
    medicines    = _float(payload, "medicines")
    diagnostics  = _float(payload, "diagnostics")
    ot_charges   = _float(payload, "ot_charges")
    blood_bank   = _float(payload, "blood_bank")
    miscellaneous= _float(payload, "miscellaneous")
    sum_insured  = _float(payload, "sum_insured")
    waiting_completed = bool(payload.get("waiting_completed"))
    network_hospital  = bool(payload.get("network_hospital"))
    total_claimed = room_rent + surgery_cost + medicines + diagnostics + ot_charges + blood_bank + miscellaneous

    deductions        = []
    approval_breakdown= []
    running_total     = total_claimed
    hard_reject       = False
    risk_points       = 0   # accumulates; 100 = highest risk

    def add_deduction(item, claimed, allowed, deducted, reason):
        nonlocal running_total
        deductions.append({"item": item, "claimed": round(claimed, 2),
                           "allowed": round(allowed, 2), "deducted": round(deducted, 2),
                           "reason": reason})
        running_total -= deducted

    def add_check(factor, status, impact, detail, risk_delta=0):
        nonlocal risk_points
        approval_breakdown.append({"factor": factor, "status": status,
                                   "impact": impact, "detail": detail})
        risk_points += risk_delta

    # ── 1. PRE-EXISTING / WAITING PERIOD ──────────────────────────────────────
    is_pre_existing = disease in [d.lower() for d in PRE_EXISTING_DISEASES]
    wp_years = rules["waiting_period_years"]
    if is_pre_existing and not waiting_completed:
        hard_reject = True
        risk_points += 40
        add_check("Waiting Period", "Failed", "Negative",
                  f"'{disease.title()}' is pre-existing. {company} requires {wp_years}-yr waiting period. Claim ineligible.", 0)
    else:
        add_check("Waiting Period", "Passed", "Positive",
                  "Waiting period criteria satisfied." if (waiting_completed or not is_pre_existing) else "Not a pre-existing condition.", 0)

    # ── 2. DEDUCTIBLE ─────────────────────────────────────────────────────────
    deductible = rules.get("deductible_amount", 0)
    if deductible > 0:
        if total_claimed <= deductible:
            hard_reject = True
            risk_points += 20
            add_check("Annual Deductible", "Below Deductible", "Negative",
                      f"Claim ₹{total_claimed:,.0f} is below annual deductible ₹{deductible:,}. Nothing payable.", 0)
        else:
            add_deduction("Annual Deductible", deductible, 0, deductible,
                          f"{company} has ₹{deductible:,} annual deductible. First portion is not payable.")
            add_check("Annual Deductible", f"₹{deductible:,} Applied", "Negative",
                      f"First ₹{deductible:,} deducted as annual deductible.", 5)
            risk_points += 5

    # ── 3. SUM INSURED CHECK ──────────────────────────────────────────────────
    if total_claimed > sum_insured:
        excess = total_claimed - sum_insured
        add_deduction("Excess over Sum Insured", total_claimed, sum_insured, excess,
                      f"Total ₹{total_claimed:,.0f} exceeds SI ₹{sum_insured:,.0f}. Capped at SI.")
        add_check("Sum Insured Adequacy", "Exceeded", "Negative",
                  f"Claim ₹{total_claimed:,.0f} exceeds sum insured by ₹{excess:,.0f}.", 15)
        risk_points += 15
    else:
        add_check("Sum Insured Adequacy", "Passed", "Positive",
                  f"Claim ₹{total_claimed:,.0f} within SI ₹{sum_insured:,.0f}.")

    # ── 4. ROOM RENT CAP ──────────────────────────────────────────────────────
    room_limit = sum_insured * rules["room_rent_limit_pct"] / 100
    if room_rent > room_limit:
        excess_room = room_rent - room_limit
        add_deduction("Room Rent", room_rent, room_limit, excess_room,
                      f"{company} caps room rent at {rules['room_rent_limit_pct']}% of SI = ₹{room_limit:,.0f}/day.")
        add_check("Room Rent Cap", "Exceeded", "Negative",
                  f"Room rent ₹{room_rent:,.0f} exceeds cap ₹{room_limit:,.0f}.", 8)
        risk_points += 8
    else:
        add_check("Room Rent Cap", "Passed", "Positive",
                  f"Room rent ₹{room_rent:,.0f} within daily cap ₹{room_limit:,.0f}.")

    # ── 5. SURGERY SUB-LIMIT ──────────────────────────────────────────────────
    surgery_limit = sum_insured * rules["surgery_sub_limit_pct"] / 100
    if surgery_cost > surgery_limit:
        exc = surgery_cost - surgery_limit
        add_deduction("Surgery / Procedure", surgery_cost, surgery_limit, exc,
                      f"{company} surgery sub-limit is {rules['surgery_sub_limit_pct']}% of SI = ₹{surgery_limit:,.0f}.")
        add_check("Surgery Sub-limit", "Exceeded", "Negative",
                  f"Surgery ₹{surgery_cost:,.0f} exceeds sub-limit ₹{surgery_limit:,.0f}.", 10)
        risk_points += 10
    elif surgery_cost > 0:
        add_check("Surgery Sub-limit", "Passed", "Positive",
                  f"Surgery ₹{surgery_cost:,.0f} within sub-limit ₹{surgery_limit:,.0f}.")

    # ── 6. MEDICINES SUB-LIMIT ────────────────────────────────────────────────
    med_limit = sum_insured * rules["medicines_sub_limit_pct"] / 100
    if medicines > med_limit:
        exc = medicines - med_limit
        add_deduction("Medicines (IPD)", medicines, med_limit, exc,
                      f"{company} medicines capped at {rules['medicines_sub_limit_pct']}% of SI = ₹{med_limit:,.0f}.")
        add_check("Medicines Sub-limit", "Exceeded", "Negative",
                  f"Medicines ₹{medicines:,.0f} exceed cap ₹{med_limit:,.0f}.", 7)
        risk_points += 7
    elif medicines > 0:
        add_check("Medicines Sub-limit", "Passed", "Positive",
                  f"Medicines ₹{medicines:,.0f} within cap ₹{med_limit:,.0f}.")

    # ── 7. OT CHARGES SUB-LIMIT ───────────────────────────────────────────────
    ot_limit = sum_insured * rules["ot_charges_sub_limit_pct"] / 100
    if ot_charges > ot_limit:
        exc = ot_charges - ot_limit
        add_deduction("OT Charges", ot_charges, ot_limit, exc,
                      f"{company} OT charges capped at {rules['ot_charges_sub_limit_pct']}% of SI = ₹{ot_limit:,.0f}.")
        add_check("OT Charges Sub-limit", "Exceeded", "Negative",
                  f"OT ₹{ot_charges:,.0f} exceeds cap ₹{ot_limit:,.0f}.", 6)
        risk_points += 6
    elif ot_charges > 0:
        add_check("OT Charges Sub-limit", "Passed", "Positive",
                  f"OT charges ₹{ot_charges:,.0f} within cap ₹{ot_limit:,.0f}.")

    # ── 8. DIAGNOSTICS SUB-LIMIT ──────────────────────────────────────────────
    diag_limit = sum_insured * rules["sub_limits"]["diagnostics_pct"] / 100
    if diagnostics > diag_limit:
        exc = diagnostics - diag_limit
        add_deduction("Diagnostics", diagnostics, diag_limit, exc,
                      f"{company} diagnostics sub-limit {rules['sub_limits']['diagnostics_pct']}% of SI = ₹{diag_limit:,.0f}.")
        add_check("Diagnostics Sub-limit", "Exceeded", "Negative",
                  f"Diagnostics ₹{diagnostics:,.0f} exceed cap ₹{diag_limit:,.0f}.", 5)
        risk_points += 5
    else:
        add_check("Diagnostics Sub-limit", "Passed", "Positive",
                  f"Diagnostics ₹{diagnostics:,.0f} within cap ₹{diag_limit:,.0f}.")

    # ── 9. BLOOD BANK COVERAGE ────────────────────────────────────────────────
    if blood_bank > 0:
        if not rules.get("blood_bank_covered", True):
            add_deduction("Blood Bank", blood_bank, 0, blood_bank,
                          f"{company} does not cover blood bank charges under this policy.")
            add_check("Blood Bank Coverage", "Not Covered", "Negative",
                      f"Blood bank ₹{blood_bank:,.0f} excluded by {company} policy.", 8)
            risk_points += 8
        else:
            add_check("Blood Bank Coverage", "Covered", "Positive",
                      f"Blood bank ₹{blood_bank:,.0f} is covered under {company} policy.")

    # ── 10. ICU DAILY CAP ─────────────────────────────────────────────────────
    icu_cap = rules.get("icu_per_day_limit", 0)
    if treatment == "icu" and icu_cap > 0 and room_rent > icu_cap:
        exc = room_rent - icu_cap
        add_deduction("ICU Daily Charges", room_rent, icu_cap, exc,
                      f"{company} caps ICU room at ₹{icu_cap:,}/day. Excess ₹{exc:,.0f} deducted.")
        add_check("ICU Daily Cap", "Exceeded", "Negative",
                  f"ICU room ₹{room_rent:,.0f} exceeds daily cap ₹{icu_cap:,}.", 7)
        risk_points += 7
    elif treatment == "icu":
        add_check("ICU Daily Cap", "Passed", "Positive",
                  "ICU charges within policy daily limit." if icu_cap > 0 else "No ICU per-day cap for this policy.")

    # ── 11. MISCELLANEOUS / NON-PAYABLE ───────────────────────────────────────
    flat_ded = rules["non_payable_fixed_deduction"]
    add_deduction("Non-Payable Items", flat_ded, 0, flat_ded,
                  f"Flat ₹{flat_ded:,} deducted for: {', '.join(rules['non_payable_items'][:3])}, etc.")
    add_check("Non-Payable Items", "Deducted", "Negative",
              f"₹{flat_ded:,} deducted for consumables/misc not covered by {company}.", 3)
    risk_points += 3
    if miscellaneous > 0:
        misc_ded = round(miscellaneous * 0.5, 2)
        add_deduction("Miscellaneous / Consumables", miscellaneous,
                      round(miscellaneous - misc_ded, 2), misc_ded,
                      f"50% cap on miscellaneous/consumable charges. ₹{misc_ded:,.0f} deducted.")
        add_check("Miscellaneous Charges", "50% Capped", "Negative",
                  f"₹{miscellaneous:,.0f} miscellaneous: 50% deduction applied.", 3)
        risk_points += 3

    # ── 12. NON-NETWORK PENALTY ───────────────────────────────────────────────
    if not network_hospital:
        pen_pct = rules["non_network_penalty_pct"]
        penalty = round(running_total * pen_pct / 100, 2)
        add_deduction("Non-Network Penalty", running_total,
                      round(running_total - penalty, 2), penalty,
                      f"{company} applies {pen_pct}% penalty for non-network hospitals.")
        add_check("Hospital Network", "Non-Network", "Negative",
                  f"{pen_pct}% penalty applied. Use network hospitals for full benefit.", 10)
        risk_points += 10
    else:
        add_check("Hospital Network", "In-Network", "Positive",
                  "Treatment at network hospital — no penalty applied.")

    # ── 13. CO-PAY (standard + age-based) ────────────────────────────────────
    base_copay = rules["co_pay_pct"]
    age_extra  = _age_copay(age, rules.get("age_co_pay_bands", {}))
    effective_copay = base_copay + age_extra
    if effective_copay > 0:
        copay_amt = round(running_total * effective_copay / 100, 2)
        detail_str = f"{company}: {base_copay}% standard co-pay"
        if age_extra > 0:
            detail_str += f" + {age_extra}% age-based co-pay (age {age})"
        add_deduction("Co-Pay", running_total,
                      round(running_total - copay_amt, 2), copay_amt,
                      f"{detail_str}. Your out-of-pocket share: ₹{copay_amt:,.0f}.")
        add_check("Co-Pay", f"{effective_copay}% Applied", "Negative",
                  f"You bear {effective_copay}% co-pay = ₹{copay_amt:,.0f}.", 5 if effective_copay > 15 else 3)
        risk_points += 5 if effective_copay > 15 else 3
    else:
        add_check("Co-Pay", "Nil", "Positive",
                  f"{company} has zero co-pay for network hospital claims.")

    # ── 14. DISEASE-SPECIFIC OVERRIDES ────────────────────────────────────────
    override = DISEASE_SPECIFIC_OVERRIDES.get(disease)
    if override:
        add_check("Disease Override", "Special Rules", "Negative" if override.get("requires_special_approval") else "Neutral",
                  override["note"], 5 if override.get("requires_special_approval") else 0)
        if override.get("requires_special_approval"):
            risk_points += 5

    # ── Eligible amount ───────────────────────────────────────────────────────
    eligible_amount = max(round(running_total, 2), 0)
    if hard_reject:
        eligible_amount = 0

    # ── Claim Efficiency Ratio ────────────────────────────────────────────────
    claim_efficiency = round(eligible_amount / total_claimed * 100, 1) if total_claimed > 0 else 0

    # ── Risk Score ────────────────────────────────────────────────────────────
    risk_score = min(int(risk_points), 100)
    if risk_score >= 60:    risk_tier = "Critical"
    elif risk_score >= 40:  risk_tier = "High Risk"
    elif risk_score >= 20:  risk_tier = "Moderate Risk"
    else:                   risk_tier = "Low Risk"

    # ── AI Recommendations ────────────────────────────────────────────────────
    recommendations = []
    if not network_hospital:
        recommendations.append("Switch to a network hospital to avoid the non-network penalty and save significantly on your claim.")
    if is_pre_existing and not waiting_completed:
        recommendations.append(f"Complete the {wp_years}-year waiting period for '{disease.title()}' before making a claim. Consider interim coverage options.")
    if total_claimed > sum_insured:
        recommendations.append(f"Upgrade your sum insured. Current SI ₹{sum_insured:,.0f} is insufficient for this claim. Consider a top-up plan.")
    if room_rent > room_limit:
        recommendations.append(f"Opt for a lower room category. Choosing a room within ₹{room_limit:,.0f}/day eliminates proportionate deductions on other items.")
    if surgery_cost > surgery_limit:
        recommendations.append(f"Negotiate surgery costs with the hospital. {company} caps surgical procedures at ₹{surgery_limit:,.0f}.")
    if medicines > med_limit:
        recommendations.append(f"Request generic medicine substitutes. Medicines exceeding ₹{med_limit:,.0f} are not claimable under {company}.")
    if age_extra > 0:
        recommendations.append(f"Age-based co-pay of {age_extra}% applies at your age ({age}). Consider policies with flat co-pay across age bands.")
    if deductible > 0:
        recommendations.append(f"Your policy has a ₹{deductible:,} annual deductible. For small claims, it may be more cost-effective to pay out-of-pocket.")
    if not rules.get("blood_bank_covered", True) and blood_bank > 0:
        recommendations.append("Blood bank charges are not covered under this insurer. Choose a policy that includes blood bank coverage.")
    if not recommendations:
        recommendations.append("Your claim profile is clean. Submit all original bills and discharge summary within 30 days of discharge.")
    recommendations = recommendations[:5]  # Cap at 5

    # ── Final Decision Explanation ─────────────────────────────────────────────
    if hard_reject:
        explanation = (
            f"Claim REJECTED — {('Pre-existing disease waiting period not met.' if is_pre_existing and not waiting_completed else 'Claim fell below annual deductible.')} "
            f"No amount is payable under this policy at this time."
        )
    elif eligible_amount <= 0:
        explanation = "Claim results in zero payable amount after all deductions. Review sub-limits and non-payable items."
    elif claim_efficiency < 50:
        explanation = (
            f"Significant deductions applied. Only {claim_efficiency}% of your claim (₹{eligible_amount:,.0f} of ₹{total_claimed:,.0f}) "
            f"is payable. Primary reductions: {', '.join(d['item'] for d in deductions[:3])}."
        )
    else:
        explanation = (
            f"Claim approved with standard deductions. ₹{eligible_amount:,.0f} approved out of ₹{total_claimed:,.0f} claimed "
            f"({claim_efficiency}% recovery). Submit documents within {rules['post_hospitalization_days']} days of discharge."
        )

    return {
        "total_claimed": round(total_claimed, 2),
        "eligible_amount": eligible_amount,
        "claim_efficiency_pct": claim_efficiency,
        "deductions": deductions,
        "approval_breakdown": approval_breakdown,
        "final_decision_explanation": explanation,
        "hard_reject": hard_reject,
        "risk_score": risk_score,
        "risk_tier": risk_tier,
        "recommendations": recommendations,
    }


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "MediSync360 Insurance AI v2", "port": 5001})


@app.route("/predict-claim", methods=["POST"])
def predict_claim():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body provided"}), 400

    required = ["age", "disease", "treatment_type", "company", "sum_insured",
                "waiting_completed", "network_hospital",
                "room_rent", "surgery_cost", "medicines", "diagnostics",
                "ot_charges", "blood_bank", "miscellaneous"]
    missing = [f for f in required if f not in data]
    if missing:
        return jsonify({"error": f"Missing fields: {missing}"}), 422
    if data["company"] not in INSURANCE_RULES:
        return jsonify({"error": f"Unknown company: {data['company']}"}), 422

    try:
        rule_result = run_rule_engine(data)
        ml_result   = ml_predict(data)

        if rule_result["hard_reject"]:
            ml_result = {"probability": 0.0, "low": 0.0, "high": 0.0}

        response = {
            "approval_probability":       ml_result["probability"],
            "confidence_band":            {"low": ml_result["low"], "high": ml_result["high"]},
            "total_claimed_amount":       rule_result["total_claimed"],
            "approved_amount":            rule_result["eligible_amount"],
            "claim_efficiency_pct":       rule_result["claim_efficiency_pct"],
            "deductions":                 rule_result["deductions"],
            "approval_breakdown":         rule_result["approval_breakdown"],
            "final_decision_explanation": rule_result["final_decision_explanation"],
            "risk_score":                 rule_result["risk_score"],
            "risk_tier":                  rule_result["risk_tier"],
            "recommendations":            rule_result["recommendations"],
            "metadata": {
                "company":            data["company"],
                "disease":            data["disease"],
                "sum_insured":        data["sum_insured"],
                "network_hospital":   data["network_hospital"],
                "waiting_completed":  data["waiting_completed"],
                "post_hosp_days":     INSURANCE_RULES[data["company"]]["post_hospitalization_days"],
            },
        }
        return jsonify(response), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/compare-claim", methods=["POST"])
def compare_claim():
    """Run rule engine across ALL companies for the same bill."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "No JSON body"}), 400

    results = []
    for company_name in INSURANCE_RULES:
        payload = {**data, "company": company_name}
        try:
            rule_r = run_rule_engine(payload)
            ml_r   = ml_predict(payload)
            if rule_r["hard_reject"]:
                ml_r = {"probability": 0.0, "low": 0.0, "high": 0.0}
            results.append({
                "company":              company_name,
                "approved_amount":      rule_r["eligible_amount"],
                "total_deducted":       round(rule_r["total_claimed"] - rule_r["eligible_amount"], 2),
                "claim_efficiency_pct": rule_r["claim_efficiency_pct"],
                "approval_probability": ml_r["probability"],
                "risk_score":           rule_r["risk_score"],
                "risk_tier":            rule_r["risk_tier"],
                "co_pay_pct":           INSURANCE_RULES[company_name]["co_pay_pct"],
                "hard_reject":          rule_r["hard_reject"],
                "top_recommendation":   rule_r["recommendations"][0] if rule_r["recommendations"] else "",
            })
        except Exception:
            continue

    results.sort(key=lambda x: x["approved_amount"], reverse=True)
    return jsonify({"total_claimed": data.get("sum_insured", 0), "comparison": results}), 200


@app.route("/train", methods=["POST"])
def retrain():
    try:
        stats = train_model()
        return jsonify({
            "status": "Model retrained successfully",
            "accuracy": round(stats["accuracy"], 4),
            "auc": round(stats.get("auc", 0), 4),
            "cv_auc_mean": round(stats.get("cv_auc_mean", 0), 4),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/companies", methods=["GET"])
def get_companies():
    result = []
    for name, r in INSURANCE_RULES.items():
        result.append({
            "name": name,
            "room_rent_limit_pct": r["room_rent_limit_pct"],
            "co_pay_pct": r["co_pay_pct"],
            "waiting_period_years": r["waiting_period_years"],
            "non_network_penalty_pct": r["non_network_penalty_pct"],
            "surgery_sub_limit_pct": r["surgery_sub_limit_pct"],
            "medicines_sub_limit_pct": r["medicines_sub_limit_pct"],
            "blood_bank_covered": r.get("blood_bank_covered", True),
            "maternity_limit": r.get("maternity_limit", 0),
            "deductible_amount": r.get("deductible_amount", 0),
            "annual_bonus_pct": r.get("annual_bonus_pct", 0),
        })
    return jsonify(result)


if __name__ == "__main__":
    if not os.path.exists(MODEL_PATH):
        print("First run — training GBM model on 5000 rows …")
        train_model()
    print("Insurance AI server starting on http://localhost:5001")
    app.run(host="0.0.0.0", port=5001, debug=False)
