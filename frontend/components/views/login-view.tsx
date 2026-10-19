"use client";
import React, { useState } from "react";
import {
  Shield,
  Sparkles,
  CalendarDays,
  Inbox,
  ChartColumn,
  Users,
  Check,
  ArrowRight,
  Play,
  Lock,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginViewProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSelectDemoPersona: (persona: "employee" | "manager" | "hr") => Promise<void>;
  onOpenReplay: () => void;
  busy: boolean;
  error?: string;
}

export function LoginView({
  onLogin,
  onSelectDemoPersona,
  onOpenReplay,
  busy,
  error,
}: LoginViewProps) {
  const [email, setEmail] = useState("ayush@employee.com");
  const [password, setPassword] = useState("password123");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-main)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1120px",
          display: "grid",
          gridTemplateColumns: "280px 1fr 320px",
          gap: "24px",
          alignItems: "stretch",
        }}
        className="login-grid"
      >
        {/* LEFT PANEL: Role Overview */}
        <div
          style={{
            background: "var(--sidebar-bg)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 24px",
            color: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  background: "var(--primary)",
                  borderRadius: 10,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <Shield size={22} color="#FFF" />
              </div>
              <div>
                <h2 style={{ fontSize: 20, color: "#FFF", fontWeight: 800, margin: 0 }}>AgentOS</h2>
                <span style={{ fontSize: 11, color: "var(--sidebar-muted)" }}>Operations Platform</span>
              </div>
            </div>

            <div
              style={{
                background: "rgba(37, 99, 235, 0.2)",
                border: "1px solid rgba(37, 99, 235, 0.4)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: "#93C5FD" }}>
                ENTERPRISE WORKSPACE
              </span>
              <p style={{ fontSize: 12, color: "#E2EAF5", marginTop: 4, lineHeight: 1.5 }}>
                Role-based support, policy compliance, leave management, and organizational analytics.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#CBD5E1" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA" }} />
                <span>Employee · Grounded policy & leave</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#CBD5E1" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA" }} />
                <span>Manager · Team approvals & coverage</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#CBD5E1" }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
                <span>HR Analyst · Workforce SQL reports</span>
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <span style={{ fontSize: 11, color: "var(--sidebar-muted)" }}>Synthetic Enterprise Demo</span>
          </div>
        </div>

        {/* CENTER PANEL: Login Form & Demo Persona Selection */}
        <div
          className="saas-card"
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "40px 36px",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                width: 44,
                height: 44,
                background: "var(--primary-subtle)",
                borderRadius: 12,
                display: "grid",
                placeItems: "center",
                margin: "0 auto 14px",
                color: "var(--primary)",
              }}
            >
              <Shield size={24} />
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", marginBottom: 6 }}>
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              Sign in to your account or launch a demo identity
            </p>
          </div>

          {error && (
            <div className="banner error" role="alert" style={{ marginBottom: 20 }}>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="saas-form-group" style={{ margin: 0 }}>
              <label>Email Address</label>
              <div style={{ position: "relative" }}>
                <Mail
                  size={16}
                  style={{ position: "absolute", left: 12, top: 12, color: "var(--text-secondary)" }}
                />
                <input
                  type="email"
                  required
                  className="saas-input"
                  style={{ width: "100%", paddingLeft: 38 }}
                  placeholder="e.g. ayush@employee.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="saas-form-group" style={{ margin: 0 }}>
              <label>Password</label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={16}
                  style={{ position: "absolute", left: 12, top: 12, color: "var(--text-secondary)" }}
                />
                <input
                  type="password"
                  required
                  className="saas-input"
                  style={{ width: "100%", paddingLeft: 38 }}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              style={{
                background: "var(--primary)",
                color: "#FFFFFF",
                height: 42,
                fontSize: 14,
                fontWeight: 650,
                borderRadius: 8,
                marginTop: 6,
              }}
            >
              {busy ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Quick Demo Accounts Selection */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--border-color)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Try demo accounts
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                className="btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", fontSize: 13 }}
                onClick={() => {
                  setEmail("ayush@employee.com");
                  onSelectDemoPersona("employee");
                }}
                disabled={busy}
              >
                <span><strong>ayush@employee.com</strong> <span style={{ color: "var(--text-secondary)" }}>(Employee)</span></span>
                <ArrowRight size={14} color="var(--primary)" />
              </button>

              <button
                type="button"
                className="btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", fontSize: 13 }}
                onClick={() => {
                  setEmail("rahul@manager.com");
                  onSelectDemoPersona("manager");
                }}
                disabled={busy}
              >
                <span><strong>rahul@manager.com</strong> <span style={{ color: "var(--text-secondary)" }}>(Manager)</span></span>
                <ArrowRight size={14} color="var(--purple)" />
              </button>

              <button
                type="button"
                className="btn-outline"
                style={{ justifyContent: "space-between", padding: "10px 14px", fontSize: 13 }}
                onClick={() => {
                  setEmail("priya@hr.com");
                  onSelectDemoPersona("hr");
                }}
                disabled={busy}
              >
                <span><strong>priya@hr.com</strong> <span style={{ color: "var(--text-secondary)" }}>(HR Analyst)</span></span>
                <ArrowRight size={14} color="var(--success)" />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Teammate Feature Box */}
        <div
          style={{
            background: "linear-gradient(145deg, #1D4ED8, #1E40AF)",
            borderRadius: "var(--radius-lg)",
            padding: "32px 24px",
            color: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255, 255, 255, 0.15)",
                padding: "4px 10px",
                borderRadius: 9999,
                fontSize: 11,
                fontWeight: 650,
                marginBottom: 20,
              }}
            >
              <Sparkles size={13} />
              AI OPERATIONAL ASSISTANT
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 750, color: "#FFF", lineHeight: 1.3, marginBottom: 12 }}>
              Your work, with an AI teammate.
            </h3>
            <p style={{ fontSize: 13, color: "#DBEAFE", lineHeight: 1.6, marginBottom: 24 }}>
              Empowering employees with verified citations, manager reviews, and auditable governance.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                "Get policy answers with citations",
                "Draft leave requests & check holidays",
                "Track support tickets with IT & HR",
                "View real-time approval queues",
                "Execute safe aggregate reports",
              ].map((feat, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#EFF6FF" }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      background: "rgba(255, 255, 255, 0.2)",
                      display: "grid",
                      placeItems: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Check size={11} color="#FFF" />
                  </div>
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ paddingTop: 20 }}>
            <Button
              variant="outline"
              onClick={onOpenReplay}
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <Play size={13} style={{ marginRight: 6 }} /> Open Recorded Demo Replay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
