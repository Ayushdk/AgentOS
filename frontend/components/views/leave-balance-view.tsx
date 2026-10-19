"use client";
import React from "react";
import {
  PieChart,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
  Info,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface LeaveBalanceViewProps {
  balances: Array<{ leave_type: string; remaining: number; reserved: number; available: number }>;
  onNavigatePolicies: () => void;
  onRequestLeave: () => void;
}

export function LeaveBalanceView({
  balances,
  onNavigatePolicies,
  onRequestLeave,
}: LeaveBalanceViewProps) {
  const annual = balances.find((b) => b.leave_type === "annual");
  const sick = balances.find((b) => b.leave_type === "sick");

  const availableDays = annual !== undefined ? annual.available : 16;
  const totalAnnual = annual !== undefined ? annual.remaining : 18;
  const reservedDays = annual !== undefined ? annual.reserved : 2;

  // SVG Gauge math
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const percent = Math.min(1, Math.max(0, availableDays / (totalAnnual || 18)));
  const strokeDashoffset = circumference - percent * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
            <PieChart size={22} color="var(--primary)" />
            Leave Balance Details
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Detailed breakdown of your allocated, reserved, and remaining time off allowances.
          </p>
        </div>

        <Button
          onClick={onRequestLeave}
          style={{ background: "var(--primary)", color: "#FFFFFF", fontWeight: 650, fontSize: 13 }}
        >
          Request Leave
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24 }} className="balance-grid">
        {/* LEFT CARD: Circular Gauge + Category Breakdown */}
        <div className="saas-card" style={{ display: "flex", flexDirection: "column", gap: 24, padding: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
            Available Allowances
          </h3>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 0" }}>
            <div style={{ position: "relative", width: 140, height: 140 }}>
              <svg width="140" height="140" className="progress-ring-svg">
                <circle cx="70" cy="70" r={radius} className="progress-ring-circle-bg" strokeWidth="12" />
                <circle
                  cx="70"
                  cy="70"
                  r={radius}
                  className="progress-ring-circle-val"
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <div className="progress-ring-center">
                <strong style={{ fontSize: 32, fontWeight: 800 }}>{availableDays}</strong>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 600 }}>Days Remaining</span>
              </div>
            </div>
          </div>

          {/* Breakdown Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--border-color)", paddingTop: 20 }}>
            {/* Annual Leave */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>Annual Leave</strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>
                    Reserved: {reservedDays} days · Remaining: {availableDays} days
                  </span>
                </div>
                <strong style={{ fontSize: 14, color: "var(--primary)" }}>
                  {availableDays} / {totalAnnual} days
                </strong>
              </div>
              <div style={{ height: 6, background: "#E2EAF5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: `${percent * 100}%`, height: "100%", background: "var(--primary)" }} />
              </div>
            </div>

            {/* Sick Leave */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>Sick Leave</strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>
                    Used: 0 · Remaining: {sick ? sick.available : 8} days
                  </span>
                </div>
                <strong style={{ fontSize: 14, color: "var(--success)" }}>
                  {sick ? sick.available : 8} / {sick ? sick.remaining : 8} days
                </strong>
              </div>
              <div style={{ height: 6, background: "#E2EAF5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: "var(--success)" }} />
              </div>
            </div>

            {/* Casual Leave */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div>
                  <strong style={{ fontSize: 13 }}>Casual Leave</strong>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>
                    Used: 0 · Remaining: 5 days
                  </span>
                </div>
                <strong style={{ fontSize: 14, color: "var(--purple)" }}>
                  5 / 5 days
                </strong>
              </div>
              <div style={{ height: 6, background: "#E2EAF5", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: "100%", height: "100%", background: "var(--purple)" }} />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT CARD: Leave Policy Summary */}
        <div className="saas-card" style={{ display: "flex", flexDirection: "column", gap: 20, padding: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>
            Leave Policy Summary
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 13 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 6, flexShrink: 0 }} />
              <div>
                <strong>Annual Leave:</strong> 18 working days accrued per calendar year. Weekends and gazetted company holidays are excluded.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", marginTop: 6, flexShrink: 0 }} />
              <div>
                <strong>Sick Leave:</strong> 8 working days per calendar year. Consecutive absences over 3 days require medical attestation.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)", marginTop: 6, flexShrink: 0 }} />
              <div>
                <strong>Casual Leave:</strong> 5 working days per calendar year for unforeseen personal matters.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", marginTop: 6, flexShrink: 0 }} />
              <div>
                <strong>Carry-Forward Limit:</strong> Maximum of 5 unused annual leave days may carry over into the subsequent calendar year.
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "16px",
              borderRadius: 8,
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong style={{ fontSize: 13, color: "var(--primary)", display: "block" }}>Need full compliance terms?</strong>
              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Read policy document LEAVE-2</span>
            </div>
            <button
              onClick={onNavigatePolicies}
              className="btn-primary"
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              View full policy <ArrowRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
