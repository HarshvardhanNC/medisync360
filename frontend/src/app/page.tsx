"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center pb-20 pt-16">

      {/* ── Hero Section ─────────────────────────────────────────────────── */}
      <div className="relative w-full max-w-5xl mx-auto flex flex-col items-center animate-subtle-fade text-balance">
        
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 text-zinc-300 text-xs font-semibold mb-8 uppercase tracking-widest backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          The standard for modern healthcare
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6">
          Intelligent Healthcare, <br/>
          <span className="text-zinc-500">Secured Cryptographically.</span>
        </h1>

        <p className="text-lg md:text-xl text-zinc-400 font-normal max-w-2xl mx-auto leading-relaxed mb-10">
          MediSync360 unifies symptom analysis mapping, blockchain-verified medical records, and transparent insurance logistics into one beautifully engineered system.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center">
          <Link href="/register">
            <button className="px-8 py-3.5 bg-white text-zinc-950 font-semibold rounded-full text-base hover:bg-zinc-200 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] flex items-center gap-2">
              Start Free Trial
              <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
          </Link>
          <Link href="/symptom-checker">
            <button className="px-8 py-3.5 bg-transparent border border-zinc-800 text-zinc-300 font-semibold rounded-full text-base hover:text-white hover:bg-zinc-900 hover:border-zinc-700 hover:scale-105 active:scale-95 transition-all">
              Try the AI Predictor
            </button>
          </Link>
        </div>
      </div>

      {/* ── Feature Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-24 w-full max-w-7xl px-4 animate-subtle-fade" style={{ animationDelay: '0.1s' }}>
        
        {/* Feature 1 */}
        <div className="group relative rounded-3xl p-8 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-emerald-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Diagnostic AI</h2>
          <p className="text-zinc-500 font-light text-sm leading-relaxed">
            Gradient Boosting Machine Learning models resolve complex symptoms into highly accurate condition outcomes and specialist referrals.
          </p>
        </div>

        {/* Feature 2 */}
        <div className="group relative rounded-3xl p-8 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-amber-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Verified Vault</h2>
          <p className="text-zinc-500 font-light text-sm leading-relaxed">
            Every medical report uploaded is cryptographically hashed and verified against ledgers, guaranteeing absolute data immutability.
          </p>
        </div>

        {/* Feature 3 */}
        <div className="group relative rounded-3xl p-8 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-blue-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Insurance Core</h2>
          <p className="text-zinc-500 font-light text-sm leading-relaxed">
            Process complex structures into direct logical coverage answers, eliminating clinical claim denials and overhead cost confusion.
          </p>
        </div>

        {/* Feature 4 */}
        <div className="group relative rounded-3xl p-8 bg-zinc-900/40 border border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all text-left">
          <div className="w-12 h-12 rounded-xl bg-zinc-800/80 border border-zinc-700 flex items-center justify-center mb-6 text-zinc-400 group-hover:text-rose-400 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Secure SOS Access</h2>
          <p className="text-zinc-500 font-light text-sm leading-relaxed">
            Render dynamic QR gateways that grant first responders restricted, instant access to critical life-saving profiles bypass controls.
          </p>
        </div>

      </div>
    </div>
  );
}
