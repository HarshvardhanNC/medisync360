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
  blockchainTransactionHash?: string;
  blockchainBlockNumber?: number;
  blockchainContractAddress?: string;
  blockchainNetwork?: string;
  verificationStatus: "verified" | "tampered" | "unchecked";
}

interface VerifyDetails {
  recomputedHash: string;
  storedHash: string;
  dbHashMatch: boolean;
  blockchainMatch: boolean;
  transactionHash: string;
  blockNumber: number;
  contractAddress: string;
  blockchainNetwork: string;
  onChainUploader: string;
  onChainTimestamp: number;
}

type UploadStep = "idle" | "hashing" | "uploading" | "saving" | "anchoring" | "mining" | "done" | "error";
type VerifyStep = "idle" | "fetching" | "hashing" | "comparing_db" | "comparing_chain" | "done" | "error";

const UPLOAD_STEPS = [
  { id: "hashing",   label: "SHA-256 Hashing",      desc: "Computing cryptographic fingerprint of your file",     icon: "🔐" },
  { id: "uploading", label: "Cloud Storage",         desc: "Encrypting & uploading to Cloudinary CDN",            icon: "☁️" },
  { id: "saving",    label: "Database Record",       desc: "Persisting metadata to MongoDB",                      icon: "🗄️" },
  { id: "anchoring", label: "Broadcasting to Chain", desc: "Sending anchorReport() tx to local EVM node",        icon: "📡" },
  { id: "mining",    label: "Block Mined",           desc: "Transaction confirmed & immutably written to ledger", icon: "⛏️" },
  { id: "done",      label: "Vault Secured",         desc: "File hash now lives permanently on blockchain",       icon: "🔒" },
];

const VERIFY_STEPS = [
  { id: "fetching",        label: "Fetching File",     desc: "Re-downloading original file bytes from Cloudinary" },
  { id: "hashing",         label: "Re-computing Hash", desc: "Running SHA-256 on live bytes" },
  { id: "comparing_db",    label: "Database Check",    desc: "Comparing against stored hash in MongoDB" },
  { id: "comparing_chain", label: "Blockchain Check",  desc: "Querying getReport() from on-chain registry" },
  { id: "done",            label: "Verdict",           desc: "Tamper detection complete" },
];

function shortHash(h: string, n = 10) {
  if (!h || h === "pending") return "pending...";
  return h.slice(0, n) + "..." + h.slice(-6);
}

function VerificationBadge({ status }: { status: MedicalReport["verificationStatus"] }) {
  if (status === "verified")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Verified
      </span>
    );
  if (status === "tampered")
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
        Tampered
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
      Unchecked
    </span>
  );
}

function UploadPipeline({ step, error }: { step: UploadStep; error: string }) {
  const activeIdx = UPLOAD_STEPS.findIndex((s) => s.id === step);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1117] border border-gray-700/60 rounded-3xl p-8 w-full max-w-lg shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Anchoring to Blockchain</h2>
            <p className="text-gray-500 text-xs">Real-time transaction pipeline</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mb-6">
          {[0,1,2,3,4,5,6,7].map((i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{
                backgroundColor:
                  step === "done" ? "#10b981" :
                  step === "error" ? "#ef4444" :
                  i <= activeIdx ? `hsl(${210 + i * 20}, 80%, 60%)` : "#1f2937",
              }}
            />
          ))}
        </div>

        <div className="space-y-3">
          {UPLOAD_STEPS.map((s, i) => {
            const isDone = activeIdx > i || step === "done";
            const isActive = s.id === step;
            return (
              <div
                key={s.id}
                className={`flex items-start gap-3 p-3 rounded-xl transition-all duration-300 ${
                  isActive ? "bg-blue-500/10 border border-blue-500/20" :
                  isDone ? "bg-emerald-500/5 border border-emerald-500/10" :
                  "bg-gray-900/40 border border-gray-800/40"
                }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm transition-all ${
                  isDone ? "bg-emerald-500/20 text-emerald-400" :
                  isActive ? "bg-blue-500/20 text-blue-400" :
                  "bg-gray-800 text-gray-600"
                }`}>
                  {isDone ? "✓" : isActive ? <span className="animate-spin inline-block">↻</span> : s.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${isDone ? "text-emerald-400" : isActive ? "text-blue-300" : "text-gray-600"}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-gray-600 truncate">{s.desc}</p>
                </div>
                {isActive && (
                  <div className="flex gap-0.5 self-center">
                    {[0,1,2].map((d) => (
                      <div key={d} className="w-1 h-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: `${d * 0.15}s` }} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
            Error: {error}
          </div>
        )}
      </div>
    </div>
  );
}

function VerifyModal({
  report, verifyStep, verifyDetails, onClose,
}: {
  report: MedicalReport;
  verifyStep: VerifyStep;
  verifyDetails: VerifyDetails | null;
  onClose: () => void;
}) {
  const activeIdx = VERIFY_STEPS.findIndex((s) => s.id === verifyStep);
  const isRunning = verifyStep !== "done" && verifyStep !== "error" && verifyStep !== "idle";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0d1117] border border-gray-700/60 rounded-3xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Integrity Verification</h2>
              <p className="text-gray-500 text-xs font-mono truncate max-w-xs">{report.fileName}</p>
            </div>
          </div>
          {!isRunning && (
            <button onClick={onClose} className="text-gray-600 hover:text-gray-300 transition-colors p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="space-y-2 mb-6">
          {VERIFY_STEPS.map((s, i) => {
            const isDone = activeIdx > i || verifyStep === "done";
            const isActive = s.id === verifyStep;
            return (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                isActive ? "bg-purple-500/10 border border-purple-500/20" :
                isDone ? "bg-emerald-500/5 border border-emerald-500/10" :
                "bg-gray-900/40 border border-gray-800/40"
              }`}>
                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  isDone ? "bg-emerald-500/20 text-emerald-400" :
                  isActive ? "bg-purple-500/20 text-purple-400" :
                  "bg-gray-800 text-gray-600"
                }`}>
                  {isDone ? "✓" : isActive ? <span className="animate-spin">↻</span> : i + 1}
                </div>
                <div>
                  <p className={`text-xs font-semibold ${isDone ? "text-emerald-400" : isActive ? "text-purple-300" : "text-gray-600"}`}>{s.label}</p>
                  <p className="text-[11px] text-gray-600">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {verifyDetails && verifyStep === "done" && (
          <div className="space-y-4">
            <div className={`rounded-2xl p-5 border ${verifyDetails.dbHashMatch && verifyDetails.blockchainMatch ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30"}`}>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{verifyDetails.dbHashMatch && verifyDetails.blockchainMatch ? "🔒" : "⚠️"}</span>
                <div>
                  <h3 className={`text-lg font-bold ${verifyDetails.dbHashMatch && verifyDetails.blockchainMatch ? "text-emerald-400" : "text-red-400"}`}>
                    {verifyDetails.dbHashMatch && verifyDetails.blockchainMatch ? "Document Integrity Confirmed" : "Tampering Detected!"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {verifyDetails.dbHashMatch && verifyDetails.blockchainMatch
                      ? "File matches both database record and blockchain anchor"
                      : "Hash mismatch found - document may have been altered"}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-3">
                <div className={`flex-1 p-2 rounded-lg text-center ${verifyDetails.dbHashMatch ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <p className="text-xs font-bold text-gray-400">DB Match</p>
                  <p className={`text-lg font-bold ${verifyDetails.dbHashMatch ? "text-emerald-400" : "text-red-400"}`}>{verifyDetails.dbHashMatch ? "✓" : "✗"}</p>
                </div>
                <div className={`flex-1 p-2 rounded-lg text-center ${verifyDetails.blockchainMatch ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                  <p className="text-xs font-bold text-gray-400">Chain Match</p>
                  <p className={`text-lg font-bold ${verifyDetails.blockchainMatch ? "text-emerald-400" : "text-red-400"}`}>{verifyDetails.blockchainMatch ? "✓" : "✗"}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hash Comparison</h4>
              <div>
                <p className="text-[11px] text-gray-600 mb-1">Live SHA-256 (from Cloudinary bytes)</p>
                <p className="font-mono text-xs text-blue-400 break-all bg-blue-500/5 p-2 rounded-lg border border-blue-500/10">{verifyDetails.recomputedHash}</p>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 mb-1">Stored in MongoDB</p>
                <p className={`font-mono text-xs break-all p-2 rounded-lg border ${verifyDetails.dbHashMatch ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" : "text-red-400 bg-red-500/5 border-red-500/10"}`}>{verifyDetails.storedHash}</p>
              </div>
            </div>

            {verifyDetails.transactionHash && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">On-Chain Record</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-600 mb-1">Transaction Hash</p>
                    <p className="font-mono text-[11px] text-purple-400 truncate">{shortHash(verifyDetails.transactionHash, 14)}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-600 mb-1">Block Number</p>
                    <p className="font-mono text-[11px] text-purple-400">#{verifyDetails.blockNumber}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-600 mb-1">Uploader Address</p>
                    <p className="font-mono text-[11px] text-purple-400 truncate">{shortHash(verifyDetails.onChainUploader || "", 10)}</p>
                  </div>
                  <div className="bg-gray-800/50 rounded-lg p-2.5">
                    <p className="text-[10px] text-gray-600 mb-1">Anchored At</p>
                    <p className="font-mono text-[11px] text-purple-400">
                      {verifyDetails.onChainTimestamp
                        ? new Date(verifyDetails.onChainTimestamp * 1000).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })
                        : "n/a"}
                    </p>
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2.5 mt-1">
                  <p className="text-[10px] text-gray-600 mb-1">Contract Address</p>
                  <p className="font-mono text-[11px] text-purple-400 break-all">{verifyDetails.contractAddress || "n/a"}</p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2.5">
                  <p className="text-[10px] text-gray-600 mb-1">Network</p>
                  <p className="font-mono text-[11px] text-purple-400">{verifyDetails.blockchainNetwork || "hardhat-local"}</p>
                </div>
              </div>
            )}

            <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-semibold transition-all">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BlockchainWidget({ reports }: { reports: MedicalReport[] }) {
  const anchored = reports.filter((r) => r.blockchainTransactionHash && r.blockchainTransactionHash !== "pending");
  const blocks = anchored.slice(0, 5).reverse();

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-4 mb-2 overflow-x-auto">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Live Chain State</span>
        <span className="ml-auto text-xs text-gray-600 font-mono">hardhat-local · EVM · MedicalReportRegistry.sol</span>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-gray-600 text-xs font-mono">No blocks mined yet — upload a document to anchor it on-chain</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-max">
          <div className="flex-shrink-0 w-20 h-16 rounded-xl bg-gray-800/60 border border-gray-700 flex flex-col items-center justify-center">
            <span className="text-[10px] text-gray-600 font-mono">genesis</span>
            <span className="text-xs text-gray-500 font-bold">#0</span>
          </div>
          <span className="text-gray-700 font-mono text-lg">→</span>

          {blocks.map((r, i) => (
            <div key={r._id} className="flex items-center gap-2">
              <div className="flex-shrink-0 w-28 h-16 rounded-xl bg-blue-900/20 border border-blue-700/40 flex flex-col items-center justify-center px-2 hover:border-blue-500/60 transition-colors cursor-default group relative">
                <span className="text-[10px] text-blue-500 font-mono">#{r.blockchainBlockNumber ?? "?"}</span>
                <span className="text-[10px] text-blue-400 font-mono truncate max-w-full">{shortHash(r.fileHash, 6)}</span>
                <span className="text-[9px] text-gray-600 truncate max-w-full">{r.fileName.slice(0, 10)}...</span>
                <div className="absolute bottom-full mb-2 left-0 bg-gray-900 border border-gray-700 rounded-lg p-2 text-[10px] font-mono text-gray-300 w-52 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                  <p className="text-gray-500">Tx: <span className="text-purple-400">{shortHash(r.blockchainTransactionHash || "", 12)}</span></p>
                  <p className="text-gray-500">Hash: <span className="text-blue-400">{shortHash(r.fileHash, 12)}</span></p>
                  <p className="text-gray-500">Status: <span className={r.verificationStatus === "verified" ? "text-emerald-400" : r.verificationStatus === "tampered" ? "text-red-400" : "text-yellow-400"}>{r.verificationStatus}</span></p>
                </div>
              </div>
              {i < blocks.length - 1 && <span className="text-gray-700 font-mono text-lg">→</span>}
            </div>
          ))}

          {anchored.length > 5 && (
            <>
              <span className="text-gray-700 font-mono text-lg">→</span>
              <div className="flex-shrink-0 w-20 h-16 rounded-xl bg-gray-800/40 border border-gray-700/40 border-dashed flex items-center justify-center">
                <span className="text-[10px] text-gray-600 font-mono">+{anchored.length - 5} more</span>
              </div>
            </>
          )}

          <span className="text-gray-700 font-mono text-lg">→</span>
          <div className="flex-shrink-0 w-20 h-16 rounded-xl bg-gray-800/30 border border-gray-700/30 border-dashed flex flex-col items-center justify-center">
            <div className="w-3 h-3 rounded-sm border border-gray-600 border-dashed animate-pulse mb-1" />
            <span className="text-[10px] text-gray-700 font-mono">next</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MedicalVault() {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploadError, setUploadError] = useState("");
  const [verifyingReport, setVerifyingReport] = useState<MedicalReport | null>(null);
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("idle");
  const [verifyDetails, setVerifyDetails] = useState<VerifyDetails | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError("");
    setUploadStep("hashing");
    const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      await tick(600);
      setUploadStep("uploading");

      const formData = new FormData();
      formData.append("file", file);
      const uploadPromise = fetchAPIForm("/reports/upload", formData);

      await tick(800);
      setUploadStep("saving");
      await tick(700);
      setUploadStep("anchoring");
      await tick(900);
      setUploadStep("mining");

      const response = await uploadPromise;

      setUploadStep("done");
      await tick(1200);
      setReports((prev) => [response.report, ...prev]);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || "Upload failed");
      setUploadStep("error");
      await tick(2500);
    } finally {
      setUploadStep("idle");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVerify = async (report: MedicalReport) => {
    setVerifyingReport(report);
    setVerifyDetails(null);
    setVerifyStep("fetching");
    const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));

    try {
      const verifyPromise = fetchAPI(`/reports/verify/${report._id}`, "POST");

      await tick(600);
      setVerifyStep("hashing");
      await tick(700);
      setVerifyStep("comparing_db");
      await tick(600);
      setVerifyStep("comparing_chain");

      const result = await verifyPromise;

      setVerifyDetails(result.details);
      setVerifyStep("done");

      setReports((prev) =>
        prev.map((r) =>
          r._id === report._id
            ? { ...r, verificationStatus: result.verified ? "verified" : "tampered" }
            : r
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Verification failed");
      setVerifyStep("error");
      await tick(2000);
      setVerifyingReport(null);
      setVerifyStep("idle");
    }
  };

  const handleDownload = async (reportId: string) => {
    setError("");
    try {
      const data = await fetchAPI(`/reports/${reportId}/download-link`);
      if (!data?.downloadUrl) throw new Error("Download link not available");
      window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      setError(err.message || "Failed to generate download link");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-gray-700 rounded-full" />
          <div className="absolute top-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-gray-400 font-medium tracking-wide font-mono text-sm">Decrypting Vault Access...</p>
      </div>
    );
  }

  const anchored = reports.filter((r) => r.blockchainTransactionHash && r.blockchainTransactionHash !== "pending");

  return (
    <>
      {uploadStep !== "idle" && <UploadPipeline step={uploadStep} error={uploadError} />}

      {verifyingReport && verifyStep !== "idle" && (
        <VerifyModal
          report={verifyingReport}
          verifyStep={verifyStep}
          verifyDetails={verifyDetails}
          onClose={() => {
            setVerifyingReport(null);
            setVerifyStep("idle");
            setVerifyDetails(null);
          }}
        />
      )}

      <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-500 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight flex items-center space-x-3">
              <span className="w-2 h-8 rounded-full bg-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
              <span>Medical Report Vault</span>
            </h1>
            <p className="text-gray-400 mt-2 font-medium text-sm">
              SHA-256 hashes anchored immutably on-chain via{" "}
              <span className="text-blue-400 font-mono">MedicalReportRegistry.sol</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-3 text-center">
              <div className="px-4 py-2 bg-gray-900/60 border border-gray-800 rounded-xl">
                <p className="text-lg font-bold text-white">{reports.length}</p>
                <p className="text-[10px] text-gray-600 uppercase tracking-wider">Total</p>
              </div>
              <div className="px-4 py-2 bg-emerald-500/5 border border-emerald-500/15 rounded-xl">
                <p className="text-lg font-bold text-emerald-400">{anchored.length}</p>
                <p className="text-[10px] text-emerald-700 uppercase tracking-wider">On-Chain</p>
              </div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadStep !== "idle"}
              className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-900 border-2 border-white rounded-xl hover:bg-gray-100 hover:scale-105 shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all font-bold disabled:opacity-70 disabled:cursor-wait"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>Upload and Anchor</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center text-red-300 bg-red-500/10 p-4 rounded-2xl border border-red-500/20 font-medium text-sm">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
            <button onClick={() => setError("")} className="ml-auto text-red-500 hover:text-red-300">x</button>
          </div>
        )}

        <BlockchainWidget reports={reports} />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "🔐", label: "SHA-256 Hash",     desc: "File fingerprinted before upload" },
            { icon: "⛓️", label: "anchorReport()",   desc: "Solidity fn writes hash on-chain" },
            { icon: "🗄️", label: "MongoDB + Cloud",  desc: "Metadata stored off-chain" },
            { icon: "✅", label: "getReport()",      desc: "Live comparison on verification" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-900/40 border border-gray-800 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs font-bold text-gray-300 font-mono">{item.label}</p>
                <p className="text-[10px] text-gray-600 leading-tight">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept=".pdf,.png,.jpg,.jpeg"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {reports.map((report) => {
            const hasChain = report.blockchainTransactionHash && report.blockchainTransactionHash !== "pending";
            return (
              <div
                key={report._id}
                className="bg-[#0d1117]/90 backdrop-blur-xl border border-gray-700/50 rounded-3xl flex flex-col justify-between group hover:border-gray-600 transition-all shadow-xl"
              >
                <div className={`h-1 rounded-t-3xl ${hasChain ? "bg-gradient-to-r from-blue-600 to-emerald-500" : "bg-gray-800"}`} />

                <div className="p-5">
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <h3 className="font-bold text-base text-white line-clamp-1 flex-1" title={report.fileName}>
                      {report.fileName}
                    </h3>
                    <VerificationBadge status={report.verificationStatus} />
                  </div>

                  <span className="text-[10px] font-semibold text-gray-500 bg-gray-800 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {report.fileType === "application/pdf" ? "PDF" : report.fileType.split("/")[1]}
                  </span>

                  <div className="bg-[#1a2030] p-3 rounded-xl border border-gray-800/80 mt-3">
                    <p className="text-[10px] font-semibold text-gray-600 mb-1 uppercase tracking-wider">SHA-256 Fingerprint</p>
                    <p className="text-xs font-mono text-blue-400 break-all" title={report.fileHash}>
                      {report.fileHash
                        ? report.fileHash.substring(0, 12) + "..." + report.fileHash.substring(report.fileHash.length - 8)
                        : "Pending"}
                    </p>
                  </div>

                  {hasChain ? (
                    <div className="mt-3 bg-blue-950/20 border border-blue-800/30 rounded-xl p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">On-Chain Anchor</p>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                        <div>
                          <p className="text-gray-600">Tx Hash</p>
                          <p className="text-purple-400 truncate" title={report.blockchainTransactionHash}>
                            {shortHash(report.blockchainTransactionHash || "", 10)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Block</p>
                          <p className="text-purple-400">#{report.blockchainBlockNumber ?? "?"}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-600">Contract</p>
                          <p className="text-purple-400 truncate" title={report.blockchainContractAddress}>
                            {shortHash(report.blockchainContractAddress || "", 12)}
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-600">Network</p>
                          <p className="text-purple-400">{report.blockchainNetwork || "hardhat-local"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl p-3">
                      <p className="text-[10px] text-yellow-500 font-mono">Not yet anchored on blockchain</p>
                    </div>
                  )}
                </div>

                <div className="px-5 pb-5">
                  <div className="border-t border-gray-800/60 pt-4 flex flex-col gap-2">
                    <span className="text-xs font-medium text-gray-600">
                      {new Date(report.uploadDate).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(report._id)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600/15 border border-blue-600/25 text-blue-400 text-xs font-semibold hover:bg-blue-600/30 hover:text-blue-300 transition-all"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download
                      </button>
                      <button
                        onClick={() => handleVerify(report)}
                        disabled={verifyingReport?._id === report._id}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/10 border border-purple-600/20 text-purple-400 text-xs font-semibold hover:bg-purple-600/25 hover:text-purple-300 transition-all disabled:opacity-50 disabled:cursor-wait"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Verify Chain
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-700 bg-gray-800/10 rounded-3xl flex flex-col items-center justify-center p-8 text-center hover:bg-gray-800/30 hover:border-blue-500/40 transition-all cursor-pointer min-h-[280px] group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Drop Document</h3>
            <p className="text-gray-600 text-xs font-medium leading-relaxed max-w-[160px]">
              PDF, JPG, or PNG - automatically hashed and anchored on-chain
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
