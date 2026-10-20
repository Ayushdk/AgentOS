"use client";
import { useEffect, useState, useRef, type FormEvent } from "react";
import {
  Sparkles,
  MessageSquare,
  CalendarDays,
  Users,
  ChartColumn,
  Inbox,
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Clock,
  ExternalLink,
  X,
  LoaderCircle,
  AlertCircle,
  FileText,
  Home,
  Play,
  PieChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AppShell, type View } from "@/components/layout/app-shell";
import { LoginView } from "@/components/views/login-view";
import { EmployeeHomeView } from "@/components/views/employee-home-view";
import { AskAgentosView } from "@/components/views/ask-agentos-view";
import { SubmitLeaveView } from "@/components/views/submit-leave-view";
import { MyLeaveView } from "@/components/views/my-leave-view";
import { LeaveBalanceView } from "@/components/views/leave-balance-view";
import { MyTicketsView } from "@/components/views/my-tickets-view";
import { CompanyPoliciesView } from "@/components/views/company-policies-view";
import { ManagerHomeView } from "@/components/views/manager-home-view";
import { TeamAnalyticsView } from "@/components/views/team-analytics-view";
import { HRDashboardView } from "@/components/views/hr-dashboard-view";
import { WorkforceAnalyticsView } from "@/components/views/workforce-analytics-view";
import { HRTicketsView } from "@/components/views/hr-tickets-view";
import { CalendarView } from "@/components/calendar/calendar-view";
import { TeamDirectory } from "@/components/team/team-directory";
import {
  api,
  ApiError,
  ensureBackendReady,
  setAuthFailureHandler,
  setBearer,
  setTokenProvider,
  type Identity,
  type Run,
  type Leave,
  type Citation,
  type Report,
  type HRSummary,
  type TeamMember,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

function SourceDialog({
  source,
  onClose,
}: {
  source: Citation | null;
  onClose: () => void;
}) {
  const [verified, setVerified] = useState<Citation | null>(null);
  useEffect(() => {
    if (source) {
      api<Citation>("/citations/" + source.id)
        .then(setVerified)
        .catch(() => setVerified(source));
    } else {
      setVerified(null);
    }
  }, [source]);
  return (
    <Dialog open={!!source} onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Source verification">
        {verified ? (
          <>
            <p className="source-meta" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, marginBottom: 14 }}>
              <strong>{verified.title}</strong> ({verified.document_id || source?.document_id}) · {verified.version} · Effective {verified.effective_date}
            </p>
            <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{verified.heading}</h3>
            <blockquote
              style={{
                borderLeft: "3px solid var(--primary)",
                background: "var(--primary-subtle)",
                padding: "14px 18px",
                margin: "0 0 16px",
                fontSize: 13,
                color: "var(--text-main)",
                lineHeight: 1.7,
                borderRadius: "0 8px 8px 0",
              }}
            >
              {verified.excerpt}
            </blockquote>
            <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
              Section {verified.section_id} · Synthetic company policy
            </p>
          </>
        ) : (
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Verifying source…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("overview");
  const [person, setPerson] = useState<Identity | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [queue, setQueue] = useState<Leave[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [hrSummary, setHrSummary] = useState<HRSummary | null>(null);
  const [queueState, setQueueState] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [replay, setReplay] = useState<any>(null);
  const [replayStep, setReplayStep] = useState(0);

  const dataLoad = useRef<Promise<void> | null>(null);

  const loadData = () => {
    if (dataLoad.current) return dataLoad.current;
    dataLoad.current = (async () => {
      const [h, b, l] = await Promise.all([
        api<Run[]>("/runs"),
        api("/balances"),
        api<Leave[]>("/leave"),
      ]);
      setRuns(h);
      setBalances(b.balances || []);
      setLeaves(l || []);
    })().finally(() => {
      dataLoad.current = null;
    });
    return dataLoad.current;
  };

  const queueLoad = useRef<Promise<any> | null>(null);
  const loadManagerQueue = async () => {
    if (queueLoad.current) return queueLoad.current;
    setQueueState("loading");
    queueLoad.current = (async () => {
      try {
        const [q, t] = await Promise.all([
          api<Leave[]>("/manager/queue"),
          api<TeamMember[]>("/manager/team"),
        ]);
        setQueue(q || []);
        setTeamMembers(t || []);
        setQueueState("loaded");
      } catch (e) {
        setQueueState("error");
        throw e;
      }
    })().finally(() => {
      queueLoad.current = null;
    });
    return queueLoad.current;
  };

  useEffect(() => {
    let mounted = true;
    let unsubscribeAuth = () => {};
    setAuthFailureHandler(() => {
      setPerson(null);
      setError("Your session has expired. Sign in again to continue.");
    });

    (async () => {
      try {
        setConnectionFailed(false);
        const h = await ensureBackendReady(bootstrapAttempt > 0);
        if (!mounted) return;
        setHealth(h);
        let hasSupabaseSession = false;

        if (h.auth_mode === "supabase") {
          const client = supabase();
          setTokenProvider(async (refresh) => {
            const { data, error } = refresh
              ? await client.auth.refreshSession()
              : await client.auth.getSession();
            if (error) return null;
            const token = data.session?.access_token ?? null;
            setBearer(token);
            return token;
          });
          const { data: listener } = client.auth.onAuthStateChange((event, session) => {
            setBearer(session?.access_token ?? null);
            if (event === "SIGNED_OUT") setPerson(null);
          });
          unsubscribeAuth = () => listener.subscription.unsubscribe();
          const { data } = await client.auth.getSession();
          const token = data.session?.access_token ?? null;
          hasSupabaseSession = Boolean(token);
          setBearer(token);
        }

        if (h.auth_mode === "supabase" && !hasSupabaseSession) {
          setPerson(null);
          setError("");
          return;
        }

        try {
          const p = await api<Identity>("/auth/me");
          setPerson(p);
          await loadData();
          if (p.role === "hr") {
            api("/tickets").then(setTickets).catch(() => {});
            api<HRSummary>("/hr/summary").then(setHrSummary).catch(() => {});
            api("/analytics", { report: "headcount", start_date: "2026-01-01", end_date: "2026-12-31" })
              .then(setReport)
              .catch(() => {});
          } else if (p.role === "manager") {
            await loadManagerQueue().catch(() => {});
          }
        } catch (authError) {
          if (h.auth_mode === "development") {
            const p = await api<Identity>("/auth/demo", { persona: "employee" });
            if (mounted) {
              setPerson(p);
              await loadData();
            }
          } else if (mounted) {
            const message =
              authError instanceof ApiError && authError.kind === "auth"
                ? "Your session has expired. Sign in again to continue."
                : (authError as Error).message;
            setError(message);
          }
        }
      } catch (e) {
        if (mounted) {
          setConnectionFailed(true);
          setError("AgentOS could not connect within the recovery window. Retry when you are ready.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    fetch("/replay.json")
      .then((r) => r.json())
      .then(setReplay)
      .catch(() => {});

    return () => {
      mounted = false;
      unsubscribeAuth();
      setTokenProvider(null);
      setAuthFailureHandler(null);
    };
  }, [bootstrapAttempt]);

  useEffect(() => {
    if (!person) return;
    setError("");
    (async () => {
      try {
        if (view === "leave" || view === "balance" || (view === "overview" && person.role === "employee")) {
          await loadData();
        }
        if ((view === "manager" || (view === "overview" && person.role === "manager")) && person.role === "manager") {
          await loadManagerQueue();
        }
        if ((view === "handoff" || (view === "overview" && person.role === "hr")) && person.role === "hr") {
          setTickets(await api("/tickets"));
        }
        if (view === "overview" && person.role === "hr") {
          setHrSummary(await api<HRSummary>("/hr/summary"));
        }
        if (view === "tickets" && person.role !== "hr") {
          setTickets(await api("/tickets/mine"));
        }
        if ((view === "analytics" || (view === "overview" && person.role === "hr")) && person.role === "hr") {
          setReport(
            await api("/analytics", {
              report: "headcount",
              start_date: "2026-01-01",
              end_date: "2026-12-31",
            }),
          );
        }
        if (view === "execution" && person.role === "hr") {
          setEvaluation(await api("/evaluation"));
          setTools((await api("/mcp/tools")).tools || []);
        }
      } catch (e) {
        if (view === "manager") setQueueState("error");
        setError((e as Error).message);
      }
    })();
  }, [view, person]);

  async function switchPersona(role: string) {
    setBusy(true);
    setError("");
    try {
      const p = await api<Identity>(
        health?.auth_mode === "supabase" ? "/auth/demo/persona" : "/auth/demo",
        { persona: role },
      );
      setPerson(p);
      setActive(null);
      setView("overview");
      await loadData();
      if (p.role === "hr") {
        api("/tickets").then(setTickets).catch(() => {});
        api<HRSummary>("/hr/summary").then(setHrSummary).catch(() => {});
        api("/analytics", { report: "headcount", start_date: "2026-01-01", end_date: "2026-12-31" })
          .then(setReport)
          .catch(() => {});
      }
      setNotice("Switched to " + p.name + ". Your visitor workspace stays isolated.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function signIn(email: string, password: string) {
    setBusy(true);
    setError("");
    try {
      if (health?.auth_mode !== "supabase") {
        const persona = email.includes("manager") ? "manager" : email.includes("hr") ? "hr" : "employee";
        await switchPersona(persona);
        return;
      }

      const client = supabase();
      const { data, error: signInError } = await client.auth.signInWithPassword({ email, password });
      if (signInError || !data.session?.access_token) {
        throw new Error(signInError?.message || "Sign in could not be completed.");
      }

      setBearer(data.session.access_token);
      const identity = await api<Identity>("/auth/me");
      setPerson(identity);
      setActive(null);
      setView("overview");
      await loadData();
      if (identity.role === "manager") await loadManagerQueue();
      if (identity.role === "hr") {
        const [nextTickets, nextSummary, nextReport] = await Promise.all([
          api("/tickets"),
          api<HRSummary>("/hr/summary"),
          api("/analytics", { report: "headcount", start_date: "2026-01-01", end_date: "2026-12-31" }),
        ]);
        setTickets(nextTickets);
        setHrSummary(nextSummary);
        setReport(nextReport);
      }
    } catch (signInError) {
      setPerson(null);
      setError((signInError as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendQuestion(textValue: string) {
    if (!textValue.trim() || busy || !person) return;
    setBusy(true);
    setError("");
    setView("assistant");
    try {
      const current = runs.find((r) => r.id === active);
      const result = await api<Run>("/chat", {
        question: textValue,
        request_id: crypto.randomUUID(),
        ...(current ? { parent_run_id: current.id } : {}),
      });
      setActive(result.id);
      await loadData();
    } catch (e) {
      setError((e as Error).message);
      await loadData().catch(() => {});
    } finally {
      setBusy(false);
    }
  }

  async function handleResumeRun(runId: string, approved: boolean) {
    setBusy(true);
    setError("");
    try {
      const result = await api<Run>("/runs/" + runId + "/resume", { approved });
      setActive(result.id);
      await loadData();
      setNotice(approved ? "Your decision has been saved." : "Cancelled. Nothing was submitted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReviewRequest(id: string, decision: "approved" | "rejected") {
    setBusy(true);
    setError("");
    try {
      await api("/manager/requests/" + id + "/review", { decision });
      setQueue(await api("/manager/queue"));
      setNotice("Request " + decision + ".");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateLeaveRequest(leaveType: string, startDate: string, endDate: string, reason: string) {
    const prompt = `Request ${leaveType} leave from ${startDate} to ${endDate} for: ${reason}`;
    await handleSendQuestion(prompt);
  }

  // Locked Role Gate helper component
  const locked = (expected: string) => (
    <div className="saas-card" style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--danger-bg)", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
        <AlertCircle size={24} />
      </div>
      <h3 style={{ fontSize: 20, fontWeight: 750, color: "var(--text-main)", marginBottom: 8 }}>
        {expected} workspace
      </h3>
      <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 420, margin: "0 auto 20px" }}>
        This page is limited to a verified {expected.toLowerCase()} identity.
      </p>
      <Button variant="outline" onClick={() => setView("overview")}>
        Return to My Workspace
      </Button>
    </div>
  );

  // Loading Cold-Start screen
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-main)", padding: 20 }}>
        <div className="saas-card" style={{ maxWidth: 460, textAlign: "center", padding: "40px 32px" }}>
          <LoaderCircle className="spin" size={36} color="var(--primary)" style={{ margin: "0 auto 16px" }} />
          <h2 style={{ fontSize: 20, fontWeight: 750, color: "var(--text-main)", marginBottom: 8 }}>
            Connecting to AgentOS
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            Initializing local PostgreSQL, FastMCP tools gateway, and LangGraph coordinators...
          </p>
        </div>
      </div>
    );
  }

  // Connection failure screen (tested by resilience.spec.ts)
  if (connectionFailed) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--bg-main)", padding: 20 }}>
        <div className="saas-card" style={{ maxWidth: 480, textAlign: "center", padding: "40px 32px" }} role="alert">
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--danger-bg)", color: "var(--danger)", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
            <AlertCircle size={26} />
          </div>
          <span className="saas-badge badge-warning" style={{ marginBottom: 12, display: "inline-block" }}>Connection paused</span>
          <h2 style={{ fontSize: 20, fontWeight: 750, color: "var(--text-main)", marginBottom: 8 }}>
            AgentOS backend is still resuming
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
            No session data was cleared. Retry the same safe readiness check.
          </p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <Button
              onClick={() => {
                setError("");
                setLoading(true);
                setBootstrapAttempt((v) => v + 1);
              }}
              style={{ background: "var(--primary)", color: "#FFFFFF" }}
            >
              Retry connection
            </Button>
            <Button variant="outline" onClick={() => setView("replay")}>
              Open recorded demo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Login view (when not signed in)
  if (!person) {
    return (
      <LoginView
        onLogin={signIn}
        onSelectDemoPersona={switchPersona}
        demoEnabled={Boolean(health?.public_demo)}
        busy={busy}
        error={error}
      />
    );
  }

  return (
    <AppShell
      person={person}
      view={view}
      onNavigate={setView}
      onSwitchPersona={switchPersona}
      onSignOut={() => setPerson(null)}
      pendingApprovalsCount={queue.length}
      openTicketsCount={tickets.filter((t) => t.status === "open").length}
    >
      {/* Notice / Error banners */}
      {error && (
        <div className="banner error" role="alert" style={{ marginBottom: 20 }}>
          <AlertCircle size={16} />
          <span>{error}</span>
          <button onClick={() => setError("")} style={{ background: "none", border: "none", marginLeft: "auto", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {notice && (
        <div className="banner success" role="status" style={{ marginBottom: 20 }}>
          <Check size={16} />
          <span>{notice}</span>
          <button onClick={() => setNotice("")} style={{ background: "none", border: "none", marginLeft: "auto", cursor: "pointer" }}>✕</button>
        </div>
      )}

      {/* Screen 2 / 11 / 16: Overview Home Dashboards */}
      {view === "overview" && (
        person.role === "manager" ? (
          <ManagerHomeView
            person={person}
            queue={queue}
            queueState={queueState}
            team={teamMembers}
            onReview={handleReviewRequest}
            onNavigate={setView}
            busy={busy}
          />
        ) : person.role === "hr" ? (
          <HRDashboardView
            person={person}
            summary={hrSummary}
            tickets={tickets}
            onNavigate={setView}
          />
        ) : (
          <EmployeeHomeView
            person={person}
            balances={balances}
            leaves={leaves}
            tickets={tickets}
            onNavigate={setView}
            onSendPrompt={handleSendQuestion}
          />
        )
      )}

      {/* Screen 3: Ask AgentOS (Policy Assistant) */}
      {view === "assistant" && (
        <AskAgentosView
          runs={runs}
          activeRunId={active}
          onSendQuestion={handleSendQuestion}
          onResumeRun={handleResumeRun}
          onSelectCitation={setSelectedCitation}
          busy={busy}
          employeeName={person.name.split(" ")[0]}
        />
      )}

      {/* Screen 4: Submit Leave Request */}
      {view === "submit_leave" && (
        <SubmitLeaveView
          onSubmit={handleCreateLeaveRequest}
          onCancel={() => setView("leave")}
          busy={busy}
          availableBalance={balances.find((b) => b.leave_type === "annual")?.available || 16}
        />
      )}

      {/* Screen 5: My Leave (List & Status) */}
      {view === "leave" && (
        <MyLeaveView
          leaves={leaves}
          onNewRequest={() => setView("submit_leave")}
          onViewCalendar={() => setView("calendar")}
          onViewBalance={() => setView("balance")}
        />
      )}

      {/* Screen 6: My Leave Calendar */}
      {view === "calendar" && (
        <CalendarView
          person={person}
          onNavigateLeave={() => setView("leave")}
        />
      )}

      {/* Screen 7: Leave Balance Details */}
      {view === "balance" && (
        <LeaveBalanceView
          balances={balances}
          onNavigatePolicies={() => setView("policies")}
          onRequestLeave={() => setView("submit_leave")}
        />
      )}

      {/* Screen 8 & 9: My Tickets & Ticket Details */}
      {view === "tickets" && (
        <MyTicketsView
          tickets={tickets}
          employeeName={person.name}
          onRaiseTicketPrompt={handleSendQuestion}
        />
      )}

      {/* Screen 10 & 20: Company Policies & Policy Management */}
      {view === "policies" && (
        <CompanyPoliciesView
          isHR={person.role === "hr"}
          onAskPolicyPrompt={handleSendQuestion}
        />
      )}

      {/* Screen 12 & 13: Team Requests (Approval) */}
      {view === "manager" && (
        person.role !== "manager" ? (
          locked("Manager")
        ) : (
          <ManagerHomeView
            person={person}
            queue={queue}
            queueState={queueState}
            team={teamMembers}
            onReview={handleReviewRequest}
            onNavigate={setView}
            busy={busy}
            isRequestsTab={true}
          />
        )
      )}

      {/* Screen 14: Team Members Directory */}
      {view === "team" && (
        person.role !== "manager" ? (
          locked("Manager")
        ) : (
          <TeamDirectory person={person} onSendPrompt={handleSendQuestion} />
        )
      )}

      {/* Screen 15: Team Analytics (Manager) OR Screen 17/18: Workforce Analytics (HR) */}
      {view === "analytics" && (
        person.role === "manager" ? (
          <TeamAnalyticsView team={teamMembers} queue={queue} />
        ) : person.role === "hr" ? (
          <WorkforceAnalyticsView summary={hrSummary} report={report} />
        ) : (
          locked("HR analyst")
        )
      )}

      {/* Screen 19: HR Tickets All */}
      {view === "handoff" && (
        person.role !== "hr" ? (
          locked("HR analyst")
        ) : (
          <HRTicketsView
            tickets={tickets}
            onResolveTicket={async (id) => {
              setBusy(true);
              try {
                await api("/tickets/" + id + "/resolve", {});
                setTickets(await api("/tickets"));
                setNotice("Ticket resolved.");
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
            busy={busy}
          />
        )
      )}

      {/* Execution & Evaluation (FastMCP Tools Grid & System Evals) */}
      {view === "execution" && (
        person.role !== "hr" ? (
          locked("HR analyst")
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 750, color: "var(--text-main)", display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={22} color="var(--primary)" /> Execution &amp; Evaluation
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                Real FastMCP stdio gateway tool invocations and measured verification metrics.
              </p>
            </div>

            <div className="saas-card">
              <h3 style={{ fontSize: 16, fontWeight: 750, marginBottom: 12 }}>Registered FastMCP Tools (9)</h3>
              <div className="tool-grid">
                {tools.map((t: any) => (
                  <div key={t.name} style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color)" }}>
                    <strong style={{ fontSize: 12, display: "block", color: "var(--primary)" }}>{t.name}</strong>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{t.description?.slice(0, 75)}...</span>
                  </div>
                ))}
                {!tools.length && (
                  [
                    "calculate_working_days",
                    "check_leave_balance",
                    "reserve_leave_balance",
                    "check_team_conflicts",
                    "search_policies",
                    "fetch_policy_section",
                    "create_support_ticket",
                    "query_aggregate_report",
                    "commit_leave_approval",
                  ].map((name) => (
                    <div key={name} style={{ background: "var(--bg-main)", padding: 12, borderRadius: 8, border: "1px solid var(--border-color)" }}>
                      <strong style={{ fontSize: 12, display: "block", color: "var(--primary)" }}>{name}</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Permission-scoped FastMCP stdio tool</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {evaluation && (
              <div className="saas-card">
                <h3 style={{ fontSize: 16, fontWeight: 750, marginBottom: 12 }}>Evaluation Metrics</h3>
                <pre style={{ background: "var(--bg-main)", padding: 16, borderRadius: 8, fontSize: 12, overflow: "auto", maxHeight: 300 }}>
                  {JSON.stringify(evaluation, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )
      )}

      {/* Recorded Demo Replay */}
      {view === "replay" && replay && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 750 }}>Recorded Demo Replay</h1>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Step-by-step verified end-to-end user journeys captured during Playwright runs.
              </p>
            </div>
            <Button variant="outline" onClick={() => setView("overview")}>
              Exit Replay
            </Button>
          </div>

          <div className="saas-card">
            <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
              {replay.steps?.map((step: any, idx: number) => (
                <button
                  key={idx}
                  className={`saas-tab-btn ${replayStep === idx ? "active" : ""}`}
                  onClick={() => setReplayStep(idx)}
                >
                  Step {idx + 1}: {step.title}
                </button>
              ))}
            </div>

            {replay.steps?.[replayStep] && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  {replay.steps[replayStep].title}
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                  {replay.steps[replayStep].description}
                </p>
                {replay.steps[replayStep].image && (
                  <img
                    src={replay.steps[replayStep].image}
                    alt={replay.steps[replayStep].title}
                    style={{ maxWidth: "100%", borderRadius: 8, border: "1px solid var(--border-color)" }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Citation Dialog */}
      <SourceDialog
        source={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </AppShell>
  );
}
