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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="team-directory-container">
      {/* Header */}
      <div className="team-header-bar">
        <div>
          <div className="team-badge">
            <Users size={16} />
            <span>Direct Reports Directory</span>
          </div>
          <h1 className="team-heading">Engineering Team Roster</h1>
          <p className="team-subtext">
            Official reporting line for Manager {person.name}. Live authorized employee records.
          </p>
        </div>

        <div className="team-search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search by name, ID, or title..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="team-search-input"
            aria-label="Search direct reports"
          />
        </div>
      </div>

      {error && (
        <div className="banner error mb-4" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadTeam}>
            <RefreshCw size={14} className="mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-trio-grid mb-6">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Assigned</span>
            <div className="stat-icon-wrapper icon-blue">
              <Users size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{members.length}</span>
            <span className="stat-subtext">employee records</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-blue-subtle">Engineering division</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Active Headcount</span>
            <div className="stat-icon-wrapper icon-emerald">
              <UserCheck size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{activeCount}</span>
            <span className="stat-subtext">active engineers</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-success">On active duty</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-label">Historic Departures</span>
            <div className="stat-icon-wrapper icon-slate">
              <XCircle size={18} />
            </div>
          </div>
          <div className="stat-value-group">
            <span className="stat-number">{exitedCount}</span>
            <span className="stat-subtext">exited record</span>
          </div>
          <div className="stat-tag-row">
            <span className="badge badge-neutral">Managed transition</span>
          </div>
        </div>
      </div>

      {/* Team Roster Table */}
      <div className="content-card">
        <div className="card-header-row">
          <div>
            <h2 className="card-title">Team Roster</h2>
            <p className="card-subtitle">
              Detailed employment and reporting records for your team.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadTeam}>
            <RefreshCw size={14} className="mr-1" /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted">
            <RefreshCw size={24} className="spin inline mb-2" />
            <p>Loading direct reports...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th>Status</th>
                  {onSendPrompt && <th className="text-right">Action</th>}
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length > 0 ? (
                  filteredMembers.map((m) => (
                    <tr key={m.id}>
                      <td className="font-medium text-navy">
                        <div className="flex items-center gap-2">
                          <div className="avatar avatar-purple small-avatar">
                            {m.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <span>{m.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{m.id}</span>
                      </td>
                      <td className="text-muted">{m.department}</td>
                      <td>
                        <span className="leave-type-pill capitalize">{m.role}</span>
                      </td>
                      <td className="text-muted">{m.joined_on}</td>
                      <td>
                        {m.status === "Active" ? (
                          <span className="badge badge-success">
                            <CheckCircle2 size={12} /> Active
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <XCircle size={12} /> Exited ({m.exited_on})
                          </span>
                        )}
                      </td>
                      {onSendPrompt && (
                        <td className="text-right">
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => onSendPrompt(`Check leave balance and history for ${m.name} (${m.id})`)}
                          >
                            Review Record
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      No matching direct reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
