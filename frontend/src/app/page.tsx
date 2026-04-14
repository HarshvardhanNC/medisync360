"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-16 animate-in fade-in zoom-in duration-1000 pb-20">

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl mx-auto mt-10">

        {/* Vibrant glow layers */}
        <div
          className="animate-pulse-ring absolute rounded-full pointer-events-none"
          style={{
            width: "520px", height: "520px",
            top: "50%", left: "50%",
            background: "radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute pointer-events-none rounded-full"
          style={{
            width: "700px", height: "320px",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(ellipse, rgba(59,130,246,0.15) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Hero text */}
        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 text-teal-300 text-sm font-medium mb-4 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            AI-Powered · Blockchain-Secured · Real-Time
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter drop-shadow-2xl leading-none">
            <span className="block mb-2 text-white/90">Welcome to</span>
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage:
                  "linear-gradient(90deg, #2dd4bf 0%, #34d399 35%, #38bdf8 70%, #818cf8 100%)",
              }}
            >
              MediSync360
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto font-light leading-relaxed">
            The absolute future of healthcare decision-making. Harness AI symptom analysis,
            blockchain-secured medical records, and transparent insurance estimates all in one
            beautifully unified platform.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="relative z-10 mt-10 flex flex-wrap gap-4 justify-center">
          <Link href="/login">
            <button
              className="px-10 py-4 font-bold rounded-full text-lg transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #14b8a6, #3b82f6)",
                boxShadow: "0 0 30px rgba(20,184,166,0.45), 0 0 60px rgba(59,130,246,0.2)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 45px rgba(20,184,166,0.65), 0 0 80px rgba(59,130,246,0.3)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 0 30px rgba(20,184,166,0.45), 0 0 60px rgba(59,130,246,0.2)";
              }}
            >
              Get Started
            </button>
          </Link>
          <Link href="/symptom-checker">
            <button className="px-10 py-4 bg-white/5 border border-white/20 text-white font-bold rounded-full text-lg hover:bg-white/10 hover:border-white/40 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-sm">
              Try AI Predictor
            </button>
          </Link>
        </div>
      </div>

      {/* ── Feature Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 w-full max-w-7xl px-4 relative z-10">

        {/* AI Diagnostic */}
        <div
          className="group relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] cursor-default overflow-hidden"
          style={{
            background: "rgba(17,24,39,0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(20,184,166,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 8px 40px rgba(20,184,166,0.25), 0 0 0 1px rgba(20,184,166,0.35)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(20,184,166,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(20,184,166,0.2)";
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-teal-500/30 transition-all duration-300">
            <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">AI Diagnostic</h2>
          <p className="text-slate-400 text-base leading-relaxed font-light">
            Describe symptoms naturally to receive specialist mapping and high-precision clinical outcome predictions.
          </p>
        </div>

        {/* Secure Vault */}
        <div
          className="group relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] cursor-default overflow-hidden"
          style={{
            background: "rgba(17,24,39,0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(59,130,246,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 8px 40px rgba(59,130,246,0.25), 0 0 0 1px rgba(59,130,246,0.35)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(59,130,246,0.2)";
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-500/30 transition-all duration-300">
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Secure Vault</h2>
          <p className="text-slate-400 text-base leading-relaxed font-light">
            Store entire lifetime medical history secured globally authenticated via immutable framework ledgers.
          </p>
        </div>

        {/* Insurance Logic */}
        <div
          className="group relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] cursor-default overflow-hidden"
          style={{
            background: "rgba(17,24,39,0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(139,92,246,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 8px 40px rgba(139,92,246,0.25), 0 0 0 1px rgba(139,92,246,0.35)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(139,92,246,0.2)";
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-purple-500/30 transition-all duration-300">
            <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Insurance Logic</h2>
          <p className="text-slate-400 text-base leading-relaxed font-light">
            Cross-analyze coverage structures to map accurate overhead treatments mitigating clinical claim denials.
          </p>
        </div>

        {/* Rapid SOS */}
        <div
          className="group relative rounded-3xl p-8 transition-all duration-500 hover:-translate-y-3 hover:scale-[1.02] cursor-default overflow-hidden"
          style={{
            background: "rgba(17,24,39,0.55)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(244,63,94,0.2)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow =
              "0 8px 40px rgba(244,63,94,0.25), 0 0 0 1px rgba(244,63,94,0.35)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(244,63,94,0.45)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.4)";
            (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(244,63,94,0.2)";
          }}
        >
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-rose-500/30 transition-all duration-300">
            <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">Rapid SOS</h2>
          <p className="text-slate-400 text-base leading-relaxed font-light">
            Produce universally scannable markers providing responsive access bypass controls during clinical emergencies.
          </p>
        </div>

      </div>
    </div>
  );
}
