"use client";
import React, { useState, useRef, useEffect } from "react";
import { fetchAPI } from "../utils/api";

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  cited_clauses?: string[];
  cited_uins?: string[];
  timestamp: string;
}

interface InsuranceChatAssistantProps {
  claimData?: any;
  claimResult?: any;
  initialOpen?: boolean;
}

export default function InsuranceChatAssistant({
  claimData,
  claimResult,
  initialOpen = false,
}: InsuranceChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "assistant",
      text: "### 👋 Hello! I'm your MediSync360 Insurance Rule & Claims Specialist.\n\nI answer queries directly from our **verified policy rule engine** across 10 IRDAI-registered retail health policies.\n\nAsk me about **room rent limits, waiting periods for conditions like Cataract or Hernia, why certain items were deducted, or how add-on riders protect your bill**.",
      cited_clauses: ["IRDAI Master Circular on Standardization"],
      cited_uins: ["Verified 10-Product Registry"],
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>([
    "Does HDFC Optima Secure have a room rent limit?",
    "What is the Cataract waiting period in Star Health?",
    "Why did my room rent trigger proportionate deductions?",
    "How does the Consumables Safeguard Rider work?",
    "Compare all 10 insurers for my bill",
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Update suggestions dynamically if a claim result becomes available
  useEffect(() => {
    if (claimResult) {
      const newSuggs: string[] = [];
      if (claimResult.deductions && claimResult.deductions.length > 0) {
        newSuggs.push("Why was my claim deducted?");
        newSuggs.push("How can I get 100% approval on this bill?");
      }
      if (claimData?.company) {
        newSuggs.push(`What are the room rent rules in ${claimData.company}?`);
        newSuggs.push(`What is the PED waiting period in ${claimData.company}?`);
      }
      newSuggs.push("Compare all 10 insurers for my bill");
      setSuggestions(newSuggs);
    }
  }, [claimResult, claimData]);

  const getFlaskUrl = () => {
    if (typeof window !== "undefined") {
      return `http://${window.location.hostname}:5001`;
    }
    return "http://localhost:5001";
  };

  const sendMessage = async (queryText: string) => {
    const textToSend = queryText.trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const payload = {
        query: textToSend,
        claimData: claimData || null,
        claimResult: claimResult || null,
      };

      let resData: any;
      try {
        const directRes = await fetch(`${getFlaskUrl()}/assistant-chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!directRes.ok) throw new Error("Flask assistant failed");
        resData = await directRes.json();
      } catch (directErr) {
        resData = await fetchAPI("/ai/assistant-chat", "POST", payload);
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: resData.answer || "I have analyzed your query against the insurance rules.",
        cited_clauses: resData.cited_clauses || [],
        cited_uins: resData.cited_uins || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (resData.suggested_questions && resData.suggested_questions.length > 0) {
        setSuggestions(resData.suggested_questions);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        text: "I encountered an error querying the insurance rule engine. Please ensure the insurance AI server is running.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Simple Markdown Formatter for Assistant Text
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split("\n");
    return (
      <div style={{ lineHeight: 1.55 }}>
        {lines.map((line, idx) => {
          if (line.startsWith("### ")) {
            return (
              <h4 key={idx} style={{ margin: "0.6rem 0 0.3rem", fontSize: "0.92rem", fontWeight: 700, color: "#fafafa" }}>
                {line.replace("### ", "")}
              </h4>
            );
          }
          if (line.startsWith("#### ")) {
            return (
              <h5 key={idx} style={{ margin: "0.5rem 0 0.25rem", fontSize: "0.85rem", fontWeight: 600, color: "#818cf8" }}>
                {line.replace("#### ", "")}
              </h5>
            );
          }
          if (line.startsWith("> ")) {
            return (
              <div
                key={idx}
                style={{
                  margin: "0.4rem 0",
                  padding: "0.4rem 0.75rem",
                  background: "rgba(99,102,241,0.12)",
                  borderLeft: "3px solid #818cf8",
                  borderRadius: "0 6px 6px 0",
                  fontSize: "0.82rem",
                  color: "#d4d4d8",
                }}
              >
                {line.replace("> ", "")}
              </div>
            );
          }
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={idx} style={{ display: "flex", gap: "0.4rem", margin: "0.25rem 0", fontSize: "0.82rem" }}>
                <span style={{ color: "#818cf8", flexShrink: 0 }}>•</span>
                <span style={{ color: "#d4d4d8" }}>{line.replace(/^[-*]\s+/, "")}</span>
              </div>
            );
          }
          if (line.trim() === "") {
            return <div key={idx} style={{ height: "0.35rem" }} />;
          }
          return (
            <p key={idx} style={{ margin: "0.2rem 0", fontSize: "0.82rem", color: "#d4d4d8" }}>
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Launcher Pill (Bottom-Right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: "fixed",
            bottom: "1.75rem",
            right: "1.75rem",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
            padding: "0.75rem 1.25rem",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fafafa",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 999,
            boxShadow: "0 8px 30px rgba(99,102,241,0.35)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <span style={{ fontSize: "1.15rem" }}>💬</span>
          <span>Ask Insurance AI Specialist</span>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px #10b981",
            }}
          />
        </button>
      )}

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "1.5rem",
            right: "1.5rem",
            width: "clamp(320px, 92vw, 440px)",
            height: "clamp(480px, 80vh, 660px)",
            background: "#121215",
            border: "1px solid #27272a",
            borderRadius: 16,
            boxShadow: "0 20px 50px rgba(0,0,0,0.7), 0 0 25px rgba(99,102,241,0.15)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            fontFamily: "Inter,Outfit,sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "0.9rem 1.1rem",
              background: "linear-gradient(90deg, #18181b, #1f1f27)",
              borderBottom: "1px solid #27272a",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "rgba(99,102,241,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  border: "1px solid rgba(99,102,241,0.4)",
                }}
              >
                🤖
              </div>
              <div>
                <div style={{ fontSize: "0.875rem", fontWeight: 700, color: "#fafafa" }}>
                  MediSync360 Insurance AI
                </div>
                <div style={{ fontSize: "0.7rem", color: "#818cf8" }}>
                  Grounded in 10 Verified IRDAI Policy Registries
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                color: "#a1a1aa",
                fontSize: "1.2rem",
                cursor: "pointer",
                padding: "0.2rem 0.5rem",
                borderRadius: 4,
                lineHeight: 1,
              }}
              title="Close Chat"
            >
              ✕
            </button>
          </div>

          {/* Active Context Banner */}
          {claimData?.company && (
            <div
              style={{
                background: "rgba(99,102,241,0.06)",
                borderBottom: "1px solid #27272a",
                padding: "0.4rem 0.9rem",
                fontSize: "0.72rem",
                color: "#a1a1aa",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                Carrier: <strong style={{ color: "#fafafa" }}>{claimData.company}</strong>
                {claimData.disease && ` • ${claimData.disease}`}
              </span>
              {claimResult && (
                <span style={{ color: "#10b981", fontWeight: 600 }}>
                  Approved: ₹{claimResult.approved_amount?.toLocaleString("en-IN")}
                </span>
              )}
            </div>
          )}

          {/* Message Thread */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "88%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.3rem",
                  }}
                >
                  <div
                    style={{
                      background: isUser ? "#6366f1" : "#18181b",
                      border: isUser ? "1px solid #4f46e5" : "1px solid #27272a",
                      color: isUser ? "#ffffff" : "#fafafa",
                      padding: "0.75rem 0.95rem",
                      borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                    }}
                  >
                    {isUser ? (
                      <div style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{m.text}</div>
                    ) : (
                      renderFormattedText(m.text)
                    )}

                    {/* Source Citations Tags */}
                    {!isUser && ((m.cited_clauses && m.cited_clauses.length > 0) || (m.cited_uins && m.cited_uins.length > 0)) && (
                      <div
                        style={{
                          marginTop: "0.6rem",
                          borderTop: "1px solid #27272a",
                          paddingTop: "0.4rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.35rem",
                        }}
                      >
                        {m.cited_uins?.map((u) => (
                          <span
                            key={u}
                            style={{
                              fontSize: "0.66rem",
                              background: "#09090b",
                              color: "#818cf8",
                              padding: "0.1rem 0.4rem",
                              borderRadius: 4,
                              fontFamily: "monospace",
                              border: "1px solid #27272a",
                            }}
                          >
                            🏷️ {u}
                          </span>
                        ))}
                        {m.cited_clauses?.map((c) => (
                          <span
                            key={c}
                            style={{
                              fontSize: "0.66rem",
                              background: "rgba(99,102,241,0.12)",
                              color: "#a5b4fc",
                              padding: "0.1rem 0.4rem",
                              borderRadius: 4,
                            }}
                          >
                            📜 {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "#71717a",
                      alignSelf: isUser ? "flex-end" : "flex-start",
                      padding: "0 0.25rem",
                    }}
                  >
                    {m.timestamp}
                  </span>
                </div>
              );
            })}
            {loading && (
              <div
                style={{
                  alignSelf: "flex-start",
                  background: "#18181b",
                  border: "1px solid #27272a",
                  padding: "0.6rem 0.9rem",
                  borderRadius: "12px 12px 12px 2px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  fontSize: "0.78rem",
                  color: "#818cf8",
                }}
              >
                <span>⚡ Auditing verified policy clauses…</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Quick Question Chips */}
          {suggestions.length > 0 && (
            <div
              style={{
                padding: "0.4rem 0.75rem",
                borderTop: "1px solid #27272a",
                background: "#0d0d10",
                display: "flex",
                gap: "0.4rem",
                overflowX: "auto",
                whiteSpace: "nowrap",
                scrollbarWidth: "none",
              }}
            >
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => sendMessage(s)}
                  disabled={loading}
                  style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.25)",
                    borderRadius: 999,
                    padding: "0.25rem 0.65rem",
                    color: "#a5b4fc",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                    flexShrink: 0,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.18)";
                    e.currentTarget.style.borderColor = "#818cf8";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(99,102,241,0.08)";
                    e.currentTarget.style.borderColor = "rgba(99,102,241,0.25)";
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            style={{
              padding: "0.75rem",
              background: "#18181b",
              borderTop: "1px solid #27272a",
              display: "flex",
              gap: "0.5rem",
            }}
          >
            <input
              type="text"
              placeholder="Ask about room caps, waiting periods, clauses..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: "0.6rem 0.8rem",
                color: "#fafafa",
                fontSize: "0.85rem",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? "#27272a" : "#6366f1",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "0 1rem",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

