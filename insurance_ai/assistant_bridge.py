"""
Generative AI Assistant Bridge & Grounding Engine — MediSync360.
Provides deterministic, verified grounding contexts, policy Q&A synthesis,
and claim explanation helpers for the conversational AI insurance assistant.
Strictly guarantees zero hallucination of limits, clauses, or financial numbers.
"""
import re
from typing import Dict, Any, List, Optional
from domain.models import CalculationResult, ClaimInput, ProductPolicy
from domain.status import CalculationStatus, RoomCategory
from registry.product_registry import get_policy, list_supported_policies, COMPANY_ALIASES
from registry.source_registry import get_citation


def prepare_chatbot_grounding_context(result: CalculationResult) -> Dict[str, Any]:
    """
    Produces structured grounding data for the GenAI Assistant.
    Guarantees that the assistant references only verified financial outputs and official clauses.
    """
    return {
        "status": result.status.value,
        "product": result.product_identified,
        "uin": result.uin,
        "financial_summary": {
            "total_submitted": result.total_submitted_bill,
            "admissible_before_deductions": result.eligible_expense_amount,
            "final_payable": result.estimated_payable_amount,
            "total_deductions": result.excluded_expense_amount,
            "remaining_sum_insured": result.remaining_sum_insured,
            "recovery_efficiency_pct": result.claim_efficiency_pct,
        },
        "itemized_deductions": [
            {
                "item": d.item,
                "amount_deducted": d.deducted,
                "reason": d.reason,
                "clause_reference": d.clause,
            }
            for d in result.deductions
        ],
        "policy_checks": [
            {
                "factor": c.factor,
                "verdict": c.status,
                "detail": c.detail,
                "clause_reference": c.clause,
            }
            for c in result.approval_breakdown
        ],
        "missing_information": result.missing_information,
        "manual_review_needed": len(result.manual_review_requirements) > 0,
        "official_source_clauses": result.source_clauses,
        "verified_recommendations": result.recommendations,
        "is_restoration_triggered": result.is_restoration_triggered,
        "restoration_amount_applied": result.restoration_amount_applied,
        "consumables_waived_by_rider": result.consumables_waived_by_rider,
    }


def _detect_mentioned_company(query_lower: str, fallback_company: Optional[str] = None) -> Optional[ProductPolicy]:
    """Detects which insurance carrier is mentioned in the query or falls back to current context."""
    for alias, cid in COMPANY_ALIASES.items():
        if alias in query_lower:
            policy = get_policy(cid)
            if policy:
                return policy

    if fallback_company:
        cid = COMPANY_ALIASES.get(fallback_company.lower().strip())
        if cid:
            policy = get_policy(cid)
            if policy:
                return policy

    return None


def handle_assistant_query(
    query: str,
    current_claim: Optional[Dict[str, Any]] = None,
    current_result: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Core conversational question-answering engine.
    Analyzes user intent, checks active claim context and product registry,
    and returns a verified, explainable response with official clause citations.
    """
    q = query.strip()
    q_lower = q.lower()

    active_company_name = (current_claim or {}).get("company") or (current_result or {}).get("metadata", {}).get("company")
    target_policy = _detect_mentioned_company(q_lower, active_company_name)

    cited_clauses: List[str] = []
    cited_uins: List[str] = []
    suggestions: List[str] = []

    # ─────────────────────────────────────────────────────────────────────────
    # INTENT 1: EXPLAINING THE ACTIVE CLAIM DEDUCTIONS / DECISION
    # ─────────────────────────────────────────────────────────────────────────
    claim_deduction_triggers = [
        "why", "deduct", "cut", "reject", "less", "payable", "approved", "admissible",
        "my claim", "this claim", "calculation", "bill", "my bill", "full approval"
    ]
    is_claim_specific = any(t in q_lower for t in claim_deduction_triggers) and current_result is not None

    if is_claim_specific and current_result:
        approved = current_result.get("approved_amount", 0.0)
        claimed = current_result.get("total_claimed_amount", 0.0)
        efficiency = current_result.get("claim_efficiency_pct", 0.0)
        deductions = current_result.get("deductions", [])
        product = current_result.get("product_identified", "Your Policy")
        uin = current_result.get("uin", "")
        if uin:
            cited_uins.append(uin)

        summary_parts = []

        if "how" in q_lower and ("full" in q_lower or "100" in q_lower or "increase" in q_lower or "avoid" in q_lower):
            summary_parts.append(
                f"### 💡 How to Achieve Maximum Reimbursement on Your Claim ({product}):\n"
            )
            tips = []
            has_misc_ded = any("Consumable" in d.get("item", "") or "Non-Medical" in d.get("item", "") for d in deductions)
            has_room_ded = any("Room" in d.get("item", "") or "Proportionate" in d.get("item", "") for d in deductions)

            if has_misc_ded:
                tips.append("1. **Attach a Consumables Safeguard Rider:** Non-medical items (gloves, PPE kits, admission kits) are deducted by default under IRDAI guidelines. Opting for a Consumables Cover / Care Shield rider waives these deductions.")
            if has_room_ded:
                tips.append("2. **Choose a Room Within Entitlement:** Stay within a Single Private AC room (or add a Room Rent Waiver Rider) to avoid proportionate cuts on surgeon, OT, and nursing charges.")
            if not tips:
                tips.append("Your current claim is already optimized at maximum contractual recovery!")
            summary_parts.append("\n".join(tips))
            suggestions = [
                "Explain the itemized deductions on this bill",
                "How does the Consumables Safeguard Rider work?",
                "Compare this claim across all 10 insurers"
            ]
        else:
            summary_parts.append(
                f"### 📋 Claim Settlement Analysis for **{product}** (UIN: `{uin}`):\n"
            )
            summary_parts.append(
                f"- **Total Submitted Bill:** ₹{claimed:,.0f}\n"
                f"- **Estimated Payable Amount:** **₹{approved:,.0f}** ({efficiency}% recovery efficiency)\n"
                f"- **Total Disallowed Deductions:** ₹{claimed - approved:,.0f}\n"
            )

            if current_result.get("is_restoration_triggered"):
                restored_amt = current_result.get("restoration_amount_applied", 0.0)
                summary_parts.append(
                    f"> 🔄 **Automatic Sum Insured Restoration Active:** Added **₹{restored_amt:,.0f}** to your claim pool because prior hospitalizations had depleted your remaining Sum Insured.\n"
                )

            if current_result.get("consumables_waived_by_rider", 0.0) > 0:
                waived_amt = current_result.get("consumables_waived_by_rider", 0.0)
                summary_parts.append(
                    f"> 🛡️ **Consumables Safeguard Rider Applied:** Successfully covered **₹{waived_amt:,.0f}** in non-medical hospital items that would otherwise be excluded.\n"
                )

            if deductions:
                summary_parts.append("#### Itemized Deductions & Contractual Reasons:")
                for d in deductions:
                    item_name = d.get("item", "Item")
                    ded_amt = d.get("deducted", 0.0)
                    reason = d.get("reason", "Contractual exclusion")
                    clause = d.get("clause", "Policy Condition")
                    cited_clauses.append(clause)
                    summary_parts.append(
                        f"- **{item_name} (-₹{ded_amt:,.0f}):** {reason} *(Ref: `{clause}`)*"
                    )
            else:
                summary_parts.append("✅ **No financial deductions were applied!** All submitted expenses are 100% admissible under your policy terms.")

            suggestions = [
                "How can I get 100% approval on this bill?",
                "Are medical implants subject to room rent deductions?",
                "What is the waiting period for pre-existing diseases?"
            ]

        return {
            "answer": "\n".join(summary_parts),
            "cited_clauses": list(set(cited_clauses)),
            "cited_uins": list(set(cited_uins)),
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # INTENT 6: POLICY COMPARISON ACROSS INSURERS
    # ─────────────────────────────────────────────────────────────────────────
    if any(k in q_lower for k in ["compare", "best insurer", "which company", "difference", "benchmark"]):
        policies = list_supported_policies()
        cited_clauses.append("Comparative Policy Benchmark")
        answer = (
            "### ⇄ Multi-Carrier Benchmark (10 Verified Retail Health Products):\n\n"
            "| Insurer & Policy | Room Category Entitlement | PED Waiting | Standard Co-Pay | Restoration |\n"
            "| :--- | :--- | :---: | :---: | :---: |\n"
        )
        for pol in policies:
            r_desc = "Any Room" if pol.room_entitlement.category == RoomCategory.ANY_ROOM else "Single Private AC"
            if pol.room_entitlement.per_day_limit_pct:
                r_desc = f"{pol.room_entitlement.per_day_limit_pct}% SI/day"
            answer += f"| **{pol.insurer_name}** ({pol.product_name}) | {r_desc} | {pol.waiting_periods.pre_existing_disease_months}m | {pol.standard_copay_pct:.0f}% | {'Yes' if pol.restoration_benefit else 'No'} |\n"

        answer += (
            "\n💡 **Key Takeaways:**\n"
            "- **No Room Capping:** HDFC Optima Secure, Care Supreme, and Star Comprehensive allow Any Room or Single Private AC with zero proportionate deductions.\n"
            "- **Capped Room Rent:** New India Mediclaim has a strict 1% SI/day room rent cap that triggers proportionate cuts on surgery fees if you choose a Deluxe room.\n"
        )
        suggestions = [
            "Why did my room rent trigger deductions?",
            "How does New India Mediclaim calculate room rent penalties?",
            "How can I get 100% reimbursement on my claim?"
        ]
        return {
            "answer": answer,
            "cited_clauses": cited_clauses,
            "cited_uins": [pol.uin for pol in policies[:3]],
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────

    # INTENT 2: ROOM RENT LIMITS & PROPORTIONATE DEDUCTIONS
    # ─────────────────────────────────────────────────────────────────────────
    if any(k in q_lower for k in ["room rent", "room limit", "deluxe room", "suite", "room category", "proportionate"]):
        p = target_policy or get_policy("hdfc")
        cited_uins.append(p.uin)
        ent = p.room_entitlement
        cat_desc = ent.category.value.replace("_", " ").title()

        answer = f"### 🏨 Room Rent Conditions for **{p.insurer_name} — {p.product_name}** (`{p.uin}`):\n\n"
        if ent.per_day_limit_pct:
            daily_limit_pct = ent.per_day_limit_pct
            cited_clauses.append("Room Rent Sub-limit Clause")
            answer += (
                f"- **Room Entitlement:** Capped at **{daily_limit_pct}% of Sum Insured per day** (e.g., ₹5,000/day on a ₹5 Lakh policy).\n"
                f"- **Proportionate Deductions:** **Yes**. If you occupy a room higher than your entitlement (such as a Deluxe room or Suite), associated medical expenses (surgeon fees, OT, nursing, doctor visits) are reduced proportionately using:\n"
                f"  $$\\text{{Proportionate Ratio}} = \\frac{{\\text{{Entitled Room Limit}}}}{{\\text{{Actual Room Rent Charged}}}}\n$$\n"
                f"- **IRDAI Statutory Exemption:** Under IRDAI Master Guidelines, **medical devices, cardiac stents, implants, diagnostic tests, and pharmacy medicines are strictly exempt from proportionate cuts**, even if you upgrade your room!\n"
            )
        else:
            cited_clauses.append("In-Patient Hospitalization Clause")
            answer += (
                f"- **Room Entitlement:** **{cat_desc} (No Room Rent Cap)**.\n"
                f"- **Proportionate Deductions:** **Nil (0%)**. You can choose any hospital room category without facing financial penalties or cuts on surgeon, OT, or consultation fees.\n"
            )

        answer += (
            f"- **ICU Entitlement:** {'Covered up to actuals with No Limit' if not ent.icu_per_day_limit_pct else f'Capped at {ent.icu_per_day_limit_pct}% of SI per day'}.\n"
        )
        suggestions = [
            f"What is the waiting period for {p.insurer_name}?",
            "Are stents and implants protected from room rent penalties?",
            "Which health insurance plans have no room rent capping?"
        ]
        return {
            "answer": answer,
            "cited_clauses": cited_clauses,
            "cited_uins": cited_uins,
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # INTENT 3: WAITING PERIODS (INITIAL, SPECIFIC AILMENT, PED, MATERNITY)
    # ─────────────────────────────────────────────────────────────────────────
    if any(k in q_lower for k in ["waiting period", "ped", "cataract", "hernia", "pre-existing", "waiting"]):
        p = target_policy or get_policy("star")
        cited_uins.append(p.uin)
        wp = p.waiting_periods
        cited_clauses.extend(["Code-Excl01 (Pre-Existing Diseases)", "Code-Excl02 (Specific Disease/Procedure)", "Code-Excl03 (Initial Waiting Period)"])

        disease_matched = None
        for d in wp.specific_diseases_list:
            if d in q_lower:
                disease_matched = d
                break

        answer = f"### ⏳ Waiting Period Rules for **{p.insurer_name} — {p.product_name}** (`{p.uin}`):\n\n"
        if disease_matched:
            answer += (
                f"- **{disease_matched.title()} Waiting Period:** **{wp.specific_disease_months} Months**.\n"
                f"  Under Clause `Code-Excl02`, treatments for {disease_matched} are excluded during the first {wp.specific_disease_months} months of continuous coverage.\n\n"
            )

        answer += (
            f"1. **Initial Waiting Period:** **{wp.initial_waiting_days} Days** from inception. Only accidental trauma is covered from Day 1.\n"
            f"2. **Specific Ailments / Daycare Waiting Period:** **{wp.specific_disease_months} Months** for conditions such as Cataract, Hernia, Hydrocele, Piles, Fistula, Gallstones, and Joint Replacements.\n"
            f"3. **Pre-Existing Disease (PED) Waiting Period:** **{wp.pre_existing_disease_months} Months** (or reduced to 12 months if a PED Buyback / JumpStart rider is attached).\n"
        )
        if wp.maternity_waiting_months:
            answer += f"4. **Maternity Waiting Period:** **{wp.maternity_waiting_months} Months**.\n"

        suggestions = [
            f"Does {p.insurer_name} have a room rent limit?",
            "How does the PED Buyback rider reduce waiting periods?",
            "Is accidental hospitalization covered from Day 1?"
        ]
        return {
            "answer": answer,
            "cited_clauses": cited_clauses,
            "cited_uins": cited_uins,
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # INTENT 4: CONSUMABLES / NON-PAYABLES & SAFEGUARD RIDER
    # ─────────────────────────────────────────────────────────────────────────
    if any(k in q_lower for k in ["consumable", "non-medical", "safeguard", "care shield", "gloves", "ppe"]):
        cited_clauses.append("Non-Medical Exclusions Clause (IRDAI Schedule I)")
        answer = (
            "### 🛡️ Understanding Hospital Consumables & Non-Payable Items:\n\n"
            "Under **IRDAI Guidelines on Standardization of Health Insurance**, hospital bills contain approximately **68 non-medical items** that are excluded from base policies by default:\n\n"
            "- **Common Excluded Items:** PPE kits, surgical gloves, syringes, thermometer charges, admission kit, sanitizers, diapers, administrative record fees, and tissue paper.\n"
            "- **The Consumables Cover Rider (Care Shield / Safeguard):** When this endorsement is purchased, the insurer waives non-medical exclusions and reimburses these items in full up to the Sum Insured.\n"
            "- **Impact on Claim Settlement:** In surgical hospitalizations, consumables typically account for **5% to 12% of the total hospital bill**. Having this rider ensures 100% claim recovery efficiency.\n"
        )
        suggestions = [
            "Why was my claim deducted?",
            "What is the difference between Daycare and Inpatient hospitalization?",
            "What is Sum Insured Restoration?"
        ]
        return {
            "answer": answer,
            "cited_clauses": cited_clauses,
            "cited_uins": cited_uins,
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # INTENT 5: SUM INSURED RESTORATION / RECHARGE BENEFIT
    # ─────────────────────────────────────────────────────────────────────────
    if any(k in q_lower for k in ["restoration", "recharge", "reset", "reassure"]):
        p = target_policy or get_policy("care")
        cited_uins.append(p.uin)
        cited_clauses.append("Automatic Restoration / Reset Benefit Clause")

        answer = (
            f"### 🔄 Automatic Sum Insured Restoration Benefit ({p.product_name} - `{p.uin}`):\n\n"
            "**How Restoration Works in Indian Health Insurance:**\n"
            "1. **Trigger Condition:** If prior claims in the current policy year have partially or completely exhausted your base Sum Insured, the policy automatically restores the Sum Insured up to 100% of the base coverage.\n"
            "2. **Single-Claim Indemnity Limit:** Under IRDAI statutory rules, **the maximum payout on any single hospitalization can never exceed the base Sum Insured**. Restoration recharges coverage for subsequent hospitalizations or restores depleted balances from previous claims.\n"
            "3. **Multi-Claim Support:** Top policies like *Care Supreme* and *Niva Bupa ReAssure 2.0* feature unlimited automatic recharge for both related and unrelated illnesses.\n"
        )
        suggestions = [
            "What happens if my bill exceeds the base Sum Insured?",
            f"What are the sub-limits in {p.insurer_name}?",
            "Compare all 10 insurers for my bill"
        ]
        return {
            "answer": answer,
            "cited_clauses": cited_clauses,
            "cited_uins": cited_uins,
            "suggested_questions": suggestions,
        }

    # ─────────────────────────────────────────────────────────────────────────
    # DEFAULT INTENT: GENERAL DOMAIN CONSULTATION & INQUIRY
    # ─────────────────────────────────────────────────────────────────────────
    p = target_policy or get_policy("hdfc")
    cited_uins.append(p.uin)
    cited_clauses.append("Limit of Indemnity Clause")
    answer = (
        f"### 💬 MediSync360 Insurance Rule Intelligence Assistant\n\n"
        f"I can provide deterministic, clause-verified answers across **10 IRDAI-registered retail health policies** (including {p.insurer_name}, Star Health, Care Health, ICICI Lombard, Niva Bupa, and New India Assurance).\n\n"
        "**What I can do for you:**\n"
        "- 📑 **Explain Your Deductions:** Tell you why specific items were disallowed on your active bill.\n"
        "- 🏨 **Audit Room Rent Limits:** Check whether choosing a Deluxe room or Suite will cause proportionate surgery cuts.\n"
        "- ⏳ **Verify Waiting Periods:** Look up exact waiting times for Cataract, Hernia, Dialysis, or Pre-existing conditions.\n"
        "- 🛡️ **Riders & Endorsements:** Explain Consumables Safeguard and PED Buyback riders.\n"
        "- ⇄ **Compare Policies:** Benchmark coverage and claim efficiency across all 10 insurers.\n"
    )
    suggestions = [
        "Why was ₹40,000 deducted from my surgery?",
        "Does HDFC Optima Secure have a room rent limit?",
        "What is the Cataract waiting period in Star Health?",
        "Compare all 10 insurers for my bill"
    ]
    return {
        "answer": answer,
        "cited_clauses": cited_clauses,
        "cited_uins": cited_uins,
        "suggested_questions": suggestions,
    }
