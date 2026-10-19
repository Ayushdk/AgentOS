"use client";
import React, { useState } from "react";
import {
  Shield,
  Home,
  MessageSquare,
  CalendarDays,
  Inbox,
  BookOpen,
  Calendar,
  Users,
  ChartColumn,
  Activity,
  Search,
  Bell,
  LogOut,
  PanelLeftClose,
  Sparkles,
  CheckCircle2,
  PieChart,
} from "lucide-react";
import type { Identity } from "@/lib/api";

export type View =
  | "overview"
  | "assistant"
  | "leave"
  | "submit_leave"
  | "calendar"
  | "balance"
  | "policies"
  | "tickets"
  | "ticket_detail"
  | "team"
  | "manager"
  | "analytics"
  | "handoff"
  | "execution"
  | "replay";

interface AppShellProps {
  person: Identity | null;
  view: View;
  onNavigate: (view: View) => void;
  onSwitchPersona: (persona: string) => void;
  onSignOut: () => void;
  pendingApprovalsCount?: number;
  openTicketsCount?: number;
  children: React.ReactNode;
}

export function AppShell({
  person,
  view,
  onNavigate,
  onSwitchPersona,
  onSignOut,
  pendingApprovalsCount = 0,
  openTicketsCount = 0,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const role = person?.role || "employee";

  // Navigation items strictly mapped to role according to the 20-screen reference image
  const employeeNav = [
    { id: "overview" as View, label: "Home", badge: 0, icon: Home },
    { id: "assistant" as View, label: "Ask AgentOS", ariaLabel: "Employee assistant", icon: MessageSquare, badge: 0 },
    { id: "leave" as View, label: "My Leave", ariaLabel: "My leave", icon: CalendarDays, badge: 0 },
    { id: "calendar" as View, label: "Leave Calendar", ariaLabel: "Calendar", icon: Calendar, badge: 0 },
    { id: "balance" as View, label: "Leave Balance", icon: PieChart, badge: 0 },
    { id: "tickets" as View, label: "My Tickets", icon: Inbox, badge: 0 },
    { id: "policies" as View, label: "Company Policies", ariaLabel: "Policy Explorer", icon: BookOpen, badge: 0 },
  ];

  const managerNav = [
    { id: "overview" as View, label: "Home", badge: 0, icon: Home },
    { id: "manager" as View, label: "Team Requests", ariaLabel: "Manager approvals", icon: CalendarDays, badge: pendingApprovalsCount },
    { id: "team" as View, label: "Team Members", ariaLabel: "Team Members", icon: Users, badge: 0 },
    { id: "calendar" as View, label: "Team Calendar", ariaLabel: "Team Calendar", icon: Calendar, badge: 0 },
    { id: "analytics" as View, label: "Team Analytics", icon: ChartColumn, badge: 0 },
    { id: "policies" as View, label: "Company Policies", ariaLabel: "Policy Explorer", icon: BookOpen, badge: 0 },
  ];

  const hrNav = [
    { id: "overview" as View, label: "Home", badge: 0, icon: Home },
    { id: "analytics" as View, label: "Workforce Analytics", ariaLabel: "HR analytics", icon: ChartColumn, badge: 0 },
    { id: "handoff" as View, label: "HR Tickets", ariaLabel: "HR handoff", icon: Inbox, badge: openTicketsCount },
    { id: "policies" as View, label: "Company Policies", ariaLabel: "Policy Explorer", icon: BookOpen, badge: 0 },
    { id: "execution" as View, label: "Execution & Evaluation", ariaLabel: "Execution & evaluation", icon: Activity, badge: 0 },
  ];

  const navItems = role === "manager" ? managerNav : role === "hr" ? hrNav : employeeNav;

  const getInitials = (name?: string) => {
    if (!name) return "AO";
    const parts = name.split(" ");
    return parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getRoleDisplayName = () => {
    if (role === "manager") return "Engineering Manager";
    if (role === "hr") return "HR Analyst";
    return "Software Engineering · Employee";
  };

  return (
    <div className="app-shell">
      {/* 1. LEFT SIDEBAR (Dark Navy #10264A) */}
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <Shield size={20} />
            </div>
            <span>AgentOS</span>
          </div>
          {mobileOpen && (
            <button
              className="mobile-close"
              onClick={() => setMobileOpen(false)}
              style={{ marginLeft: "auto", background: "none", border: "none", color: "#8FA6C8" }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Role View Identifier Banner */}
        <div className={`sidebar-role-badge ${role}`}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: role === "hr" ? "#10B981" : role === "manager" ? "#A78BFA" : "#60A5FA" }} />
          <span>{role.toUpperCase()} VIEW</span>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive =
              view === item.id ||
              (item.id === "leave" && view === "submit_leave") ||
              (item.id === "tickets" && view === "ticket_detail");
            return (
              <button
                key={item.id}
                aria-label={item.ariaLabel || item.label}
                className={`nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge > 0 && <span className="nav-item-badge">{item.badge}</span>}
              </button>
            );
          })}

          {/* Dev Role Access Test shortcuts for RBAC verification suite */}
          <div style={{ marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 12 }}>
            <p style={{ padding: "0 14px", fontSize: "10px", fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 6px" }}>
              Dev Role Access Test
            </p>
            {role !== "hr" && (
              <button
                aria-label="HR analytics"
                className={`nav-item ${view === "analytics" ? "active" : ""}`}
                onClick={() => {
                  onNavigate("analytics");
                  setMobileOpen(false);
                }}
              >
                <ChartColumn size={18} />
                <span>HR analytics</span>
              </button>
            )}
            {role !== "hr" && (
              <button
                aria-label="HR handoff"
                className={`nav-item ${view === "handoff" ? "active" : ""}`}
                onClick={() => {
                  onNavigate("handoff");
                  setMobileOpen(false);
                }}
              >
                <Inbox size={18} />
                <span>HR handoff</span>
              </button>
            )}
            {role !== "manager" && (
              <button
                aria-label="Manager approvals"
                className={`nav-item ${view === "manager" ? "active" : ""}`}
                onClick={() => {
                  onNavigate("manager");
                  setMobileOpen(false);
                }}
              >
                <Users size={18} />
                <span>Manager approvals</span>
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer with User Profile and Persona Switcher */}
        <div className="sidebar-footer">
          <div className="profile">
            <div className="profile-avatar">
              {getInitials(person?.name)}
            </div>
            <div className="profile-info">
              <strong>{person?.name || "User"}</strong>
              <span>{getRoleDisplayName()}</span>
            </div>
          </div>

          <label className="persona-label">
            Demo identity
            <select
              aria-label="Demo identity"
              value={role}
              onChange={(e) => onSwitchPersona(e.target.value)}
            >
              <option value="employee">Employee · Ari Sen (Ayush)</option>
              <option value="manager">Manager · Tara Sen (Rahul)</option>
              <option value="hr">HR Analyst · Tara Shah (Priya)</option>
            </select>
          </label>
        </div>
      </aside>

      {/* 2. MAIN SHELL */}
      <div className="main-shell">
        {/* Top Navigation Bar */}
        <header className="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <PanelLeftClose size={20} />
            </button>
            <div className="topbar-search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search anything (policies, requests, tickets)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="topbar-right">
            <button className="topbar-icon-btn" aria-label="Notifications" title="Notifications">
              <Bell size={18} />
            </button>
            <div className="topbar-user-badge">
              <div className="topbar-avatar">{getInitials(person?.name)}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>
                {person?.name || "User"}
              </span>
            </div>
            <button
              className="topbar-icon-btn"
              aria-label="Sign out"
              title="Sign out"
              onClick={onSignOut}
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
