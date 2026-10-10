"use client";
import React, { useState, useEffect } from "react";
import {
  BookOpen,
  Search,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  ExternalLink,
  Send,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  RefreshCw,
  FolderGit2,
  ArrowRight,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  api,
  type PolicySummary,
  type PolicyDetail,
  type Identity,
  type Run,
  type Citation,
} from "@/lib/api";

interface PolicyExplorerProps {
  person: Identity;
  onAskQuestion: (question: string) => void;
  busy: boolean;
}

export function PolicyExplorer({ person, onAskQuestion, busy }: PolicyExplorerProps) {
  const [policies, setPolicies] = useState<PolicySummary[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>("LEAVE-2");
  const [selectedDetail, setSelectedDetail] = useState<PolicyDetail | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [questionText, setQuestionText] = useState("");

  // Load policy list
  const loadPolicies = async () => {
    setLoadingList(true);
    setError("");
    try {
      const list = await api<PolicySummary[]>("/policies");
      setPolicies(list);
      if (list.length > 0 && !list.some((p) => p.id === selectedPolicyId)) {
        setSelectedPolicyId(list[0].id);
      }
    } catch (e) {
      setError((e as Error).message || "Failed to load policies repository.");
    } finally {
      setLoadingList(false);
    }
  };

  // Load single policy document detail
  const loadPolicyDetail = async (id: string) => {
    setLoadingDetail(true);
    setError("");
    try {
      const detail = await api<PolicyDetail>(`/policies/${encodeURIComponent(id)}`);
      setSelectedDetail(detail);
    } catch (e) {
      setError((e as Error).message || "Failed to load policy document details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    if (selectedPolicyId) {
      loadPolicyDetail(selectedPolicyId);
    }
  }, [selectedPolicyId]);

  // Search filter
  const filteredPolicies = policies.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      p.id.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.audience.toLowerCase().includes(q)
    );
  });

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) return;

    // Send question to chat
    onAskQuestion(questionText.trim());
    setQuestionText("");
  };

  const handleQuickQuestion = (prompt: string) => {
    onAskQuestion(prompt);
  };

  const getPolicyTag = (id: string) => {
    if (id.startsWith("LEAVE")) return "Time & Leave";
    if (id.startsWith("REMOTE")) return "Workplace";
    if (id.startsWith("REIMBURSE") || id.startsWith("TRAVEL") || id.startsWith("EXPENSE")) return "Finance";
    if (id.startsWith("ONBOARD")) return "People & Talent";
    return "Operations";
  };

  return (
    <div className="policy-explorer-container">
      {/* 1. Header Bar */}
      <div className="policy-header-bar">
        <div>
          <div className="policy-badge">
            <BookOpen size={16} />
            <span>Policy & Guidelines Explorer</span>
          </div>
          <h1 className="policy-heading">Meridian Policy Repository</h1>
          <p className="policy-subtext">
            Official company governance documents, benefit rules, and compliance standards. Grounded in live company records.
          </p>
        </div>

        {/* Search input */}
        <div className="policy-search-box">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            placeholder="Search policies by title or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="policy-search-input"
            aria-label="Search policies"
          />
          {searchQuery && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearchQuery("")}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="banner error mb-4" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => loadPolicyDetail(selectedPolicyId)}>
            <RefreshCw size={14} className="mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* 2. Split Workspace Layout: Document Browser on Left, Content & Grounded Q&A on Right */}
      <div className="policy-workspace-grid">
        {/* Left Column: Policy List */}
        <div className="policy-list-card">
          <div className="policy-list-header">
            <h2 className="policy-list-title">All Policies ({filteredPolicies.length})</h2>
            <span className="badge badge-neutral">Role: {person.role}</span>
          </div>

          {loadingList ? (
            <div className="policy-list-loading">
              <RefreshCw size={16} className="spin text-muted" />
              <span>Loading policy catalog...</span>
            </div>
          ) : filteredPolicies.length > 0 ? (
            <div className="policy-items-scroll">
              {filteredPolicies.map((p) => {
                const isSelected = p.id === selectedPolicyId;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={`policy-nav-item ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedPolicyId(p.id)}
                  >
                    <div className="policy-item-top">
                      <span className="policy-code-pill">{p.id}</span>
                      <span className="policy-category-tag">{getPolicyTag(p.id)}</span>
                    </div>
                    <strong className="policy-item-title">{p.title}</strong>
                    <div className="policy-item-meta">
                      <span>v{p.version}</span>
                      <span>·</span>
                      <span>{p.sections_count} sections</span>
                      <span>·</span>
                      <span>Effective {p.effective_date}</span>
                    </div>
                    <ChevronRight size={14} className="item-arrow" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="policy-empty-search">
              <HelpCircle size={24} className="text-muted mb-2" />
              <p className="font-medium text-slate-700">No matching policies found</p>
              <p className="text-sm text-muted">Try a different keyword or clear your search.</p>
            </div>
          )}

          <div className="policy-trust-box">
            <ShieldCheck size={16} className="text-emerald inline mr-1" />
            <span className="text-xs text-muted">
              Only authorized and non-expired policies for {person.role} are shown.
            </span>
          </div>
        </div>

        {/* Right Column: Full Document Reader & Embedded Grounded Q&A */}
        <div className="policy-reader-card">
          {loadingDetail ? (
            <div className="reader-loading-state">
              <RefreshCw size={24} className="spin text-blue mb-2" />
              <p>Fetching official document text...</p>
            </div>
          ) : selectedDetail ? (
            <div className="document-view-container">
              {/* Document Header */}
              <div className="document-header">
                <div className="document-header-meta">
                  <span className="document-id-chip">{selectedDetail.id}</span>
                  <span className="document-version">Version {selectedDetail.version}</span>
                  <span className="document-effective">
                    Effective: {selectedDetail.effective_date}
                  </span>
                  <span className="document-audience">
                    Audience: {selectedDetail.audience}
                  </span>
                </div>
                <h2 className="document-main-title">{selectedDetail.title}</h2>
                <p className="document-subtitle">
                  Official Meridian Ledger internal policy guideline. Grounded in enterprise database.
                </p>
              </div>

              {/* Document Sections */}
              <div className="document-sections-list">
                {selectedDetail.sections.map((section, sIdx) => (
                  <section key={section.id} className="policy-section-box">
                    <div className="section-head-row">
                      <span className="section-index">§{sIdx + 1}</span>
                      <h3 className="section-title">{section.heading}</h3>
                      <span className="section-id-label">[{section.section_id}]</span>
                    </div>
                    <p className="section-body-text">{section.text}</p>
                    {section.claim_key && (
                      <div className="section-claim-meta">
                        <CheckCircle2 size={13} className="text-emerald mr-1 inline" />
                        <span>
                          Structured claim rule: <code>{section.claim_key} = {section.claim_value}</code>
                        </span>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              {/* Grounded AI Policy Assistant Box */}
              <div className="policy-assistant-embed">
                <div className="assistant-embed-header">
                  <div className="embed-icon-tile">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <h3 className="embed-title">Ask AI About This Policy</h3>
                    <p className="embed-desc">
                      Get verified answers grounded in {selectedDetail.id} with verifiable citations.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAskSubmit} className="embed-composer">
                  <input
                    type="text"
                    className="embed-input"
                    placeholder={`Ask about ${selectedDetail.title} (e.g. entitlements, criteria, limits)...`}
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    disabled={busy}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="embed-submit-btn"
                    disabled={busy || !questionText.trim()}
                  >
                    <Send size={14} className="mr-1" />
                    Ask Assistant
                  </Button>
                </form>

                {/* Quick Prompts for Current Policy */}
                <div className="embed-suggestions">
                  <span className="suggestions-label">Suggested questions:</span>
                  {selectedDetail.id === "LEAVE-2" && (
                    <>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("How many annual leave days do I get under LEAVE-2?")}
                      >
                        Annual leave days
                      </button>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("Are weekends and holidays excluded from leave?")}
                      >
                        Working days rule
                      </button>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("How long does a leave draft remain valid?")}
                      >
                        Draft expiration
                      </button>
                    </>
                  )}
                  {selectedDetail.id === "REMOTE-1" && (
                    <>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("How many remote days are permitted per week under REMOTE-1?")}
                      >
                        Weekly remote limit
                      </button>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("Does remote work require manager approval?")}
                      >
                        Manager approval requirement
                      </button>
                    </>
                  )}
                  {selectedDetail.id === "REIMBURSE-1" && (
                    <>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("What business expenses are eligible for reimbursement?")}
                      >
                        Eligible expenses
                      </button>
                      <button
                        type="button"
                        className="suggestion-chip"
                        onClick={() => handleQuickQuestion("Can I claim home broadband reimbursement?")}
                      >
                        Broadband reimbursement
                      </button>
                    </>
                  )}
                  {selectedDetail.id !== "LEAVE-2" && selectedDetail.id !== "REMOTE-1" && selectedDetail.id !== "REIMBURSE-1" && (
                    <button
                      type="button"
                      className="suggestion-chip"
                      onClick={() => handleQuickQuestion(`Summarize key rules in policy ${selectedDetail.id}`)}
                    >
                      Summarize key rules
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="reader-empty-state">
              <FileText size={32} className="text-muted mb-2" />
              <p className="font-medium text-slate-700">Select a policy to view</p>
              <p className="text-sm text-muted">Choose any policy document from the list on the left to read its terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
