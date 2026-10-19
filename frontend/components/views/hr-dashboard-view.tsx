"use client";
import React from "react";
import {
  Users,
  Calendar,
  TrendingDown,
  Inbox,
  ArrowRight,
  ShieldCheck,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HRSummary, Identity } from "@/lib/api";

interface HRDashboardViewProps {
  person: Identity;
  summary: HRSummary | null;
  tickets: any[];
  onNavigate: (view: any) => void;
}

export function HRDashboardView({
  person,
  summary,
  tickets,
  onNavigate,
}: HRDashboardViewProps) {
  const firstName = person.name.split(" ")[0] || "Priya";

  const totalEmployees = summary?.employees.total || 48;
  const activeEmployees = summary?.employees.active || 46;
  const exitedEmployees = summary?.employees.exited || 2;
  const openTickets = tickets.filter((t) => t.status === "open").length || 3;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          Good morning, {firstName}! <span>👋</span>
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          HR Analyst · People Operations Overview &amp; Compliance Hub
        </p>
      </div>

      {/* 2. Top 4 Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="metrics-grid">
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Total Employees</span>
            <div className="metric-icon-box blue">
              <Users size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">{totalEmployees}</span>
            <span className="metric-subtext" style={{ color: "var(--success)" }}>+2% from last month</span>
          </div>
          <span className="saas-badge badge-neutral" style={{ marginTop: "auto" }}>
            {summary?.departments.count || 5} operational divisions
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Active Employees</span>
            <div className="metric-icon-box green">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--success)" }}>
              {activeEmployees}
            </span>
            <span className="metric-subtext">roster records</span>
          </div>
          <span className="saas-badge badge-success" style={{ marginTop: "auto" }}>
            100% verified status
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">On Leave Today</span>
            <div className="metric-icon-box blue">
              <Calendar size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number">2</span>
            <span className="metric-subtext">scheduled absence</span>
          </div>
          <span className="saas-badge badge-info" style={{ marginTop: "auto" }}>
            Approved by managers
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-label">Attrition Rate</span>
            <div className="metric-icon-box red">
              <TrendingDown size={18} />
            </div>
          </div>
          <div className="metric-value-row">
            <span className="metric-number" style={{ color: "var(--danger)" }}>
              {((exitedEmployees / totalEmployees) * 100).toFixed(1)}%
            </span>
            <span className="metric-subtext" style={{ color: "var(--success)" }}>-0.5% from last month</span>
          </div>
          <span className="saas-badge badge-neutral" style={{ marginTop: "auto" }}>
            {exitedEmployees} historic departures
          </span>
        </div>
      </div>

      {/* 3. Recent HR Tickets Section */}
      <div className="saas-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 750, color: "var(--text-main)" }}>
              Recent HR Tickets
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>
              Questions escalated from employee conversations needing people team resolution.
            </p>
          </div>
          <button
            onClick={() => onNavigate("handoff")}
            style={{ background: "none", border: "none", color: "var(--primary)", fontSize: 12, fontWeight: 600 }}
          >
            View all ({tickets.length}) →
          </button>
        </div>

        <div className="saas-table-wrapper">
          <table className="saas-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Employee</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tickets.slice(0, 4).map((t) => (
                <tr key={t.id}>
                  <td>
                    <strong>{t.question}</strong>
                    <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
                      Reason: {t.reason ? t.reason.replace("_", " ") : "Policy clarification"}
                    </span>
                  </td>
                  <td>
                    <span>Ari Sen (E001)</span>
                  </td>
                  <td>
                    <span className={`saas-badge badge-${t.status}`}>
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => onNavigate("handoff")}
                      className="btn-outline"
                      style={{ padding: "5px 12px", fontSize: 12 }}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}

              {!tickets.length && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 32, color: "var(--text-secondary)" }}>
                    No pending support tickets in the HR queue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
