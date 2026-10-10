"use client";
import React, { useState } from "react";
import {
  Users,
  Building2,
  TrendingDown,
  Inbox,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  BarChart3,
  PieChart as PieIcon,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Button } from "@/components/ui/button";
import type { Identity, Report } from "@/lib/api";

interface HRDashboardProps {
  person: Identity;
  tickets: any[];
  report: Report | null;
  onResolveTicket: (id: string) => Promise<void>;
  onNavigate: (view: any) => void;
  onSendPrompt: (text: string) => void;
  busy: boolean;
}

const defaultDepartmentData = [
  { department: "Engineering", count: 10 },
  { department: "Product", count: 10 },
  { department: "Operations", count: 10 },
  { department: "Finance", count: 10 },
  { department: "People", count: 10 },
];

const statusDonutData = [
  { name: "Active", value: 47, color: "#10b981" },
  { name: "On Leave", value: 2, color: "#3b82f6" },
  { name: "Exited", value: 3, color: "#94a3b8" },
];

export function HRDashboard({
  person,
  tickets,
  report,
  onResolveTicket,
  onNavigate,
  onSendPrompt,
  busy,
}: HRDashboardProps) {
  const [promptText, setPromptText] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const firstName = person.name.split(" ")[0] || "Tara";

  // Use report rows if available, else default department data
  const chartRows =
    report && report.report === "headcount" && report.rows.length > 0
      ? report.rows.map((r: any) => ({
          department: r.department || r.group,
          count: Number(r.value || 10),
        }))
      : defaultDepartmentData;

  const totalHeadcount = report?.total ?? chartRows.reduce((acc, curr) => acc + curr.count, 0);
  const departmentCount = chartRows.length;

  const openTickets = tickets.filter((t) => t.status === "open");

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolveTicket(id);
    } finally {
      setResolvingId(null);
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
            Here's your People Operations analytics and support overview.
          </p>
        </div>
        <div className="user-profile-badge">
          <div className="avatar avatar-rose">
            {person.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="user-badge-meta">
            <strong className="user-badge-name">{person.name}</strong>
            <span className="user-badge-role">HR Analyst · People Operations</span>
          </div>
        </div>
      </div>

      {/* 2. Top Summary Stat Cards */}
      <div className="stats-quad-grid">
        {/* Card 1: Total Employees */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Employees</span>
            <div className="stat-icon-wrapper icon-purple">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{totalHeadcount}</span>
            <span className="stat-subtext">active headcount</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-success">
              {report ? "Live database query" : "100% seeded roster"}
            </span>
          </div>
          <div className="stat-footer-text">
            <span>{departmentCount} synthetic departments</span>
            <span>All enterprise data</span>
          </div>
        </div>

        {/* Card 2: Departments */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Departments</span>
            <div className="stat-icon-wrapper icon-blue">
              <Building2 size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{departmentCount}</span>
            <span className="stat-subtext">functional units</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-blue-subtle">10 staff per division</span>
          </div>
          <div className="stat-footer-text">
            <span>Eng, Product, Ops, Fin, People</span>
          </div>
        </div>

        {/* Card 3: Attrition Rate */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Annual Attrition</span>
            <div className="stat-icon-wrapper icon-emerald">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">6%</span>
            <span className="stat-subtext">3 exits / 50 records</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-success">94% annual retention</span>
          </div>
          <div className="stat-footer-text">
            <span>47 active · 3 historic departures</span>
          </div>
        </div>

        {/* Card 4: Open Tickets */}
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Open Tickets</span>
            <div className="stat-icon-wrapper icon-amber">
              <Inbox size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{openTickets.length}</span>
            <span className="stat-subtext">requires action</span>
          </div>
          <div className="stat-tag-row">
            {openTickets.length > 0 ? (
              <span className="badge badge-warning">Handoffs pending</span>
            ) : (
              <span className="badge badge-neutral">No open escalations</span>
            )}
          </div>
          <div className="stat-footer-link">
            <button
              type="button"
              className="btn-link"
              onClick={() => onNavigate("handoff")}
            >
              Go to ticket inbox <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Analytical Charts Grid */}
      <div className="dashboard-charts-grid">
        {/* Headcount by Department Bar Chart */}
        <div className="content-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Headcount by Department</h2>
              <p className="card-subtitle">
                Current active employee distribution across business units.
              </p>
            </div>
            <button
              type="button"
              className="btn-link-sm"
              onClick={() => onNavigate("analytics")}
            >
              Full Analytics
            </button>
          </div>

          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartRows}
                margin={{ top: 15, right: 15, left: -15, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#e2e8f0"
                />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f1f5f9" }}
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Bar
                  dataKey="count"
                  fill="#4f46e5"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Status Donut Chart */}
        <div className="content-card">
          <div className="card-header-row">
            <div>
              <h2 className="card-title">Employee Status</h2>
              <p className="card-subtitle">
                Breakdown of active, leave, and exited employee records.
              </p>
            </div>
            <span className="badge badge-neutral">Total: 50</span>
          </div>

          <div className="donut-chart-wrapper">
            <div style={{ width: 180, height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusDonutData}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="donut-legend">
              {statusDonutData.map((item, idx) => (
                <div key={idx} className="donut-legend-item">
                  <span
                    className="donut-legend-color"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="donut-legend-name">{item.name}</span>
                  <strong className="donut-legend-value">{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Bottom Operational Row: Tickets & AI Assistant */}
      <div className="dashboard-content-split">
        {/* Left Column: Recent Support Tickets */}
        <div className="dashboard-main-col">
          <div className="content-card">
            <div className="card-header-row">
              <div>
                <h2 className="card-title">Recent HR Support Tickets</h2>
                <p className="card-subtitle">
                  Employee questions escalated from the AI assistant for policy clarification.
                </p>
              </div>
              <button
                type="button"
                className="btn-link"
                onClick={() => onNavigate("handoff")}
              >
                View all tickets <ArrowRight size={13} />
              </button>
            </div>

            {tickets.length > 0 ? (
              <div className="ticket-list-wrapper">
                {tickets.slice(0, 5).map((t) => (
                  <div key={t.id} className="ticket-card-row">
                    <div className="ticket-info">
                      <div className="ticket-title-row">
                        <strong className="ticket-title">{t.title || t.question}</strong>
                        <span
                          className={`badge ${
                            t.status === "resolved"
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                        >
                          {t.status}
                        </span>
                      </div>
                      <p className="ticket-desc">{t.description || t.reason}</p>
                      <span className="ticket-meta">
                        From: {t.employee_name || t.employee_id} · {t.created_at ? t.created_at.slice(0, 10) : "Recent"}
                      </span>
                    </div>
                    {t.status !== "resolved" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="btn-resolve-ticket"
                        disabled={busy || resolvingId === t.id}
                        onClick={() => handleResolve(t.id)}
                      >
                        <CheckCircle2 size={14} />
                        Resolve
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-inbox-state">
                <div className="empty-icon-circle icon-emerald">
                  <ShieldCheck size={28} />
                </div>
                <h3>No Open Tickets</h3>
                <p>
                  All employee policy inquiries and handoffs have been reviewed and resolved.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI HR Assistant */}
        <div className="dashboard-side-col">
          <div className="content-card ai-assistant-banner-card">
            <div className="ai-card-badge">
              <Sparkles size={16} />
              <span>AI People Analytics</span>
            </div>
            <h2 className="ai-card-title">Ask your HR Assistant</h2>
            <p className="ai-card-desc">
              Execute parameter-validated SQL analytics, summarize policy escalations, or report headcount.
            </p>

            <form onSubmit={handlePromptSubmit} className="ai-composer-wrapper">
              <input
                type="text"
                className="ai-composer-input"
                placeholder="Ask about department headcount, joiners, or tickets..."
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
              <span className="ai-chips-label">HR analytics prompts:</span>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Show headcount by department")}
              >
                Headcount by department
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Show joining trends for 2026")}
              >
                Joining trends 2026
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Summarize all open HR support tickets")}
              >
                Review open tickets
              </button>
              <button
                type="button"
                className="ai-chip-btn"
                onClick={() => onSendPrompt("Show approved leave report for 2026")}
              >
                Approved leave report
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
