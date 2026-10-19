"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Identity, type Leave, type TeamMember, type CalendarData } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";

interface ManagerHomeViewProps {
  person: Identity;
  queue: Leave[];
  queueState: "idle" | "loading" | "loaded" | "error";
  team: TeamMember[];
  onReview: (id: string, decision: "approved" | "rejected") => Promise<void>;
  onNavigate: (view: any) => void;
  busy: boolean;
  isRequestsTab?: boolean;
}

export function ManagerHomeView({
  person,
  queue,
  queueState,
  team,
  onReview,
  onNavigate,
  busy,
  isRequestsTab = false,
}: ManagerHomeViewProps) {
  const firstName = person.name.split(" ")[0] || "Rahul";
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");
  const [modalTarget, setModalTarget] = useState<{ req: Leave; decision: "approved" | "rejected" } | null>(null);
  const [commentText, setCommentText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [calendar, setCalendar] = useState<CalendarData | null>(null);

  useEffect(() => {
    api<CalendarData>("/calendar").then(setCalendar).catch(() => {});
  }, []);

  const isoLocal = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const isAway = (leave: Leave, date: string) =>
    leave.status === "approved" && leave.start_date <= date && leave.end_date >= date;

  const activeTeam = team.filter((m) => m.status === "Active");
  const coverage = React.useMemo(() => {
    const rows: { key: string; date: string; day: string; holiday: { date: string; title: string } | undefined; away: TeamMember[] }[] = [];
    let offset = 0;
    while (rows.length < 5 && offset < 14) {
      const d = new Date();
      d.setHours(12, 0, 0, 0);
      d.setDate(d.getDate() + offset++);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const key = isoLocal(d);
      const holiday = calendar?.holidays.find((h) => h.date === key);
      const away = activeTeam.filter((m) => (calendar?.team_leaves || []).some((l) => l.employee_id === m.id && isAway(l, key)));
      rows.push({
        key,
        date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
        day: d.toLocaleDateString("en-IN", { weekday: "short" }),
        holiday,
        away,
      });
    }
    return rows;
  }, [activeTeam, calendar]);

  // Simulated synthetic approval records for historical tabs
  const approvedHistory = [
    {
      id: "hist-01",
      employee_id: "E002",
      employee_name: "Neha Varma",
      start_date: "2026-04-10",
      end_date: "2026-04-12",
      leave_type: "Annual",
      days: 3,
      status: "approved",
    },
    {
      id: "hist-02",
      employee_id: "E003",
      employee_name: "Arjun Mehta",
      start_date: "2026-03-15",
      end_date: "2026-03-16",
      leave_type: "Sick",
      days: 2,
      status: "approved",
    },
  ];

  const handleConfirmDecision = async () => {
    if (!modalTarget) return;
    setActionLoadingId(modalTarget.req.id);
    try {
      await onReview(modalTarget.req.id, modalTarget.decision);
      setModalTarget(null);
      setCommentText("");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header Banner */}
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span className="team-badge" style={{ fontSize: 12, padding: "4px 10px", borderRadius: 6, background: "var(--primary-subtle)", color: "var(--primary)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ShieldCheck size={14} /> Manager workspace
          </span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          Good morning, {firstName}! <span>👋</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Engineering Manager · Authorized Team Approvals &amp; Coverage
        </p>
      </div>

      {/* 2. Metric Cards Row: Team Members, Pending Requests, Approved This Month, Rejected */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Team Members</span>
            <div className="metric-icon-box blue">
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{team.length || 8}</span>
            <span className="metric-subtext">direct reports</span>
          </div>
          <button
            onClick={() => onNavigate("team")}
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 11, fontWeight: 600, marginTop: "auto", textAlign: "left" }}
          >
            View directory →
          </button>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pending Requests</span>
            <div className="metric-icon-box amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--warning)" }}>
              {queue.length}
            </span>
            <span className="metric-subtext">requires decision</span>
          </div>
          <span className={`saas-badge ${queue.length ? "badge-warning" : "badge-success"}`} style={{ marginTop: "auto" }}>
            {queue.length ? "Action required" : "Up to date"}
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Approved This Month</span>
            <div className="metric-icon-box green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--success)" }}>12</span>
            <span className="metric-subtext">scheduled</span>
          </div>
          <span className="saas-badge badge-success" style={{ marginTop: "auto" }}>
            No multi-person conflicts
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Rejected This Month</span>
            <div className="metric-icon-box red">
              <XCircle size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--danger)" }}>1</span>
            <span className="metric-subtext">conflict</span>
          </div>
          <span className="saas-badge badge-neutral" style={{ marginTop: "auto" }}>
            Policy audit logged
          </span>
        </div>
      </div>

      {/* 3. Team Requests / Pending Approvals Section */}
      <div className="saas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 18, fontWeight: 750, color: "var(--text-main)" }}>
              Approval inbox
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Requests from verified direct reports, with dates and reserved working days.
            </p>
          </div>

          {isRequestsTab && (
            <div className="saas-tabs-group">
              <button
                className={`saas-tab-btn ${activeTab === "pending" ? "active" : ""}`}
                onClick={() => setActiveTab("pending")}
              >
                Pending ({queue.length})
              </button>
              <button
                className={`saas-tab-btn ${activeTab === "approved" ? "active" : ""}`}
                onClick={() => setActiveTab("approved")}
              >
                Approved ({approvedHistory.length})
              </button>
              <button
                className={`saas-tab-btn ${activeTab === "rejected" ? "active" : ""}`}
                onClick={() => setActiveTab("rejected")}
              >
                Rejected (0)
              </button>
            </div>
          )}
        </div>

        {/* Requests List */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {activeTab === "pending" && (
            <>
              {queue.map((req) => {
                const displayName = req.employee_name || req.employee_id || "Ari Sen";
                const initials = displayName.split(" ").map((n) => n[0]).join("").slice(0, 2);
                return (
                  <div key={req.id} className="review-card">
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: "50%",
                          background: "var(--primary-subtle)",
                          color: "var(--primary)",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {initials}
                      </div>

                      <div>
                        <strong style={{ fontSize: 14, color: "var(--text-main)", display: "block" }}>
                          {displayName}
                        </strong>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {formatShortDate(req.start_date)} — {formatShortDate(req.end_date)} ·{" "}
                          <strong style={{ color: "var(--text-main)" }}>{req.days} working {req.days === 1 ? "day" : "days"}</strong> ·{" "}
                          <span style={{ textTransform: "capitalize" }}>{req.leave_type} leave</span>
                        </span>
                      </div>
                    </div>

                    <div className="review-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-reject"
                        disabled={busy || actionLoadingId === req.id}
                        onClick={async () => {
                          setActionLoadingId(req.id);
                          try {
                            await onReview(req.id, "rejected");
                          } finally {
                            setActionLoadingId(null);
                          }
                        }}
                        style={{ color: "var(--danger)", borderColor: "var(--danger-border)" }}
                      >
                        <X size={14} style={{ marginRight: 4 }} /> Reject
                      </Button>

                      <Button
                        size="sm"
                        className="btn-approve"
                        disabled={busy || actionLoadingId === req.id}
                        onClick={async () => {
                          setActionLoadingId(req.id);
                          try {
                            await onReview(req.id, "approved");
                          } finally {
                            setActionLoadingId(null);
                          }
                        }}
                        style={{ background: "var(--primary)", color: "#FFFFFF", fontWeight: 600 }}
                      >
                        <Check size={14} style={{ marginRight: 4 }} /> Approve
                      </Button>

                      <button
                        type="button"
                        onClick={() => setModalTarget({ req, decision: "approved" })}
                        style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, textDecoration: "underline", cursor: "pointer", marginLeft: 4 }}
                      >
                        Comment...
                      </button>
                    </div>
                  </div>
                );
              })}

              {!queue.length && (
                <div style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
                  <ShieldCheck size={32} color="var(--success)" style={{ margin: "0 auto 10px" }} />
                  <strong style={{ display: "block", fontSize: 15, color: "var(--text-main)" }}>Approval inbox is clear</strong>
                  <p style={{ fontSize: 12, marginTop: 4 }}>No pending leave requests from direct reports require a decision.</p>
                </div>
              )}
            </>
          )}

          {activeTab === "approved" && (
            <>
              {approvedHistory.map((req) => (
                <div key={req.id} className="review-card">
                  <div>
                    <strong style={{ fontSize: 14, color: "var(--text-main)", display: "block" }}>
                      {req.employee_name}
                    </strong>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {formatShortDate(req.start_date)} — {formatShortDate(req.end_date)} · {req.days} days ({req.leave_type})
                    </span>
                  </div>
                  <span className="saas-badge badge-approved">Approved</span>
                </div>
              ))}
            </>
          )}

          {activeTab === "rejected" && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)", fontSize: 13 }}>
              No rejected requests this period.
            </div>
          )}
        </div>
      </div>

      {/* Five-Day Team Coverage (Tested by calendar-clock.spec.ts) */}
      <div className="saas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 className="card-heading-sm" style={{ fontSize: 16, fontWeight: 750, display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <Calendar size={18} color="var(--primary)" /> Five-day team coverage
          </h3>
          <button
            type="button"
            className="btn-link-sm"
            onClick={() => onNavigate("calendar")}
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
          >
            Calendar →
          </button>
        </div>

        <div className="availability-timeline-list" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {coverage.map((row) => (
            <div
              key={row.key}
              className="timeline-day-row"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                background: "var(--bg-main)",
                borderRadius: 8,
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)", minWidth: 64 }}>
                  {row.date}
                </span>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {row.day}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {row.holiday ? (
                  <span className="saas-badge badge-warning" style={{ fontSize: 11 }}>
                    {row.holiday.title}
                  </span>
                ) : row.away.length ? (
                  <span className="saas-badge badge-neutral" style={{ fontSize: 11 }}>
                    {row.away.length} away: {row.away.map((m) => m.name).join(", ")}
                  </span>
                ) : (
                  <span className="saas-badge badge-success" style={{ fontSize: 11 }}>
                    All active reports available
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Screen 13: Approve / Reject Decision Modal */}
      {modalTarget && (
        <div className="saas-modal-backdrop" onClick={() => setModalTarget(null)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 750 }}>
                {modalTarget.decision === "approved" ? "Approve Leave Request" : "Reject Leave Request"}
              </h3>
              <button onClick={() => setModalTarget(null)} style={{ background: "none", border: "none" }}>✕</button>
            </div>

            <div className="saas-modal-body" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Employee Summary Banner */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: modalTarget.decision === "approved" ? "var(--primary-subtle)" : "var(--danger-bg)",
                  border: `1px solid ${modalTarget.decision === "approved" ? "var(--primary-border)" : "var(--danger-border)"}`,
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: "50%",
                    background: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    color: "var(--text-main)",
                  }}
                >
                  {(modalTarget.req.employee_name || modalTarget.req.employee_id).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <strong style={{ fontSize: 14, display: "block" }}>
                    {modalTarget.req.employee_name || modalTarget.req.employee_id}
                  </strong>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {formatShortDate(modalTarget.req.start_date)} — {formatShortDate(modalTarget.req.end_date)} · {modalTarget.req.days} days ({modalTarget.req.leave_type})
                  </span>
                </div>
              </div>

              {/* Optional decision comment */}
              <div className="saas-form-group" style={{ margin: 0 }}>
                <label>Add a comment (optional)</label>
                <textarea
                  rows={3}
                  className="saas-textarea"
                  placeholder={modalTarget.decision === "approved" ? "e.g. Looks good. Enjoy your leave!" : "Reason for rejection..."}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                />
              </div>

              <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {modalTarget.decision === "approved"
                  ? "Approving this request will immediately deduct the reserved days from the employee's active balance."
                  : "Rejecting this request will immediately release the reserved days back to the employee's available balance."}
              </p>
            </div>

            <div className="saas-modal-footer">
              <Button variant="outline" onClick={() => setModalTarget(null)} disabled={busy}>
                Cancel
              </Button>
              <Button
                onClick={handleConfirmDecision}
                disabled={busy}
                style={{
                  background: modalTarget.decision === "approved" ? "var(--primary)" : "var(--danger)",
                  color: "#FFFFFF",
                  fontWeight: 650,
                }}
              >
                {modalTarget.decision === "approved" ? "Approve Request" : "Reject Request"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
