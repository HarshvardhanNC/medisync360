"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../../utils/api";
import { useParams } from "next/navigation";

// Define the shape of the emergency data we expect back from the public endpoint
interface EmergencyData {
  name: string;
  bloodGroup?: string;
  allergies?: string[];
  chronicDiseases?: string[];
  currentMedications?: string[];
  emergencyContact?: string;
}

export default function EmergencyPage() {
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchAPI(`/users/emergency-public/${id}`)
      .then(setData)
      .catch((err) => {
        console.error("Failed to fetch emergency data", err);
        setError("Patient data could not be retrieved or patient not found.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
          <div className="absolute top-0 w-16 h-16 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-400 font-medium tracking-wide">Retrieving critical medical data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[80vh] px-4">
        <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center max-w-md shadow-2xl backdrop-blur-sm">
          <svg className="w-16 h-16 text-rose-500 mb-6 mx-auto animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className="text-2xl font-black text-white mb-3">Error Loading Data</h3>
          <p className="text-rose-300 font-medium">{error || "Patient not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-8 max-w-3xl mx-auto w-full pt-8 pb-20 px-4">
      {/* ⚠️ Emergency Banner */}
      <div className="bg-rose-500 text-white rounded-2xl p-4 flex items-center justify-center space-x-3 shadow-[0_0_30px_rgba(244,63,94,0.3)] animate-in slide-in-from-top-4 duration-500">
        <svg className="w-8 h-8 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h1 className="text-xl font-black tracking-tight uppercase">Emergency Medical Record</h1>
          <p className="text-rose-100 text-xs font-medium">CONFIDENTIAL — FIRST RESPONDER ACCESS</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-[#111827]/90 backdrop-blur-3xl rounded-[2rem] p-8 border border-rose-500/30 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-700 delay-100 fill-mode-both">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/4 translate-x-1/4" />

        <div className="relative mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-4xl font-black text-white tracking-tight mb-2">{data.name}</h2>
            <div className="inline-flex items-center space-x-2 bg-rose-500/10 text-rose-400 font-bold px-4 py-1.5 rounded-full border border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Blood Group: {data.bloodGroup || "Unknown"}</span>
            </div>
          </div>
          <div className="bg-[#1F2937]/80 rounded-2xl p-4 border border-gray-700 text-center min-w-[140px]">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Emergency Contact</p>
            <a href={`tel:${data.emergencyContact?.replace(/[^0-9+]/g, "")}`} className="text-lg font-black text-white text-rose-400 hover:text-rose-300 transition-colors">
              {data.emergencyContact || "Not setup"}
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 w-full mb-8">
            <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-red-500/20 hover:bg-[#1F2937]/80 transition-colors">
              <p className="text-sm text-red-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 Allergies
              </p>
              <p className="text-white font-semibold text-lg">{data.allergies?.length ? data.allergies.join(", ") : "None recorded"}</p>
            </div>
            
            <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-orange-500/20 hover:bg-[#1F2937]/80 transition-colors">
              <p className="text-sm text-orange-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                 Chronic Diseases
              </p>
              <p className="text-white font-semibold text-lg">{data.chronicDiseases?.length ? data.chronicDiseases.join(", ") : "None recorded"}</p>
            </div>
            
            <div className="col-span-1 md:col-span-2 bg-[#1F2937]/50 rounded-2xl p-5 border border-teal-500/20 hover:bg-[#1F2937]/80 transition-colors">
              <p className="text-sm text-teal-400 font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                 Current Medications
              </p>
              <p className="text-white font-semibold text-lg">{data.currentMedications?.length ? data.currentMedications.join(", ") : "None recorded"}</p>
            </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-4">
          <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <p className="text-blue-200 text-sm font-medium leading-relaxed">
            Data sourced directly from the MediSync360 secure medical vault network. Use only for immediate life-saving care decisions.
          </p>
        </div>
      </div>
    </div>
  );
}
