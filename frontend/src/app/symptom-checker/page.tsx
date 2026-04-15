"use client";

import { useState } from "react";
import { fetchAPI } from "../../utils/api";

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState("");

  const [hospitals, setHospitals] = useState<any[]>([]);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState("");

  const handleAnalyze = async () => {
    if (!symptoms) return;
    setLoading(true);
    setError("");
    setPrediction(null);
    setHospitals([]);
    try {
      const data = await fetchAPI('/ai/symptoms', 'POST', { symptoms });
      setPrediction(data);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze symptoms');
    } finally {
      setLoading(false);
    }
  };

  const handleFindHospitals = async () => {
    if (!prediction?.recommendedSpecialist) return;
    
    // Provide a default location if user left it blank
    const targetLocation = userLocation.trim() !== "" ? userLocation : "Capital City, Local";

    setFetchingHospitals(true);
    setError("");

    try {
      const data = await fetchAPI('/ai/hospitals', 'POST', {
         specialist: prediction.recommendedSpecialist,
         location: targetLocation
      });
      setHospitals(data.hospitals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to locate hospitals');
    } finally {
      setFetchingHospitals(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center pb-24 pt-8 animate-subtle-fade">
      <div className="w-full max-w-4xl space-y-12">
        
        {/* Header section */}
        <div className="text-center px-4 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            AI Diagnosis Protocol
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Input clinical symptoms using natural language. The ML engine will map observations to highly probable conditions and isolate the necessary specialist.
          </p>
        </div>

        {/* Input box */}
        <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            {error && (
              <div className="flex items-center text-red-400 bg-red-400/10 p-4 rounded-xl mb-6 border border-red-400/20 font-medium text-sm">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}
            
            <label className="block text-sm font-semibold mb-3 text-zinc-300 uppercase tracking-widest">Clinical Observation</label>
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full h-40 p-5 rounded-2xl bg-zinc-950/50 border border-zinc-700 text-zinc-100 text-lg placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-light resize-none"
              placeholder="e.g., Sharp chest pain radiating to the left arm accompanied by sweating..."
            ></textarea>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleAnalyze} 
                disabled={loading || !symptoms}
                className={`px-8 py-3.5 bg-white text-zinc-950 rounded-full font-semibold text-base hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center space-x-2 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Analysis</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Prediction Results */}
        {prediction && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 mt-12 animate-subtle-fade relative overflow-hidden">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center border-b border-zinc-800 pb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 text-emerald-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </div>
              Resolution Data
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6 text-sm relative z-10">
               <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                 <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-2">Predicted Pathogen/Condition</h3>
                 <p className="text-2xl font-bold text-white tracking-tight">{prediction.predictedCondition || 'Unknown'}</p>
               </div>
               
               <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-center">
                 <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-3">Triage Directive</h3>
                 <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${prediction.urgencyLevel === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' : prediction.urgencyLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                      {prediction.urgencyLevel}
                    </span>
                    <span className="text-zinc-300 font-medium pl-3 border-l border-zinc-700">{prediction.recommendedSpecialist || 'General Physician'}</span>
                 </div>
               </div>
               
               <div className="md:col-span-2 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800 text-zinc-300 text-base leading-relaxed font-light">
                 <span className="block text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-xs">Clinical Summary</span>
                 {prediction.description}
               </div>

               {hospitals.length === 0 && !fetchingHospitals && (
                 <div className="md:col-span-2 mt-4 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                   <h3 className="text-lg font-semibold text-emerald-50 mb-2">Locate Treatment Facilities</h3>
                   <p className="text-emerald-200/60 mb-6 font-light text-sm">Target area mapping for {prediction.recommendedSpecialist} availability.</p>
                   <div className="flex flex-col md:flex-row gap-3">
                     <input 
                       type="text" 
                       placeholder="Enter Region or Zip Code..."
                       value={userLocation}
                       onChange={(e) => setUserLocation(e.target.value)}
                       className="flex-1 p-3.5 rounded-xl bg-zinc-950 border border-emerald-500/20 text-white text-base focus:border-emerald-500 focus:outline-none transition"
                     />
                     <button 
                      onClick={handleFindHospitals}
                      className="px-6 py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl transition-all active:scale-95 whitespace-nowrap">
                      Scan Network
                     </button>
                   </div>
                 </div>
               )}

               {fetchingHospitals && (
                 <div className="md:col-span-2 flex flex-col items-center justify-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 mt-2">
                   <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
                   <p className="text-zinc-400 text-sm font-medium">Interfacing with facility databases...</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Hospital Display */}
        {hospitals.length > 0 && (
          <div className="mt-16 animate-subtle-fade">
            <h2 className="text-2xl font-bold text-white mb-6">Network Targets</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hospitals.map((hospital, idx) => (
                <div key={idx} className="bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700 transition duration-300 relative">
                  <div className="absolute top-6 right-6 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs font-bold border border-zinc-700">
                     {hospital.treatmentCostRange || '$$$'}
                  </div>
                  
                  <div className="pr-16 mb-6">
                    <h3 className="font-semibold text-lg text-white mb-1">{hospital.name}</h3>
                    <p className="text-zinc-500 text-sm font-light flex items-center">
                       <svg className="w-4 h-4 mr-1.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                       {hospital.location}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 pt-5 border-t border-zinc-800/80 mb-6">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1.5">Rating</p>
                      <div className="flex items-end font-semibold text-lg text-white">
                        {hospital.rating} 
                        <span className="text-xs text-zinc-600 ml-1 mb-0.5 font-light">/ 5.0</span>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1.5">Experience</p>
                      <p className="font-semibold text-lg text-white flex items-end">
                        {hospital.doctorExperienceAvgYears || '10+'} 
                        <span className="text-xs text-zinc-600 ml-1 mb-0.5 font-light">years avg</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Accepted Payers</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.insuranceCompatibility?.slice(0,3).map((ins: string, i: number) => (
                        <span key={i} className="text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md">{ins}</span>
                      ))}
                      {hospital.insuranceCompatibility && hospital.insuranceCompatibility.length > 3 && (
                        <span className="text-[11px] font-medium text-zinc-500 px-1 py-1">+{hospital.insuranceCompatibility.length - 3}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
