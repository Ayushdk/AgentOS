"use client";
import React, { useState } from "react";
import { CalendarDays, AlertCircle, Check, ArrowLeft, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SubmitLeaveViewProps {
  onSubmit: (leaveType: string, startDate: string, endDate: string, reason: string) => Promise<void>;
  onCancel: () => void;
  busy: boolean;
  availableBalance?: number;
}

export function SubmitLeaveView({
  onSubmit,
  onCancel,
  busy,
  availableBalance = 16,
}: SubmitLeaveViewProps) {
  const [leaveType, setLeaveType] = useState("annual");
  const [startDate, setStartDate] = useState("2026-04-26");
  const [endDate, setEndDate] = useState("2026-04-28");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const calculateDays = () => {
    try {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = d2.getTime() - d1.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays > 0 ? diffDays : 1;
    } catch {
      return 1;
    }
  };

  const calculatedDays = calculateDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      setError("Please choose start and end dates.");
      return;
    }
    if (endDate < startDate) {
      setError("End date cannot be earlier than start date.");
      return;
    }
    setError("");
    onSubmit(leaveType, startDate, endDate, reason || "Personal time off");
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <button
        onClick={onCancel}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          width: "fit-content",
        }}
      >
        <ArrowLeft size={16} /> Back to My Leave
      </button>

      <div className="saas-card" style={{ padding: "32px" }}>
        <div style={{ borderBottom: "1px solid var(--border-color)", paddingBottom: 18, marginBottom: 24 }}>
          <h1 style={{ fontSize: 20, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarDays size={22} color="var(--primary)" />
            Submit Leave Request
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Fill in the details to create a formal leave request for manager review.
          </p>
        </div>

        {error && (
          <div className="banner error" role="alert" style={{ marginBottom: 20 }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Leave Type */}
          <div className="saas-form-group" style={{ margin: 0 }}>
            <label>Leave Type</label>
            <select
              className="saas-select"
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <option value="annual">Annual Leave ({availableBalance} days available)</option>
              <option value="sick">Sick Leave (8 days available)</option>
              <option value="personal">Personal Leave (3 days available)</option>
            </select>
          </div>

          {/* Dates row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="saas-form-group" style={{ margin: 0 }}>
              <label>Start Date</label>
              <input
                type="date"
                required
                className="saas-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="saas-form-group" style={{ margin: 0 }}>
              <label>End Date</label>
              <input
                type="date"
                required
                className="saas-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Number of Days Preview */}
          <div className="saas-form-group" style={{ margin: 0 }}>
            <label>Number of Days</label>
            <input
              type="text"
              readOnly
              className="saas-input"
              value={`${calculatedDays} ${calculatedDays === 1 ? "day" : "days"}`}
              style={{ background: "var(--bg-main)", color: "var(--text-main)", fontWeight: 600 }}
            />
          </div>

          {/* Reason */}
          <div className="saas-form-group" style={{ margin: 0 }}>
            <label>Reason (Optional)</label>
            <textarea
              className="saas-textarea"
              rows={3}
              placeholder="e.g. Family function, vacation, or medical appointment"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Manager notification disclaimer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 14px",
              borderRadius: 8,
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary-border)",
              fontSize: 12,
              color: "var(--primary)",
            }}
          >
            <ShieldCheck size={16} />
            <span>This will be sent to your direct manager for review and balance reservation.</span>
          </div>

          {/* Form Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={busy}
              style={{ fontSize: 13 }}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={busy}
              style={{
                background: "var(--primary)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 650,
              }}
            >
              {busy ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
