"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "../../utils/api";

export default function MedicalVault() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userData = await fetchAPI('/users/profile');
        setUser(userData);
        
        if (userData && userData._id) {
          const reportsData = await fetchAPI(`/reports/${userData._id}`);
          setReports(reportsData.reports || []);
        }
      } catch (err) {
        console.error("Failed to fetch data", err);
        setError("Failed to load your medical vault");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError("");

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const response = await fetchAPI('/reports/upload', 'POST', {
          patientId: user._id,
          fileData: base64data
        });
        
        // Add new report to list locally
        setReports([{
           fileName: file.name,
           fileHash: response.fileHash,
           txHash: response.blockchainTxHash,
           date: new Date().toISOString()
        }, ...reports]);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to upload report');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
         fileInputRef.current.value = "";
      }
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  if (loading) {
     return (
       <div className="flex-1 flex flex-col items-center justify-center space-y-6">
         <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-700 rounded-full"></div>
            <div className="absolute top-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
         </div>
         <p className="text-gray-400 font-medium tracking-wide">Decrypting Vault Access...</p>
       </div>
     );
  }

  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pt-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
        <div>
           <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight flex items-center space-x-3">
              <span className="w-2 h-8 rounded-full bg-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
              <span>Medical Report Vault</span>
           </h1>
           <p className="text-gray-400 mt-2 font-medium">Globally authenticated clinical record storage anchored on decentralized ledgers.</p>
        </div>
        <button 
          onClick={triggerFileUpload}
          disabled={uploading}
          className={`flex items-center space-x-2 px-8 py-3 bg-white text-gray-900 border-2 border-white rounded-xl hover:bg-gray-100 hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all font-bold ${uploading ? 'opacity-70 cursor-wait transform-none hover:scale-100' : ''}`}
        >
           {uploading ? (
             <>
               <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               <span>Securing...</span>
             </>
           ) : (
             <>
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
               <span>Upload Document</span>
             </>
           )}
        </button>
      </div>

      {error && (
         <div className="flex items-center text-red-300 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 font-medium">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            {error}
         </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".pdf,.png,.jpg,.jpeg"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {reports.map((report, idx) => (
          <div key={idx} className="bg-[#111827]/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl flex flex-col justify-between group hover:border-gray-500 transition-colors shadow-xl">
            <div>
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-white line-clamp-1 flex-1 pr-4" title={report.fileName || `Report_${idx+1}`}>{report.fileName || `Report_${idx+1}`}</h3>
                <span className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-full border border-emerald-500/20 flex-shrink-0">Secured</span>
              </div>
              <div className="bg-[#1F2937] p-3 rounded-xl border border-gray-800 mb-4">
                 <p className="text-xs font-mono text-gray-400 break-all" title={report.txHash}>
                   <span className="text-gray-500 mr-2">TX Hash</span>
                   <span className="text-blue-400">{report.fileHash ? `${report.fileHash.substring(0, 10)}...${report.fileHash.substring(report.fileHash.length - 8)}` : 'Pending'}</span>
                 </p>
              </div>
            </div>
            <div className="flex justify-between items-center mt-2 border-t border-gray-800 pt-4">
              <span className="text-sm font-medium text-gray-500">{new Date(report.date || Date.now()).toLocaleDateString()}</span>
              <button className="text-blue-400 font-semibold hover:text-blue-300 transition-colors text-sm group-hover:underline">View File</button>
            </div>
          </div>
        ))}

        <div onClick={triggerFileUpload} className="border-2 border-dashed border-gray-700 bg-gray-800/20 rounded-3xl flex flex-col items-center justify-center p-8 text-center hover:bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer min-h-[220px] group">
           {uploading ? (
             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           ) : (
             <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
             </div>
           )}
           <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">{uploading ? 'Anchoring to Blockchain...' : 'Drop Documents'}</h3>
           <p className="text-gray-500 mt-1 max-w-[200px] text-sm font-medium leading-relaxed">PDF, JPG, or PNG files up to 10MB.</p>
        </div>
      </div>
    </div>
  );
}
