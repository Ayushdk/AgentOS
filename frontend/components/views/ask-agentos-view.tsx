"use client";
import React, { useState } from "react";
import {
  Sparkles,
  Send,
  BookOpen,
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Check,
  X,
  Clock,
  ExternalLink,
  LoaderCircle,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Citation, Run } from "@/lib/api";

interface AskAgentosViewProps {
  runs: Run[];
  activeRunId: string | null;
  onSendQuestion: (q: string) => Promise<void>;
  onResumeRun: (runId: string, approved: boolean) => Promise<void>;
  onSelectCitation: (citation: Citation) => void;
  busy: boolean;
  employeeName?: string;
}

export function AskAgentosView({
  runs,
  activeRunId,
  onSendQuestion,
  onResumeRun,
  onSelectCitation,
  busy,
  employeeName = "Ari",
}: AskAgentosViewProps) {
  const [inputVal, setInputVal] = useState("");

  const currentRun = runs.find((r) => r.id === activeRunId) || runs[0];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputVal.trim()) {
      onSendQuestion(inputVal.trim());
      setInputVal("");
    }
  };

  const handleChipClick = (text: string) => {
    if (text === "Understand a policy") onSendQuestion("How many annual leave days do I get?");
    else if (text === "Plan some time off") onSendQuestion("Check leave November 16–20, 2026");
    else if (text === "Get a little guidance") onSendQuestion("Can I claim home broadband reimbursement?");
    else onSendQuestion(text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={22} color="var(--primary)" />
          Ask AgentOS
        </h1>
        <h2 className="title" style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontWeight: 500 }}>
          A little support. More momentum.
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
          Grounded policy answers, automatic leave calculations, and human-in-the-loop approvals.
        </p>
      </div>

      {/* Suggested Prompt Chips */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          type="button"
          className="prompt-chip"
          onClick={() => handleChipClick("Understand a policy")}
        >
          Understand a policy
        </button>
        <button
          type="button"
          className="prompt-chip"
          onClick={() => handleChipClick("Plan some time off")}
        >
          Plan some time off
        </button>
        <button
          type="button"
          className="prompt-chip"
          onClick={() => handleChipClick("Get a little guidance")}
        >
          Get a little guidance
        </button>
        <button
          type="button"
          className="prompt-chip"
          onClick={() => handleChipClick("What is the policy for work from home?")}
        >
          What is the policy for work from home?
        </button>
      </div>

      {/* Main Conversation Window */}
      <div
        className="saas-card conversation"
        style={{
          minHeight: 460,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20, overflowY: "auto", flex: 1 }}>
          {/* Greeting if no active conversation */}
          {!currentRun && (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--text-secondary)",
                maxWidth: 480,
                margin: "0 auto",
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Sparkles size={26} />
              </div>
              <h3 style={{ fontSize: 18, color: "var(--text-main)", fontWeight: 700, marginBottom: 8 }}>
                Hello, {employeeName}. What&apos;s on your mind?
              </h3>
              <p style={{ fontSize: 13, lineHeight: 1.6 }}>
                Ask about company leave entitlements, remote work rules, or plan a custom vacation. Answers cite official policies.
              </p>
            </div>
          )}

          {/* User question bubble */}
          {currentRun && (
            <div className="chat-bubble-user">
              {currentRun.question}
            </div>
          )}

          {/* AI Response Card */}
          {currentRun && (
            <div className="chat-bubble-ai">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "var(--primary)",
                    display: "grid",
                    placeItems: "center",
                    color: "#FFFFFF",
                  }}
                >
                  <Sparkles size={14} />
                </div>
                <strong style={{ fontSize: 13, color: "var(--text-main)" }}>AgentOS Assistant</strong>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: "auto" }}>
                  Verified Citation Support
                </span>
              </div>

              {/* Response Text */}
              <div style={{ fontSize: 14, color: "var(--text-main)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                {currentRun.result?.answer || currentRun.result?.message || currentRun.result?.summary || "Analyzing company policies..."}
              </div>

              {/* Citations Box */}
              {currentRun.result?.citations && currentRun.result.citations.length > 0 && (
                <div className="citation-card-box">
                  <div className="citation-header">
                    <span className="citation-title">
                      <BookOpen size={14} /> Official Policy Citations
                    </span>
                    <span style={{ fontSize: 11, color: "var(--primary)" }}>Verified</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                    {currentRun.result.citations.map((c: Citation) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onSelectCitation(c)}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--primary-border)",
                          borderRadius: 6,
                          padding: "6px 12px",
                          fontSize: 12,
                          color: "var(--primary)",
                          fontWeight: 600,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>{c.title}</span>
                        <ExternalLink size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive LangGraph Leave Draft Card */}
              {currentRun.result?.draft && (
                <div className="draft-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>
                        {currentRun.result.draft.leave_type?.toUpperCase()} Leave Draft
                      </h4>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
                        {currentRun.result.draft.start_date} to {currentRun.result.draft.end_date}
                      </p>
                    </div>
                    <span className="saas-badge badge-pending">Ready for confirmation</span>
                  </div>

                  <div className="draft-metrics">
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Requested Days</span>
                      <strong style={{ fontSize: 20, display: "block" }}>{currentRun.result.draft.days}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Excluded Holidays</span>
                      <strong style={{ fontSize: 13, display: "block", color: "var(--success)" }}>
                        {((currentRun.result.calculation?.holidays || currentRun.result.draft?.holidays || []).map((h: any) => typeof h === "string" ? h : h.title).filter(Boolean).join(", ")) || "None"}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Balance Remaining</span>
                      <strong style={{ fontSize: 20, display: "block" }}>
                        {currentRun.result.draft.available_balance || 16}
                      </strong>
                    </div>
                  </div>

                  {currentRun.status === "awaiting_confirmation" && (
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <Button
                        type="button"
                        onClick={() => onResumeRun(currentRun.id, true)}
                        disabled={busy}
                        style={{ background: "var(--primary)", color: "#FFFFFF", fontWeight: 600, fontSize: 13 }}
                      >
                        <Check size={14} style={{ marginRight: 6 }} /> Confirm &amp; submit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onResumeRun(currentRun.id, false)}
                        disabled={busy}
                        style={{ fontSize: 13 }}
                      >
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Waiting for manager indicator */}
              {(currentRun.result?.answer?.includes("manager approval") || (currentRun.status === "completed" && (currentRun.result?.action === "submit_leave" || currentRun.result?.draft_id))) && (
                <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8, color: "var(--warning)", fontSize: 13, fontWeight: 600 }}>
                  <Clock size={16} /> Waiting for your manager
                </div>
              )}

              {/* Cancelled indicator */}
              {(currentRun.status === "cancelled" || currentRun.result?.answer?.includes("Cancelled. Nothing was submitted")) && (
                <div style={{ marginTop: 14, color: "var(--text-secondary)", fontSize: 13 }}>
                  Cancelled. Nothing was submitted.
                </div>
              )}

              {/* Human-in-the-loop HR Ticket Handoff Confirmation */}
              {(currentRun.result?.action === "create_ticket" || currentRun.result?.handoff_prompt || currentRun.result?.handoff_reason) && currentRun.status === "awaiting_confirmation" && (
                <div style={{ marginTop: 16, padding: "16px", borderRadius: 10, background: "var(--purple-bg)", border: "1px solid var(--purple-border)" }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--purple)", margin: 0 }}>
                    Human Support Handoff Required
                  </h4>
                  <p style={{ fontSize: 12, color: "var(--text-main)", marginTop: 4 }}>
                    {currentRun.result?.handoff_prompt || currentRun.result?.answer || "Your question requires People Operations verification. Would you like to create an HR support ticket?"}
                  </p>
                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <Button
                      type="button"
                      onClick={() => onResumeRun(currentRun.id, true)}
                      disabled={busy}
                      style={{ background: "var(--purple)", color: "#FFF", fontSize: 12 }}
                    >
                      Confirm handoff
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onResumeRun(currentRun.id, false)}
                      disabled={busy}
                      style={{ fontSize: 12 }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {(currentRun.result?.ticket_created || currentRun.result?.ticket_id || currentRun.handoff_status === "created") && (
                <div style={{ marginTop: 12, color: "var(--success)", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={15} /> HR ticket created
                </div>
              )}
            </div>
          )}

          {busy && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--primary)", fontSize: 13, padding: 12 }}>
              <LoaderCircle className="spin" size={18} />
              <span>AgentOS is verifying policy rules and analyzing calendar...</span>
            </div>
          )}
        </div>

        {/* Input Composer */}
        <form
          onSubmit={handleSend}
          style={{
            marginTop: 20,
            display: "flex",
            gap: 12,
            borderTop: "1px solid var(--border-color)",
            paddingTop: 16,
          }}
        >
          <input
            type="text"
            className="saas-input"
            aria-label="Ask your employee assistant"
            placeholder="Ask about leave, policies, holidays, or benefits..."
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            disabled={busy}
            style={{ flex: 1, padding: "12px 16px", fontSize: 14 }}
          />
          <Button
            type="submit"
            aria-label="Send question"
            disabled={busy || !inputVal.trim()}
            style={{
              background: "var(--primary)",
              color: "#FFFFFF",
              padding: "0 20px",
              height: 44,
              borderRadius: 8,
              fontWeight: 600,
            }}
          >
            <Send size={15} style={{ marginRight: 6 }} /> Send question
          </Button>
        </form>
      </div>
    </div>
  );
}
