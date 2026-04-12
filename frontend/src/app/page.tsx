import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-16 animate-in fade-in zoom-in duration-1000 pb-20">
      
      {/* Hero Section Container for Glow Effects */}
      <div className="relative w-full max-w-5xl mx-auto mt-10">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>
         
         <div className="relative z-10 space-y-6">
           <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white drop-shadow-xl">
             <span className="block mb-2">Welcome to</span>
             <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-emerald-400 to-cyan-500 drop-shadow-lg">MediSync360</span>
           </h1>
           <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
             The absolute future of healthcare decision-making. Harness AI symptom analysis, 
             blockchain-secured medical records, and transparent insurance estimates all in one beautifully unified platform.
           </p>
         </div>
         
         <div className="relative z-10 mt-10 flex space-x-6 justify-center">
            <Link href="/login">
              <button className="px-10 py-4 bg-white text-gray-900 font-bold rounded-full text-lg shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-transform">
                 Get Started
              </button>
            </Link>
            <Link href="/symptom-checker">
               <button className="px-10 py-4 bg-transparent border-2 border-white/20 text-white font-bold rounded-full text-lg hover:bg-white/5 transition-colors">
                  Try AI Predictor
               </button>
            </Link>
         </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 w-full max-w-7xl px-4 relative z-10">
        
        <div className="bg-[#111827]/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:bg-[#111827] transition-all duration-300 hover:-translate-y-2 group shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">AI Diagnostic</h2>
          <p className="text-gray-400 text-base leading-relaxed font-light">Describe symptoms naturally to receive specialist mapping and high-precision clinical outcome predictions.</p>
        </div>
        
        <div className="bg-[#111827]/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:bg-[#111827] transition-all duration-300 hover:-translate-y-2 group shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Secure Vault</h2>
          <p className="text-gray-400 text-base leading-relaxed font-light">Store entire lifetime medical history secured globally authenticated via immutable framework ledgers.</p>
        </div>
        
        <div className="bg-[#111827]/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:bg-[#111827] transition-all duration-300 hover:-translate-y-2 group shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Insurance Logic</h2>
          <p className="text-gray-400 text-base leading-relaxed font-light">Cross-analyze coverage structures to map accurate overhead treatments mitigating clinical claim denials.</p>
        </div>
        
        <div className="bg-[#111827]/60 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-8 hover:bg-[#111827] transition-all duration-300 hover:-translate-y-2 group shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
             <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Rapid SOS</h2>
          <p className="text-gray-400 text-base leading-relaxed font-light">Produce universally scannable markers providing responsive access bypass controls during clinical emergencies.</p>
        </div>

      </div>
    </div>
  );
}
