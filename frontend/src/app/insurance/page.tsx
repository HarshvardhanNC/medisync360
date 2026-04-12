"use client";

import { useState } from "react";
import { fetchAPI } from "../../utils/api";

export default function InsuranceAnalyzer() {
  const [costQuotation, setCostQuotation] = useState("");
  const [policyText, setPolicyText] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    if (!costQuotation || !policyText) return;
    setLoading(true);
    setError("");
    
    try {
      const data = await fetchAPI('/ai/insurance', 'POST', { 
        costQuotation: Number(costQuotation), 
        policyText 
      });
      setAnalysis(data);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Make sure you are logged in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full space-y-8 animate-in fade-in zoom-in-95 duration-700 pt-4">
      <div className="text-center border-b border-gray-800 pb-8 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-500/20 blur-[80px] pointer-events-none rounded-full"></div>
        <h1 className="relative text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400 inline-block drop-shadow-xl tracking-tight mb-4">
          AI Insurance Analyzer
        </h1>
        <p className="relative text-gray-400 max-w-2xl mx-auto font-medium text-lg leading-relaxed">
          Upload your policy documentation and hospital quotations. Our advanced AI layers will parse exclusions and estimate real coverage endpoints to prevent surprise clinical bills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
         <div className="space-y-6">
            {error && (
               <div className="flex items-center text-red-300 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 text-sm font-medium">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  {error}
               </div>
            )}
            
            <div className="bg-[#111827]/80 backdrop-blur-xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl transition focus-within:border-purple-500/50">
               <label className="block font-bold mb-3 text-purple-200">Total Quotation Value ($)</label>
               <input 
                 type="number" 
                 value={costQuotation}
                 onChange={(e) => setCostQuotation(e.target.value)}
                 className="w-full bg-[#1F2937] border border-gray-600 rounded-xl p-4 text-white font-bold focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition shadow-inner" 
                 placeholder="e.g. 15000" 
               />
            </div>
            
            <div className="bg-[#111827]/80 backdrop-blur-xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl transition focus-within:border-purple-500/50">
               <label className="block font-bold mb-3 text-purple-200">Insurance Policy Term Text</label>
               <textarea 
                 value={policyText}
                 onChange={(e) => setPolicyText(e.target.value)}
                 className="w-full h-48 bg-[#1F2937] border border-gray-600 rounded-xl p-4 text-white font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-none transition shadow-inner leading-relaxed" 
                 placeholder="Paste policy details, general exclusions, tier schedules, or specific medical coverage limits here to allow the AI to compute overheads..."
               ></textarea>
            </div>
            
            <button 
              onClick={handleAnalyze}
              disabled={loading || !policyText || !costQuotation}
              className={`w-full py-5 rounded-2xl bg-white text-gray-900 font-extrabold text-xl hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-[0_0_20px_rgba(255,255,255,0.2)] flex justify-center items-center ${loading ? 'opacity-70 cursor-wait transform-none' : ''}`}
            >
               {loading ? (
                 <>
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Running Neural Computation...
                 </>
               ) : 'Execute Document Analysis'}
            </button>
         </div>

         <div className={`bg-[#111827]/80 backdrop-blur-xl rounded-[2rem] p-8 border border-gray-700/50 shadow-2xl h-full flex flex-col relative overflow-hidden ${analysis ? '' : 'items-center justify-center text-center'}`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
            
            {!analysis ? (
               <div className="text-gray-500 max-w-sm mx-auto relative z-10 flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-[#1F2937] border border-gray-700 mb-6 flex items-center justify-center">
                     <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-300 mb-2">Awaiting Input</h3>
                  <p className="font-medium text-sm leading-relaxed">Enter your treatment quotation and paste the raw policy text to calculate claim acceptance metrics.</p>
               </div>
            ) : (
               <div className="space-y-6 animate-in fade-in slide-in-from-right-4 relative z-10">
                  <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-500 border-b border-gray-800 pb-4 mb-6">Computation Results</h3>
                  
                  <div className="flex justify-between items-center bg-[#1F2937] p-6 rounded-2xl border border-emerald-500/20 shadow-lg">
                     <span className="text-gray-300 font-bold">Covered Approximation:</span>
                     <span className="text-3xl font-black text-emerald-400">${analysis.estimatedCoveredAmount}</span>
                  </div>
                  
                  <div className="flex justify-between items-center bg-[#1F2937] p-6 rounded-2xl border border-rose-500/20 shadow-lg">
                     <span className="text-gray-300 font-bold">Out of Pocket Projection:</span>
                     <span className="text-3xl font-black text-rose-400">${analysis.estimatedOutOfPocket}</span>
                  </div>

                  {analysis.notCoveredReasons && analysis.notCoveredReasons.length > 0 && (
                     <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-2xl mt-8">
                        <h4 className="font-bold text-rose-400 mb-3 flex items-center space-x-2">
                           <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                           <span>Exclusion Justifications</span>
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2 font-medium">
                           {analysis.notCoveredReasons.map((r: string, idx: number) => <li key={idx} className="leading-relaxed">{r}</li>)}
                        </ul>
                     </div>
                  )}

                  {analysis.rejectionRisks && analysis.rejectionRisks.length > 0 && (
                     <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-2xl">
                        <h4 className="font-bold text-yellow-400 mb-3 flex items-center space-x-2">
                           <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                           <span>Identified Claim Rejection Traps</span>
                        </h4>
                        <ul className="list-disc list-inside text-sm text-gray-300 space-y-2 font-medium">
                           {analysis.rejectionRisks.map((r: string, idx: number) => <li key={idx} className="leading-relaxed">{r}</li>)}
                        </ul>
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );
}
