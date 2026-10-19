"use client";
import React from "react";
import {
  ChartColumn,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { TeamMember, Leave } from "@/lib/api";

interface TeamAnalyticsViewProps {
  team: TeamMember[];
  queue: Leave[];
}

export function TeamAnalyticsView({ team, queue }: TeamAnalyticsViewProps) {
  // Monthly leave requests aggregation (Approved vs Rejected)
  const monthlyData = [
    { month: "Nov", Approved: 6, Rejected: 1 },
    { month: "Dec", Approved: 8, Rejected: 2 },
    { month: "Jan", Approved: 12, Rejected: 1 },
    { month: "Feb", Approved: 9, Rejected: 0 },
    { month: "Mar", Approved: 14, Rejected: 2 },
    { month: "Apr", Approved: 10, Rejected: 1 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
            <ChartColumn size={22} color="var(--primary)" />
            Team Analytics
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Direct report attendance trends, approval velocity, and seasonal time-off distributions.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <select className="saas-select" defaultValue="6m" style={{ fontSize: 12, padding: "6px 12px" }}>
            <option value="6m">Last 6 Months</option>
            <option value="ytd">Year to Date (2026)</option>
            <option value="1y">Last 12 Months</option>
          </select>
        </div>
      </div>

      {/* Top 4 Metrics Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Team Members</span>
            <div className="metric-icon-box blue">
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{team.length || 8}</span>
            <span className="metric-subtext">active</span>
          </div>
          <span className="saas-badge badge-neutral" style={{ marginTop: "auto" }}>
            100% attendance recorded
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">On Leave Today</span>
            <div className="metric-icon-box green">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--success)" }}>2</span>
            <span className="metric-subtext">scheduled</span>
          </div>
          <span className="saas-badge badge-success" style={{ marginTop: "auto" }}>
            Coverage maintained
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Avg. Leave Days / Employee</span>
            <div className="metric-icon-box blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">4.3</span>
            <span className="metric-subtext">days / quarter</span>
          </div>
          <span className="saas-badge badge-info" style={{ marginTop: "auto" }}>
            Normal distribution
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Recent Approval Time</span>
            <div className="metric-icon-box purple">
              <Clock size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--purple)" }}>1.2</span>
            <span className="metric-subtext">business days</span>
          </div>
          <span className="saas-badge badge-neutral" style={{ marginTop: "auto" }}>
            Fast resolution
          </span>
        </div>
      </div>

      {/* Main Chart: Leave Requests by Month */}
      <div className="saas-card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 750, color: "var(--text-main)" }}>
            Leave Requests by Month
          </h3>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
            Monthly comparison of approved versus rejected direct-report requests.
          </p>
        </div>

        <div style={{ width: "100%", height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2EAF5" vertical={false} />
              <XAxis dataKey="month" stroke="#64748B" fontSize={12} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={12} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  boxShadow: "var(--shadow-md)",
                  fontSize: "12px",
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 10 }}
                iconType="circle"
              />
              <Bar dataKey="Approved" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejected" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
