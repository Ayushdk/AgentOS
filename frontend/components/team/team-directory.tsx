"use client";
import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Calendar,
  Building2,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  UserCheck,
  Eye,
  Mail,
  User,
  X,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api, type TeamMember, type Identity } from "@/lib/api";

interface TeamDirectoryProps {
  person: Identity;
  onSendPrompt?: (text: string) => void;
}
export function TeamDirectory({ person, onSendPrompt }: TeamDirectoryProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);

  const loadTeam = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<TeamMember[]>("/manager/team");
      setMembers(data);
    } catch (e) {
      setError((e as Error).message || "Failed to load direct reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const filteredMembers = members.filter((m) => {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    return (
      m.name.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q) ||
      m.role.toLowerCase().includes(q) ||
      m.department.toLowerCase().includes(q)
    );
  });

  const activeCount = members.filter((m) => m.status === "Active").length;
  const exitedCount = members.filter((m) => m.status === "Exited").length;
  const departments = [...new Set(members.map((m) => m.department).filter(Boolean))];

  return (
    <div className="team-directory-container" style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
      {/* Header */}
      <div className="team-header-bar" style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div
            className="team-badge"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--primary)",
              background: "var(--primary-subtle)",
              border: "1px solid var(--primary-border)",
              padding: "4px 10px",
              borderRadius: 20,
              marginBottom: 8,
            }}
          >
            <Users size={16} />
            <span>Direct Reports Directory</span>
          </div>
          <h1 className="team-heading" style={{ fontSize: 24, fontWeight: 700, color: "var(--text-main)", letterSpacing: "-0.02em", marginBottom: 4 }}>
            Direct Reports
          </h1>
          <p className="team-subtext" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Official reporting line for Manager {person.name}. Live authorized employee records.
          </p>
        </div>

        <div
          className="team-search-box"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "#FFFFFF",
            border: "1px solid var(--border-color)",
            borderRadius: 10,
            padding: "8px 14px",
            minWidth: 280,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Search size={16} style={{ color: "var(--text-secondary)" }} />
          <input
            type="text"
            placeholder="Search by name, ID, or title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="team-search-input"
            aria-label="Search direct reports"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              width: "100%",
              fontSize: 13,
              color: "var(--text-main)",
            }}
          />
        </div>
      </div>

      {error && (
        <div className="banner error mb-4" role="alert" style={{ background: "var(--danger-bg)", color: "var(--danger)", border: "1px solid var(--danger-border)", padding: "12px 16px", borderRadius: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadTeam}>
            <RefreshCw size={14} style={{ marginRight: 4 }} /> Retry
          </Button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-trio-grid mb-6" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <div className="stat-card" style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="stat-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="stat-label" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Total Assigned</span>
            <div className="stat-icon-wrapper icon-blue" style={{ width: 36, height: 36, borderRadius: 10, background: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center" }}>
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value-group" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="stat-number" style={{ fontSize: 28, fontWeight: 750, color: "var(--text-main)", lineHeight: 1 }}>{members.length}</span>
            <span className="stat-subtext" style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>employee records</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-blue-subtle" style={{ background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
              {departments.length ? departments.join(", ") : "No departments loaded"}
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="stat-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="stat-label" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Active Headcount</span>
            <div className="stat-icon-wrapper icon-emerald" style={{ width: 36, height: 36, borderRadius: 10, background: "#ECFDF5", color: "#059669", display: "grid", placeItems: "center" }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-value-group" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="stat-number" style={{ fontSize: 28, fontWeight: 750, color: "var(--text-main)", lineHeight: 1 }}>{activeCount}</span>
            <span className="stat-subtext" style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>active employees</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-success" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <CheckCircle2 size={12} /> On active duty
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 14, padding: 20, boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="stat-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="stat-label" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Historic Departures</span>
            <div className="stat-icon-wrapper icon-slate" style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", color: "#64748B", display: "grid", placeItems: "center" }}>
              <XCircle size={18} />
            </div>
          </div>
          <div className="stat-value-group" style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span className="stat-number" style={{ fontSize: 28, fontWeight: 750, color: "var(--text-main)", lineHeight: 1 }}>{exitedCount}</span>
            <span className="stat-subtext" style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>exited record</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-neutral" style={{ background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6 }}>
              Managed transition
            </span>
          </div>
        </div>
      </div>

      {/* Team Roster Table */}
      <div className="content-card" style={{ background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 14, padding: 24, boxShadow: "var(--shadow-sm)" }}>
        <div className="card-header-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 className="card-title" style={{ fontSize: 17, fontWeight: 700, color: "var(--text-main)" }}>Team Roster</h2>
            <p className="card-subtitle" style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>
              Detailed employment and reporting records for your team.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadTeam} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-secondary)" }}>
            <RefreshCw size={24} className="spin" style={{ display: "inline-block", marginBottom: 8 }} />
            <p>Loading direct reports...</p>
          </div>
        ) : (
          <div className="table-responsive" style={{ width: "100%", overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: 13, textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Employee</th>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>ID</th>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Department</th>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Role</th>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Joined Date</th>
                  <th style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Status</th>
                  {onSendPrompt && <th className="text-right" style={{ background: "#F8FAFC", color: "var(--text-secondary)", fontSize: 12, fontWeight: 650, textTransform: "uppercase", letterSpacing: "0.04em", padding: "12px 16px", borderTop: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)", textAlign: "right", whiteSpace: "nowrap" }}>Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((m) => (
                    <tr key={m.id} style={{ transition: "background 0.15s" }}>
                      <td className="font-medium text-navy" style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            className="avatar avatar-purple small-avatar"
                            style={{
                              width: 34,
                              height: 34,
                              borderRadius: "50%",
                              background: "#EEF2FF",
                              color: "#4F46E5",
                              border: "1px solid #C7D2FE",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: 12,
                              flexShrink: 0,
                            }}
                          >
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <span style={{ fontWeight: 600, color: "var(--text-main)", display: "block" }}>{m.name}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span className="badge badge-neutral" style={{ background: "#F1F5F9", color: "#475569", border: "1px solid #E2E8F0", padding: "2px 7px", borderRadius: 6, fontFamily: "monospace", fontSize: 11 }}>
                          {m.id}
                        </span>
                      </td>
                      <td className="text-muted" style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", color: "var(--text-secondary)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {m.department}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span className="leave-type-pill capitalize" style={{ display: "inline-block", background: "#EFF6FF", color: "#2563EB", border: "1px solid #BFDBFE", fontSize: 12, fontWeight: 500, padding: "3px 8px", borderRadius: 6, textTransform: "capitalize" }}>
                          {m.role}
                        </span>
                      </td>
                      <td className="text-muted" style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", color: "var(--text-secondary)", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {m.joined_on}
                      </td>
                      <td style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        {m.status === "Active" ? (
                          <span className="badge badge-success" style={{ background: "#ECFDF5", color: "#059669", border: "1px solid #A7F3D0", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA", display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                            <XCircle size={12} /> Exited ({m.exited_on})
                          </span>
                        )}
                      </td>
                      {onSendPrompt && (
                        <td className="text-right" style={{ padding: "14px 16px", borderBottom: "1px solid #F1F5F9", textAlign: "right", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => {
                              setSelectedMember(m);
                              onSendPrompt(`Check leave balance and history for ${m.name} (${m.id})`);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 4,
                              background: "#EFF6FF",
                              color: "#2563EB",
                              border: "1px solid #BFDBFE",
                              padding: "6px 14px",
                              borderRadius: 8,
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            Review Record
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted" style={{ padding: 48, textAlign: "center", color: "var(--text-secondary)" }}>
                      No matching direct reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Inspection Modal */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={(open) => !open && setSelectedMember(null)}>
          <DialogContent title="Direct Report Profile">
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px", background: "#F8FAFC", borderRadius: 10, border: "1px solid var(--border-color)" }}>
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "50%",
                    background: "#EEF2FF",
                    color: "#4F46E5",
                    border: "1px solid #C7D2FE",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: 16,
                  }}
                >
                  {selectedMember.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main)" }}>{selectedMember.name}</h3>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)", textTransform: "capitalize" }}>
                    {selectedMember.role} · {selectedMember.department}
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ padding: 12, background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Employee ID</span>
                  <strong style={{ fontSize: 13, color: "var(--text-main)", fontFamily: "monospace" }}>{selectedMember.id}</strong>
                </div>

                <div style={{ padding: 12, background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Employment Status</span>
                  <strong style={{ fontSize: 13, color: selectedMember.status === "Active" ? "var(--success)" : "var(--danger)" }}>
                    {selectedMember.status}
                  </strong>
                </div>

                <div style={{ padding: 12, background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Joined Date</span>
                  <strong style={{ fontSize: 13, color: "var(--text-main)" }}>{selectedMember.joined_on}</strong>
                </div>

                <div style={{ padding: 12, background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 8 }}>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block" }}>Reporting Manager</span>
                  <strong style={{ fontSize: 13, color: "var(--text-main)" }}>{person.name}</strong>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <Button variant="outline" size="sm" onClick={() => setSelectedMember(null)}>
                  Close
                </Button>
                {onSendPrompt && (
                  <Button
                    size="sm"
                    style={{ background: "var(--primary)", color: "#FFFFFF" }}
                    onClick={() => {
                      onSendPrompt(`Check leave balance and history for ${selectedMember.name} (${selectedMember.id})`);
                      setSelectedMember(null);
                    }}
                  >
                    <MessageSquare size={14} style={{ marginRight: 6 }} />
                    Query Leave Balance in Assistant
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
