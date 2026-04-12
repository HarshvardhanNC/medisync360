"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAPI } from "../../utils/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!email || !password) {
      return setError("Please fill in all fields");
    }

    setLoading(true);
    try {
      const data = await fetchAPI('/auth/login', 'POST', { email, password });
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="absolute -inset-0.5 bg-gradient-to-br from-teal-500/20 to-blue-500/20 blur-2xl z-0 pointer-events-none rounded-full"></div>
        
        <div className="bg-[#111827]/90 backdrop-blur-2xl border border-gray-700/60 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-extrabold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 font-light">Secure access to your medical ecosystem.</p>
          </div>
          
          {error && (
             <div className="flex items-center text-red-300 bg-red-500/10 p-3 rounded-xl mb-6 border border-red-500/20 text-sm font-medium">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
             </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5 ml-1">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                placeholder="jane.doe@example.com" 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1.5 ml-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                placeholder="••••••••" 
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-4 py-4 rounded-xl bg-white text-gray-900 font-extrabold text-lg hover:bg-gray-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] flex justify-center items-center ${loading ? 'opacity-70 cursor-wait transform-none' : ''}`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Authenticating...
                </>
              ) : 'Sign In'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-400 font-medium">
            New to MediSync? <Link href="/register" className="text-teal-400 hover:text-teal-300 hover:underline transition-colors">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
