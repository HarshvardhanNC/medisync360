"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchAPI } from "../../utils/api";

type UserProfile = {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  role: "patient" | "doctor" | "admin";
  isApproved?: boolean;
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
  specialization?: string[];
  experienceYears?: number;
  consultationFee?: number;
};

type ProviderSlot = {
  id?: string;
  date: string;
  time: string;
  isBooked: boolean;
};

type ProviderAppointment = {
  id: string;
  patientName: string;
  reason: string;
  date: string;
  time: string;
  status: "scheduled" | "completed" | "cancelled";
};

type ReportAccessRequest = {
  id: string;
  patientIdentifier: string;
  note: string;
  status: "pending";
  createdAt: string;
};

type SharedReport = {
  _id: string;
  fileName: string;
  uploadDate: string;
  verificationStatus: string;
  userId?: {
    name?: string;
    email?: string;
  };
};

type EmergencySearchResult = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  bloodGroup: string;
  allergies: string[];
  chronicDiseases: string[];
  currentMedications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  emergencyConsent: boolean;
};

type PatientAppointment = {
  id: string;
  providerName: string;
  doctorName: string;
  doctorEmail: string;
  specialization: string;
  date: string;
  time: string;
  reason: string;
  status: "scheduled" | "completed" | "cancelled";
  availableSlots: ProviderSlot[];
};

const getId = (user: UserProfile) => user._id || user.id || "";

const getInitials = (name: string) =>
  (name || "U")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

function SOSQRModal({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const userId = getId(user);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const emergencyUrl = `${baseUrl}/emergency/${userId}`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(emergencyUrl)}&color=18181b&bgcolor=ffffff&margin=12`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-subtle-fade"
      style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center bg-zinc-950 border border-rose-500/30">
        <button onClick={onClose} className="absolute top-6 right-6 text-zinc-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight mb-4">Emergency QR Access</h2>
        <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-white p-2">
          <img src={qrUrl} alt="Emergency QR Code" width={244} height={244} />
        </div>
        <p className="mt-5 text-zinc-400 text-sm text-center">
          Share this marker for restricted emergency access.
        </p>
      </div>
    </div>
  );
}

function PatientDashboard({ user }: { user: UserProfile }) {
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [appointmentActionKey, setAppointmentActionKey] = useState("");
  const [rescheduleChoice, setRescheduleChoice] = useState<Record<string, string>>({});
  const [profileForm, setProfileForm] = useState({
    phoneNumber: user.phoneNumber || "",
    bloodGroup: user.bloodGroup || "",
    allergies: user.allergies?.join(", ") || "",
    chronicDiseases: user.chronicDiseases?.join(", ") || "",
    currentMedications: user.currentMedications?.join(", ") || "",
    emergencyContactName: user.emergencyContactName || "",
    emergencyContactPhone: user.emergencyContactPhone || "",
    insuranceProvider: user.insuranceProvider || "",
    insurancePolicyNumber: user.insurancePolicyNumber || "",
    emergencyConsent: Boolean(user.emergencyConsent),
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const metrics = [
    { label: "Blood Vector", value: user.bloodGroup || "Null" },
    { label: "Immunology Flags", value: user.allergies?.join(", ") || "Clear / Subnull" },
    { label: "Chronic Vectors", value: user.chronicDiseases?.join(", ") || "Clear / Subnull" },
    { label: "SOS Node", value: user.emergencyContactPhone || "Null" },
  ];

  const loadAppointments = async () => {
    setAppointmentsLoading(true);
    setAppointmentsError("");
    try {
      const data = await fetchAPI("/users/appointments");
      setAppointments(data.appointments || []);
    } catch (err: any) {
      setAppointmentsError(err.message || "Failed to load booked appointments");
    } finally {
      setAppointmentsLoading(false);
    }
  };

  useEffect(() => {
    void loadAppointments();
  }, []);

  const handleCancelAppointment = async (appointmentId: string) => {
    setAppointmentActionKey(`cancel:${appointmentId}`);
    setAppointmentsError("");
    try {
      await fetchAPI(`/users/appointments/${appointmentId}/cancel`, "POST");
      await loadAppointments();
    } catch (err: any) {
      setAppointmentsError(err.message || "Failed to cancel appointment");
    } finally {
      setAppointmentActionKey("");
    }
  };

  const handleRescheduleAppointment = async (appointmentId: string) => {
    const slotValue = rescheduleChoice[appointmentId];
    if (!slotValue) return;
    const [date, time] = slotValue.split("||");
    if (!date || !time) return;

    setAppointmentActionKey(`reschedule:${appointmentId}`);
    setAppointmentsError("");
    try {
      await fetchAPI(`/users/appointments/${appointmentId}/reschedule`, "POST", { date, time });
      setRescheduleChoice((current) => ({ ...current, [appointmentId]: "" }));
      await loadAppointments();
    } catch (err: any) {
      setAppointmentsError(err.message || "Failed to reschedule appointment");
    } finally {
      setAppointmentActionKey("");
    }
  };

  const handleEmergencyProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMessage("");

    try {
      await fetchAPI("/users/profile", "PUT", profileForm);
      setProfileMessage("Emergency profile updated successfully.");
    } catch (err: any) {
      setProfileMessage(err.message || "Failed to update emergency profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4">
      <div className="col-span-1 bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8 flex flex-col items-center">
        <div className="w-28 h-28 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-300 mb-6">
          {getInitials(user.name)}
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-1">{user.name}</h2>
        <p className="text-zinc-500 font-light text-sm">{user.email}</p>
        <div className="mt-8 w-full space-y-3 border-t border-zinc-800/80 pt-6">
          {metrics.map((item) => (
            <div key={item.label} className="flex justify-between items-center bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">{item.label}</span>
              <span className="text-white font-semibold text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-2 space-y-6">
        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-8 border border-zinc-800">
          <h3 className="text-lg font-bold mb-6 text-white">Patient Workspace</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/symptom-checker" className="bg-white text-zinc-950 font-semibold py-4 rounded-2xl text-center hover:bg-zinc-200 transition-all">
              Start Diagnosis
            </Link>
            <Link href="/vault" className="bg-zinc-950 border border-zinc-800 text-white font-semibold py-4 rounded-2xl text-center hover:bg-zinc-900 transition-all">
              Open Vault
            </Link>
          </div>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-8 border border-zinc-800">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h3 className="text-lg font-bold text-white">Emergency Profile</h3>
              <p className="text-zinc-500 text-sm mt-1">
                Fill the critical medical information that can be accessed through your QR code and by verified doctors when you enable consent.
              </p>
            </div>
            <span
              className={`text-xs font-bold uppercase ${
                profileForm.emergencyConsent ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {profileForm.emergencyConsent ? "Public for emergency access" : "Private"}
            </span>
          </div>

          <form onSubmit={handleEmergencyProfileSave} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={profileForm.phoneNumber}
              onChange={(e) => setProfileForm((current) => ({ ...current, phoneNumber: e.target.value }))}
              placeholder="Phone number"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={profileForm.bloodGroup}
              onChange={(e) => setProfileForm((current) => ({ ...current, bloodGroup: e.target.value }))}
              placeholder="Blood group"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={profileForm.emergencyContactName}
              onChange={(e) => setProfileForm((current) => ({ ...current, emergencyContactName: e.target.value }))}
              placeholder="Emergency contact name"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={profileForm.emergencyContactPhone}
              onChange={(e) => setProfileForm((current) => ({ ...current, emergencyContactPhone: e.target.value }))}
              placeholder="Emergency contact phone"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={profileForm.insuranceProvider}
              onChange={(e) => setProfileForm((current) => ({ ...current, insuranceProvider: e.target.value }))}
              placeholder="Insurance provider"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <input
              value={profileForm.insurancePolicyNumber}
              onChange={(e) => setProfileForm((current) => ({ ...current, insurancePolicyNumber: e.target.value }))}
              placeholder="Insurance policy number"
              className="bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
            />
            <textarea
              value={profileForm.allergies}
              onChange={(e) => setProfileForm((current) => ({ ...current, allergies: e.target.value }))}
              placeholder="Allergies, comma separated"
              className="md:col-span-2 h-24 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none"
            />
            <textarea
              value={profileForm.chronicDiseases}
              onChange={(e) => setProfileForm((current) => ({ ...current, chronicDiseases: e.target.value }))}
              placeholder="Chronic diseases, comma separated"
              className="md:col-span-2 h-24 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none"
            />
            <textarea
              value={profileForm.currentMedications}
              onChange={(e) => setProfileForm((current) => ({ ...current, currentMedications: e.target.value }))}
              placeholder="Current medications, comma separated"
              className="md:col-span-2 h-24 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none"
            />
            <label className="md:col-span-2 flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={profileForm.emergencyConsent}
                onChange={(e) => setProfileForm((current) => ({ ...current, emergencyConsent: e.target.checked }))}
                className="mt-1"
              />
              <span>
                I consent to make this emergency profile visible through QR code and accessible to verified doctors on the platform during emergencies.
              </span>
            </label>
            <div className="md:col-span-2 flex items-center justify-between gap-4">
              <p className={`text-sm ${profileMessage.includes("successfully") ? "text-emerald-400" : "text-red-400"}`}>
                {profileMessage}
              </p>
              <button
                type="submit"
                disabled={profileSaving}
                className="px-5 py-3 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {profileSaving ? "Saving..." : "Save Emergency Profile"}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md rounded-3xl p-8 border border-zinc-800">
          <div className="flex items-center justify-between gap-4 mb-5">
            <h3 className="text-lg font-bold text-white">Booked Appointments</h3>
            <button
              onClick={() => void loadAppointments()}
              className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm font-semibold hover:bg-zinc-900 transition-all"
            >
              Refresh
            </button>
          </div>

          {appointmentsError && (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-300">
              {appointmentsError}
            </div>
          )}

          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-500" />
            </div>
          ) : appointments.length === 0 ? (
            <p className="text-zinc-500 text-sm">No appointments booked yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5">
                  <p className="text-white font-semibold">{appointment.providerName}</p>
                  <p className="text-zinc-300 text-sm mt-1">{appointment.doctorName}</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {[appointment.specialization, appointment.doctorEmail].filter(Boolean).join(" • ")}
                  </p>
                  <p className="text-zinc-400 text-sm mt-4">{appointment.reason}</p>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-zinc-300 text-sm">{[appointment.date, appointment.time].filter(Boolean).join(" • ")}</span>
                    <span
                      className={`text-xs font-bold uppercase ${
                        appointment.status === "cancelled" ? "text-red-400" : "text-emerald-400"
                      }`}
                    >
                      {appointment.status}
                    </span>
                  </div>

                  {appointment.status !== "cancelled" && (
                    <div className="mt-4 space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={rescheduleChoice[appointment.id] || ""}
                          onChange={(e) =>
                            setRescheduleChoice((current) => ({
                              ...current,
                              [appointment.id]: e.target.value,
                            }))
                          }
                          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                        >
                          <option value="">Select new slot</option>
                          {appointment.availableSlots.map((slot) => (
                            <option key={slot.id || `${slot.date}-${slot.time}`} value={`${slot.date}||${slot.time}`}>
                              {[slot.date, slot.time].filter(Boolean).join(" • ")}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => void handleRescheduleAppointment(appointment.id)}
                          disabled={!rescheduleChoice[appointment.id] || appointmentActionKey === `reschedule:${appointment.id}`}
                          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 disabled:opacity-50"
                        >
                          {appointmentActionKey === `reschedule:${appointment.id}` ? "Updating..." : "Reschedule"}
                        </button>
                      </div>
                      <button
                        onClick={() => void handleCancelAppointment(appointment.id)}
                        disabled={appointmentActionKey === `cancel:${appointment.id}`}
                        className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 disabled:opacity-50"
                      >
                        {appointmentActionKey === `cancel:${appointment.id}` ? "Cancelling..." : "Cancel Appointment"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProviderDashboard({ user }: { user: UserProfile }) {
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState("");
  const [availability, setAvailability] = useState<ProviderSlot[]>([]);
  const [appointments, setAppointments] = useState<ProviderAppointment[]>([]);
  const [requests, setRequests] = useState<ReportAccessRequest[]>([]);
  const [sharedReports, setSharedReports] = useState<SharedReport[]>([]);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("");
  const [patientIdentifier, setPatientIdentifier] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submittingSlot, setSubmittingSlot] = useState(false);
  const [removingSlotId, setRemovingSlotId] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [emergencySearchQuery, setEmergencySearchQuery] = useState("");
  const [emergencySearchLoading, setEmergencySearchLoading] = useState(false);
  const [emergencySearchResults, setEmergencySearchResults] = useState<EmergencySearchResult[]>([]);
  const [emergencySearchError, setEmergencySearchError] = useState("");

  const loadWorkspace = async () => {
    setWorkspaceLoading(true);
    setWorkspaceError("");
    try {
      const [workspaceResult, sharedResult] = await Promise.allSettled([
        fetchAPI("/providers/workspace"),
        fetchAPI("/reports/shared-with-me"),
      ]);

      if (workspaceResult.status === "fulfilled") {
        setAvailability(workspaceResult.value.availability || []);
        setAppointments(workspaceResult.value.appointments || []);
        setRequests(workspaceResult.value.reportAccessRequests || []);
      } else {
        throw workspaceResult.reason;
      }

      if (sharedResult.status === "fulfilled") {
        setSharedReports(sharedResult.value.reports || []);
      } else {
        setSharedReports([]);
      }
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to load provider workspace");
    } finally {
      setWorkspaceLoading(false);
    }
  };

  useEffect(() => {
    void loadWorkspace();
  }, []);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotDate || !slotTime) return;
    setSubmittingSlot(true);
    setWorkspaceError("");
    try {
      const data = await fetchAPI("/providers/availability", "POST", { date: slotDate, time: slotTime });
      setAvailability((current) => [...current, data.slot]);
      setSlotDate("");
      setSlotTime("");
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to add availability slot");
    } finally {
      setSubmittingSlot(false);
    }
  };

  const handleRequestReportAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientIdentifier.trim()) return;
    setSubmittingRequest(true);
    setWorkspaceError("");
    try {
      const data = await fetchAPI("/providers/request-report-access", "POST", {
        patientIdentifier: patientIdentifier.trim(),
        note: requestNote.trim(),
      });
      setRequests((current) => [data.request, ...current]);
      setPatientIdentifier("");
      setRequestNote("");
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to request report access");
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleRemoveSlot = async (slotId?: string) => {
    if (!slotId) return;

    setRemovingSlotId(slotId);
    setWorkspaceError("");
    try {
      await fetchAPI(`/providers/availability/${slotId}`, "DELETE");
      setAvailability((current) => current.filter((slot) => slot.id !== slotId));
    } catch (err: any) {
      setWorkspaceError(err.message || "Failed to remove availability slot");
    } finally {
      setRemovingSlotId("");
    }
  };

  const handleEmergencySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencySearchQuery.trim()) {
      setEmergencySearchResults([]);
      return;
    }

    setEmergencySearchLoading(true);
    setEmergencySearchError("");
    try {
      const data = await fetchAPI(`/users/emergency-search?q=${encodeURIComponent(emergencySearchQuery.trim())}`);
      setEmergencySearchResults(data.results || []);
    } catch (err: any) {
      setEmergencySearchError(err.message || "Failed to search emergency records");
    } finally {
      setEmergencySearchLoading(false);
    }
  };

  if (workspaceLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 px-4">
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <div className="w-24 h-24 rounded-full bg-zinc-950 border border-zinc-800 flex items-center justify-center text-3xl font-bold text-zinc-300 mb-5">
              {getInitials(user.name)}
            </div>
            <h2 className="text-2xl font-bold text-white">{user.name}</h2>
            <p className="text-zinc-500 text-sm mt-1">{user.email}</p>
            <div className="mt-6 space-y-3">
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Role</p>
                <p className="text-white font-semibold mt-1">Doctor / Provider</p>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Specialization</p>
                <p className="text-white font-semibold mt-1">{user.specialization?.join(", ") || "Not set"}</p>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Experience</p>
                <p className="text-white font-semibold mt-1">{user.experienceYears || 0} years</p>
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3">
                <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Consultation Fee</p>
                <p className="text-white font-semibold mt-1">INR {user.consultationFee || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-4">Add Availability Slots</h3>
            <form onSubmit={handleAddSlot} className="space-y-4">
              <input
                type="date"
                value={slotDate}
                onChange={(e) => setSlotDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm"
              />
              <input
                type="time"
                value={slotTime}
                onChange={(e) => setSlotTime(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={submittingSlot}
                className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-semibold"
              >
                {submittingSlot ? "Adding..." : "Add Slot"}
              </button>
            </form>
            <div className="mt-5 space-y-2">
              {availability.length === 0 && <p className="text-zinc-500 text-sm">No availability slots added yet.</p>}
              {availability.map((slot) => (
                <div key={slot.id} className="flex items-center justify-between rounded-xl bg-zinc-950 border border-zinc-800 px-4 py-3">
                  <span className="text-white text-sm">{[slot.date, slot.time].filter(Boolean).join(" • ")}</span>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-bold ${slot.isBooked ? "text-red-400" : "text-emerald-400"}`}>
                      {slot.isBooked ? "Booked" : "Open"}
                    </span>
                    <button
                      onClick={() => void handleRemoveSlot(slot.id)}
                      disabled={slot.isBooked || removingSlotId === slot.id}
                      className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 disabled:opacity-50"
                    >
                      {removingSlotId === slot.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-6">
          {workspaceError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-red-300 text-sm font-medium">
              {workspaceError}
            </div>
          )}

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h3 className="text-lg font-bold text-white">View Appointments</h3>
              <button
                onClick={() => void loadWorkspace()}
                className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-950 text-zinc-200 text-sm font-semibold hover:bg-zinc-900 transition-all"
              >
                Refresh
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.length === 0 && (
                <p className="text-zinc-500 text-sm md:col-span-2">No appointments available yet.</p>
              )}
              {appointments.map((appointment) => (
                <div key={appointment.id} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5">
                  <p className="text-white font-semibold">{appointment.patientName}</p>
                  <p className="text-zinc-400 text-sm mt-1">{appointment.reason}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-zinc-300 text-sm">{[appointment.date, appointment.time].filter(Boolean).join(" • ")}</span>
                    <span className="text-xs font-bold text-emerald-400 uppercase">{appointment.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-5">Emergency Patient Search</h3>
            <form onSubmit={handleEmergencySearch} className="flex flex-col md:flex-row gap-3">
              <input
                value={emergencySearchQuery}
                onChange={(e) => setEmergencySearchQuery(e.target.value)}
                placeholder="Search by patient name, email, or phone number"
                className="flex-1 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
              />
              <button
                type="submit"
                disabled={emergencySearchLoading}
                className="px-5 py-3 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all disabled:opacity-50"
              >
                {emergencySearchLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {emergencySearchError && (
              <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-medium text-red-300">
                {emergencySearchError}
              </div>
            )}

            <div className="mt-5 space-y-4">
              {emergencySearchResults.length === 0 ? (
                <p className="text-zinc-500 text-sm">No emergency search results yet.</p>
              ) : (
                emergencySearchResults.map((patient) => (
                  <div key={patient.id} className="rounded-2xl bg-zinc-950 border border-zinc-800 p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <p className="text-white font-semibold">{patient.name}</p>
                        <p className="text-zinc-400 text-sm mt-1">
                          {[patient.email, patient.phoneNumber].filter(Boolean).join(" • ")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold uppercase text-rose-400">Blood Group</p>
                        <p className="text-2xl font-black text-white">{patient.bloodGroup || "-"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-sm">
                      <div>
                        <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-1">Allergies</p>
                        <p className="text-zinc-200">{patient.allergies.join(", ") || "None listed"}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-1">Chronic Diseases</p>
                        <p className="text-zinc-200">{patient.chronicDiseases.join(", ") || "None listed"}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-1">Current Medications</p>
                        <p className="text-zinc-200">{patient.currentMedications.join(", ") || "None listed"}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-1">Emergency Contact</p>
                        <p className="text-zinc-200">
                          {[patient.emergencyContactName, patient.emergencyContactPhone].filter(Boolean).join(" • ") || "Not listed"}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-zinc-500 uppercase text-[10px] font-bold tracking-widest mb-1">Insurance</p>
                        <p className="text-zinc-200">
                          {[patient.insuranceProvider, patient.insurancePolicyNumber].filter(Boolean).join(" • ") || "Not listed"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <span className="text-xs font-bold uppercase text-emerald-400">Emergency consent active</span>
                      <Link
                        href={`/emergency/${patient.id}`}
                        className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-zinc-200 text-sm font-semibold hover:bg-zinc-800 transition-all"
                      >
                        Open QR View
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-5">Request Report Access</h3>
            <form onSubmit={handleRequestReportAccess} className="space-y-4">
              <input
                value={patientIdentifier}
                onChange={(e) => setPatientIdentifier(e.target.value)}
                placeholder="Patient email or identifier"
                className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm"
              />
              <textarea
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Add a short clinical note"
                className="w-full h-24 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm resize-none"
              />
              <button
                type="submit"
                disabled={submittingRequest}
                className="py-3 px-5 rounded-xl bg-white text-zinc-950 font-semibold hover:bg-zinc-200 transition-all"
              >
                {submittingRequest ? "Requesting..." : "Submit Access Request"}
              </button>
            </form>
            <div className="mt-5 space-y-2">
              {requests.length === 0 && <p className="text-zinc-500 text-sm">No report access requests yet.</p>}
              {requests.map((request) => (
                <div key={request.id} className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-semibold">{request.patientIdentifier}</p>
                    <span className="text-xs font-bold text-amber-400 uppercase">{request.status}</span>
                  </div>
                  <p className="text-zinc-400 text-sm mt-2">{request.note || "No note provided"}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-8">
            <h3 className="text-lg font-bold text-white mb-5">View Shared Reports</h3>
            <div className="space-y-3">
              {sharedReports.length === 0 && <p className="text-zinc-500 text-sm">No reports shared with you yet.</p>}
              {sharedReports.map((report) => (
                <div key={report._id} className="rounded-xl bg-zinc-950 border border-zinc-800 p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-white font-semibold">{report.fileName}</p>
                    <p className="text-zinc-400 text-sm">
                      {report.userId?.name || "Patient"} • {new Date(report.uploadDate).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 uppercase">{report.verificationStatus}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);

  useEffect(() => {
    fetchAPI("/users/profile")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center animate-subtle-fade">
        <div className="bg-red-400/10 border border-red-400/20 p-8 rounded-3xl text-center max-w-md">
          <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Authentication Error</h3>
          <p className="text-red-400 font-medium text-sm">Session could not be validated. Please re-authenticate.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-8 max-w-6xl mx-auto w-full pt-8 pb-24 animate-subtle-fade">
      {showQRModal && <SOSQRModal user={user} onClose={() => setShowQRModal(false)} />}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold mb-4 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Secured Node
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            {user.role === "doctor" ? "Provider Workspace" : "Patient Control Center"}
          </h1>
          <p className="text-zinc-500 font-light">
            Identity: <span className="font-mono bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded text-zinc-300 text-sm ml-1 select-all">{getId(user)}</span>
          </p>
        </div>
        {user.role !== "doctor" && (
          <button
            onClick={() => setShowQRModal(true)}
            className="px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 text-white font-medium text-sm hover:bg-zinc-800 transition"
          >
            Emergency QR Access
          </button>
        )}
      </div>

      {user.role === "doctor" ? <ProviderDashboard user={user} /> : <PatientDashboard user={user} />}
    </div>
  );
}
