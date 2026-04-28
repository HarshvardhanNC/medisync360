"use client";

import { useState, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Deduction {
  item: string;
  claimed: number;
  allowed: number;
  deducted: number;
  reason: string;
}

interface ApprovalFactor {
  factor: string;
  status: string;
  impact: "Positive" | "Negative" | string;
  detail: string;
}

interface ClaimResult {
  approval_probability: number;
  total_claimed_amount: number;
  approved_amount: number;
  deductions: Deduction[];
  approval_breakdown: ApprovalFactor[];
  final_decision_explanation: string;
  metadata: {
    company: string;
    disease: string;
    sum_insured: number;
    network_hospital: boolean;
    waiting_completed: boolean;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COMPANIES = ["ICICI Lombard", "HDFC ERGO", "Star Health", "Care Health"];
const DISEASES = [
  "Diabetes", "Hypertension", "Heart Disease", "Asthma", "Arthritis",
  "Kidney Disease", "Chronic Kidney Disease", "Thyroid Disorder", "Obesity",
  "Sleep Apnea", "Fever", "Fracture", "Appendicitis", "Cancer", "Maternity",
  "Cataract", "Hernia", "Dengue", "COVID-19", "Other",
];
const TREATMENTS = ["Surgery", "Medical Management", "Daycare", "ICU", "Emergency"];

const FLASK_URL = "http://localhost:5001";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

const pct = (n: number) => `${Math.round(n * 100)}%`;

// ─── Component ────────────────────────────────────────────────────────────────
export default function ClaimIntelligencePage() {
  // Form state
  const [form, setForm] = useState({
    age: "",
    disease: "Fever",
    treatment_type: "Medical Management",
    company: "Star Health",
    sum_insured: "",
    waiting_completed: true,
    network_hospital: true,
    room_rent: "",
    surgery_cost: "",
    medicines: "",
    diagnostics: "",
    ot_charges: "",
    blood_bank: "",
    miscellaneous: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ClaimResult | null>(null);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const payload = {
      age: parseInt(form.age),
      disease: form.disease,
      treatment_type: form.treatment_type,
      company: form.company,
      sum_insured: parseFloat(form.sum_insured),
      waiting_completed: form.waiting_completed,
      network_hospital: form.network_hospital,
      room_rent: parseFloat(form.room_rent) || 0,
      surgery_cost: parseFloat(form.surgery_cost) || 0,
      medicines: parseFloat(form.medicines) || 0,
      diagnostics: parseFloat(form.diagnostics) || 0,
      ot_charges: parseFloat(form.ot_charges) || 0,
      blood_bank: parseFloat(form.blood_bank) || 0,
      miscellaneous: parseFloat(form.miscellaneous) || 0,
    };

    try {
      const res = await fetch(`${FLASK_URL}/predict-claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "API Error");
      }
      const data: ClaimResult = await res.json();
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err: any) {
      setError(err.message || "Failed to connect to Insurance AI service. Ensure the Flask server is running on port 5001.");
    } finally {
      setLoading(false);
    }
  };

  const probColor = (p: number) => {
    if (p >= 0.75) return "#10b981";
    if (p >= 0.50) return "#f59e0b";
    return "#ef4444";
  };

  const probLabel = (p: number) => {
    if (p >= 0.75) return "High likelihood of approval without major deductions";
    if (p >= 0.50) return "Moderate risk — Expected partial deductions";
    return "High risk of claim rejection or massive deduction";
  };

  return (
    <div style={{ fontFamily: "Inter,Outfit, sans-serif", backgroundColor: "#09090b", color: "#fafafa", minHeight: "100vh" }}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "3rem", padding: "3rem 0 1rem", borderBottom: "1px solid #27272a" }}>
        <h1 style={{
          fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 700, lineHeight: 1.15, marginBottom: "0.75rem",
          color: "#fafafa"
        }}>
          Claim Intelligence System
        </h1>
        <p style={{ color: "#a1a1aa", maxWidth: 650, margin: "0 auto", fontSize: "1.05rem", lineHeight: 1.6 }}>
          Analyse projected medical bills against exact company underwriting guidelines. Instantly preview eligible amounts, detailed deduction breakdowns, and potential rejection risks for ICICI, HDFC, Star, and Care Health.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", maxWidth: 1200, margin: "0 auto", padding: "0 1rem 4rem" }}>

        {/* ── LEFT: Form ───────────────────────────────────────────────────── */}
        <form id="claim-form" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

          {/* Patient & Policy Info */}
          <section style={sectionStyle}>
            <div style={sectionHeadStyle}>
              {iconDot("#3b82f6")}
              Policy Definitions
            </div>

            <div style={gridTwo}>
              <Field label="Age (years)" id="age" name="age" type="number" placeholder="e.g. 45" value={form.age} onChange={handleChange} required min="1" max="100" />
              <div>
                <label style={labelStyle} htmlFor="company">Insurance Carrier</label>
                <select id="company" name="company" value={form.company} onChange={handleChange} style={selectStyle} required>
                  {COMPANIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div style={gridTwo}>
              <div>
                <label style={labelStyle} htmlFor="disease">Admitting Diagnosis</label>
                <select id="disease" name="disease" value={form.disease} onChange={handleChange} style={selectStyle} required>
                  {DISEASES.map((d) => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle} htmlFor="treatment_type">Modality of Treatment</label>
                <select id="treatment_type" name="treatment_type" value={form.treatment_type} onChange={handleChange} style={selectStyle} required>
                  {TREATMENTS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <Field label="Sum Insured (₹)" id="sum_insured" name="sum_insured" type="number" placeholder="e.g. 500000" value={form.sum_insured} onChange={handleChange} required min="1" />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginTop: "0.5rem" }}>
              <Toggle id="waiting_completed" name="waiting_completed" checked={form.waiting_completed} onChange={handleChange} label="Waiting Period Over" />
              <Toggle id="network_hospital" name="network_hospital" checked={form.network_hospital} onChange={handleChange} label="In-Network Hospital" />
            </div>
          </section>

          {/* Bill Breakdown */}
          <section style={sectionStyle}>
            <div style={sectionHeadStyle}>
              {iconDot("#a855f7")}
              Hospital Bill Line Items (₹)
            </div>
            <div style={gridThree}>
              <Field label="Room Rent" id="room_rent" name="room_rent" type="number" placeholder="0" value={form.room_rent} onChange={handleChange} />
              <Field label="Surgery / Procedure" id="surgery_cost" name="surgery_cost" type="number" placeholder="0" value={form.surgery_cost} onChange={handleChange} />
              <Field label="Medicines (IPD)" id="medicines" name="medicines" type="number" placeholder="0" value={form.medicines} onChange={handleChange} />
              <Field label="Diagnostics" id="diagnostics" name="diagnostics" type="number" placeholder="0" value={form.diagnostics} onChange={handleChange} />
              <Field label="OT Charges" id="ot_charges" name="ot_charges" type="number" placeholder="0" value={form.ot_charges} onChange={handleChange} />
              <Field label="Blood Bank" id="blood_bank" name="blood_bank" type="number" placeholder="0" value={form.blood_bank} onChange={handleChange} />
            </div>
            <div style={{ marginTop: "0.9rem" }}>
              <Field label="Miscellaneous / Consumables" id="miscellaneous" name="miscellaneous" type="number" placeholder="0" value={form.miscellaneous} onChange={handleChange} />
            </div>
          </section>

          {error && (
            <div style={{ background: "rgba(220, 38, 38, 0.1)", border: "1px solid #7f1d1d", borderRadius: 8, padding: "1rem", color: "#fca5a5", fontSize: "0.875rem" }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            id="analyze-claim-btn"
            disabled={loading}
            style={{
              width: "100%", padding: "1rem 2rem",
              background: loading ? "#27272a" : "#fafafa",
              color: loading ? "#71717a" : "#09090b",
              border: "1px solid #e4e4e7", borderRadius: 8, fontWeight: 600,
              fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {loading ? "Analysing Factors..." : "Run Underwriting Analysis"}
          </button>
        </form>

        {/* ── RIGHT: Results ───────────────────────────────────────────────── */}
        <div ref={resultRef}>
          {!result && !loading && (
            <div style={{ ...sectionStyle, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 420, gap: "1rem", color: "#71717a", textAlign: "center" }}>
              <div style={{ width: 64, height: 64, borderRadius: 8, background: "#18181b", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                📊
              </div>
              <h3 style={{ color: "#a1a1aa", fontWeight: 500, fontSize: "1rem" }}>Awaiting Claim Data</h3>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6, maxWidth: 280 }}>
                Input parameters on the left to simulate the rule engine checks.
              </p>
            </div>
          )}

          {result && <Results result={result} probColor={probColor} probLabel={probLabel} />}
        </div>
      </div>

      {/* Mobile stacking fix */}
      <style>{`
        @media (max-width: 768px) {
          form, div[ref] { grid-column: 1 / -1; }
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Results Panel ────────────────────────────────────────────────────────────
function Results({ result, probColor, probLabel }: {
  result: ClaimResult;
  probColor: (p: number) => string;
  probLabel: (p: number) => string;
}) {
  const p = result.approval_probability;
  const color = probColor(p);
  const totalDeducted = result.total_claimed_amount - result.approved_amount;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Probability Meter & Summary */}
      <section style={sectionStyle}>
        <div style={sectionHeadStyle}>
          {iconDot(color)}
          Underwriting Forecast
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 0" }}>
          <div>
            <div style={{ fontSize: "3.5rem", fontWeight: 700, color, lineHeight: 1, letterSpacing: "-0.02em" }}>
              {pct(p)}
            </div>
            <div style={{ color: "#a1a1aa", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {probLabel(p)}
            </div>
          </div>
        </div>

        {/* Amount summary */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginTop: "1rem", borderTop: "1px solid #27272a", paddingTop: "1.5rem" }}>
          <AmountCard label="Declared Total" amount={result.total_claimed_amount} color="#a1a1aa" />
          <AmountCard label="Eligible Payables" amount={result.approved_amount} color="#10b981" />
          <AmountCard label="Liability (Patient)" amount={totalDeducted} color="#ef4444" />
        </div>
      </section>

      {/* Deductions Table */}
      {result.deductions.length > 0 && (
        <section style={sectionStyle}>
          <div style={sectionHeadStyle}>
            {iconDot("#ef4444")}
            Deduction Ledger
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #27272a", borderRadius: 8, background: "#09090b" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem", textAlign: "left" }}>
              <thead style={{ background: "#18181b" }}>
                <tr>
                  <th style={{ padding: "0.75rem 1rem", color: "#a1a1aa", fontWeight: 500, borderBottom: "1px solid #27272a" }}>Line Item</th>
                  <th style={{ padding: "0.75rem 1rem", color: "#a1a1aa", fontWeight: 500, borderBottom: "1px solid #27272a" }}>Claimed</th>
                  <th style={{ padding: "0.75rem 1rem", color: "#a1a1aa", fontWeight: 500, borderBottom: "1px solid #27272a" }}>Allowed</th>
                  <th style={{ padding: "0.75rem 1rem", color: "#a1a1aa", fontWeight: 500, borderBottom: "1px solid #27272a" }}>Deducted</th>
                </tr>
              </thead>
              <tbody>
                {result.deductions.map((d, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #27272a" }}>
                    <td style={{ padding: "0.75rem 1rem", color: "#fafafa" }}>{d.item}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#a1a1aa" }}>{fmt(d.claimed)}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#10b981" }}>{fmt(d.allowed)}</td>
                    <td style={{ padding: "0.75rem 1rem", color: "#f87171", fontWeight: 600 }}>{fmt(d.deducted)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Reason annotations */}
          <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {result.deductions.map((d, i) => (
              <div key={i} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", background: "#18181b", border: "1px solid #27272a", borderRadius: 6, padding: "0.75rem" }}>
                <div style={{ color: "#ef4444", marginTop: 2 }}>⚠️</div>
                <div style={{ fontSize: "0.8rem", color: "#a1a1aa", lineHeight: 1.5 }}>
                  <span style={{ color: "#fafafa", fontWeight: 500, marginRight: "0.5rem" }}>{d.item}:</span>
                  {d.reason}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Approval Breakdown */}
      <section style={sectionStyle}>
        <div style={sectionHeadStyle}>
          {iconDot("#6366f1")}
          Policy Contract Checks
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {result.approval_breakdown.map((f, i) => {
            const isPos = f.impact === "Positive";
            const badgeColor = isPos ? "#10b981" : "#ef4444";
            const badgeBg = isPos ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)";
            return (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #27272a", paddingBottom: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
                    <span style={{ fontWeight: 500, fontSize: "0.9rem", color: "#fafafa" }}>{f.factor}</span>
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "#71717a", lineHeight: 1.4 }}>{f.detail}</div>
                </div>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, padding: "0.2rem 0.5rem", borderRadius: 4, background: badgeBg, color: badgeColor, border: `1px solid ${badgeColor}33`, whiteSpace: "nowrap" }}>
                  {f.status}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Final Explanation */}
      <section style={{ ...sectionStyle, borderLeft: result.approved_amount > 0 ? "3px solid #10b981" : "3px solid #ef4444" }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: result.approved_amount > 0 ? "#10b981" : "#ef4444", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Executive Summary
        </div>
        <p style={{ color: "#d4d4d8", lineHeight: 1.6, fontSize: "0.95rem", margin: 0 }}>
          {result.final_decision_explanation}
        </p>
      </section>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AmountCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div style={{ background: "#09090b", borderRadius: 8, padding: "1rem", border: "1px solid #27272a" }}>
      <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 500, marginBottom: "0.5rem" }}>{label}</div>
      <div style={{ fontSize: "1.25rem", fontWeight: 600, color }}>{fmt(amount)}</div>
    </div>
  );
}

function Field({ label, id, ...props }: any) {
  return (
    <div>
      <label htmlFor={id} style={labelStyle}>{label}</label>
      <input id={id} style={inputStyle} {...props} />
    </div>
  );
}

function Toggle({ id, name, checked, onChange, label }: any) {
  return (
    <label htmlFor={id} style={{ display: "flex", alignItems: "center", gap: "0.75rem", cursor: "pointer", userSelect: "none" }}>
      <input type="checkbox" id={id} name={name} checked={checked} onChange={onChange} style={{ display: "none" }} />
      <div style={{
        width: 36, height: 20, borderRadius: 99, transition: "background 0.2s",
        background: checked ? "#fafafa" : "#27272a",
        position: "relative",
      }}>
        <div style={{
          position: "absolute", top: 2, left: checked ? "calc(100% - 18px)" : 2,
          width: 16, height: 16, borderRadius: "50%", background: checked ? "#09090b" : "#71717a", transition: "left 0.2s",
        }} />
      </div>
      <span style={{ fontSize: "0.85rem", color: "#a1a1aa", fontWeight: 400 }}>{label}</span>
    </label>
  );
}

// ─── Shared Styles ────────────────────────────────────────────────────────────
const sectionStyle: React.CSSProperties = {
  background: "#18181b", // zinc-900
  border: "1px solid #27272a", // zinc-800
  borderRadius: 12,
  padding: "1.5rem",
};

const sectionHeadStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 600,
  color: "#fafafa",
  marginBottom: "1.25rem",
  display: "flex",
  alignItems: "center",
  gap: "0.6rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8rem",
  color: "#a1a1aa", // zinc-400
  fontWeight: 500,
  marginBottom: "0.5rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#09090b", // zinc-950
  border: "1px solid #27272a", // zinc-800
  borderRadius: 6,
  padding: "0.6rem 0.8rem",
  color: "#fafafa",
  fontSize: "0.9rem",
  outline: "none",
  fontFamily: "Inter, inherit",
  transition: "border-color 0.2s",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

const gridTwo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "1.25rem",
};

const gridThree: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "1rem",
};

function iconDot(color: string) {
  return (
    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block", flexShrink: 0 }} />
  );
}
