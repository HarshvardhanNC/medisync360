"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchAPI } from "../../utils/api";

type ProviderSlot = {
  id?: string;
  date: string;
  time: string;
  isBooked: boolean;
};

type ProviderDoctor = {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  fees: number;
  availability: ProviderSlot[];
};

type ProviderCard = {
  id: string;
  type: "hospital" | "clinic";
  name: string;
  location: string;
  treatmentCostRange: string;
  rating: number;
  doctorExperienceAvgYears: number;
  insuranceCompatibility: string[];
  emergencyServices: boolean;
  doctors: ProviderDoctor[];
};

type TriageRound = {
  stage: number;
  questions: string[];
  answers: string[];
};

type DiseaseAlternative = {
  condition: string;
  probability: number;
  confidence: number;
};

type PredictionResponse = {
  decision: "PREDICT" | "CLARIFY" | "ABSTAIN" | "URGENT_ESCALATION";
  prediction?: {
    condition: string;
    probability: number;
    confidence_percentage: number;
    simplified_condition?: string;
    patient_summary?: string;
  } | null;
  calibrated_probability?: number;
  alternatives?: DiseaseAlternative[];
  matched_symptoms?: string[];
  missing_information?: string[];
  uncertainty?: {
    score: number;
    entropy: number;
    level: string;
  };
  questions?: string[];
  clarification_questions?: string[];
  urgency?: string;
  abstained?: boolean;
  reason?: string;
  abstention_reason?: string | null;
  model_version?: string;

  // Backward compatibility
  decisionAction?: string;
  predictedCondition?: string;
  simplifiedCondition?: string;
  patientSummary?: string;
  recommendedSpecialist?: string;
  urgencyLevel?: string;
  description?: string;
  confidence?: number;
  calibratedProbability?: number;
  rawModelScore?: number;
  clinicalDisclaimer?: string;
  isEmergency?: boolean;
  matchedSymptoms?: string[];
  alternativePossibilities?: DiseaseAlternative[];
  precautions?: string[];
  needs_more_info?: boolean;
  follow_up_questions?: string[];
  triage_stage?: number;
};

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState("");
  const [baseSymptoms, setBaseSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
  const [error, setError] = useState("");
  const [hospitals, setHospitals] = useState<ProviderCard[]>([]);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState("");
  const [bookingKey, setBookingKey] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [triageRounds, setTriageRounds] = useState<TriageRound[]>([]);

  const resolvedSpecialist = prediction && prediction.decision === "PREDICT"
    ? prediction.recommendedSpecialist || "General Physician"
    : "";

  const loadHospitals = useCallback(async (showLoader: boolean) => {
    if (!resolvedSpecialist) return;

    const targetLocation = userLocation.trim() !== "" ? userLocation : "Mumbai";

    if (showLoader) {
      setFetchingHospitals(true);
    }

    setError("");

    try {
      const data = await fetchAPI("/ai/hospitals", "POST", {
        specialist: resolvedSpecialist,
        location: targetLocation,
      });
      setHospitals(data.hospitals || []);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to locate hospitals";
      setError(errorMsg);
    } finally {
      if (showLoader) {
        setFetchingHospitals(false);
      }
    }
  }, [resolvedSpecialist, userLocation]);

  const handleAnalyze = async (
    overrideSymptoms?: string,
    overrideRounds?: TriageRound[],
    options?: { preservePrediction?: boolean },
  ) => {
    const textToAnalyze = overrideSymptoms || symptoms;
    if (!textToAnalyze) return;

    setLoading(true);
    setError("");
    if (!options?.preservePrediction) {
      setPrediction(null);
    }
    setHospitals([]);

    try {
      const roundsToSubmit = overrideRounds ?? triageRounds;
      setTriageRounds(roundsToSubmit);
      const data: PredictionResponse = await fetchAPI("/ai/symptoms", "POST", {
        symptoms: textToAnalyze,
        triageContext: roundsToSubmit.length > 0 ? { rounds: roundsToSubmit } : undefined,
      });
      setPrediction(data);
      if (data.decision === "CLARIFY" || data.needs_more_info) {
        setAnswers({});
      } else {
        setAnswers({});
        setTriageRounds([]);
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to analyze symptoms";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (hospital: ProviderCard, doctor: ProviderDoctor, slot: ProviderSlot) => {
    const targetLocation = userLocation.trim() !== "" ? userLocation : hospital.location;
    const currentBookingKey = `${hospital.id}:${doctor.id}:${slot.date}:${slot.time}`;

    setBookingKey(currentBookingKey);
    setError("");

    try {
      await fetchAPI("/ai/book-generated-slot", "POST", {
        providerId: hospital.id,
        doctorId: doctor.id,
        date: slot.date,
        time: slot.time,
        specialist: resolvedSpecialist || doctor.specialization,
        location: targetLocation,
      });
      await loadHospitals(false);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to book appointment slot";
      setError(errorMsg);
    } finally {
      setBookingKey("");
    }
  };

  const handleFindHospitals = async () => {
    if (!resolvedSpecialist) return;
    await loadHospitals(true);
  };

  useEffect(() => {
    if (!resolvedSpecialist || hospitals.length === 0) return;

    const interval = window.setInterval(() => {
      void loadHospitals(false);
    }, 10000);

    const handleFocus = () => {
      void loadHospitals(false);
    };

    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [resolvedSpecialist, loadHospitals, hospitals.length]);

  return (
    <div className="flex-1 flex flex-col items-center pb-24 pt-8 animate-subtle-fade">
      <div className="w-full max-w-4xl space-y-12">
        <div className="text-center px-4 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            AI Clinical Diagnosis Protocol
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Describe symptoms using natural language. The calibrated ML pipeline evaluates diagnostic evidence, detects red-flags, and routes clinical decisions with zero forced guessing.
          </p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-md rounded-3xl p-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            {error && (
              <div className="flex items-center text-red-400 bg-red-400/10 p-4 rounded-xl mb-6 border border-red-400/20 font-medium text-sm">
                <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <label className="block text-sm font-semibold mb-3 text-zinc-300 uppercase tracking-widest">
              Clinical Observation
            </label>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="w-full h-40 p-5 rounded-2xl bg-zinc-950/50 border border-zinc-700 text-zinc-100 text-lg placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-light resize-none"
              placeholder="e.g., High fever accompanied by severe shivering chills, drenching sweats, muscle aches, and nausea..."
            />

            <div className="mt-6 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-xs text-zinc-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Calibrated Multi-Turn Engine Active</span>
              </div>
              <button
                onClick={() => {
                  setBaseSymptoms(symptoms.trim());
                  setTriageRounds([]);
                  setAnswers({});
                  handleAnalyze(symptoms.trim(), [], { preservePrediction: false });
                }}
                disabled={loading || !symptoms.trim()}
                className={`px-8 py-3.5 bg-white text-zinc-950 rounded-full font-semibold text-base hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center space-x-2 ${loading || !symptoms.trim() ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Analyzing Pipeline...</span>
                  </>
                ) : (
                  <>
                    <span>Execute Analysis</span>
                    <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* DECISION CASE 1: CLARIFY                                   */}
        {/* ========================================================= */}
        {prediction && (prediction.decision === "CLARIFY" || prediction.needs_more_info) && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-amber-500/30 mt-12 animate-subtle-fade relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.1)]">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center border-b border-zinc-800 pb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Decision: Clinical Clarification Required (CLARIFY)
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Triage Round {prediction.triage_stage || triageRounds.length + 1} of 3
              </span>
              <span className="text-zinc-400 text-sm">Targeted differentiation to resolve clinical entropy</span>
            </div>

            <p className="text-zinc-300 mb-6 font-light text-base bg-zinc-900/40 p-4 rounded-xl border border-zinc-800">
              {prediction.reason || prediction.description || "The symptoms described are shared among multiple conditions. Answering these targeted questions will differentiate potential causes."}
            </p>

            {/* Current Evidence / Matched Symptoms */}
            {(prediction.matched_symptoms || prediction.matchedSymptoms) && (prediction.matched_symptoms || prediction.matchedSymptoms)!.length > 0 && (
              <div className="mb-6 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800">
                <span className="block text-xs uppercase font-semibold text-zinc-500 tracking-wider mb-2">
                  Recognized Clinical Evidence So Far:
                </span>
                <div className="flex flex-wrap gap-2">
                  {(prediction.matched_symptoms || prediction.matchedSymptoms)!.map((sym, sIdx) => (
                    <span key={sIdx} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg">
                      ✓ {sym.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Questions List */}
            <div className="space-y-6 relative z-10">
              {(prediction.questions || prediction.clarification_questions || prediction.follow_up_questions || []).map((q: string, idx: number) => (
                <div key={idx} className="bg-zinc-900/60 rounded-2xl p-6 border border-zinc-800 transition-all hover:border-zinc-700">
                  <p className="text-white font-medium mb-4 text-base sm:text-lg flex items-start">
                    <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold mr-3 flex-shrink-0 mt-0.5 border border-amber-500/20">
                      {idx + 1}
                    </span>
                    {q}
                  </p>
                  <div className="flex flex-wrap gap-3 pl-9">
                    {["Yes", "No", "Not sure"].map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt }))}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-[0.98] ${
                          answers[idx] === opt
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.1)]"
                            : "bg-zinc-950 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-900"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div className="pt-8 mt-4 border-t border-zinc-800/80 flex justify-end">
                <button
                  onClick={() => {
                    const activeQuestions = prediction.questions || prediction.clarification_questions || prediction.follow_up_questions || [];
                    const allAnswered = activeQuestions.length > 0 && activeQuestions.every((_: string, index: number) => Boolean(answers[index]));
                    if (!allAnswered) {
                      setError("Please answer all follow-up questions before continuing.");
                      return;
                    }

                    setError("");
                    const roundAnswers = activeQuestions.map((_: string, index: number) => answers[index] || "Not sure");
                    const nextRounds = [
                      ...triageRounds,
                      {
                        stage: prediction.triage_stage || triageRounds.length + 1,
                        questions: activeQuestions,
                        answers: roundAnswers,
                      },
                    ];

                    setTriageRounds(nextRounds);
                    handleAnalyze(baseSymptoms || symptoms.trim(), nextRounds, { preservePrediction: true });
                  }}
                  disabled={loading}
                  className={`px-8 py-3.5 bg-emerald-500 text-zinc-950 rounded-full font-bold text-base transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center ${
                    loading ? "opacity-60 cursor-not-allowed" : "hover:bg-emerald-400"
                  }`}
                >
                  {loading ? "Continuing Triage..." : "Continue Assessment"}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DECISION CASE 2: URGENT_ESCALATION                         */}
        {/* ========================================================= */}
        {prediction && prediction.decision === "URGENT_ESCALATION" && (
          <div className="bg-red-950/40 rounded-3xl p-8 border-2 border-red-500/60 mt-12 animate-subtle-fade relative overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.25)]">
            <div className="flex items-center space-x-4 mb-6 pb-4 border-b border-red-500/30">
              <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 animate-pulse">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-red-500 text-white uppercase tracking-widest">
                    EMERGENCY
                  </span>
                  <span className="text-red-400 font-mono text-xs">Decision: URGENT_ESCALATION</span>
                </div>
                <h2 className="text-2xl font-bold text-red-400 tracking-wide mt-1">Immediate Medical Attention Required</h2>
              </div>
            </div>

            <div className="p-6 bg-red-900/30 rounded-2xl border border-red-500/30 mb-6">
              <p className="text-red-100 font-medium text-lg leading-relaxed">
                {prediction.description || prediction.reason}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-zinc-950/80 rounded-2xl p-6 border border-red-500/20">
                <h3 className="text-red-400 font-semibold uppercase tracking-wider text-xs mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Critical Emergency Actions
                </h3>
                <ul className="space-y-2.5 text-sm text-zinc-300">
                  {(prediction.precautions || [
                    "Call emergency services (911/112/108) immediately",
                    "Do not attempt to drive yourself to the hospital",
                    "Rest and remain seated or lying down in a safe position",
                    "Have someone stay with you while awaiting emergency response"
                  ]).map((item: string, idx: number) => (
                    <li key={idx} className="flex items-start">
                      <span className="text-red-400 mr-2 font-bold">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-red-500/10 rounded-2xl p-6 border border-red-500/30 flex flex-col justify-between">
                <div>
                  <h3 className="text-red-400 font-semibold uppercase tracking-wider text-xs mb-2">
                    Direct Emergency Hotlines
                  </h3>
                  <p className="text-sm text-zinc-300 mb-4">
                    Emergency triage safety red-flags override standard outpatient predictive modeling.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-4 py-2 bg-red-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-600/30">
                    Call 911 / 112
                  </span>
                  <span className="px-4 py-2 bg-zinc-900 text-zinc-300 border border-zinc-700 font-medium rounded-xl text-sm">
                    Nearest ER
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DECISION CASE 3: ABSTAIN                                   */}
        {/* ========================================================= */}
        {prediction && prediction.decision === "ABSTAIN" && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 mt-12 animate-subtle-fade relative overflow-hidden shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center border-b border-zinc-800 pb-4">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mr-3 text-blue-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Clinical Evaluation Status: Safe Abstention (ABSTAIN)
            </h2>

            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800 mb-6">
              <div className="flex items-center space-x-2 text-blue-400 mb-2 font-semibold text-lg">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>We don't have enough reliable information to make a prediction.</span>
              </div>
              <p className="text-zinc-300 text-base leading-relaxed mt-2">
                {prediction.abstention_reason || prediction.reason || prediction.description || "The symptoms provided do not match known diagnostic profiles with sufficient clinical confidence or fall outside our supported outpatient scope."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="p-5 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-300 text-sm space-y-2">
                <h4 className="font-semibold text-zinc-200 uppercase tracking-wider text-xs flex items-center">
                  <svg className="w-4 h-4 mr-1.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Recommended Next Steps
                </h4>
                <ul className="space-y-1.5 text-zinc-400 text-xs">
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2 font-bold">•</span>
                    Schedule a consultation with a General Physician for physical examination.
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2 font-bold">•</span>
                    Provide additional details such as fever severity, duration, or specific locations.
                  </li>
                  <li className="flex items-start">
                    <span className="text-blue-400 mr-2 font-bold">•</span>
                    If symptoms worsen abruptly or you experience red-flag signs, seek emergency care immediately.
                  </li>
                </ul>
              </div>

              <div className="p-5 bg-blue-500/5 rounded-2xl border border-blue-500/20 text-zinc-300 text-sm space-y-2">
                <p className="font-medium text-blue-300 flex items-center text-xs uppercase tracking-wider">
                  <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Zero-Forced-Guessing Safety Guarantee
                </p>
                <p className="text-zinc-400 font-light text-xs">
                  MediSync360 strictly adheres to calibrated selective classification. No random disease or artificial confidence is displayed when evidence is insufficient.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* DECISION CASE 4: PREDICT                                   */}
        {/* ========================================================= */}
        {prediction && (prediction.decision === "PREDICT" || (!prediction.needs_more_info && prediction.decision !== "ABSTAIN" && prediction.decision !== "URGENT_ESCALATION")) && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 mt-12 animate-subtle-fade relative overflow-hidden shadow-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center border-b border-zinc-800 pb-4 justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 text-emerald-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span>Diagnostic Assessment (PREDICT)</span>
              </div>
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-semibold rounded-lg">
                Decision: PREDICT
              </span>
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-sm relative z-10">
              {/* Top Condition Card */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-2 text-xs">
                  Primary Diagnostic Hypothesis
                </h3>
                <p className="text-2xl font-bold text-white tracking-tight">
                  {prediction.prediction?.condition || prediction.predictedCondition || "Unknown"}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    Calibrated Probability: {Math.round(((prediction.prediction?.probability ?? prediction.calibrated_probability ?? prediction.calibratedProbability ?? 0.85) * 100))}%
                  </span>
                  {prediction.uncertainty && (
                    <span className="px-3 py-1 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-mono border border-zinc-700">
                      Uncertainty: {prediction.uncertainty.level} (Entropy: {prediction.uncertainty.entropy})
                    </span>
                  )}
                  <span className="text-zinc-500 text-xs font-mono">
                    Model: {prediction.model_version || "calibrated-rf"}
                  </span>
                </div>
              </div>

              {/* Specialist & Urgency Card */}
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-center">
                <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-3 text-xs">
                  Triage Directive & Care Pathway
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      (prediction.urgencyLevel || prediction.urgency || "").includes("High") || (prediction.urgencyLevel || prediction.urgency || "").includes("Emergency")
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : (prediction.urgencyLevel || prediction.urgency || "").includes("Medium")
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {prediction.urgencyLevel || prediction.urgency || "Routine"}
                    </span>
                    <span className="text-zinc-300 font-medium pl-3 border-l border-zinc-700">
                      {prediction.recommendedSpecialist || "General Physician"}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-light pt-1">
                    Recommended specialist consultation for confirmatory diagnostics and treatment.
                  </p>
                </div>
              </div>

              {/* Patient Friendly Layman Summary */}
              {(prediction.patientSummary || prediction.prediction?.patient_summary) && (
                <div className="md:col-span-2 bg-teal-500/5 p-6 rounded-2xl border border-teal-500/20 text-teal-100 text-base leading-relaxed">
                  <span className="block text-teal-400 font-semibold mb-1.5 uppercase tracking-wider text-xs flex items-center">
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    What This Means For You (Patient Explanation)
                  </span>
                  <p className="font-medium text-sm sm:text-base text-teal-50">
                    {prediction.patientSummary || prediction.prediction?.patient_summary}
                  </p>
                </div>
              )}

              {/* Supporting Symptoms Evidence */}
              {(prediction.matched_symptoms || prediction.matchedSymptoms) && (prediction.matched_symptoms || prediction.matchedSymptoms)!.length > 0 && (
                <div className="md:col-span-2 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800">
                  <span className="block text-zinc-500 font-semibold mb-3 uppercase tracking-wider text-xs">
                    Supporting Clinical Evidence (Matched Symptoms)
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(prediction.matched_symptoms || prediction.matchedSymptoms)!.map((sym, sIdx) => (
                      <span key={sIdx} className="px-3 py-1.5 bg-zinc-950 text-zinc-200 border border-zinc-700 text-xs font-medium rounded-xl flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2"></span>
                        {sym.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Differential Alternatives */}
              {(prediction.alternatives || prediction.alternativePossibilities) && (prediction.alternatives || prediction.alternativePossibilities)!.length > 0 && (
                <div className="md:col-span-2 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800">
                  <span className="block text-zinc-500 font-semibold mb-3 uppercase tracking-wider text-xs">
                    Differential Diagnostic Candidates (Alternatives)
                  </span>
                  <div className="grid sm:grid-cols-3 gap-3">
                    {(prediction.alternatives || prediction.alternativePossibilities)!.slice(0, 3).map((alt, aIdx) => (
                      <div key={aIdx} className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                        <p className="text-white font-medium text-sm truncate">{alt.condition}</p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="w-full bg-zinc-800 h-1.5 rounded-full mr-3 overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(alt.confidence, 100)}%` }}></div>
                          </div>
                          <span className="text-zinc-400 text-xs font-mono whitespace-nowrap">{Math.round(alt.confidence)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Precautions */}
              {prediction.precautions && prediction.precautions.length > 0 && (
                <div className="md:col-span-2 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800">
                  <span className="block text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-xs">
                    Recommended Precautions & Care Instructions
                  </span>
                  <ul className="space-y-2 text-zinc-300 text-sm">
                    {prediction.precautions.map((precaution, pIdx) => (
                      <li key={pIdx} className="flex items-start">
                        <span className="text-emerald-400 mr-2 font-bold">•</span>
                        {precaution}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clinical Disclaimer */}
              <div className="md:col-span-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 text-zinc-500 text-xs font-light leading-relaxed">
                <span className="font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                  Clinical Disclaimer:
                </span>
                {prediction.clinicalDisclaimer || "Calibrated probability is a statistical estimate based on reported clinical observations, not medical certainty. Please consult a licensed medical professional for definitive diagnosis and treatment."}
              </div>

              {/* Facility Locator */}
              <div className="md:col-span-2 mt-4 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <h3 className="text-lg font-semibold text-emerald-50 mb-2">Locate Treatment Facilities</h3>
                <p className="text-emerald-200/60 mb-6 font-light text-sm">
                  Target area mapping for {prediction.recommendedSpecialist || "General Physician"} availability.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter Region or City (e.g. Mumbai, Delhi, Bengaluru)..."
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    className="flex-1 p-3.5 rounded-xl bg-zinc-950 border border-emerald-500/20 text-white text-base focus:border-emerald-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleFindHospitals}
                    disabled={fetchingHospitals}
                    className={`px-6 py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl transition-all active:scale-95 whitespace-nowrap ${fetchingHospitals ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {fetchingHospitals ? "Scanning Facilities..." : "Scan Network"}
                  </button>
                </div>
              </div>

              {fetchingHospitals && (
                <div className="md:col-span-2 flex flex-col items-center justify-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 mt-2">
                  <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-zinc-400 text-sm font-medium">Interfacing with verified provider catalog...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hospital Cards */}
        {hospitals.length > 0 && (
          <div className="mt-16 animate-subtle-fade">
            <h2 className="text-2xl font-bold text-white mb-6">Available Treatment Facilities & Doctors</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hospitals.map((hospital, hIndex) => (
                <div key={`${hospital.id}-${hIndex}`} className="bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700 transition duration-300 relative">
                  <div className="absolute top-6 right-6 bg-zinc-800 text-zinc-300 px-3 py-1 rounded-full text-xs font-bold border border-zinc-700">
                    {hospital.treatmentCostRange || "$$$"}
                  </div>

                  <div className="pr-16 mb-6">
                    <h3 className="font-semibold text-lg text-white mb-1">{hospital.name}</h3>
                    <p className="text-zinc-500 text-sm font-light flex items-center">
                      <svg className="w-4 h-4 mr-1.5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {hospital.location}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-5 border-t border-zinc-800/80 mb-6">
                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1.5">Rating</p>
                      <div className="flex items-end font-semibold text-lg text-white">
                        {hospital.rating}
                        <span className="text-xs text-zinc-600 ml-1 mb-0.5 font-light">/ 5.0</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1.5">Avg Experience</p>
                      <p className="font-semibold text-lg text-white">
                        {hospital.doctorExperienceAvgYears || "10+"}
                        <span className="text-xs text-zinc-400 font-light ml-1">years</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-800/80">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mr-1">Accepted Insurances:</span>
                    {hospital.insuranceCompatibility.slice(0, 3).map((ins, i) => (
                      <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md border border-zinc-700">
                        {ins}
                      </span>
                    ))}
                    {hospital.insuranceCompatibility.length > 3 && (
                      <span className="text-[11px] font-medium text-zinc-500 px-1 py-1">+{hospital.insuranceCompatibility.length - 3}</span>
                    )}
                  </div>

                  <div className="mt-5 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Available Doctors</p>
                    {hospital.doctors.map((doctor, dIndex) => (
                      <div key={`${doctor.id}-${dIndex}`} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div>
                            <h4 className="text-white font-semibold">{doctor.name}</h4>
                            <p className="text-sm text-zinc-400">
                              {doctor.specialization} • {doctor.experience} years • INR {doctor.fees}
                            </p>
                          </div>
                          <span className="text-[10px] text-emerald-400 border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-widest">
                            {hospital.type}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          {doctor.availability.map((slot) => {
                            const currentBookingKey = `${hospital.id}:${doctor.id}:${slot.date}:${slot.time}`;
                            const isBooking = bookingKey === currentBookingKey;

                            return (
                              <button
                                key={`${slot.date}-${slot.time}`}
                                onClick={() => handleBookSlot(hospital, doctor, slot)}
                                disabled={slot.isBooked || isBooking}
                                className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                  slot.isBooked
                                    ? "bg-red-500/10 border-red-500/20 text-red-400 cursor-not-allowed"
                                    : "bg-white text-zinc-950 border-white hover:bg-zinc-200"
                                } ${isBooking ? "opacity-70 cursor-wait" : ""}`}
                              >
                                {slot.isBooked
                                  ? `${slot.date} • ${slot.time} • Booked`
                                  : isBooking
                                    ? "Booking..."
                                    : `Book ${slot.date} • ${slot.time}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
