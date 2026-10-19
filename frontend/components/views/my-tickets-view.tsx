"use client";
import React, { useState } from "react";
import {
  Inbox,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Send,
  MessageSquare,
  ArrowLeft,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TicketItem {
  id: string;
  question: string;
  status: string;
  reason?: string;
  priority?: string;
  category?: string;
  created_at: string;
  description?: string;
}

interface MyTicketsViewProps {
  tickets: any[];
  employeeName?: string;
  onRaiseTicketPrompt: (subject: string) => void;
}

export function MyTicketsView({
  tickets,
  employeeName = "Ayush Nagar",
  onRaiseTicketPrompt,
}: MyTicketsViewProps) {
  const [activeTab, setActiveTab] = useState<"all" | "open" | "in_progress" | "resolved">("all");
  const [selectedTicket, setSelectedTicket] = useState<TicketItem | null>(null);
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("IT Support");
  const [newDesc, setNewDesc] = useState("");
  const [commentText, setCommentText] = useState("");

  // Seed default demonstration tickets if user has 0 tickets from database
  const demoTickets: TicketItem[] = [
    {
      id: "1185-lap",
      question: "Laptop not working",
      status: "open",
      priority: "Medium",
      category: "IT Support",
      created_at: "2026-04-28T10:14:00Z",
      description: "My laptop is not turning on. I have tried charging it for 2 hours with the official charger but the screen remains blank.",
    },
    {
      id: "1172-acc",
      question: "Access request to internal tool",
      status: "in_progress",
      priority: "Medium",
      category: "Access & IAM",
      created_at: "2026-04-18T14:30:00Z",
      description: "Need read access to the internal production observability dashboard for engineering on-call rotation.",
    },
    {
      id: "1156-pay",
      question: "Payroll clarification on tax deductions",
      status: "resolved",
      priority: "Low",
      category: "Payroll",
      created_at: "2026-03-28T09:20:00Z",
      description: "Question regarding Section 80C investment proof verification in the March pay slip.",
    },
    {
      id: "1140-off",
      question: "Office seat change request",
      status: "resolved",
      priority: "Low",
      category: "Workplace",
      created_at: "2026-03-11T16:00:00Z",
      description: "Requesting desk relocation to the 4th floor engineering bay closer to the platform infrastructure team.",
    },
  ];

  // Merge real DB tickets with demo tickets
  const displayTickets: TicketItem[] = [
    ...tickets.map((t) => ({
      id: t.id,
      question: t.question,
      status: t.status,
      reason: t.reason,
      priority: "Medium",
      category: "People Operations",
      created_at: t.created_at,
      description: t.question,
    })),
    ...demoTickets,
  ];

  const filteredTickets = displayTickets.filter((t) => {
    if (activeTab === "all") return true;
    if (activeTab === "open") return t.status === "open";
    if (activeTab === "in_progress") return t.status === "in_progress";
    if (activeTab === "resolved") return t.status === "resolved";
    return true;
  });

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSubject.trim()) {
      onRaiseTicketPrompt(`I need human assistance: ${newSubject.trim()} - ${newDesc.trim()}`);
      setNewTicketOpen(false);
      setNewSubject("");
      setNewDesc("");
    }
  };

  const getPriorityBadge = (p: string = "Medium") => {
    const pl = p.toLowerCase();
    if (pl === "high") return <span className="saas-badge badge-danger">High</span>;
    if (pl === "medium") return <span className="saas-badge badge-warning">Medium</span>;
    return <span className="saas-badge badge-neutral">Low</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header and top action bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
            <Inbox size={22} color="var(--primary)" />
            My Tickets
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Track IT support, payroll queries, and HR escalations with resolution timelines.
          </p>
        </div>

        <Button
          onClick={() => setNewTicketOpen(true)}
          style={{ background: "var(--primary)", color: "#FFFFFF", fontWeight: 650, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={16} /> New Ticket
        </Button>
      </div>

      {/* Tabs Filter Bar */}
      <div className="saas-tabs-bar" style={{ margin: 0 }}>
        <div className="saas-tabs-group">
          <button
            className={`saas-tab-btn ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Tickets ({displayTickets.length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "open" ? "active" : ""}`}
            onClick={() => setActiveTab("open")}
          >
            Open ({displayTickets.filter((t) => t.status === "open").length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "in_progress" ? "active" : ""}`}
            onClick={() => setActiveTab("in_progress")}
          >
            In Progress ({displayTickets.filter((t) => t.status === "in_progress").length})
          </button>
          <button
            className={`saas-tab-btn ${activeTab === "resolved" ? "active" : ""}`}
            onClick={() => setActiveTab("resolved")}
          >
            Resolved ({displayTickets.filter((t) => t.status === "resolved").length})
          </button>
        </div>
      </div>

      {/* Tickets List Table */}
      <div className="saas-table-wrapper">
        <table className="saas-table">
          <thead>
            <tr>
              <th>Ticket ID &amp; Subject</th>
              <th>Category</th>
              <th>Date Created</th>
              <th>Priority</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map((t) => (
              <tr key={t.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: t.status === "open" ? "var(--primary-subtle)" : t.status === "in_progress" ? "var(--warning-bg)" : "var(--success-bg)",
                        color: t.status === "open" ? "var(--primary)" : t.status === "in_progress" ? "var(--warning)" : "var(--success)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <Inbox size={16} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", display: "block" }}>
                        #TKT-{t.id.slice(0, 4)}
                      </span>
                      <strong style={{ fontSize: 13, color: "var(--text-main)" }}>{t.question}</strong>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.category || "Operations"}</span>
                </td>
                <td>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    {new Date(t.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </td>
                <td>
                  {getPriorityBadge(t.priority)}
                </td>
                <td>
                  <span className={`saas-badge badge-${t.status}`}>
                    {t.status.replace("_", " ")}
                  </span>
                </td>
                <td style={{ textAlign: "right" }}>
                  <button
                    onClick={() => setSelectedTicket(t)}
                    className="btn-outline"
                    style={{ padding: "5px 12px", fontSize: 12 }}
                  >
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Screen 9: Ticket Details Modal / Drawer */}
      {selectedTicket && (
        <div className="saas-modal-backdrop" onClick={() => setSelectedTicket(null)}>
          <div className="saas-modal-card" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <h3 style={{ fontSize: 16, fontWeight: 750 }}>
                  Ticket #TKT-{selectedTicket.id.slice(0, 4)}
                </h3>
                <span className={`saas-badge badge-${selectedTicket.status}`}>
                  {selectedTicket.status.replace("_", " ")}
                </span>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                style={{ background: "none", border: "none", fontSize: 18, color: "var(--text-secondary)" }}
              >
                ✕
              </button>
            </div>

            <div className="saas-modal-body" style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
              {/* Left Column: Details */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <h4 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-main)", marginBottom: 4 }}>
                    {selectedTicket.question}
                  </h4>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                    Created by {employeeName} on {new Date(selectedTicket.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--bg-main)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color)" }}>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>CATEGORY</span>
                    <strong style={{ fontSize: 13, display: "block", marginTop: 2 }}>{selectedTicket.category || "IT Support"}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>PRIORITY</span>
                    <div style={{ marginTop: 2 }}>{getPriorityBadge(selectedTicket.priority)}</div>
                  </div>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>DESCRIPTION</span>
                  <p style={{ fontSize: 13, color: "var(--text-main)", marginTop: 6, lineHeight: 1.6, background: "#F8FAFC", padding: 12, borderRadius: 8 }}>
                    {selectedTicket.description || selectedTicket.question}
                  </p>
                </div>

                <div>
                  <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>ATTACHMENTS</span>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: "#FFFFFF", border: "1px solid var(--border-color)", borderRadius: 6, fontSize: 11, color: "var(--primary)" }}>
                      <Paperclip size={12} />
                      <span>screenshot_diag.png</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Activity Timeline */}
              <div style={{ borderLeft: "1px solid var(--border-color)", paddingLeft: 20, display: "flex", flexDirection: "column", gap: 16 }}>
                <h4 style={{ fontSize: 13, fontWeight: 750, color: "var(--text-main)" }}>Activity Timeline</h4>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--primary)", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <strong>Ticket created</strong>
                      <span style={{ display: "block", fontSize: 10, color: "var(--text-secondary)" }}>10:14 AM · By Ari Sen</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--warning)", marginTop: 5, flexShrink: 0 }} />
                    <div>
                      <strong>Assigned to specialist</strong>
                      <span style={{ display: "block", fontSize: 10, color: "var(--text-secondary)" }}>11:30 AM · Triage queue</span>
                    </div>
                  </div>

                  {selectedTicket.status === "resolved" && (
                    <div style={{ display: "flex", gap: 10, fontSize: 12 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <strong>Resolved</strong>
                        <span style={{ display: "block", fontSize: 10, color: "var(--text-secondary)" }}>Action verified</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-color)" }}>
                  <textarea
                    rows={2}
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    style={{ width: "100%", fontSize: 12, padding: 8, borderRadius: 6, border: "1px solid var(--border-color)", resize: "none" }}
                  />
                  <Button
                    size="sm"
                    disabled={!commentText.trim()}
                    onClick={() => setCommentText("")}
                    style={{ marginTop: 6, width: "100%", fontSize: 11, background: "var(--primary)", color: "#FFF" }}
                  >
                    Add comment
                  </Button>
                </div>
              </div>
            </div>

            <div className="saas-modal-footer">
              <Button variant="outline" onClick={() => setSelectedTicket(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Ticket Modal */}
      {newTicketOpen && (
        <div className="saas-modal-backdrop" onClick={() => setNewTicketOpen(false)}>
          <div className="saas-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="saas-modal-header">
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>Raise a New Support Ticket</h3>
              <button onClick={() => setNewTicketOpen(false)} style={{ background: "none", border: "none" }}>✕</button>
            </div>
            <form onSubmit={handleCreateTicket}>
              <div className="saas-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div className="saas-form-group" style={{ margin: 0 }}>
                  <label>Subject</label>
                  <input
                    type="text"
                    required
                    className="saas-input"
                    placeholder="e.g. Broken monitor, broadband reimbursement question"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                  />
                </div>

                <div className="saas-form-group" style={{ margin: 0 }}>
                  <label>Category</label>
                  <select className="saas-select" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="IT Support">IT Support &amp; Hardware</option>
                    <option value="Access & IAM">Access &amp; Permissions</option>
                    <option value="Payroll">Payroll &amp; Tax Deductions</option>
                    <option value="People Operations">People Operations &amp; HR</option>
                  </select>
                </div>

                <div className="saas-form-group" style={{ margin: 0 }}>
                  <label>Description</label>
                  <textarea
                    rows={4}
                    required
                    className="saas-textarea"
                    placeholder="Provide details about your request..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                  />
                </div>
              </div>
              <div className="saas-modal-footer">
                <Button type="button" variant="outline" onClick={() => setNewTicketOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" style={{ background: "var(--primary)", color: "#FFF" }}>
                  Create Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
