"use client";

import { useEffect, useState } from "react";
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

export default function SymptomChecker() {
  const [symptoms, setSymptoms] = useState("");
  const [baseSymptoms, setBaseSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState("");
  const [hospitals, setHospitals] = useState<ProviderCard[]>([]);
  const [fetchingHospitals, setFetchingHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState("");
  const [bookingKey, setBookingKey] = useState("");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [triageRounds, setTriageRounds] = useState<TriageRound[]>([]);

  const resolvedSpecialist = prediction && !prediction.needs_more_info ? prediction.recommendedSpecialist || "" : "";
  const currentFollowUpQuestions: string[] = prediction?.follow_up_questions || [];
  const allFollowUpAnswered =
    currentFollowUpQuestions.length > 0 &&
    currentFollowUpQuestions.every((_: string, index: number) => Boolean(answers[index]));

  const loadHospitals = async (showLoader: boolean) => {
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
    } catch (err: any) {
      setError(err.message || "Failed to locate hospitals");
    } finally {
      if (showLoader) {
        setFetchingHospitals(false);
      }
    }
  };

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
      const data = await fetchAPI("/ai/symptoms", "POST", {
        symptoms: textToAnalyze,
        triageContext: roundsToSubmit.length > 0 ? { rounds: roundsToSubmit } : undefined,
      });
      setPrediction(data);
      if (data.needs_more_info) {
        setAnswers({});
      } else {
        setAnswers({});
        setTriageRounds([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to analyze symptoms");
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
    } catch (err: any) {
      setError(err.message || "Failed to book appointment slot");
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
  }, [resolvedSpecialist, userLocation, hospitals.length]);

  return (
    <div className="flex-1 flex flex-col items-center pb-24 pt-8 animate-subtle-fade">
      <div className="w-full max-w-4xl space-y-12">
        <div className="text-center px-4 space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
            AI Diagnosis Protocol
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
            Input clinical symptoms using natural language. The ML engine will map observations to highly probable conditions and isolate the necessary specialist.
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
              placeholder="e.g., Sharp chest pain radiating to the left arm accompanied by sweating..."
            />

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setBaseSymptoms(symptoms.trim());
                  setTriageRounds([]);
                  setAnswers({});
                  handleAnalyze(symptoms.trim(), [], { preservePrediction: false });
                }}
                disabled={loading || !symptoms}
                className={`px-8 py-3.5 bg-white text-zinc-950 rounded-full font-semibold text-base hover:bg-zinc-200 transition-all active:scale-[0.98] flex items-center space-x-2 ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-zinc-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Processing...</span>
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

        {prediction && prediction.needs_more_info && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 mt-12 animate-subtle-fade relative overflow-hidden">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center border-b border-zinc-800 pb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mr-3 text-amber-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              Triage Follow-up Questions
            </h2>
            <p className="text-zinc-500 mb-3 uppercase tracking-wider text-xs">
              Round {prediction.triage_stage || triageRounds.length + 1}
            </p>
            <p className="text-zinc-400 mb-8 font-light text-lg">{prediction.description}</p>
            
            <div className="space-y-6 relative z-10">
              {prediction.follow_up_questions?.map((q: string, idx: number) => (
                <div key={idx} className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 transition-all hover:border-zinc-700">
                  <p className="text-white font-medium mb-4 text-lg">{q}</p>
                  <div className="flex flex-wrap gap-3">
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
                    if (!allFollowUpAnswered) {
                      setError("Please answer all follow-up questions before continuing.");
                      return;
                    }

                    setError("");
                    const roundAnswers = prediction.follow_up_questions.map((_: string, index: number) => answers[index] || "Not sure");
                    const nextRounds = [
                      ...triageRounds,
                      {
                        stage: prediction.triage_stage || triageRounds.length + 1,
                        questions: prediction.follow_up_questions,
                        answers: roundAnswers,
                      },
                    ];

                    setTriageRounds(nextRounds);
                    handleAnalyze(baseSymptoms || symptoms.trim(), nextRounds, { preservePrediction: true });
                  }}
                  disabled={loading || !allFollowUpAnswered}
                  className={`px-8 py-3.5 bg-emerald-500 text-zinc-950 rounded-full font-bold text-base transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] flex items-center ${
                    loading || !allFollowUpAnswered
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:bg-emerald-400"
                  }`}
                >
                  {loading ? "Continuing..." : "Continue Analysis"}
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {prediction && !prediction.needs_more_info && (
          <div className="bg-zinc-950 rounded-3xl p-8 border border-zinc-800 mt-12 animate-subtle-fade relative overflow-hidden">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center border-b border-zinc-800 pb-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mr-3 text-emerald-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Resolution Data
            </h2>

            <div className="grid md:grid-cols-2 gap-6 text-sm relative z-10">
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800">
                <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-2">Predicted Pathogen/Condition</h3>
                <p className="text-2xl font-bold text-white tracking-tight">{prediction.predictedCondition || "Unknown"}</p>
              </div>

              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-zinc-800 flex flex-col justify-center">
                <h3 className="text-zinc-500 font-semibold uppercase tracking-wider mb-3">Triage Directive</h3>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${prediction.urgencyLevel === "High" ? "bg-red-500/10 text-red-400 border-red-500/20" : prediction.urgencyLevel === "Medium" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                    {prediction.urgencyLevel}
                  </span>
                  <span className="text-zinc-300 font-medium pl-3 border-l border-zinc-700">{prediction.recommendedSpecialist || "General Physician"}</span>
                </div>
              </div>

              <div className="md:col-span-2 bg-zinc-900/30 p-6 rounded-2xl border border-zinc-800 text-zinc-300 text-base leading-relaxed font-light">
                <span className="block text-zinc-500 font-semibold mb-2 uppercase tracking-wider text-xs">Clinical Summary</span>
                {prediction.description}
              </div>

              <div className="md:col-span-2 mt-4 p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <h3 className="text-lg font-semibold text-emerald-50 mb-2">Locate Treatment Facilities</h3>
                <p className="text-emerald-200/60 mb-6 font-light text-sm">
                  Target area mapping for {prediction.recommendedSpecialist} availability.
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="Enter Region or Zip Code..."
                    value={userLocation}
                    onChange={(e) => setUserLocation(e.target.value)}
                    className="flex-1 p-3.5 rounded-xl bg-zinc-950 border border-emerald-500/20 text-white text-base focus:border-emerald-500 focus:outline-none transition"
                  />
                  <button
                    onClick={handleFindHospitals}
                    disabled={fetchingHospitals}
                    className={`px-6 py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-400 font-semibold rounded-xl transition-all active:scale-95 whitespace-nowrap ${fetchingHospitals ? "opacity-70 cursor-wait" : ""}`}
                  >
                    {fetchingHospitals ? "Scanning..." : "Scan Network"}
                  </button>
                </div>
              </div>

              {fetchingHospitals && (
                <div className="md:col-span-2 flex flex-col items-center justify-center p-12 bg-zinc-900/50 rounded-2xl border border-zinc-800 mt-2">
                  <div className="w-8 h-8 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin mb-4" />
                  <p className="text-zinc-400 text-sm font-medium">Interfacing with facility databases...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {hospitals.length > 0 && (
          <div className="mt-16 animate-subtle-fade">
            <h2 className="text-2xl font-bold text-white mb-6">Network Targets</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {hospitals.map((hospital) => (
                <div key={hospital.id} className="bg-zinc-900/40 rounded-3xl p-6 border border-zinc-800 hover:bg-zinc-800/40 hover:border-zinc-700 transition duration-300 relative">
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
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1.5">Experience</p>
                      <p className="font-semibold text-lg text-white flex items-end">
                        {hospital.doctorExperienceAvgYears || "10+"}
                        <span className="text-xs text-zinc-600 ml-1 mb-0.5 font-light">years avg</span>
                      </p>
                    </div>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-3">Accepted Payers</p>
                    <div className="flex flex-wrap gap-2">
                      {hospital.insuranceCompatibility?.slice(0, 3).map((ins: string, i: number) => (
                        <span key={i} className="text-[11px] font-medium bg-zinc-900 border border-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md">
                          {ins}
                        </span>
                      ))}
                      {hospital.insuranceCompatibility && hospital.insuranceCompatibility.length > 3 && (
                        <span className="text-[11px] font-medium text-zinc-500 px-1 py-1">+{hospital.insuranceCompatibility.length - 3}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">Available Doctors</p>
                    {hospital.doctors.map((doctor) => (
                      <div key={doctor.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
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
