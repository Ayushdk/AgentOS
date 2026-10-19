"use client";
import React, { useState } from "react";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Leave } from "@/lib/api";
import { formatShortDate } from "@/lib/dates";

interface MyLeaveViewProps {
  leaves: Leave[];
  onNewRequest: () => void;
  onViewCalendar: () => void;
  onViewBalance: () => void;
}

export function MyLeaveView({
  leaves,
  onNewRequest,
  onViewCalendar,
  onViewBalance,
}: MyLeaveViewProps) {
  const [filterTab, setFilterTab] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null);

  const filteredLeaves = leaves.filter((l) => {
    if (filterTab === "all") return true;
    if (filterTab === "pending") return l.status === "pending";
    if (filterTab === "approved") return l.status === "approved";
    if (filterTab === "rejected") return l.status === "rejected" || l.status === "cancelled";
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header and top navigation bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
            <CalendarDays size={22} color="var(--primary)" />
            My Leave
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Track your leave requests, review approval statuses, and manage planned time off.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button
            variant="outline"
            onClick={onViewCalendar}
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Calendar
          </Button>

          <Button
            variant="outline"
            onClick={onViewBalance}
            style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            Leave Balance
          </Button>

          <Button
            onClick={onNewRequest}
            style={{
              background: "var(--primary)",
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 650,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Plus size={16} /> New Request
          </Button>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="saas-tabs-bar" style={{ margin: 0 }}>
        <div className="saas-tabs-group">
          <button
            className={`saas-tab-btn ${filterTab === "all" ? "active" : ""}`}
            onClick={() => setFilterTab("all")}
          >
            All Requests ({leaves.length})
          </button>
          <button
            className={`saas-tab-btn ${filterTab === "pending" ? "active" : ""}`}
            onClick={() => setFilterTab("pending")}
          >
            Pending ({leaves.filter((l) => l.status === "pending").length})
          </button>
          <button
            className={`saas-tab-btn ${filterTab === "approved" ? "active" : ""}`}
            onClick={() => setFilterTab("approved")}
          >
            Approved ({leaves.filter((l) => l.status === "approved").length})
          </button>
          <button
            className={`saas-tab-btn ${filterTab === "rejected" ? "active" : ""}`}
            onClick={() => setFilterTab("rejected")}
          >
            Rejected ({leaves.filter((l) => l.status === "rejected" || l.status === "cancelled").length})
          </button>
        </div>
      </div>

      {/* Requests Table */}
      <div className="saas-table-wrapper">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Date Range</th>
              <th>Leave Type</th>
              <th>Working Days</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeaves.map((l) => (
              <tr key={l.id}>
                <td>
                  <strong>{formatShortDate(l.start_date)} — {formatShortDate(l.end_date)}</strong>
                  <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)" }}>
                    Ref #{l.id.slice(0, 8)}
                  </span>
                </td>
                <td>
                  <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{l.leave_type} Leave</span>
                </td>
                <td>
                  <strong>{l.days}</strong> <span style={{ color: "var(--text-secondary)" }}>{l.days === 1 ? "day" : "days"}</span>
                </td>
                <td>
                  <span className={`saas-badge badge-${l.status}`}>
                    {l.status}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setSelectedLeave(l)}
                    className="btn-outline"
                    style={{ padding: "5px 12px", fontSize: 12 }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}

            {!filteredLeaves.length && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
                  No leave requests found in this filter category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Leave Details Modal */}
      {selectedLeave && (
        <div className="saas-modal-backdrop" onClick={() => setSelectedLeave(null)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Leave Request Details</h3>
              <button
                onClick={() => setSelectedLeave(null)}
                style={{ background: "none", border: "none", fontSize: 18, color: "var(--text-secondary)" }}
              >
                ✕
              </button>
            </div>
            <div className="saas-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Date Period
                </span>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginTop: 2 }}>
                  {formatShortDate(selectedLeave.start_date)} — {formatShortDate(selectedLeave.end_date)}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                    Leave Type
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 600, textTransform: "capitalize", marginTop: 2 }}>
                    {selectedLeave.leave_type} Leave
                  </p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                    Duration
                  </span>
                  <p style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    {selectedLeave.days} working {selectedLeave.days === 1 ? "day" : "days"}
                  </p>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 11, color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: 700 }}>
                  Current Status
                </span>
                <div style={{ marginTop: 4 }}>
                  <span className={`saas-badge badge-${selectedLeave.status}`}>
                    {selectedLeave.status}
                  </span>
                </div>
              </div>

              <div style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color)", fontSize: 12, color: "var(--text-secondary)" }}>
                Reviewed by your direct manager. Days are reserved upon submission and deducted on approval.
              </div>
            </div>
            <div className="saas-modal-footer">
              <Button variant="outline" onClick={() => setSelectedLeave(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
