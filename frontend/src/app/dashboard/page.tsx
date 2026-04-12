"use client";

import { useEffect, useState } from "react";
import { fetchAPI } from "../../utils/api";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await fetchAPI('/users/profile');
        setUser(data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
           <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
           <div className="absolute top-0 w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-gray-400 font-medium tracking-wide">Syncing your medical data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl text-center max-w-md">
           <svg className="w-12 h-12 text-red-500 mb-4 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
           <h3 className="text-xl font-bold text-white mb-2">Authentication Error</h3>
           <p className="text-red-400 font-medium">Could not load profile. Please try logging out and logging in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col space-y-8 max-w-6xl mx-auto w-full pt-4">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white flex items-center space-x-3">
           <span className="w-2 h-8 rounded-full bg-teal-500 drop-shadow-[0_0_10px_rgba(20,184,166,0.8)]"></span>
           <span>Patient Hub</span>
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Card Summary */}
        <div className="col-span-1 bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 flex flex-col items-center shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-bl-[100px] blur-2xl pointer-events-none"></div>
           
           <div className="relative mb-6">
              <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative w-32 h-32 rounded-full bg-[#1F2937] border-4 border-[#111827] flex items-center justify-center text-4xl font-black text-white shadow-2xl">
                 {getInitials(user.name)}
              </div>
           </div>
           
           <h2 className="text-2xl font-bold text-white tracking-tight">{user.name}</h2>
           <p className="text-gray-400 font-medium mt-1">{user.email}</p>
           
           <div className="mt-6 w-full bg-[#1F2937]/50 rounded-2xl p-4 border border-gray-700/50">
              <div className="flex justify-between items-center text-sm">
                 <span className="text-gray-400 font-medium">Blood Group</span>
                 <span className="text-teal-400 font-bold bg-teal-500/10 px-3 py-1 rounded-full border border-teal-500/20">{user.bloodGroup || "Not Specified"}</span>
              </div>
           </div>

           <button 
             className="mt-8 px-6 py-3 border-2 border-gray-600 text-gray-300 font-bold rounded-xl hover:bg-gray-800 hover:text-white transition-all w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent flex items-center justify-center space-x-2"
             disabled={true}
             title="Edit profile is currently under construction"
           >
             <svg className="w-5 h-5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
             <span>Edit Profile</span>
           </button>
        </div>

        {/* Quick Actions & Recent Activity */}
        <div className="col-span-2 space-y-8">
           
           <div className="bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/4"></div>
              
              <h3 className="text-xl font-bold mb-6 text-white flex items-center space-x-2">
                 <svg className="w-6 h-6 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                 <span>Rapid Tool Access</span>
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                 <button 
                   className="flex-1 bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(244,63,94,0.3)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                   disabled={true}
                   title="QR generation is currently under construction"
                 >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                    <span>Generate SOS QR</span>
                 </button>
                 <Link href="/vault" className="flex-1 bg-[#1F2937] hover:bg-[#374151] border border-gray-600 text-white font-bold py-4 rounded-2xl transition shadow-lg text-center flex items-center justify-center space-x-2">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    <span>Open Medical Vault</span>
                 </Link>
              </div>
           </div>

           <div className="bg-[#111827]/80 backdrop-blur-3xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl relative overflow-hidden min-h-[250px]">
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/4"></div>
              
              <h3 className="text-xl font-bold mb-6 text-white flex items-center space-x-2">
                 <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                 <span>Clinical Intelligence</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-gray-700/50 hover:bg-[#1F2937] transition-colors">
                   <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Allergies</p>
                   <p className="text-white font-semibold">{user.allergies && user.allergies.length > 0 ? user.allergies.join(", ") : "None recorded"}</p>
                </div>
                <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-gray-700/50 hover:bg-[#1F2937] transition-colors">
                   <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Chronic Diseases</p>
                   <p className="text-white font-semibold">{user.chronicDiseases && user.chronicDiseases.length > 0 ? user.chronicDiseases.join(", ") : "None recorded"}</p>
                </div>
                <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-gray-700/50 hover:bg-[#1F2937] transition-colors">
                   <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Current Medications</p>
                   <p className="text-white font-semibold">{user.currentMedications && user.currentMedications.length > 0 ? user.currentMedications.join(", ") : "None recorded"}</p>
                </div>
                <div className="bg-[#1F2937]/50 rounded-2xl p-5 border border-gray-700/50 hover:bg-[#1F2937] transition-colors">
                   <p className="text-sm text-gray-500 font-medium mb-1 uppercase tracking-wider">Emergency Contact</p>
                   <p className="text-white font-semibold">{user.emergencyContact || "Not setup"}</p>
                </div>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}
