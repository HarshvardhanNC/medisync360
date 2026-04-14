"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI, fetchAPIForm } from "../../utils/api";

interface MedicalReport {
  _id: string;
  fileName: string;
  fileType: string;
  cloudinaryURL: string;
  uploadDate: string;
  fileHash: string;
  blockchainHashReference: string;
  verificationStatus: "verified" | "tampered" | "unchecked";
}

// ── Verification status badge ──────────────────────────────────────────────
function VerificationBadge({ status }: { status: MedicalReport["verificationStatus"] }) {
  if (status === "verified") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <span>✅</span> Verified
      </span>
    );
  }
  if (status === "tampered") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/25">
        <span>❌</span> Tampered
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span>🔍</span> Unchecked
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function MedicalVault() {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch reports on mount ───────────────────────────────────────────────
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await fetchAPI("/reports");
        setReports(data.reports || []);
      } catch (err) {
        console.error("Failed to fetch reports", err);
        setError("Failed to load your medical vault");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // ── File upload via FormData (required for Multer) ───────────────────────
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchAPIForm("/reports/upload", formData);

      // Prepend the new report to the list
      setReports((prev) => [response.report, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to upload report");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // ── Integrity verification ───────────────────────────────────────────────
  const handleVerify = async (reportId: string) => {
    setVerifyingId(reportId);
    try {
      const result = await fetchAPI(`/reports/verify/${reportId}`, "POST");

      // Update the local state with the new verification status
      setReports((prev) =>
        prev.map((r) =>
          r._id === reportId
            ? { ...r, verificationStatus: result.verified ? "verified" : "tampered" }
            : r
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Verification failed");
    } finally {
      setVerifyingId(null);
    }
  };

  const triggerFileUpload = () => fileInputRef.current?.click();

  // ── Secure download (uses backend-signed Cloudinary URL) ────────────────
  const handleDownload = async (reportId: string) => {
    setError("");
    try {
      const data = await fetchAPI(`/reports/${reportId}/download-link`);
      if (!data?.downloadUrl) {
        throw new Error("Download link not available");
      }

      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate download link");
    }
  };

  // ── Loading spinner ──────────────────────────────────────────────────────
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

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500 pt-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight flex items-center space-x-3">
            <span className="w-2 h-8 rounded-full bg-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            <span>Medical Report Vault</span>
          </h1>
          <p className="text-gray-400 mt-2 font-medium">
            Globally authenticated clinical record storage anchored on decentralized ledgers.
          </p>
        </div>

        <button
          onClick={triggerFileUpload}
          disabled={uploading}
          className={`flex items-center space-x-2 px-8 py-3 bg-white text-gray-900 border-2 border-white rounded-xl hover:bg-gray-100 hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all font-bold ${
            uploading ? "opacity-70 cursor-wait transform-none hover:scale-100" : ""
          }`}
        >
          {uploading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-900"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Securing...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path>
              </svg>
              <span>Upload Document</span>
            </>
          )}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center text-red-300 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 font-medium">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          {error}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
      />

      {/* Reports grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div
            key={report._id}
            className="bg-[#111827]/80 backdrop-blur-xl border border-gray-700/50 p-6 rounded-3xl flex flex-col justify-between group hover:border-gray-500 transition-colors shadow-xl"
          >
            {/* Top section: name + status badge */}
            <div>
              <div className="flex justify-between items-start mb-3 gap-2">
                <h3
                  className="font-bold text-lg text-white line-clamp-1 flex-1"
                  title={report.fileName}
                >
                  {report.fileName}
                </h3>
                <VerificationBadge status={report.verificationStatus} />
              </div>

              {/* File type chip */}
              <span className="text-xs font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                {report.fileType === "application/pdf" ? "PDF" : report.fileType.split("/")[1]}
              </span>

              {/* Hash preview */}
              <div className="bg-[#1F2937] p-3 rounded-xl border border-gray-800 mt-3 mb-1">
                <p className="text-xs font-mono text-gray-400 break-all" title={report.fileHash}>
                  <span className="text-gray-500 mr-2">SHA-256</span>
                  <span className="text-blue-400">
                    {report.fileHash
                      ? `${report.fileHash.substring(0, 10)}...${report.fileHash.substring(
                          report.fileHash.length - 8
                        )}`
                      : "Pending"}
                  </span>
                </p>
              </div>

              {/* Block ID */}
              {report.blockchainHashReference && report.blockchainHashReference !== "pending" && (
                <p className="text-xs font-mono text-gray-600 px-1 truncate" title={report.blockchainHashReference}>
                  <span className="text-gray-700 mr-1">Block:</span>
                  {report.blockchainHashReference.substring(0, 18)}…
                </p>
              )}
            </div>

            {/* Bottom section: date + action buttons */}
            <div className="mt-4 pt-4 border-t border-gray-800 flex flex-col gap-3">
              <span className="text-sm font-medium text-gray-500">
                {new Date(report.uploadDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <div className="flex items-center gap-2">
                {/* Download — generates a signed URL from backend */}
                <button
                  onClick={() => handleDownload(report._id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600/20 border border-blue-600/30 text-blue-400 text-sm font-semibold hover:bg-blue-600/35 hover:text-blue-300 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  Download
                </button>

                {/* Verify integrity */}
                <button
                  onClick={() => handleVerify(report._id)}
                  disabled={verifyingId === report._id}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gray-700/30 border border-gray-600/30 text-gray-300 text-sm font-semibold hover:bg-gray-700/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-wait"
                >
                  {verifyingId === report._id ? (
                    <>
                      <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Checking…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                      </svg>
                      Verify
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Drop zone / empty state */}
        <div
          onClick={triggerFileUpload}
          className="border-2 border-dashed border-gray-700 bg-gray-800/20 rounded-3xl flex flex-col items-center justify-center p-8 text-center hover:bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer min-h-[220px] group"
        >
          {uploading ? (
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
              </svg>
            </div>
          )}
          <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">
            {uploading ? "Anchoring to Blockchain..." : "Drop Documents"}
          </h3>
          <p className="text-gray-500 mt-1 max-w-[200px] text-sm font-medium leading-relaxed">
            PDF, JPG, or PNG files up to 10MB.
          </p>
        </div>
      </div>
    </div>
  );
}
