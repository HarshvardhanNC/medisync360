"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return (
    <div className="fixed top-0 inset-x-0 z-50 flex justify-center pt-6 px-4 pointer-events-none">
      <nav className="pointer-events-auto w-full max-w-5xl bg-zinc-950/70 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-full px-6 py-3 flex items-center justify-between transition-all">
        
        {/* Brand */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <div className="w-3 h-3 rounded-full bg-emerald-400 group-hover:scale-110 transition-transform shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-50 transition-colors">
              MediSync<span className="text-zinc-500 font-medium">360</span>
            </span>
          </Link>
        </div>
        
        {/* Desktop Links */}
        <div className="hidden md:flex items-center space-x-2">
          {[
            { name: 'Dashboard', path: '/dashboard' },
            { name: 'Diagnosis', path: '/symptom-checker' },
            { name: 'Vault', path: '/vault' },
            { name: '🛡️ Claim AI', path: '/claim-intelligence' },
          ].map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link 
                key={link.name} 
                href={link.path} 
                className={`px-4 py-2.5 rounded-full text-base font-semibold transition-all ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-inner' 
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            )
          })}
        </div>
        
        {/* Auth Button */}
        <div className="hidden md:flex items-center ml-4">
          {isAuthenticated ? (
            <button 
              onClick={handleLogout}
              className="px-5 py-2 text-sm font-semibold rounded-full bg-transparent text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 hover:bg-zinc-900 transition-all"
            >
              Logout
            </button>
          ) : (
            <Link 
              href="/login" 
              className="px-6 py-2 text-sm font-semibold rounded-full bg-white text-zinc-950 hover:bg-zinc-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.15)]"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-zinc-400 hover:text-white p-2 focus:outline-none"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-[80px] w-[calc(100%-2rem)] max-w-sm right-4 bg-zinc-900/95 backdrop-blur-3xl border border-white/10 rounded-3xl p-4 shadow-2xl pointer-events-auto flex flex-col space-y-2 animate-subtle-fade">
          <Link href="/dashboard" className="px-5 py-3 rounded-xl font-medium text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          <Link href="/symptom-checker" className="px-5 py-3 rounded-xl font-medium text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>AI Diagnosis</Link>
          <Link href="/vault" className="px-5 py-3 rounded-xl font-medium text-zinc-300 hover:bg-white/5 hover:text-white" onClick={() => setMobileMenuOpen(false)}>Medical Vault</Link>
          <Link href="/claim-intelligence" className="px-5 py-3 rounded-xl font-medium text-indigo-300 hover:bg-indigo-500/10 hover:text-indigo-100" onClick={() => setMobileMenuOpen(false)}>🛡️ Claim AI</Link>
          
          <div className="pt-4 mt-2 border-t border-zinc-800/50">
            {isAuthenticated ? (
              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-center px-5 py-3 rounded-xl font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20"
              >
                Logout
              </button>
            ) : (
              <Link href="/login" className="block text-center px-5 py-3 rounded-xl bg-white text-zinc-950 font-semibold" onClick={() => setMobileMenuOpen(false)}>
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
