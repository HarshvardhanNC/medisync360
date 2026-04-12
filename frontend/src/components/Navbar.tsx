"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
    window.location.href = "/login";
  };

  return (
    <nav className="fixed w-full z-50 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="text-3xl font-extrabold tracking-tight flex items-center space-x-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
              </div>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 group-hover:to-white transition-colors">MediSync</span>
              <span className="text-teal-400">360</span>
            </Link>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex space-x-2 items-center bg-[#111827] border border-gray-700/50 rounded-full px-2 py-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
            <Link href="/dashboard" className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Dashboard</Link>
            <Link href="/symptom-checker" className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/symptom-checker' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>AI Diagnosis</Link>
            <Link href="/vault" className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/vault' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Medical Vault</Link>
            <Link href="/insurance" className={`px-5 py-2 rounded-full font-medium transition-all ${pathname === '/insurance' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>Insurance</Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <button 
                onClick={handleLogout}
                className="px-6 py-2.5 text-sm font-bold rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 hover:border-red-500 transition-all shadow-lg"
              >
                Logout
              </button>
            ) : (
              <Link href="/login" className="px-8 py-3 text-sm font-bold rounded-full bg-white text-gray-900 hover:bg-gray-100 hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                Login
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-300 hover:text-white p-2 rounded-lg hover:bg-white/5 transition focus:outline-none"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0F19] border-b border-gray-800 px-4 pt-2 pb-6 space-y-3 absolute w-full shadow-2xl">
          <Link href="/dashboard" className={`block px-4 py-3 rounded-xl font-medium transition ${pathname === '/dashboard' ? 'bg-teal-500/10 text-teal-400' : 'text-gray-300 hover:bg-[#111827]'}`} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
          <Link href="/symptom-checker" className={`block px-4 py-3 rounded-xl font-medium transition ${pathname === '/symptom-checker' ? 'bg-teal-500/10 text-teal-400' : 'text-gray-300 hover:bg-[#111827]'}`} onClick={() => setMobileMenuOpen(false)}>AI Diagnosis</Link>
          <Link href="/vault" className={`block px-4 py-3 rounded-xl font-medium transition ${pathname === '/vault' ? 'bg-teal-500/10 text-teal-400' : 'text-gray-300 hover:bg-[#111827]'}`} onClick={() => setMobileMenuOpen(false)}>Medical Vault</Link>
          <Link href="/insurance" className={`block px-4 py-3 rounded-xl font-medium transition ${pathname === '/insurance' ? 'bg-teal-500/10 text-teal-400' : 'text-gray-300 hover:bg-[#111827]'}`} onClick={() => setMobileMenuOpen(false)}>Insurance</Link>
          
          <div className="pt-6 border-t border-gray-800 pb-2">
            {isAuthenticated ? (
              <button 
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="w-full text-left px-4 py-3 rounded-xl bg-red-500/10 text-red-500 font-bold border border-red-500/20"
              >
                Logout All Sessions
              </button>
            ) : (
              <Link href="/login" className="block text-center px-4 py-3 rounded-xl bg-white text-gray-900 font-bold shadow-lg" onClick={() => setMobileMenuOpen(false)}>
                Secure Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
