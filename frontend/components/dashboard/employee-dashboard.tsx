"use client";
import React, { useState, useEffect } from "react";
import {
  CalendarDays,
  Sparkles,
  ArrowRight,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Palmtree,
  BookOpen,
  Send,
  Calendar as CalendarIcon,
  HelpCircle,
  FileText,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Identity, type Leave, type CalendarData } from "@/lib/api";
import { formatShortDate, computeDaysAway, toLocalDateString } from "@/lib/dates";

interface EmployeeDashboardProps {
  person: Identity;
  balances: Array<{ leave_type: string; remaining: number; reserved: number; available: number }>;
  leaves: Leave[];
  onNavigate: (view: any) => void;
  onSendPrompt: (text: string) => void;
  busy: boolean;
}

const formatDate = (d: string) => {
  return formatShortDate(d);
};

export function EmployeeDashboard({
  person,
  balances,
  leaves,
  onNavigate,
  onSendPrompt,
  busy,
}: EmployeeDashboardProps) {
  const [promptText, setPromptText] = useState("");
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loadingCalendar, setLoadingCalendar] = useState(true);

  useEffect(() => {
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
  const pendingLeaves = leaves.filter((l) => l.status === "pending");
  const recentLeaves = leaves.slice(0, 5);

  const firstName = person.name.split(" ")[0] || "Ari";

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim()) {
      onSendPrompt(promptText.trim());
      setPromptText("");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return (
          <span className="badge badge-success">
            <CheckCircle2 size={12} />
            Approved
          </span>
        );
      case "pending":
        return (
          <span className="badge badge-warning">
            <Clock size={12} />
            Pending
          </span>
        );
      case "rejected":
      case "cancelled":
        return (
          <span className="badge badge-danger">
            <XCircle size={12} />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div className="dashboard-container">
      {/* 1. Header Banner */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            Good morning, {firstName}! <span className="wave">👋</span>
          </h1>
          <p className="dashboard-subtitle">
            Hello, {firstName}. Here&apos;s your personal employee workspace for today.
          </p>
        </div>
        <div className="user-profile-badge">
          <div className="avatar avatar-indigo">
            {person.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="user-badge-meta">
            <strong className="user-badge-name">{person.name}</strong>
            <span className="user-badge-role">Employee · Engineering</span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="stats-trio-grid">
        {/* Card 1: Leave Balance */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Leave Balance</span>
            <div className="stat-icon-wrapper icon-blue">
              <CalendarDays size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{annual !== undefined ? annual.available : "—"}</span>
            <span className="stat-subtext">days remaining</span>
          </div>
          <div className="stat-progress-bar">
            <div
              className="stat-progress-fill fill-blue"
              style={{
                width: `${annual ? Math.min(100, Math.max(0, (annual.available / (annual.remaining || 18)) * 100)) : 0}%`,
              }}
            />
          </div>
          <div className="stat-footer-text">
            <span>{annual ? `${annual.remaining} total annual` : "Annual leave"}</span>
            <span>{annual ? `${annual.reserved} pending reservation` : "0 pending reservation"}</span>
          </div>
        </div>

        {/* Card 2: Upcoming Holiday */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Upcoming Holiday</span>
            <div className="stat-icon-wrapper icon-amber">
              <Palmtree size={18} />
            </div>
          </div>
          {loadingCalendar ? (
            <div className="stat-value-group">
              <span className="stat-text-title text-muted">Checking calendar…</span>
              <span className="stat-subtext">Loading corporate schedule</span>
            </div>
          ) : nextHoliday ? (
            <>
              <div className="stat-value-group">
                <span className="stat-text-title">{nextHoliday.title}</span>
                <span className="stat-subtext">{formatShortDate(nextHoliday.date)}</span>
              </div>
              <div className="stat-tag-row">
                <span className="badge badge-amber-subtle">
                  Company Holiday · {computeDaysAway(nextHoliday.date)}
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="stat-value-group">
                <span className="stat-text-title">No Upcoming Holidays</span>
                <span className="stat-subtext">All holidays observed</span>
              </div>
              <div className="stat-tag-row">
                <span className="badge badge-neutral">Full working period</span>
              </div>
            </>
          )}
          <div className="stat-footer-link">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate("calendar")}
            >
              View full holiday calendar <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Card 3: Pending Requests */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Pending Requests</span>
            <div className="stat-icon-wrapper icon-orange">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{pendingLeaves.length}</span>
            <span className="stat-subtext">in review</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-neutral">
              Reviewed by Tara Sen (Manager)
            </span>
          </div>
          <div className="stat-footer-link">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate("leave")}
            >
              Manage all requests <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Split Content Area */}
      <div className="dashboard-content-split">
        {/* Left Column: Recent Leave Requests & Calendar */}
        <div className="dashboard-main-col">
          {/* Card: My Recent Leave Requests */}
          <div className="content-card">
            <div className="card-header-row">
              <div>
                <h2 className="card-title">My Recent Leave Requests</h2>
                <p className="card-subtitle">
                  Track your submitted time off and approval statuses.
                </p>
              </div>
              <Button
                size="sm"
                className="btn-primary"
                onClick={() => onNavigate("leave")}
              >
                <Plus size={15} />
                New Leave Request
              </Button>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dates</th>
                    <th>Type</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th className="text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeaves.length > 0 ? (
                    recentLeaves.map((l) => (
                      <tr key={l.id}>
                        <td className="font-medium text-navy">
                          <div className="date-cell">
                            <CalendarIcon size={14} className="text-muted" />
                            <span>
                              {formatDate(l.start_date)} → {formatDate(l.end_date)}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="leave-type-pill">
                            {l.leave_type === "annual" ? "Annual Leave" : "Sick Leave"}
                          </span>
                        </td>
                        <td className="text-muted">{l.days} working {l.days === 1 ? "day" : "days"}</td>
                        <td>{getStatusBadge(l.status)}</td>
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => onNavigate("leave")}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="empty-table-cell">
                        <div className="empty-inline-state">
                          <CheckCircle2 size={20} className="text-muted" />
                          <span>No past leave requests found. You have full balance available!</span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Ask your AI Assistant */}
          <div className="content-card ai-assistant-banner-card">
            <div className="ai-card-badge">
              <Sparkles size={16} />
              <span>AI Employee Assistant</span>
            </div>
            <h2 className="ai-card-title">Ask your AI Assistant</h2>
            <p className="ai-card-desc">
              Check policy coverage, calculate holiday-excluded working dates, or submit a drafted leave request.
            </p>

            <form onSubmit={handlePromptSubmit} className="ai-composer-wrapper">
              <input
                type="text"
                className="ai-composer-input"
                placeholder="Ask about a policy, your leave balance, or plan time off..."
                value={promptText}
                onChange={(e) => setPromptText(e.target.value)}
                disabled={busy}
              />
              <Button
                type="submit"
                size="icon"
                className="ai-composer-submit"
                disabled={busy || !promptText.trim()}
                aria-label="Send question"
              >
                <Send size={15} />
              </Button>
            </form>

            <div className="ai-chips-wrapper">
              <span className="ai-chips-label">Quick suggestions:</span>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Check leave November 16–20, 2026")}
              >
                Plan some time off
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("How many annual leave days do I get?")}
              >
                Understand a policy
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Can I claim home broadband reimbursement?")}
              >
                Get a little guidance
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("How much leave do I have available?")}
              >
                Check leave balance
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column: Upcoming Holidays & Policy Quick Links */}
        <div className="dashboard-side-col">
          {/* Holidays Card */}
          <div className="content-card">
            <div className="card-header-simple">
              <h3 className="card-heading-sm">
                <Palmtree size={16} className="text-amber" />
                Upcoming Holidays
              </h3>
              <span className="badge badge-neutral">{new Date().getFullYear()}</span>
            </div>
            {loadingCalendar ? (
              <p className="text-sm text-muted py-3">Loading corporate holidays…</p>
            ) : futureHolidays.length > 0 ? (
              <ul className="holiday-list">
                {futureHolidays.slice(0, 3).map((h, i) => (
                  <li key={i} className="holiday-item">
                    <div className="holiday-info">
                      <strong className="holiday-name">{h.title}</strong>
                      <span className="holiday-date">{formatShortDate(h.date)}</span>
                    </div>
                    <span className="holiday-away-tag">{computeDaysAway(h.date)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-muted">
                  No upcoming corporate holidays scheduled.
                </p>
              </div>
            )}
            <div className="card-divider" />
            <p className="card-footnote">
              <ShieldCheck size={13} className="text-muted inline mr-1" />
              Company holidays and weekends do not deduct from your annual balance.
            </p>
          </div>

          {/* Policy Explorer Highlights */}
          <div className="content-card">
            <div className="card-header-simple">
              <h3 className="card-heading-sm">
                <BookOpen size={16} className="text-indigo" />
                Policy Highlights
              </h3>
              <button
                type="button"
                className="btn-link-sm"
                onClick={() => onNavigate("policies")}
              >
                Explore
              </button>
            </div>
            <div className="policy-quick-list">
              <button
                type="button"
                className="policy-quick-item"
                onClick={() => onSendPrompt("Explain annual and sick leave entitlement under LEAVE-2")}
              >
                <div>
                  <strong>LEAVE-2: Leave & Time Away</strong>
                  <p>18 annual + 8 sick days per calendar year.</p>
                </div>
                <ChevronRight size={14} className="text-muted" />
              </button>
              <button
                type="button"
                className="policy-quick-item"
                onClick={() => onSendPrompt("Explain remote work schedule policy under REMOTE-1")}
              >
                <div>
                  <strong>REMOTE-1: Hybrid Work</strong>
                  <p>Up to 2 days per week remote with manager agreement.</p>
                </div>
                <ChevronRight size={14} className="text-muted" />
              </button>
              <button
                type="button"
                className="policy-quick-item"
                onClick={() => onSendPrompt("What expense reimbursements are supported under EXPENSE-1?")}
              >
                <div>
                  <strong>EXPENSE-1: Expenses & Claims</strong>
                  <p>Business meals, travel, and verified tech stipends.</p>
                </div>
                <ChevronRight size={14} className="text-muted" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
