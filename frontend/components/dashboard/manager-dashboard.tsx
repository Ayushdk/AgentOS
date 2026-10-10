"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Calendar,
  Send,
  AlertCircle,
  UserCheck,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Identity, type Leave, type TeamMember } from "@/lib/api";

interface ManagerDashboardProps {
  person: Identity;
  queue: Leave[];
  onReview: (id: string, decision: "approved" | "rejected") => Promise<void>;
  onNavigate: (view: any) => void;
  onSendPrompt: (text: string) => void;
  busy: boolean;
}

const defaultTeamMembers = [
  { id: "E001", name: "Ari Sen", role: "Software Engineer", status: "Active" as const, joined_on: "2025-08-02", exited_on: null, department: "Engineering" },
  { id: "E002", name: "Mira Sen", role: "Frontend Engineer", status: "Active" as const, joined_on: "2026-06-03", exited_on: null, department: "Engineering" },
  { id: "E003", name: "Dev Sen", role: "Backend Engineer", status: "Active" as const, joined_on: "2024-04-04", exited_on: null, department: "Engineering" },
  { id: "E004", name: "Leena Sen", role: "QA Engineer", status: "Active" as const, joined_on: "2025-02-05", exited_on: null, department: "Engineering" },
  { id: "E005", name: "Rohan Sen", role: "DevOps Engineer", status: "Active" as const, joined_on: "2026-09-06", exited_on: null, department: "Engineering" },
  { id: "E006", name: "Nila Sen", role: "Data Engineer", status: "Active" as const, joined_on: "2024-07-07", exited_on: null, department: "Engineering" },
  { id: "E007", name: "Kiran Sen", role: "Full Stack Engineer", status: "Active" as const, joined_on: "2025-05-08", exited_on: null, department: "Engineering" },
  { id: "E008", name: "Isha Sen", role: "Software Engineer", status: "Exited" as const, joined_on: "2026-03-09", exited_on: "2026-08-28", department: "Engineering" },
  { id: "E009", name: "Samar Sen", role: "Systems Engineer", status: "Active" as const, joined_on: "2024-01-10", exited_on: null, department: "Engineering" },
];

const availabilityTimeline = [
  { day: "Mon", date: "Nov 17", status: "all-in", label: "Full Team In" },
  { day: "Tue", date: "Nov 18", status: "holiday", label: "Foundation Day" },
  { day: "Wed", date: "Nov 19", status: "partial", label: "1 Remote" },
  { day: "Thu", date: "Nov 20", status: "all-in", label: "Full Team In" },
  { day: "Fri", date: "Nov 21", status: "all-in", label: "Full Team In" },
  { day: "Mon", date: "Nov 24", status: "leave", label: "Ari Sen (Req)" },
];

const formatDate = (d: string) => {
  try {
    return new Date(d + "T00:00:00+05:30").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  } catch {
    return d;
  }
};

export function ManagerDashboard({
  person,
  queue,
  onReview,
  onNavigate,
  onSendPrompt,
  busy,
}: ManagerDashboardProps) {
  const [promptText, setPromptText] = useState("");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(defaultTeamMembers);

  useEffect(() => {
    api<TeamMember[]>("/manager/team")
      .then((data) => {
        if (data && data.length > 0) setTeamMembers(data);
      })
      .catch(() => {});
  }, []);

  const firstName = person.name.split(" ")[0] || "Tara";

  const handleAction = async (id: string, decision: "approved" | "rejected") => {
    setActionLoadingId(id);
    try {
      await onReview(id, decision);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promptText.trim()) {
      onSendPrompt(promptText.trim());
      setPromptText("");
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
            Here's your engineering team overview and approval queue.
          </p>
        </div>
        <div className="user-profile-badge">
          <div className="avatar avatar-purple">
            {person.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="user-badge-meta">
            <strong className="user-badge-name">{person.name}</strong>
            <span className="user-badge-role">Manager · Engineering</span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="stats-trio-grid">
        {/* Card 1: Pending Approvals */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Pending Approvals</span>
            <div className="stat-icon-wrapper icon-amber">
              <Clock size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{queue.length}</span>
            <span className="stat-subtext">leave {queue.length === 1 ? "request" : "requests"}</span>
          </div>
          <div className="stat-tag-row">
            {queue.length > 0 ? (
              <span className="badge badge-warning">Action required</span>
            ) : (
              <span className="badge badge-success">All caught up</span>
            )}
          </div>
          <div className="stat-footer-text">
            <span>Direct reports: 8 employees</span>
            <span>Policy: 18 annual days limit</span>
          </div>
        </div>

        {/* Card 2: Team Members */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Team Members</span>
            <div className="stat-icon-wrapper icon-blue">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{teamMembers.length}</span>
            <span className="stat-subtext">direct reports</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-blue-subtle">
              {teamMembers.filter((m) => m.status === "Active").length} active · Engineering
            </span>
          </div>
          <div className="stat-footer-link">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate("team")}
            >
              View team directory <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Card 3: Team Availability Today */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Team Status Today</span>
            <div className="stat-icon-wrapper icon-emerald">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">
              {teamMembers.filter((m) => m.status === "Active").length}
            </span>
            <span className="stat-subtext">active on duty</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-neutral">Full schedule tracked</span>
          </div>
          <div className="stat-footer-link">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate("calendar")}
            >
              Check team schedule <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Main Split Section */}
      <div className="dashboard-content-split">
        {/* Left Primary Column: Approvals Inbox */}
        <div className="dashboard-main-col">
          {/* Card: Pending Leave Approvals */}
          <div className="content-card">
            <div className="card-header-row">
              <div>
                <h2 className="card-title">Pending Leave Approvals</h2>
                <p className="card-subtitle">
                  Direct report requests awaiting your review and authorization.
                </p>
              </div>
              <span className="badge badge-warning">
                {queue.length} pending
              </span>
            </div>

            {queue.length > 0 ? (
              <div className="approval-cards-list">
                {queue.map((req) => (
                  <div key={req.id} className="approval-inbox-card review-card">
                    <div className="approval-card-left">
                      <div className="avatar avatar-indigo">
                        {(req.employee_name || "Ari Sen")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="approval-details">
                        <div className="approval-title-row">
                          <h3 className="approval-emp-name">
                            {req.employee_name || "Ari Sen"}
                          </h3>
                          <span className="leave-type-pill">
                            {req.leave_type === "annual" ? "Annual Leave" : "Sick Leave"}
                          </span>
                        </div>
                        <p className="approval-dates">
                          <Calendar size={13} className="text-muted inline mr-1" />
                          {formatDate(req.start_date)} — {formatDate(req.end_date)} ·{" "}
                          <strong>{req.days} working {req.days === 1 ? "day" : "days"}</strong>
                        </p>
                        <span className="approval-meta text-muted">
                          Submitted for manager verification
                        </span>
                      </div>
                    </div>

                    <div className="approval-actions review-actions">
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-reject"
                        disabled={busy || actionLoadingId === req.id}
                        onClick={() => handleAction(req.id, "rejected")}
                      >
                        <X size={14} />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="btn-approve"
                        disabled={busy || actionLoadingId === req.id}
                        onClick={() => handleAction(req.id, "approved")}
                      >
                        <Check size={14} />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inbox-state">
                <div className="empty-icon-circle icon-emerald">
                  <ShieldCheck size={28} />
                </div>
                <h3>Approval Inbox is Clear</h3>
                <p>
                  No pending employee leave requests require your review right now. New submissions will appear here.
                </p>
              </div>
            )}
          </div>

          {/* Card: AI Manager Assistant */}
          <div className="content-card ai-assistant-banner-card">
            <div className="ai-card-badge">
              <Sparkles size={16} />
              <span>AI Manager Assistant</span>
            </div>
            <h2 className="ai-card-title">Ask your Team Assistant</h2>
            <p className="ai-card-desc">
              Check team leave overlap, review manager approval policies, or ask about member schedules.
            </p>

            <form onSubmit={handlePromptSubmit} className="ai-composer-wrapper">
              <input
                type="text"
                className="ai-composer-input"
                placeholder="Ask about team availability, leave overlap, or manager guidance..."
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
              <span className="ai-chips-label">Manager suggestions:</span>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Summarize all pending leave requests for my team")}
              >
                Summarize pending approvals
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("How does manager approval affect employee remaining balances?")}
              >
                Approval & balance rules
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Who is on leave or scheduled away next week?")}
              >
                Check team availability
              </button>
            </div>
          </div>
        </div>

        {/* Right Sidebar Column: Team Availability & Direct Reports */}
        <div className="dashboard-side-col">
          {/* Team Availability Timeline */}
          <div className="content-card">
            <div className="card-header-simple">
              <h3 className="card-heading-sm">
                <Calendar size={16} className="text-blue" />
                Team Availability (Upcoming)
              </h3>
            </div>
            <div className="availability-timeline-list">
              {availabilityTimeline.map((item, i) => (
                <div key={i} className="timeline-day-row">
                  <div className="timeline-date-badge">
                    <strong>{item.date}</strong>
                    <span>{item.day}</span>
                  </div>
                  <div className="timeline-status-info">
                    <span className={`status-dot dot-${item.status}`} />
                    <span className="timeline-label">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Reports List */}
          <div className="content-card">
            <div className="card-header-simple">
              <h3 className="card-heading-sm">
                <Users size={16} className="text-purple" />
                Engineering Team ({teamMembers.length})
              </h3>
              <button
                type="button"
                className="btn-link-sm"
                onClick={() => onNavigate("team")}
              >
                All
              </button>
            </div>
            <div className="team-roster-list">
              {teamMembers.slice(0, 8).map((m) => (
                <div key={m.id} className="team-roster-item">
                  <div className="avatar avatar-sm avatar-neutral">
                    {m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div className="team-roster-meta">
                    <strong>{m.name}</strong>
                    <span>{m.role}</span>
                  </div>
                  <span
                    className={`badge badge-sm ${
                      m.status === "Active" ? "badge-success" : "badge-neutral"
                    }`}
                  >
                    {m.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
