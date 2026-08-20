"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { fetchAPI } from "../../utils/api";

type UserProfile = {
  _id: string;
  name: string;
  email: string;
  role: string;
  phoneNumber?: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  emergencyConsent?: boolean;
};

export default function EmergencyProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [profileForm, setProfileForm] = useState({
    phoneNumber: "",
    bloodGroup: "",
    allergies: "",
    chronicDiseases: "",
    currentMedications: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    insuranceProvider: "",
    insurancePolicyNumber: "",
    emergencyConsent: true,
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showQR, setShowQR] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    setError("");
    try {
      const u = await fetchAPI("/users/profile");
      if (u) {
        setUser(u);
        setProfileForm({
          phoneNumber: u.phoneNumber || "",
          bloodGroup: u.bloodGroup || "",
          allergies: u.allergies?.join(", ") || "",
          chronicDiseases: u.chronicDiseases?.join(", ") || "",
          currentMedications: u.currentMedications?.join(", ") || "",
          emergencyContactName: u.emergencyContactName || "",
          emergencyContactPhone: u.emergencyContactPhone || "",
          insuranceProvider: u.insuranceProvider || "",
          insurancePolicyNumber: u.insurancePolicyNumber || "",
          emergencyConsent: u.emergencyConsent ?? true,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUser();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      await fetchAPI("/users/profile", "PUT", profileForm);
      setMessage("Emergency profile updated successfully!");
      void loadUser();
    } catch (err: any) {
      setMessage(err.message || "Failed to update emergency profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center pt-24">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center pt-24 px-4">
        <p className="text-red-400 font-semibold mb-4">{error || "Please sign in to manage your emergency profile."}</p>
        <Link href="/login" className="px-6 py-3 bg-white text-zinc-950 font-bold rounded-xl">
          Sign In
        </Link>
      </div>
    );
  }

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/emergency/${user._id}` : `/emergency/${user._id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicUrl)}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-white pt-28 pb-16 px-4 max-w-6xl mx-auto">
      <div className="mb-8">
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-wider mb-3">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>SOS Medical Dispatch</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Emergency Medical Profile</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Manage your critical emergency health data, allergies, chronic conditions, and QR code access for first responders and verified doctors.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: QR & Live SOS Badge */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-6 border border-zinc-800 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-4">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-zinc-500 text-xs mt-0.5">{user.email}</p>

            <div className="mt-4 w-full grid grid-cols-2 gap-2 text-left">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <p className="text-[10px] uppercase font-bold text-zinc-500">Blood Group</p>
                <p className="text-red-400 font-extrabold text-lg mt-0.5">{user.bloodGroup || "Not Set"}</p>
              </div>
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800">
                <p className="text-[10px] uppercase font-bold text-zinc-500">Emergency SOS</p>
                <p className="text-white font-bold text-sm mt-1 truncate">{user.emergencyContactPhone || "Not Set"}</p>
              </div>
            </div>

            <div className="mt-6 w-full pt-6 border-t border-zinc-800">
              <button
                onClick={() => setShowQR(!showQR)}
                className="w-full py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 font-bold text-sm hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                {showQR ? "Hide Emergency QR" : "View Emergency QR Code"}
              </button>
            </div>

            {showQR && (
              <div className="mt-4 p-4 bg-white rounded-2xl border border-zinc-200 animate-fadeIn">
                <img src={qrCodeUrl} alt="Emergency QR Code" className="w-48 h-48 mx-auto" />
                <p className="text-zinc-950 text-xs font-semibold mt-2">Scan for instant emergency medical record</p>
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-[11px] font-bold text-red-600 hover:underline break-all"
                >
                  {publicUrl}
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Emergency Info Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-8 border border-zinc-800">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white">Emergency Information Form</h2>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Update your essential health parameters for paramedic and hospital access.
                </p>
              </div>
              <span
                className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${
                  profileForm.emergencyConsent
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}
              >
                {profileForm.emergencyConsent ? "Consent Active" : "Consent Inactive"}
              </span>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm((current) => ({ ...current, phoneNumber: e.target.value }))}
                  placeholder="+91 98765 43210"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Blood Group</label>
                <input
                  value={profileForm.bloodGroup}
                  onChange={(e) => setProfileForm((current) => ({ ...current, bloodGroup: e.target.value }))}
                  placeholder="e.g. O+, A-, AB+"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Emergency Contact Name</label>
                <input
                  value={profileForm.emergencyContactName}
                  onChange={(e) => setProfileForm((current) => ({ ...current, emergencyContactName: e.target.value }))}
                  placeholder="Relative / Guardian Name"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Emergency Contact Phone</label>
                <input
                  value={profileForm.emergencyContactPhone}
                  onChange={(e) => setProfileForm((current) => ({ ...current, emergencyContactPhone: e.target.value }))}
                  placeholder="Emergency Contact Phone"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Insurance Provider</label>
                <input
                  value={profileForm.insuranceProvider}
                  onChange={(e) => setProfileForm((current) => ({ ...current, insuranceProvider: e.target.value }))}
                  placeholder="e.g. Star Health, HDFC ERGO"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Insurance Policy Number</label>
                <input
                  value={profileForm.insurancePolicyNumber}
                  onChange={(e) => setProfileForm((current) => ({ ...current, insurancePolicyNumber: e.target.value }))}
                  placeholder="Policy ID / Member Number"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Allergies</label>
                <textarea
                  value={profileForm.allergies}
                  onChange={(e) => setProfileForm((current) => ({ ...current, allergies: e.target.value }))}
                  placeholder="e.g. Peanuts, Penicillin, Dust Mites (comma separated)"
                  className="w-full h-20 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Chronic Diseases</label>
                <textarea
                  value={profileForm.chronicDiseases}
                  onChange={(e) => setProfileForm((current) => ({ ...current, chronicDiseases: e.target.value }))}
                  placeholder="e.g. Hypertension, Asthma, Type 2 Diabetes (comma separated)"
                  className="w-full h-20 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1.5">Current Medications</label>
                <textarea
                  value={profileForm.currentMedications}
                  onChange={(e) => setProfileForm((current) => ({ ...current, currentMedications: e.target.value }))}
                  placeholder="e.g. Insulin, Metformin 500mg, Albuterol Inhaler (comma separated)"
                  className="w-full h-20 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-zinc-600"
                />
              </div>

              <label className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  checked={profileForm.emergencyConsent}
                  onChange={(e) => setProfileForm((current) => ({ ...current, emergencyConsent: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-red-600 rounded border-zinc-700 bg-zinc-900 focus:ring-0"
                />
                <span>
                  I consent to make this emergency medical profile accessible via QR code and to verified emergency doctors on MediSync360.
                </span>
              </label>

              <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
                <p className={`text-sm font-medium ${message.includes("successfully") ? "text-emerald-400" : "text-red-400"}`}>
                  {message}
                </p>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3.5 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving Profile..." : "Save Emergency Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
