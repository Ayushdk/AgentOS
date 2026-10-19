"use client";
import React from "react";
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  MessageSquare,
  PlusCircle,
  Inbox,
  BookOpen,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Identity, type Leave, type CalendarData } from "@/lib/api";
import { formatShortDate, computeDaysAway, toLocalDateString } from "@/lib/dates";

interface EmployeeHomeViewProps {
  person: Identity;
  balances: Array<{ leave_type: string; remaining: number; reserved: number; available: number }>;
  leaves: Leave[];
  tickets: any[];
  onNavigate: (view: any) => void;
  onSendPrompt: (text: string) => void;
}

export function EmployeeHomeView({
  person,
  balances,
  leaves,
  tickets,
  onNavigate,
  onSendPrompt,
}: EmployeeHomeViewProps) {
  const firstName = person.name.split(" ")[0] || "Ari";

  const [calendarData, setCalendarData] = React.useState<CalendarData | null>(null);
  const [loadingCalendar, setLoadingCalendar] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    api<CalendarData>("/calendar")
      .then((data) => {
        if (active) setCalendarData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingCalendar(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const todayStr = toLocalDateString();
  const futureHolidays = (calendarData?.holidays || [])
    .filter((h) => h.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date));
  const nextHoliday = futureHolidays.length > 0 ? futureHolidays[0] : null;

  const annual = balances.find((b) => b.leave_type === "annual");
  const sick = balances.find((b) => b.leave_type === "sick");

  const availableDays = annual !== undefined ? annual.available : 16;
  const totalDays = annual !== undefined ? annual.remaining : 18;
  const reservedDays = annual !== undefined ? annual.reserved : 2;

  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const approvedLeaves = leaves.filter((l) => l.status === "approved");
  const rejectedLeaves = leaves.filter((l) => l.status === "rejected" || l.status === "cancelled");

  // SVG circular gauge math
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(1, Math.max(0, availableDays / (totalDays || 18)))) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Greeting Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          Good morning, {firstName}! <span>👋</span>
        </h1>
        <p className="dashboard-subtitle" style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Hello, {firstName}. Here&apos;s your personal employee workspace for today.
        </p>
      </div>

      {/* 2. Top Metrics Row: Leave Balance Ring + My Requests Stat Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 20 }} className="metrics-grid">
        {/* Leave Balance Card with Circular Ring */}
        <div className="metric-card" style={{ gridColumn: "span 1" }}>
          <div className="metric-header">
            <span className="metric-label">Leave Balance</span>
            <div className="metric-icon-box blue">
              <CalendarDays size={18} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 8 }}>
            {/* Circular Progress Gauge */}
            <div className="progress-ring-container">
              <svg width="86" height="86" className="progress-ring-svg">
                <circle cx="43" cy="43" r={radius} className="progress-ring-circle-bg" />
                <circle
                  cx="43"
                  cy="43"
                  r={radius}
                  className="progress-ring-circle-val"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="progress-ring-center">
                <strong>{availableDays}</strong>
                <span>Days</span>
              </div>
            </div>

            {/* Breakdown summary */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Annual</span>
                <strong>{availableDays}/{totalDays}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Sick</span>
                <strong>{sick ? sick.available : 8}/{sick ? sick.remaining : 8}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Reserved</span>
                <strong style={{ color: "var(--warning)" }}>{reservedDays} pending</strong>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("balance")}
            style={{
              background: "none",
              border: "none",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 4,
              color: "var(--primary)",
              fontSize: 12,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            View details <ArrowRight size={13} />
          </button>
        </div>

        {/* Card 2: Upcoming Holiday (tested by calendar-clock.spec.ts) */}
        <div className="metric-card stat-card">
          <div className="metric-header stat-card-header">
            <span className="metric-label stat-label">Upcoming Holiday</span>
            <div className="metric-icon-box amber icon-amber">
              <CalendarDays size={18} />
            </div>
          </div>
          {loadingCalendar ? (
            <div className="stat-value-group">
              <span className="stat-text-title text-muted">Checking calendar…</span>
              <span className="stat-subtext">Loading corporate schedule</span>
            </div>
          ) : nextHoliday ? (
            <>
              <div className="stat-value-group" style={{ marginTop: 8 }}>
                <strong className="stat-text-title" style={{ fontSize: 16, display: "block", color: "var(--text-main)" }}>
                  {nextHoliday.title}
                </strong>
                <span className="stat-subtext" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {formatShortDate(nextHoliday.date)}
                </span>
              </div>
              <div className="stat-tag-row" style={{ marginTop: "auto" }}>
                <span className="saas-badge badge-warning badge-amber-subtle">
                  in {computeDaysAway(nextHoliday.date)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="stat-value-group" style={{ marginTop: 8 }}>
                <strong className="stat-text-title" style={{ fontSize: 16, display: "block", color: "var(--text-main)" }}>
                  No Upcoming Holidays
                </strong>
                <span className="stat-subtext" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  All holidays observed
                </span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                No upcoming corporate holidays scheduled.
              </p>
            </>
          )}
        </div>

        {/* Pending Requests Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Pending Requests</span>
            <div className="metric-icon-box amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--warning)" }}>
              {pendingLeaves.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
            <span className="saas-badge badge-pending">Under review</span>
            <button
              onClick={() => onNavigate("leave")}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}
            >
              View →
            </button>
          </div>
        </div>

        {/* Approved Requests Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Approved</span>
            <div className="metric-icon-box green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--success)" }}>
              {approvedLeaves.length}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto" }}>
            <span className="saas-badge badge-approved">Confirmed</span>
            <button
              onClick={() => onNavigate("leave")}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 11, fontWeight: 600 }}
            >
              View →
            </button>
          </div>
        </div>
      </div>

      {/* 3. AI Quick Suggestions Chips Row (Tested by journeys.spec.ts) */}
      <div
        className="saas-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          background: "#FFFFFF",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Suggested:
        </span>

        <button
          type="button"
          className="ai-chip-btn btn-outline"
          onClick={() => onSendPrompt("How many annual leave days do I get?")}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
        >
          Understand a policy
        </button>

        <button
          type="button"
          className="ai-chip-btn btn-outline"
          onClick={() => onSendPrompt("Check leave November 16–20, 2026")}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
        >
          Plan some time off
        </button>

        <button
          type="button"
          className="ai-chip-btn btn-outline"
          onClick={() => onSendPrompt("Can I claim home broadband reimbursement?")}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
        >
          Get a little guidance
        </button>

        <button
          type="button"
          className="ai-chip-btn btn-outline"
          onClick={() => onSendPrompt("How much leave do I have available?")}
          style={{ fontSize: 12, padding: "6px 14px", borderRadius: 8 }}
        >
          Check leave balance
        </button>
      </div>

      {/* 4. Quick Actions Shortcuts Row */}
      <div
        className="saas-card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "16px 20px",
          background: "#FFFFFF",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Quick Actions:
        </span>

        <button
          className="btn-outline"
          onClick={() => onNavigate("assistant")}
          style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8 }}
        >
          <Sparkles size={14} color="var(--primary)" />
          Ask a Question
        </button>

        <button
          className="btn-outline"
          onClick={() => onNavigate("submit_leave")}
          style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8 }}
        >
          <PlusCircle size={14} color="var(--primary)" />
          Submit Leave
        </button>

        <button
          className="btn-outline"
          onClick={() => onNavigate("tickets")}
          style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8 }}
        >
          <Inbox size={14} color="var(--primary)" />
          Raise a Ticket
        </button>

        <button
          className="btn-outline"
          onClick={() => onNavigate("policies")}
          style={{ fontSize: 12, padding: "8px 14px", borderRadius: 8 }}
        >
          <BookOpen size={14} color="var(--primary)" />
          View Policies
        </button>
      </div>

      {/* 4. Recent Activity Timeline */}
      <div className="saas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>Recent Activity</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Your latest leave requests, questions, and support tickets
            </p>
          </div>
          <button
            onClick={() => onNavigate("leave")}
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600 }}
          >
            View all →
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {leaves.slice(0, 3).map((l) => (
            <div
              key={l.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 8,
                background: "var(--bg-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid var(--border-color)",
                    color: "var(--primary)",
                  }}
                >
                  <CalendarDays size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, display: "block" }}>
                    Leave request submitted · {formatShortDate(l.start_date)} — {formatShortDate(l.end_date)}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    {l.leave_type.toUpperCase()} Leave · {l.days} working {l.days === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>
              <span className={`saas-badge badge-${l.status}`}>
                {l.status}
              </span>
            </div>
          ))}

          {tickets.slice(0, 2).map((t) => (
            <div
              key={t.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 8,
                background: "var(--bg-main)",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: "#FFFFFF",
                    display: "grid",
                    placeItems: "center",
                    border: "1px solid var(--border-color)",
                    color: "var(--purple)",
                  }}
                >
                  <Inbox size={16} />
                </div>
                <div>
                  <strong style={{ fontSize: 13, display: "block" }}>
                    Support ticket created · {t.question}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                    Reference #{t.id.slice(0, 8)} · Reason: {t.reason}
                  </span>
                </div>
              </div>
              <span className={`saas-badge badge-${t.status}`}>
                {t.status}
              </span>
            </div>
          ))}

          {!leaves.length && !tickets.length && (
            <div style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)", fontSize: 13 }}>
              No recent activity found. Ask AgentOS or submit a request to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
