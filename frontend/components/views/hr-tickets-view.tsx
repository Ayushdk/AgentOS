"use client";
import React, { useState } from "react";
import {
  Inbox,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface HRTicketsViewProps {
  tickets: any[];
  onResolveTicket: (id: string) => Promise<void>;
  busy: boolean;
}

export function HRTicketsView({
  tickets,
  onResolveTicket,
  busy,
}: HRTicketsViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [search, setSearch] = useState("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const filteredTickets = tickets.filter((t) => {
    if (activeTab === "open" && t.status !== "open") return false;
    if (activeTab === "in_progress" && t.status !== "in_progress") return false;
    if (activeTab === "resolved" && t.status !== "resolved") return false;
    if (search.trim()) {
      return (
        t.question.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolveTicket(id);
    } finally {
      setResolvingId(null);
    }
  };

  const getPriorityBadge = (reason: string = "") => {
    if (reason.includes("urgent") || reason.includes("conflict")) {
      return <span className="saas-badge badge-danger">High</span>;
    }
    if (reason.includes("broadband") || reason.includes("reimburse")) {
      return <span className="saas-badge badge-warning">Medium</span>;
    }
    return <span className="saas-badge badge-neutral">Normal</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
          <Inbox size={22} color="var(--primary)" />
          HR Tickets (All)
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
          Triage employee escalations, policy ambiguities, and human-in-the-loop compliance reviews.
        </p>
      </div>

      {/* Tabs and Search Bar */}
      <div className="saas-tabs-bar" style={{ margin: 0 }}>
        <div className="saas-tabs-group">
          <button
            className={`saas-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "open" ? "active" : ""}`}
            onClick={() => setActiveTab("open")}
          >
            Open ({tickets.filter((t) => t.status === "open").length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "in_progress" ? "active" : ""}`}
            onClick={() => setActiveTab("in_progress")}
          >
            In Progress ({tickets.filter((t) => t.status === "in_progress").length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "resolved" ? "active" : ""}`}
            onClick={() => setActiveTab("resolved")}
          >
            Resolved ({tickets.filter((t) => t.status === "resolved").length})
          </button>
        </div>

        <div style={{ width: 280 }}>
          <input
            type="text"
            className="saas-input"
            placeholder="Search tickets by subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: "100%", padding: "7px 12px", fontSize: 12 }}
          />
        </div>
      </div>

      {/* Tickets Table (Also includes .ticket class for Playwright test compatibility) */}
      <div className="saas-table-wrapper">
        <table className="saas-table">
          <thead>
            <tr>
              <th>ID &amp; Subject</th>
              <th>Employee</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Created Date</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id} className="ticket">
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)" }}>
                      #{t.id.slice(0, 4)}
                    </span>
                    <strong style={{ fontSize: 13, color: "var(--text-main)" }}>
                      {t.question}
                    </strong>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginTop: 2 }}>
                    Reason: {t.reason ? t.reason.replace("_", " ") : "Policy clarification"}
                  </span>
                </td>
                <td>
                  <span>Ari Sen (E001)</span>
                </td>
                <td>
                  {getPriorityBadge(t.reason)}
                </td>
                <td>
                  <span className={`saas-badge badge-${t.status}`}>
                    {t.status}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  {t.status === "open" ? (
                    <Button
                      size="sm"
                      disabled={busy || resolvingId === t.id}
                      onClick={() => handleResolve(t.id)}
                      style={{ background: "var(--success)", color: "#FFFFFF", fontSize: 12, fontWeight: 600 }}
                    >
                      <Check size={13} style={{ marginRight: 4 }} /> Resolve
                    </Button>
                  ) : (
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Resolved</span>
                  )}
                </td>
              </tr>
            ))}

            {!filteredTickets.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-secondary)" }}>
                  No HR tickets found matching this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
