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
    "w-full bg-[#1F2937]/70 border border-gray-600/60 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/60 focus:border-teal-500/60 transition-all";
  const labelCls = "block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5";

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-lg rounded-[2rem] p-8 shadow-2xl"
        style={{
          background: "linear-gradient(145deg,#111827,#0f172a)",
          border: "1px solid rgba(20,184,166,0.25)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-black text-white mb-6 tracking-tight">Edit Profile</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
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

          {/* Blood Group */}
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

          {/* Emergency Contact */}
          <div>
            <label className={labelCls}>Emergency Contact</label>
            <input
              className={inputCls}
              value={form.emergencyContact}
              onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
              placeholder="+91 9876543210"
            />
          </div>

          {/* Allergies */}
          <div>
            <label className={labelCls}>Allergies <span className="normal-case font-normal">(comma-separated)</span></label>
            <input
              className={inputCls}
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="Penicillin, Peanuts"
            />
          </div>

          {/* Chronic Diseases */}
          <div>
            <label className={labelCls}>Chronic Diseases <span className="normal-case font-normal">(comma-separated)</span></label>
            <input
              className={inputCls}
              value={form.chronicDiseases}
              onChange={(e) => setForm({ ...form, chronicDiseases: e.target.value })}
              placeholder="Diabetes, Hypertension"
            />
          </div>

          {/* Current Medications */}
          <div>
            <label className={labelCls}>Current Medications <span className="normal-case font-normal">(comma-separated)</span></label>
            <input
              className={inputCls}
              value={form.currentMedications}
              onChange={(e) => setForm({ ...form, currentMedications: e.target.value })}
              placeholder="Metformin, Lisinopril"
            />
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg,#14b8a6,#3b82f6)",
              boxShadow: "0 0 25px rgba(20,184,166,0.35)",
            }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── SOS QR Modal ────────────────────────────────────────────────────────── */
function SOSQRModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  // Generate URL that first responder will open upon scanning
  // NextJS frontend URL + path + user's generated ID
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const emergencyUrl = `${baseUrl}/emergency/${user._id}`;
  const qrData = encodeURIComponent(emergencyUrl);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${qrData}&color=14B8A6&bgcolor=0F172A&margin=12`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center"
        style={{
          background: "linear-gradient(145deg,#111827,#0f172a)",
          border: "1px solid rgba(244,63,94,0.3)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
          <h2 className="text-xl font-black text-white tracking-tight">Emergency SOS QR</h2>
        </div>
        <p className="text-gray-400 text-sm mb-6 text-center">
          Show this to first responders for instant access to your medical data.
        </p>

        <div
          className="rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(244,63,94,0.2)]"
          style={{ border: "2px solid rgba(244,63,94,0.4)" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt="SOS QR Code" width={260} height={260} />
        </div>

        <div className="mt-6 w-full bg-[#1F2937]/50 rounded-2xl p-4 border border-gray-700/50 space-y-1 text-sm">
          <p className="text-gray-400"><span className="text-white font-semibold">{user.name}</span> · {user.bloodGroup || "Blood group not set"}</p>
          <p className="text-gray-400">Emergency: <span className="text-white">{user.emergencyContact || "Not provided"}</span></p>
        </div>

        <a
          href={qrUrl}
          download="sos-qr.png"
          className="mt-4 w-full py-3 rounded-xl font-bold text-white text-center transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg,#f43f5e,#dc2626)", boxShadow: "0 0 20px rgba(244,63,94,0.3)" }}
        >
          Download QR
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
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
          <div className="absolute top-0 w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-400 font-medium tracking-wide">Syncing your medical data…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center max-w-md">
          <svg className="w-12 h-12 text-red-500 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-xl font-bold text-white mb-2">Authentication Error</h3>
          <p className="text-red-400 font-medium">Could not load profile. Please log out and log in again.</p>
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

      <div className="flex-1 flex flex-col space-y-8 max-w-6xl mx-auto w-full pt-4">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center space-x-3">
            <span className="w-2 h-8 rounded-full bg-teal-500 drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
            <span>Patient Hub</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="col-span-1 bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 flex flex-col items-center shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-bl-[100px] blur-2xl pointer-events-none" />

            <div className="relative mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-500" />
              <div className="relative w-32 h-32 rounded-full bg-[#1F2937] border-4 border-[#111827] flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                {getInitials(user.name)}
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">{user.name}</h2>
            <p className="text-gray-400 font-medium mt-1">{user.email}</p>

            <div className="mt-6 w-full bg-[#1F2937]/50 rounded-2xl p-4 border border-gray-700/50">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400 font-medium">Blood Group</span>
                <span className="text-teal-400 font-bold bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                  {user.bloodGroup || "Not Specified"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowEditModal(true)}
              className="mt-8 px-6 py-3 border-2 border-teal-500/40 text-teal-300 font-bold rounded-xl hover:bg-teal-500/10 hover:border-teal-500/70 hover:text-white transition-all w-full flex items-center justify-center space-x-2 active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit Profile</span>
            </button>
          </div>

          {/* Right Column */}
          <div className="col-span-2 space-y-8">

            {/* Rapid Tool Access */}
            <div className="bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4" />
              <h3 className="text-xl font-bold mb-6 text-white flex items-center space-x-2">
                <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Rapid Tool Access</span>
              </h3>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setShowQRModal(true)}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all shadow-[0_0_20px_rgba(244,63,94,0.3)] flex items-center justify-center space-x-2"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Generate SOS QR</span>
                </button>

                <Link
                  href="/vault"
                  className="flex-1 bg-[#1F2937] hover:bg-[#374151] border border-gray-600 text-white font-bold py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-lg text-center flex items-center justify-center space-x-2"
                >
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Open Medical Vault</span>
                </Link>
              </div>
            </div>

            {/* Clinical Intelligence */}
            <div className="bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl relative overflow-hidden min-h-[250px]">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4" />
              <h3 className="text-xl font-bold mb-6 text-white flex items-center space-x-2">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Clinical Intelligence</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Allergies", value: user.allergies?.join(", ") || "None recorded" },
                  { label: "Chronic Diseases", value: user.chronicDiseases?.join(", ") || "None recorded" },
                  { label: "Current Medications", value: user.currentMedications?.join(", ") || "None recorded" },
                  { label: "Emergency Contact", value: user.emergencyContact || "Not setup" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="bg-[#1F2937]/50 rounded-2xl p-5 border border-gray-700/50 hover:bg-[#1F2937] transition-colors cursor-default"
                  >
                    <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">{label}</p>
                    <p className="text-white font-semibold">{value}</p>
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
