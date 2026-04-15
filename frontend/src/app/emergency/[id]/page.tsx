"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchAPI } from "../../../utils/api";

type EmergencyData = {
  name: string;
  bloodGroup: string;
  allergies: string[];
  chronicDiseases: string[];
  currentMedications: string[];
  emergencyContact: string;
};

export default function EmergencyPortal() {
  const params = useParams();
  const id = params?.id as string;
  
  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    
    // We pass true for the third param (or fetch manually) to signify this might bypass the standard auth header 
    // since it's a public endpoint. Or we can just use normal fetch.
    const fetchPublicData = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/users/emergency-public/${id}`);
        if (!response.ok) {
          throw new Error("Target identity not found or unauthorized");
        }
        const responseData = await response.json();
        setData(responseData);
      } catch (err: any) {
        setError(err.message || "Failed to establish connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-rose-950 flex flex-col items-center justify-center p-8 text-white animate-subtle-fade">
        <div className="w-12 h-12 border-4 border-rose-900 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-white font-bold tracking-widest text-sm uppercase">Accessing Paramedic Protocol...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-white relative">
        <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay"></div>
        <div className="z-10 text-center max-w-md">
          <svg className="w-20 h-20 text-rose-500 mx-auto mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h1 className="text-3xl font-black mb-4">CRITICAL ERROR</h1>
          <p className="text-zinc-400 font-medium">{error || "Emergency record not located."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-rose-500 selection:text-white relative">
      <div className="absolute top-0 left-0 w-full h-2 bg-rose-600 animate-pulse"></div>
      
      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Header Block */}
        <div className="mb-12 border-b border-rose-900/50 pb-8 flex justify-between items-end">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-sm font-bold text-xs uppercase tracking-[0.2em] mb-4">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              Verified Medical Directive
            </div>
            <h1 className="text-6xl font-black text-white tracking-tighter uppercase mb-2">
              {data.name}
            </h1>
            <p className="text-zinc-500 font-mono text-sm tracking-widest">ID: {id}</p>
          </div>
          <div className="text-right">
             <div className="text-6xl font-black text-rose-500 leading-none tracking-tighter">
               {data.bloodGroup || "-"}
             </div>
             <p className="text-rose-400/60 font-bold text-xs uppercase tracking-widest mt-2">Blood Vector</p>
          </div>
        </div>

        {/* Arrays Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Allergies */}
          <div className="bg-zinc-900/50 border-l-4 border-l-amber-500 p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              Immunological Flags
            </h2>
            {data.allergies && data.allergies.length > 0 ? (
              <ul className="space-y-2">
                {data.allergies.map((allergy, i) => (
                  <li key={i} className="text-white font-medium text-lg leading-snug">{allergy}</li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-600 font-medium italic">Clear / Subnull</p>
            )}
          </div>

          {/* Chronic Diseases */}
          <div className="bg-zinc-900/50 border-l-4 border-l-blue-500 p-6">
            <h2 className="text-xs font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Chronic Vectors
            </h2>
            {data.chronicDiseases && data.chronicDiseases.length > 0 ? (
              <ul className="space-y-2">
                {data.chronicDiseases.map((disease, i) => (
                  <li key={i} className="text-white font-medium text-lg leading-snug">{disease}</li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-600 font-medium italic">Clear / Subnull</p>
            )}
          </div>

          {/* Current Medications */}
          <div className="bg-zinc-900/50 border-l-4 border-l-purple-500 p-6 md:col-span-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-4 flex items-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              Active Chemical Treatments
            </h2>
            {data.currentMedications && data.currentMedications.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {data.currentMedications.map((med, i) => (
                  <span key={i} className="bg-zinc-950 border border-zinc-800 px-4 py-2 text-white font-medium rounded-sm">
                    {med}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 font-medium italic">Clear / Subnull</p>
            )}
          </div>
          
        </div>

        {/* SOS Contact Footing */}
        <div className="mt-8 bg-zinc-900/50 border border-zinc-800 p-6 flex items-center justify-between">
           <div>
             <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-1">SOS Node Routing</h3>
             <p className="text-2xl font-bold text-white tracking-tight">{data.emergencyContact || "Not designated"}</p>
           </div>
           {data.emergencyContact && (
             <a 
              href={`tel:${data.emergencyContact}`} 
              className="px-6 py-4 bg-white text-zinc-950 font-black tracking-tight hover:bg-zinc-200 transition-colors hidden sm:block"
             >
               INITIATE CALL
             </a>
           )}
        </div>

      </main>
    </div>
  );
}
