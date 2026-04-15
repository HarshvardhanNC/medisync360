"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../utils/api";
import Link from "next/link";

/* ─── Types ───────────────────────────────────────────────────────────────── */
interface UserProfile {
  _id: string;
  name: string;
  email: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  emergencyContact?: string;
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const getInitials = (name: string) =>
  (name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

const csvToArray = (s: string) =>
  s
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

/* ─── Edit Profile Modal ──────────────────────────────────────────────────── */
function EditProfileModal({
  user,
  onClose,
  onSaved,
}: {
  user: UserProfile;
  onClose: () => void;
  onSaved: (u: UserProfile) => void;
}) {
  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
  const [form, setForm] = useState({
    name: user.name || "",
    bloodGroup: user.bloodGroup || "",
    allergies: (user.allergies || []).join(", "),
    chronicDiseases: (user.chronicDiseases || []).join(", "),
    currentMedications: (user.currentMedications || []).join(", "),
    emergencyContact: user.emergencyContact || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const updated = await fetchAPI("/users/profile", "PUT", {
        name: form.name,
        bloodGroup: form.bloodGroup || undefined,
        allergies: csvToArray(form.allergies),
        chronicDiseases: csvToArray(form.chronicDiseases),
        currentMedications: csvToArray(form.currentMedications),
        emergencyContact: form.emergencyContact || undefined,
      });
      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all";
  const labelCls = "block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-subtle-fade"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg rounded-3xl p-8 shadow-2xl bg-zinc-950 border border-zinc-800">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold text-white mb-8 tracking-tight">Edit Identity</h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              className={inputCls}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Blood Group</label>
              <select
                className={inputCls}
                value={form.bloodGroup}
                onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })}
              >
                <option value="">Not Specified</option>
                {bloodGroups.map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>SOS Node</label>
              <input
                className={inputCls}
                value={form.emergencyContact}
                onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                placeholder="Phone No."
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Immunological Flags <span className="normal-case font-medium text-zinc-600">(csv)</span></label>
            <input
              className={inputCls}
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="Penicillin, Peanuts"
            />
          </div>

          <div>
            <label className={labelCls}>Chronic Vectors <span className="normal-case font-medium text-zinc-600">(csv)</span></label>
            <input
              className={inputCls}
              value={form.chronicDiseases}
              onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value })}
              placeholder="Diabetes, Hypertension"
            />
          </div>

          <div>
            <label className={labelCls}>Current Medications <span className="normal-case font-medium text-zinc-600">(csv)</span></label>
            <input
              className={inputCls}
              value={form.currentMedications}
              onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
              placeholder="Metformin, Lisinopril"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
              {error}
            </p>
          )}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl font-semibold text-zinc-950 bg-white hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Committing..." : "Commit Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── SOS QR Modal ────────────────────────────────────────────────────────── */
function SOSQRModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const emergencyUrl = `${baseUrl}/emergency/${user._id}`;
  const qrData = encodeURIComponent(emergencyUrl);
  // Replaced chaotic colors with clean white/black for the QR logic visually
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${qrData}&color=18181b&bgcolor=ffffff&margin=12`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-subtle-fade"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center bg-zinc-950 border border-rose-500/30">
        
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center space-x-2 mb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-xl font-bold text-white tracking-tight">SOS Beacon Payload</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-6 text-center font-light leading-relaxed">
          Provide this cryptographically linked QR marker to first responders for unrestricted medical access.
        </p>

        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-white p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="SOS QR Code" width={244} height={244} />
        </div>

        <div className="mt-6 w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-1.5 text-sm">
          <div className="flex justify-between items-center text-zinc-400">
             <span>Identity</span>
             <span className="text-white font-medium">{user.name}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400">
             <span>Blood Vector</span>
             <span className="text-rose-400 font-bold">{user.bloodGroup || "Null"}</span>
          </div>
          <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800 pt-1.5 mt-1.5">
             <span>SOS Node</span>
             <span className="text-white font-medium">{user.emergencyContact || "Null"}</span>
          </div>
        </div>

        <a
          href={qrUrl}
          download="sos-qr.png"
          className="mt-6 w-full py-3.5 rounded-xl font-semibold bg-white text-zinc-950 text-center transition-all hover:bg-zinc-200 active:scale-95"
        >
          Download Marker
        </a>
      </div>
    </div>
  );
}

/* ─── Main Dashboard ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchAPI("/users/profile")
      .then(setUser)
      .catch((err) => console.error("Failed to fetch profile", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 animate-subtle-fade">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-emerald-500 rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 font-medium tracking-wide">Syncing network state…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-subtle-fade">
        <div className="bg-red-400/10 border border-red-400/20 p-8 rounded-3xl text-center max-w-md">
          <svg className="w-12 h-12 text-red-500 mb-4 mx-auto opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Authentication Error</h3>
          <p className="text-red-400 font-medium text-sm">Session could not be validated against the node. Please re-authenticate.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modals */}
      {showEditModal && (
        <EditProfileModal
          user={user}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => setUser(updated)}
        />
      )}
      {showQRModal && <SOSQRModal user={user} onClose={() => setShowQRModal(false)} />}

      <div className="flex-1 flex flex-col space-y-8 max-w-6xl mx-auto w-full pt-8 pb-24 animate-subtle-fade">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Secured Node
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
              Patient Control Center
            </h1>
            <p className="text-zinc-500 font-light">
              Identity: <span className="font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 text-sm ml-1 select-all">{user._id}</span>
            </p>
          </div>
          
          <div className="flex gap-3">
             <button className="px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white font-medium text-sm hover:bg-zinc-800 transition">
               Security Audit
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">
          
          {/* Identity Core */}
          <div className="col-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 flex flex-col items-center">
            
            <div className="relative mb-6 mt-4 group">
              <div className="w-28 h-28 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-300 group-hover:border-emerald-500/50 transition-colors">
                {getInitials(user.name)}
              </div>
              <div className="absolute right-1 bottom-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-zinc-950 flex items-center justify-center"></div>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{user.name}</h2>
            <p className="text-zinc-500 font-light text-sm">{user.email}</p>

            <div className="mt-8 w-full space-y-3 border-t border-zinc-800/80 pt-6">
              <div className="flex justify-between items-center bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Blood Vector</span>
                <span className="text-white font-semibold">
                  {user.bloodGroup || <span className="text-zinc-600 italic font-light">Null</span>}
                </span>
              </div>
              
              <button
                onClick={() => setShowEditModal(true)}
                className="w-full py-3.5 mt-2 bg-transparent border border-zinc-700 text-white font-medium rounded-xl hover:bg-white hover:text-zinc-950 hover:border-white transition-all text-sm active:scale-[0.98]"
              >
                Configure Identity
              </button>
            </div>
          </div>

          {/* Action Hub */}
          <div className="col-span-2 space-y-6">

            {/* Rapid Tools */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-8 border border-zinc-800">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mr-2">
                   <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                   </svg>
                </div>
                <span>Mission Critical</span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex-1 bg-white text-zinc-950 font-semibold py-4 rounded-2xl hover:bg-zinc-200 active:scale-95 transition-all text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Generate SOS Marker</span>
                </button>

                <Link
                  href="/vault"
                  className="flex-1 bg-zinc-950 border border-zinc-800 text-white font-semibold py-4 rounded-2xl transition-all hover:bg-zinc-900 active:scale-95 text-center text-sm flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Open Blockchain Vault</span>
                </Link>
              </div>
            </div>

            {/* Medical Telemetry */}
            <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-8 border border-zinc-800 min-h-[260px]">
              <h3 className="text-lg font-bold mb-6 text-white flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center mr-2">
                   <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                   </svg>
                </div>
                <span>Clinical Telemetry</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Immunology flags", value: user.allergies?.join(", ") || null },
                  { label: "Chronic Vectors", value: user.chronicDiseases?.join(", ") || null },
                  { label: "Active Treatments", value: user.currentMedications?.join(", ") || null },
                  { label: "SOS Node Routing", value: user.emergencyContact || null },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-zinc-950/50 rounded-2xl p-5 border border-zinc-800"
                  >
                    <p className="text-[10px] text-zinc-500 font-bold mb-2 uppercase tracking-widest">{label}</p>
                    <p className="text-white text-sm font-medium leading-relaxed">
                       {value || <span className="text-zinc-600 italic font-light">Clear / Subnull</span>}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
