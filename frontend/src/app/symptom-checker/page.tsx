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
    <div className="flex-1 flex flex-col items-center pb-24">
      <div className="w-full max-w-4xl space-y-10 animate-in fade-in duration-700">
        
        <div className="text-center px-4">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight text-white drop-shadow-md">
            AI Symptom <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Checker</span>
          </h1>
          <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Describe your symptoms naturally, and our Gemini AI intelligence will predict potential conditions and connect you with matching top-tier specialists.
          </p>
        </div>

        <div className="bg-[#111827]/80 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50 shadow-2xl relative overflow-hidden">
          {/* subtle glow behind */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/10 to-blue-500/10 blur-xl z-0 pointer-events-none"></div>
          
          <div className="relative z-10">
            {error && (
              <div className="flex items-center text-red-300 bg-red-500/10 p-4 rounded-xl mb-6 border border-red-500/20 font-medium">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
              </div>
            )}
            
            <label className="block text-xl font-semibold mb-4 text-white">What are your symptoms?</label>
            <textarea 
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full h-44 p-5 rounded-2xl bg-[#1F2937] border border-gray-600 text-white text-lg placeholder-gray-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/30 transition-all shadow-inner"
              placeholder="E.g., I have been having a severe headache accompanied by nausea for the past 2 days..."
            ></textarea>
            
            <div className="mt-8 flex justify-end">
              <button 
                onClick={handleAnalyze} 
                disabled={loading || !symptoms}
                className={`px-10 py-4 bg-white text-gray-900 rounded-full font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-[1.02] active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center space-x-2 ${loading ? 'opacity-70 cursor-wait transform-none' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <span>Analyze Symptoms</span>
                    <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {prediction && (
          <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-3xl p-8 border border-teal-500/30 mt-10 shadow-[0_10px_40px_rgba(20,184,166,0.15)] animate-in slide-in-from-bottom-8 duration-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center border-b border-gray-700/50 pb-4">
              <span className="bg-teal-500 text-white p-2 rounded-lg mr-4 shadow-lg shadow-teal-500/20">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              </span>
              AI Diagnosis Match
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8 text-lg relative z-10">
               <div className="bg-[#0B0F19]/50 rounded-2xl p-6 border border-gray-700/50">
                 <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Predicted Condition</h3>
                 <p className="text-2xl font-bold text-teal-300">{prediction.predictedCondition || 'Unknown'}</p>
               </div>
               
               <div className="bg-[#0B0F19]/50 rounded-2xl p-6 border border-gray-700/50 flex flex-col justify-center">
                 <h3 className="text-gray-400 text-sm font-semibold uppercase tracking-wider mb-2">Urgency Level & Specialist</h3>
                 <div className="flex items-center space-x-4">
                    <span className={`px-4 py-1.5 rounded-full text-sm font-bold shadow-sm ${prediction.urgencyLevel === 'High' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : prediction.urgencyLevel === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}`}>
                      {prediction.urgencyLevel} Urgency
                    </span>
                    <span className="text-white font-medium pl-4 border-l border-gray-600">{prediction.recommendedSpecialist || 'General Physician'}</span>
                 </div>
               </div>
               
               <div className="md:col-span-2 bg-teal-900/20 p-6 rounded-2xl border border-teal-500/20 text-gray-200 text-lg leading-relaxed shadow-inner">
                 <span className="block text-teal-400 font-bold mb-2">AI Summary:</span>
                 {prediction.description}
               </div>

               {hospitals.length === 0 && !fetchingHospitals && (
                 <div className="md:col-span-2 mt-6 p-6 bg-[#1F2937]/80 backdrop-blur border border-gray-600 rounded-2xl">
                   <h3 className="text-xl font-bold text-white mb-2">Ready to seek treatment?</h3>
                   <p className="text-gray-400 mb-6 font-light">Enter your location to discover top-rated real-world hospitals mapped directly to your needed specialist.</p>
                   <div className="flex flex-col md:flex-row gap-4">
                     <input 
                       type="text" 
                       placeholder="Enter City, State or Zip Code..."
                       value={userLocation}
                       onChange={(e) => setUserLocation(e.target.value)}
                       className="flex-1 p-4 rounded-xl bg-[#111827] border border-gray-600 text-white text-lg focus:border-teal-400 focus:ring-1 focus:ring-teal-400 focus:outline-none transition"
                     />
                     <button 
                      onClick={handleFindHospitals}
                      className="px-8 py-4 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-400 transition-colors shadow-lg shadow-teal-500/20 flex justify-center items-center">
                      Find Specialists
                     </button>
                   </div>
                 </div>
               )}

               {fetchingHospitals && (
                 <div className="md:col-span-2 flex flex-col items-center justify-center p-12 bg-black/30 rounded-2xl border border-gray-700/50 mt-4">
                   <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                   <p className="text-teal-400 text-xl font-medium">Scanning real-world hospital networks for {prediction.recommendedSpecialist}s...</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {hospitals.length > 0 && (
          <div className="mt-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <h2 className="text-4xl font-extrabold text-white mb-8 drop-shadow-sm flex items-center">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Available Hospitals</span>
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {hospitals.map((hospital, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden transform hover:-translate-y-1 transition duration-300 border border-gray-100">
                  <div className="absolute top-0 right-0 bg-gradient-to-bl from-teal-500 to-emerald-400 text-white px-5 py-2 rounded-bl-2xl rounded-tr-3xl font-bold shadow-md">
                     {hospital.treatmentCostRange || '$$$'}
                  </div>
                  
                  <div className="pr-20">
                    <h3 className="font-extrabold text-2xl text-gray-900 leading-tight">{hospital.name}</h3>
                    <p className="text-gray-500 mt-2 flex items-center font-medium">
                       <svg className="w-5 h-5 mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                       {hospital.location}
                    </p>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-1">Rating</p>
                      <div className="flex items-center text-yellow-500 font-extrabold text-xl">
                        {hospital.rating} 
                        <svg className="w-6 h-6 ml-1 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                      </div>
                       <p className="text-xs text-gray-400 mt-1">out of 5.0</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-gray-400 uppercase font-bold tracking-wider mb-1">Doctor Experience</p>
                      <p className="text-gray-900 font-extrabold text-xl">{hospital.doctorExperienceAvgYears || '10+'} <span className="text-sm font-medium text-gray-500">years avg</span></p>
                    </div>
                  </div>
                  
                  <div className="mt-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-3">Accepted Insurance Partners</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.insuranceCompatibility?.slice(0,4).map((ins: string, i: number) => (
                        <span key={i} className="text-sm font-medium bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg shadow-sm">{ins}</span>
                      ))}
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
