"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchAPI } from "../../utils/api";
import { useRouter } from "next/navigation";

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "patient",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (formData.password !== formData.confirmPassword) {
      return setError("Passwords do not match");
    }
    
    if (formData.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = formData;
      const data = await fetchAPI('/auth/register', 'POST', submitData);
      
      // Save token and redirect
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center -mt-10 px-4">
      <div className="relative w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="absolute -inset-0.5 bg-gradient-to-tr from-cyan-500/20 to-teal-500/20 blur-2xl z-0 pointer-events-none rounded-full"></div>
        
        <div className="bg-[#111827]/90 backdrop-blur-2xl border border-gray-700/60 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-extrabold text-white mb-2">Create Account</h2>
            <p className="text-gray-400 font-light">Join the future of healthcare.</p>
          </div>
          
          {error && (
             <div className="flex items-center text-red-300 bg-red-500/10 p-3 rounded-xl mb-4 border border-red-500/20 text-sm font-medium">
                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {error}
             </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1 ml-1">Choose Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-[#1F2937] border border-gray-600 text-white focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 appearance-none cursor-pointer font-medium"
              >
                <option value="patient">Patient</option>
                <option value="provider">Provider (Doctor/Hospital)</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1 ml-1">
                {formData.role === 'provider' ? 'Hospital / Doctor Name' : 'Full Name'}
              </label>
              <input 
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                placeholder={formData.role === 'provider' ? 'e.g. City General Hospital' : 'Jane Doe'} 
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1 ml-1">Email Address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                placeholder="jane.doe@example.com" 
                required
              />
            </div>
            
            {/* Conditional Provider Fields */}
            {formData.role === 'provider' && (
              <div className="p-4 bg-teal-900/20 border border-teal-500/30 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                <div>
                  <label className="block text-sm font-semibold text-teal-300 mb-1 ml-1">Specialization</label>
                  <input 
                    type="text" 
                    name="specialization"
                    onChange={(e) => {
                       // Convert comma separated string to array for backend
                       setFormData({ ...formData, specialization: e.target.value.split(',').map(s => s.trim()) as any })
                    }}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#1F2937]/80 border border-teal-600/50 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium text-sm" 
                    placeholder="e.g. Cardiology, Neurology" 
                    required={formData.role === 'provider'}
                  />
                  <p className="text-xs text-gray-500 mt-1 ml-1">Separate multiple with commas</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-teal-300 mb-1 ml-1">Experience (Years)</label>
                    <input 
                      type="number" 
                      name="experienceYears"
                      onChange={(e) => setFormData({ ...formData, experienceYears: parseInt(e.target.value) as any })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#1F2937]/80 border border-teal-600/50 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium text-sm" 
                      placeholder="e.g. 10" 
                    />
                  </div>
                  <div>
                     <label className="block text-xs font-semibold text-teal-300 mb-1 ml-1">Consultation Fee (₹)</label>
                    <input 
                      type="number" 
                      name="consultationFee"
                      onChange={(e) => setFormData({ ...formData, consultationFee: parseInt(e.target.value) as any })}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#1F2937]/80 border border-teal-600/50 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium text-sm" 
                      placeholder="e.g. 500" 
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 ml-1">Password</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                  placeholder="••••••••" 
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1 ml-1">Confirm</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl bg-[#1F2937] border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400 transition-all font-medium" 
                  placeholder="••••••••" 
                  required
                />
              </div>
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className={`w-full mt-4 py-4 rounded-xl bg-white text-gray-900 font-extrabold text-lg hover:bg-gray-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0 shadow-[0_0_15px_rgba(255,255,255,0.2)] flex justify-center items-center ${loading ? 'opacity-70 cursor-wait transform-none' : ''}`}
            >
              {loading ? (
                <>
                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Creating Account...
                </>
              ) : 'Sign Up'}
            </button>
          </form>
          
          <p className="mt-8 text-center text-sm text-gray-400 font-medium">
            Already have an account? <Link href="/login" className="text-teal-400 hover:text-teal-300 hover:underline transition-colors">Sign In here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
