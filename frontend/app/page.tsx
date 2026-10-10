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
  ArrowUp,
  ArrowRight,
  Check,
  ChevronRight,
  ShieldCheck,
  BookOpen,
  Clock3,
  ExternalLink,
  X,
  LoaderCircle,
  CircleHelp,
  PanelLeftClose,
  Play,
  LogOut,
  Database,
  CheckCheck,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ReportChart } from "@/components/report-chart";
import {
  api,
  setBearer,
  type Identity,
  type Run,
  type Leave,
  type Citation,
  type Report,
} from "@/lib/api";
import { supabase } from "@/lib/supabase";

type View =
  | "assistant"
  | "leave"
  | "manager"
  | "analytics"
  | "handoff"
  | "execution"
  | "replay";
const navigation = [
  { id: "assistant", label: "Employee assistant", icon: MessageSquare },
  { id: "leave", label: "My leave", icon: CalendarDays },
  { id: "manager", label: "Manager approvals", icon: Users },
  { id: "analytics", label: "HR analytics", icon: ChartColumn },
  { id: "handoff", label: "HR handoff", icon: Inbox },
  { id: "execution", label: "Execution & evaluation", icon: Activity },
] as const;
const prompts = [
  {
    icon: BookOpen,
    title: "Understand a policy",
    text: "How many annual leave days do I get?",
    tag: "Answers with sources",
  },
  {
    icon: CalendarDays,
    title: "Plan some time off",
    text: "Check leave November 16–20, 2026",
    tag: "Check dates & availability",
  },
  {
    icon: CircleHelp,
    title: "Get a little guidance",
    text: "Can I claim home broadband reimbursement?",
    tag: "A clear path to HR",
  },
];
const formatDate = (d: string) =>
  new Date(d + "T00:00:00+05:30").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
function Status({ value }: { value: string }) {
  return (
    <span className={"status " + value}>{value.replaceAll("_", " ")}</span>
  );
}
function Source({ source }: { source: Citation }) {
  const [verified, setVerified] = useState<Citation | null>(null);
  const [error, setError] = useState("");
  return (
    <Dialog
      onOpenChange={async (open) => {
        if (open) {
          setError("");
          try {
            setVerified(
              await api("/citations/" + encodeURIComponent(source.id)),
            );
          } catch (e) {
            setError((e as Error).message);
          }
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="source-chip">
          <FileText size={13} />
          {source.title}
          <ExternalLink size={11} />
        </button>
      </DialogTrigger>
      <DialogContent title={source.title}>
        {error ? (
          <p role="alert">{error}</p>
        ) : verified ? (
          <>
            <p className="source-meta">
              {verified.document_id} · v{verified.version} · Effective{" "}
              {verified.effective_date}
            </p>
            <h3>{verified.heading}</h3>
            <blockquote>{verified.excerpt}</blockquote>
            <p className="muted">
              Section {verified.section_id} · Synthetic company policy
            </p>
          </>
        ) : (
          <p>Verifying source…</p>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function Page() {
  const [view, setView] = useState<View>("assistant");
  const [person, setPerson] = useState<Identity | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [balances, setBalances] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [queue, setQueue] = useState<Leave[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [queueState, setQueueState] = useState<
    "idle" | "loading" | "loaded" | "error"
  >("idle");
  const [report, setReport] = useState<Report | null>(null);
  const [reportKind, setReportKind] = useState("headcount");
  const [from, setFrom] = useState("2026-01-01");
  const [to, setTo] = useState("2026-12-31");
  const [events, setEvents] = useState<any[]>([]);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [tools, setTools] = useState<any[]>([]);
  const [mobile, setMobile] = useState(false);
  const [replay, setReplay] = useState<any>(null);
  const [replayStep, setReplayStep] = useState(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const current = runs.find((r) => r.id === active);
  const annual = balances.find((b) => b.leave_type === "annual");
  const loadData = async () => {
    const [h, b, l] = await Promise.all([
      api<Run[]>("/runs"),
      api("/balances"),
      api<Leave[]>("/leave"),
    ]);
    setRuns(h);
    setBalances(b.balances);
    setLeaves(l);
  };
  const loadManagerQueue = async () => {
    setQueueState("loading");
    try {
      setQueue(await api("/manager/queue"));
      setQueueState("loaded");
    } catch (e) {
      setQueueState("error");
      throw e;
    }
  };
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const h = await api("/health");
        if (!mounted) return;
        setHealth(h);
        if (h.auth_mode === "supabase") {
          const { data } = await supabase().auth.getSession();
          setBearer(data.session?.access_token ?? null);
        }
        try {
          const p = await api<Identity>("/auth/me");
          setPerson(p);
          await loadData();
        } catch {
          if (h.auth_mode === "development") {
            const p = await api<Identity>("/auth/demo", {
              persona: "employee",
            });
            if (mounted) {
              setPerson(p);
              await loadData();
            }
          }
        }
      } catch (e) {
        if (mounted)
          setError(
            "The backend is waking up or unavailable. Retry shortly, or open the recorded demo.",
          );
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
    };
  }, []);
  useEffect(() => {
    if (!person) return;
    setError("");
    (async () => {
      try {
        if (view === "leave") await loadData();
        if (view === "manager" && person.role === "manager") {
          await loadManagerQueue();
        }
        if (view === "handoff" && person.role === "hr")
          setTickets(await api("/tickets"));
        if (view === "analytics" && person.role === "hr")
          setReport(
            await api("/analytics", {
              report: reportKind,
              start_date: from,
              end_date: to,
            }),
          );
        if (view === "execution" && person.role === "hr") {
          setEvaluation(await api("/evaluation"));
          setTools((await api("/mcp/tools")).tools);
        }
      } catch (e) {
        if (view === "manager") setQueueState("error");
        setError((e as Error).message);
      }
    })();
  }, [view, person]);
  useEffect(() => {
    if (active && person)
      api<any[]>("/runs/" + active + "/events")
        .then(setEvents)
        .catch(() => setEvents([]));
    else setEvents([]);
  }, [active, current?.status, person]);
  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [active, busy]);
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
      setEvents([]);
      await loadData();
      setNotice(
        "Switched to " + p.name + ". Your visitor workspace stays isolated.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(textValue = question) {
    if (!textValue.trim() || busy || !person) return;
    setBusy(true);
    setError("");
    setQuestion("");
    setView("assistant");
    try {
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
  async function decide(approved: boolean) {
    if (!current) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<Run>("/runs/" + current.id + "/resume", {
        approved,
      });
      setActive(result.id);
      await loadData();
      setNotice(
        approved
          ? "Your decision has been saved."
          : "Cancelled. Nothing was submitted.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function review(id: string, decision: string) {
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
  async function generateReport() {
    setBusy(true);
    setError("");
    try {
      setReport(
        await api("/analytics", {
          report: reportKind,
          start_date: from,
          end_date: to,
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const client = supabase();
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setBearer(data.session?.access_token ?? null);
      setPerson(await api("/auth/me"));
      setPassword("");
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function enterHostedDemo() {
    setBusy(true);
    setError("");
    try {
      const client = supabase();
      const { data, error } = await client.auth.signInAnonymously();
      if (error) throw error;
      setBearer(data.session?.access_token ?? null);
      setPerson(await api("/auth/demo/persona", { persona: "employee" }));
      await loadData();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const navigate = (v: View) => {
    setView(v);
    setMobile(false);
    setNotice("");
  };
  function locked(role: string) {
    return (
      <div className="empty">
        <ShieldCheck size={32} />
        <h3>{role} workspace</h3>
        <p>This page is limited to a verified {role.toLowerCase()} identity.</p>
        {(health?.auth_mode === "development" || person?.demo) && (
          <Button
            variant="outline"
            onClick={() => switchPersona(role === "Manager" ? "manager" : "hr")}
          >
            Switch demo identity
          </Button>
        )}
      </div>
    );
  }
  function responseCard(run: Run) {
    const r = run.result;
    const responseMode =
      r.response_mode === "live_grounded"
        ? "Gemini response"
        : r.response_mode?.includes("fallback")
          ? "Safe fallback"
          : r.needs_clarification
            ? "Deterministic clarification"
            : "Deterministic workflow";
    return (
      <div className="answer-card">
        <div className="answer-header">
          <span className="ai-mark">
            <Sparkles size={16} />
          </span>
          <strong>AgentOS</strong>
          <span className="muted">{run.specialist} specialist</span>
          <Status value={responseMode} />
        </div>
        <p className="answer-text">{r.answer}</p>
        {r.balances && (
          <div className="balance-inline">
            {r.balances.map((b: any) => (
              <div key={b.leave_type}>
                <strong>{b.available}</strong> {b.leave_type} days available{" "}
                <small>{b.reserved} reserved</small>
              </div>
            ))}
          </div>
        )}
        {r.draft && (
          <div className="draft-card">
            <div className="draft-top">
              <span className="icon-tile">
                <CalendarDays size={20} />
              </span>
              <div>
                <h3>
                  {r.draft.leave_type === "sick" ? "Sick" : "Annual"} leave
                </h3>
                <p>
                  {formatDate(r.draft.start_date)} —{" "}
                  {formatDate(r.draft.end_date)}
                </p>
              </div>
              <Status value={r.cancelled ? "cancelled" : r.draft.status} />
            </div>
            <div className="draft-metrics">
              <div>
                <strong>{r.draft.days}</strong>
                <span>working days</span>
              </div>
              <div>
                <strong>{r.calculation.available}</strong>
                <span>days available</span>
              </div>
              <div>
                <strong>{r.calculation.holidays.length}</strong>
                <span>holiday excluded</span>
              </div>
            </div>
            {r.calculation.holidays.map((h: any) => (
              <p className="fact" key={h.date}>
                <Check size={14} />
                {h.title} · {formatDate(h.date)}
              </p>
            ))}
            {r.calculation.conflicts.map((c: any) => (
              <p className="conflict" key={c.id}>
                <AlertCircle size={14} />
                {c.title} ·{" "}
                {new Date(c.starts_at).toLocaleString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}{" "}
                IST. Meeting stays unchanged.
              </p>
            ))}
            <p className="fine-print">
              Monday–Friday · Asia/Kolkata · Confirmation expires{" "}
              {new Date(r.expires_at).toLocaleTimeString("en-IN", {
                timeZone: "Asia/Kolkata",
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              IST
            </p>
          </div>
        )}
        {r.request && (
          <div className="success-box">
            <CheckCheck size={20} />
            <div>
              <strong>
                {r.request.status === "pending"
                  ? "Waiting for your manager"
                  : r.request.status}
              </strong>
              <p>
                {formatDate(r.request.start_date)} —{" "}
                {formatDate(r.request.end_date)} · {r.request.days} working days
              </p>
              <code>{r.request.id.slice(0, 8)}</code>
            </div>
          </div>
        )}
        {r.ticket_id && (
          <div className="success-box">
            <Inbox size={20} />
            <div>
              <strong>HR ticket created</strong>
              <p>
                Reference {r.ticket_id.slice(0, 8)} · {r.status}
              </p>
            </div>
          </div>
        )}
        {r.rows && r.chart && <ReportChart report={r} />}{" "}
        {!!r.citations?.length && (
          <div className="sources">
            <span>Supporting sources</span>
            <div>
              {r.citations.map((c: Citation) => (
                <Source key={c.id} source={c} />
              ))}
            </div>
          </div>
        )}
        {r.retrieval_mode && (
          <p className="retrieval-note">
            {r.retrieval_mode.includes("fallback")
              ? "Retrieval fallback: " + r.retrieval_mode.replaceAll("_", " ")
              : "Hybrid search · PostgreSQL full-text + pgvector"}
          </p>
        )}
        {run.status === "awaiting_confirmation" && (
          <div className="confirmation">
            <p>
              <ShieldCheck size={16} />
              {r.action === "create_ticket"
                ? "Share this question and its evidence with the simulated HR queue?"
                : "Submit this exact draft for manager approval?"}
            </p>
            <div>
              <Button disabled={busy} onClick={() => decide(true)}>
                <Check size={15} />
                {r.action === "create_ticket"
                  ? "Confirm handoff"
                  : "Confirm & submit"}
              </Button>
              <Button
                disabled={busy}
                variant="outline"
                onClick={() => decide(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        {run.status === "retryable_failure" && (
          <Button
            disabled={busy}
            variant="outline"
            onClick={async () => {
              setBusy(true);
              try {
                await api("/runs/" + run.id + "/retry", {});
                await loadData();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Retry saved workflow
          </Button>
        )}
        <div className="answer-footer">
          <ShieldCheck size={13} /> Verified tools & server-side permissions{" "}
          <span>{(run.latency_ms / 1000).toFixed(1)}s</span>
        </div>
      </div>
    );
  }
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("assistant");
          }}
        >
          <span className="brand-icon">
            <Sparkles size={21} />
          </span>
          Agent<span>OS</span>
          <span className="brand-dot" />
        </a>
        <div className="workspace">
          <div className="company-logo">M</div>
          <div>
            <strong>Meridian Ledger</strong>
            <span>Employee workspace</span>
          </div>
          <ChevronRight size={14} />
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {navigation.map((n) => (
            <button
              key={n.id}
              className={"nav-item " + (view === n.id ? "active" : "")}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {n.id === "manager" && queue.length > 0 && <b>{queue.length}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="demo-note">
            <ShieldCheck size={17} />
            <strong>A safe place to explore</strong>
            <p>Fictional company. Synthetic people. Simulated HR & calendar.</p>
            <button onClick={() => navigate("replay")}>
              Watch recorded demo <ArrowRight size={13} />
            </button>
          </div>
          <div className="profile">
            <div className="avatar">
              {person?.name
                .split(" ")
                .map((n) => n[0])
                .join("") || "ML"}
            </div>
            <div>
              <strong>{person?.name || "Your workspace"}</strong>
              <span>
                {person?.role === "hr"
                  ? "HR analyst"
                  : person?.role || "Not signed in"}
              </span>
            </div>
          </div>
          {(health?.auth_mode === "development" || person?.demo) && (
            <label className="persona-label">
              Demo identity
              <select
                aria-label="Demo identity"
                value={person?.role || "employee"}
                onChange={(e) => switchPersona(e.target.value)}
                disabled={busy}
              >
                <option value="employee">Employee · Ari Sen</option>
                <option value="manager">Manager · Tara Sen</option>
                <option value="hr">HR analyst · Tara Shah</option>
              </select>
            </label>
          )}
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="mobile-toggle"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <PanelLeftClose size={20} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {view === "replay"
                ? "Recorded demo"
                : navigation.find((n) => n.id === view)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="mode-indicator">
              <i />
              {view === "replay"
                ? "Recorded replay"
                : health?.model_mode === "live"
                  ? "Gemini available"
                  : "Development adapter"}
            </span>
            <span className="portfolio-label">PORTFOLIO DEMO</span>
            {health?.auth_mode === "supabase" && person && (
              <button
                aria-label="Sign out"
                onClick={async () => {
                  await supabase().auth.signOut();
                  setBearer(null);
                  setPerson(null);
                  setRuns([]);
                  setActive(null);
                }}
              >
                <LogOut size={15} />
              </button>
            )}
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div className="breadcrumb-label">PEOPLE & POSSIBILITIES</div>
            <div className="heading-row">
              <div>
                <h1>
                  {view === "assistant"
                    ? "A little support. More momentum."
                    : view === "leave"
                      ? "Time away, made clear."
                      : view === "manager"
                        ? "A thoughtful second look."
                        : view === "analytics"
                          ? "The people behind the numbers."
                          : view === "handoff"
                            ? "Keep the conversation moving."
                            : view === "execution"
                              ? "Trust, with a paper trail."
                              : "See AgentOS in action."}
                </h1>
                <p>
                  {view === "assistant"
                    ? "Your policies, plans, and next steps. All in one helpful place."
                    : view === "leave"
                      ? "Track your requests and see exactly what happens next."
                      : view === "manager"
                        ? "Review direct-report requests. Every decision is yours."
                        : view === "analytics"
                          ? "Explore aggregate workforce data with transparent definitions."
                          : view === "handoff"
                            ? "Evidence and context for the questions that need a human."
                            : view === "execution"
                              ? "Factual tool activity and measured evaluation results."
                              : "A recorded walkthrough, available even when live services are offline."}
                </p>
              </div>
              <span className="workspace-badge">
                <Database size={14} /> Synthetic workspace
              </span>
            </div>
          </div>
          {error && (
            <div className="banner error" role="alert">
              <AlertCircle size={17} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="banner success" role="status">
              <Check size={16} />
              <span>{notice}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {loading ? (
            <div className="empty">
              <LoaderCircle className="spin" />
              <h3>Opening your workspace</h3>
              <p>A free backend may need a moment to wake up.</p>
            </div>
          ) : !person && view !== "replay" ? (
            <div className="login card">
              <h2>Sign in to your workspace</h2>
              <p>Use a provisioned synthetic Supabase demo account.</p>
              {health?.public_demo && (
                <Button disabled={busy} onClick={enterHostedDemo}>
                  Enter an isolated demo workspace
                </Button>
              )}
              <form onSubmit={login}>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label>
                  Password
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
                <Button disabled={busy}>Sign in</Button>
              </form>
              <Button variant="ghost" onClick={() => navigate("replay")}>
                Open the recorded demo
              </Button>
            </div>
          ) : (
            <>
              {view === "assistant" && (
                <div className="assistant-grid">
                  <section className="conversation-column">
                    <div className="welcome-card">
                      <div className="welcome-symbol">
                        <Sparkles size={28} />
                      </div>
                      <div>
                        <span className="eyebrow">YOUR EMPLOYEE ASSISTANT</span>
                        <h2>
                          Hello, {person?.name.split(" ")[0]}. What’s on your
                          mind?
                        </h2>
                        <p>
                          Find the right policy, plan your leave, or get a
                          question to the right person.
                        </p>
                      </div>
                      <div className="welcome-orbit" />
                    </div>
                    {!current && (
                      <>
                        <div className="section-title">
                          <h3>A good place to start</h3>
                          <span>Try a question</span>
                        </div>
                        <div className="prompt-grid">
                          {prompts.map((p) => (
                            <button
                              key={p.title}
                              className="prompt-card"
                              disabled={busy}
                              onClick={() => send(p.text)}
                            >
                              <p.icon size={21} />
                              <strong>{p.title}</strong>
                              <span>{p.tag}</span>
                              <ArrowRight size={15} />
                            </button>
                          ))}
                        </div>
                        <div className="how-it-works">
                          <ShieldCheck size={19} />
                          <div>
                            <strong>You stay in control</strong>
                            <p>
                              I’ll show the evidence and prepare the next step.
                              You confirm before a request or HR ticket is
                              submitted.
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                    {current && (
                      <div className="conversation">
                        <div className="user-message">
                          <span className="avatar small-avatar">
                            {person?.name[0]}
                          </span>
                          <p>{current.question}</p>
                        </div>
                        {responseCard(current)}
                      </div>
                    )}
                    {busy && (
                      <div className="thinking" role="status">
                        <LoaderCircle size={17} className="spin" /> Checking the
                        relevant tools and saved state…
                      </div>
                    )}
                    <div ref={chatEnd} />
                    <form
                      className="composer"
                      onSubmit={(e) => {
                        e.preventDefault();
                        send();
                      }}
                    >
                      <textarea
                        aria-label="Ask your employee assistant"
                        placeholder="Ask about a policy, your leave, or your next step…"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                          }
                        }}
                        rows={2}
                      />
                      <div>
                        <span>
                          <ShieldCheck size={13} /> Only your authorized
                          workspace data
                        </span>
                        <Button
                          size="icon"
                          aria-label="Send question"
                          disabled={busy || !question.trim()}
                        >
                          <ArrowUp size={18} />
                        </Button>
                      </div>
                    </form>
                    <p className="composer-note">
                      {health?.model_mode === "live"
                        ? "Local intent routing Â· Gemini grounded response writing Â· deterministic tools."
                        : "Development adapter · deterministic routing, real database and MCP tools."}{" "}
                      All policies and people are fictional.
                    </p>
                  </section>
                  <aside className="context-column">
                    <div className="card balance-card">
                      <div className="card-title">
                        <span className="icon-tile mint">
                          <CalendarDays size={19} />
                        </span>
                        <h3>A little room to recharge</h3>
                      </div>
                      <div className="balance-number">
                        {annual?.available ?? "—"}
                        <span>days available</span>
                      </div>
                      <div className="balance-bar">
                        <i
                          style={{
                            width: ((annual?.available || 0) / 18) * 100 + "%",
                          }}
                        />
                      </div>
                      <div className="balance-details">
                        <span>Annual leave</span>
                        <strong>{annual?.reserved || 0} pending</strong>
                      </div>
                      <p>
                        Pending requests reserve days. Your manager approves
                        separately.
                      </p>
                      <button
                        className="text-link"
                        onClick={() => navigate("leave")}
                      >
                        View leave requests <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="card activity-card">
                      <div className="section-title">
                        <h3>
                          <Activity size={17} /> Activity
                        </h3>
                        <span className="pill subtle">FACTS ONLY</span>
                      </div>
                      {events.length ? (
                        <ol className="activity-list">
                          {events.slice(-7).map((e) => (
                            <li key={e.id}>
                              <i
                                className={
                                  e.detail.outcome && e.detail.outcome !== "ok"
                                    ? "warn"
                                    : ""
                                }
                              />
                              <div>
                                <strong>
                                  {e.kind === "mcp.tool"
                                    ? e.detail.tool.replaceAll("_", " ")
                                    : e.kind.replaceAll(".", " ")}
                                </strong>
                                <span>
                                  {e.detail.outcome || e.detail.to || "Saved"}
                                  {e.detail.duration_ms !== undefined
                                    ? " · " + e.detail.duration_ms + "ms"
                                    : ""}
                                </span>
                              </div>
                              <Check size={12} />
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="activity-empty">
                          <span className="activity-circle">
                            <Activity size={22} />
                          </span>
                          <p>
                            Your tool activity will appear here as we work
                            through a question.
                          </p>
                        </div>
                      )}
                      <p className="fine-print">
                        Execution events only. No private reasoning.
                      </p>
                    </div>
                    <div className="card history-card">
                      <div className="section-title">
                        <h3>Recent conversations</h3>
                        <button
                          aria-label="New conversation"
                          onClick={() => setActive(null)}
                        >
                          +
                        </button>
                      </div>
                      {runs.length ? (
                        runs.slice(0, 5).map((r) => (
                          <button
                            className={
                              "history-item " +
                              (active === r.id ? "selected" : "")
                            }
                            key={r.id}
                            onClick={() => setActive(r.id)}
                          >
                            <MessageSquare size={14} />
                            <span>{r.question}</span>
                            <ChevronRight size={13} />
                          </button>
                        ))
                      ) : (
                        <p className="muted">
                          Your questions will be saved here.
                        </p>
                      )}
                    </div>
                  </aside>
                </div>
              )}
              {view === "leave" && (
                <>
                  <div className="stats-grid">
                    {balances.map((b) => (
                      <div className="card stat" key={b.leave_type}>
                        <span>{b.leave_type} leave</span>
                        <strong>
                          {b.available}
                          <small> days available</small>
                        </strong>
                        <p>
                          {b.remaining} remaining · {b.reserved} reserved
                        </p>
                      </div>
                    ))}
                    <div className="card stat">
                      <span>Working calendar</span>
                      <strong>Mon–Fri</strong>
                      <p>Asia/Kolkata · Company holidays excluded</p>
                    </div>
                  </div>
                  <div className="card">
                    <div className="section-title">
                      <h2>Your requests</h2>
                      <Button
                        onClick={() => {
                          navigate("assistant");
                          setActive(null);
                          setQuestion("Check leave November 16–20, 2026");
                        }}
                      >
                        <CalendarDays size={16} />
                        Plan leave
                      </Button>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Time away</th>
                            <th>Type</th>
                            <th>Working days</th>
                            <th>Status</th>
                            <th>Reference</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaves.map((l) => (
                            <tr key={l.id}>
                              <td>
                                {formatDate(l.start_date)} —{" "}
                                {formatDate(l.end_date)}
                              </td>
                              <td className="capitalize">{l.leave_type}</td>
                              <td>{l.days}</td>
                              <td>
                                <Status value={l.status} />
                              </td>
                              <td>
                                <code>{l.id.slice(0, 8)}</code>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!leaves.length && (
                      <div className="empty small">
                        No requests yet. Start with a leave draft.
                      </div>
                    )}
                    <p className="fine-print">
                      Draft → employee confirmation → pending manager approval →
                      approved or rejected
                    </p>
                  </div>
                </>
              )}
              {view === "manager" &&
                (person?.role !== "manager" ? (
                  locked("Manager")
                ) : (
                  <div className="card">
                    <div className="section-title">
                      <h2>Direct-report requests</h2>
                      <span className="pill">
                        {queue.length} awaiting review
                      </span>
                    </div>
                    {queueState === "loading" ? (
                      <div className="empty small">
                        <LoaderCircle className="spin" />
                        <p>Loading direct-report requestsâ€¦</p>
                      </div>
                    ) : queueState === "error" ? (
                      <div className="empty">
                        <AlertCircle size={34} />
                        <h3>Requests could not be loaded</h3>
                        <p>The queue status is unknown. Retry before making a decision.</p>
                        <Button variant="outline" onClick={() => loadManagerQueue().catch((e) => setError((e as Error).message))}>Retry</Button>
                      </div>
                    ) : queue.length ? (
                      queue.map((l) => (
                        <div className="review-card" key={l.id}>
                          <div className="avatar">{l.employee_name?.[0]}</div>
                          <div>
                            <h3>{l.employee_name}</h3>
                            <p>
                              {formatDate(l.start_date)} —{" "}
                              {formatDate(l.end_date)}
                            </p>
                            <span className="muted">
                              {l.days} working days · {l.leave_type} leave ·
                              Employee confirmed
                            </span>
                          </div>
                          <div className="review-actions">
                            <Button
                              disabled={busy}
                              onClick={() => review(l.id, "approved")}
                            >
                              <Check size={15} />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              disabled={busy}
                              onClick={() => review(l.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty">
                        <CheckCheck size={34} />
                        <h3>You’re all caught up</h3>
                        <p>
                          Confirmed requests from your direct reports will
                          appear here.
                        </p>
                      </div>
                    )}
                    <div className="callout">
                      <ShieldCheck size={18} />
                      <p>
                        Approval rechecks working days, overlap, and reserved
                        balance within a locked database transaction.
                      </p>
                    </div>
                  </div>
                ))}
              {view === "analytics" &&
                (person?.role !== "hr" ? (
                  locked("HR analyst")
                ) : (
                  <>
                    <div className="card report-controls">
                      <label>
                        Report
                        <select
                          value={reportKind}
                          onChange={(e) => setReportKind(e.target.value)}
                        >
                          <option value="headcount">
                            Headcount by department
                          </option>
                          <option value="joiners">
                            New joiners by department
                          </option>
                          <option value="joining_trends">Joining trends</option>
                          <option value="approved_leave">
                            Approved leave by month
                          </option>
                        </select>
                      </label>
                      <label>
                        From
                        <input
                          aria-label="Report start date"
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        Through
                        <input
                          aria-label="Report end date"
                          type="date"
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                      <Button disabled={busy} onClick={generateReport}>
                        Update report
                      </Button>
                    </div>
                    {report && (
                      <div className="card">
                        <ReportChart report={report} />
                        <details className="query-details">
                          <summary>Inspect the restricted query</summary>
                          <pre>{report.query}</pre>
                        </details>
                      </div>
                    )}
                    <div className="callout">
                      <ShieldCheck size={18} />
                      <p>
                        Aggregate reporting only. Ask the assistant in natural
                        language for these reports. Individual leave reasons are
                        never available to analytics.
                      </p>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("assistant");
                          setQuestion("Show joining trends for 2026");
                        }}
                      >
                        Ask the assistant <ArrowRight size={14} />
                      </Button>
                    </div>
                  </>
                ))}
              {view === "handoff" &&
                (person?.role !== "hr" ? (
                  locked("HR analyst")
                ) : (
                  <div className="card">
                    <div className="section-title">
                      <h2>Questions for People Operations</h2>
                      <span className="pill">
                        {tickets.filter((t) => t.status === "open").length} open
                      </span>
                    </div>
                    {tickets.length ? (
                      tickets.map((t) => (
                        <div className="ticket" key={t.id}>
                          <div className="ticket-heading">
                            <span className="eyebrow">
                              {t.employee_id} · {t.id.slice(0, 8)}
                            </span>
                            <Status value={t.status} />
                          </div>
                          <h3>{t.question}</h3>
                          <p className="muted">
                            Reason: {t.reason.replaceAll("_", " ")} · Checks:{" "}
                            {t.checks.join(", ")}
                          </p>
                          <div className="sources">
                            {t.evidence.map((c: Citation) => (
                              <Source source={c} key={c.id} />
                            ))}
                          </div>
                          {t.status === "open" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy}
                              onClick={async () => {
                                setBusy(true);
                                try {
                                  await api(
                                    "/tickets/" + t.id + "/resolve",
                                    {},
                                  );
                                  setTickets(await api("/tickets"));
                                } catch (e) {
                                  setError((e as Error).message);
                                } finally {
                                  setBusy(false);
                                }
                              }}
                            >
                              Mark resolved
                            </Button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="empty">
                        <Inbox size={32} />
                        <h3>No handoffs yet</h3>
                        <p>
                          Employee-confirmed questions will appear with their
                          evidence and attempted checks.
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              {view === "execution" &&
                (person?.role !== "hr" ? (
                  locked("HR analyst")
                ) : (
                  <>
                    <div className="stats-grid">
                      <div className="card stat">
                        <span>Discovered MCP tools</span>
                        <strong>{tools.length}</strong>
                        <p>Private stdio · official Python SDK</p>
                      </div>
                      <div className="card stat">
                        <span>Evaluation mode</span>
                        <strong className="smaller">
                          {evaluation?.mode || "Not run"}
                        </strong>
                        <p>
                          Live and deterministic results reported separately
                        </p>
                      </div>
                      <div className="card stat">
                        <span>Final scenarios</span>
                        <strong>
                          {evaluation?.summary?.passed ?? "—"}
                          <small>
                            {" "}
                            / {evaluation?.summary?.total ?? 60} passed
                          </small>
                        </strong>
                        <p>Measured results, never inferred</p>
                      </div>
                    </div>
                    <div className="card">
                      <h2>Evaluation evidence</h2>
                      <p className="muted">
                        {evaluation?.limitations ||
                          "Read the packaged evaluation report for coverage and remaining verification."}
                      </p>
                      <pre className="evaluation-json">
                        {JSON.stringify(evaluation, null, 2)}
                      </pre>
                    </div>
                    <div className="card">
                      <h2>Private tool manifest</h2>
                      <div className="tool-grid">
                        {tools.map((t) => (
                          <div key={t.name}>
                            <Check size={14} />
                            <code>{t.name}</code>
                          </div>
                        ))}
                      </div>
                      <p className="fine-print">
                        Identity is server-bound and verified again inside every
                        tool. Roles and confirmation cannot be supplied by a
                        model.
                      </p>
                    </div>
                  </>
                ))}
              {view === "replay" && (
                <div className="card replay-card">
                  <span className="status recorded">
                    RECORDED REPLAY · NO LIVE EXECUTION
                  </span>
                  <h2>Three minutes inside AgentOS</h2>
                  <p className="muted">
                    Captured from actual verified development-mode journeys.
                    This playback does not call a model or execute tools.
                  </p>
                  {replay?.steps?.length ? (
                    <>
                      <div className="replay-nav">
                        {replay.steps.map((s: any, i: number) => (
                          <button
                            key={i}
                            className={replayStep === i ? "selected" : ""}
                            onClick={() => setReplayStep(i)}
                          >
                            {i + 1}. {s.title}
                          </button>
                        ))}
                      </div>
                      <div className="replay-content">
                        <h3>{replay.steps[replayStep].title}</h3>
                        <p>{replay.steps[replayStep].description}</p>
                        {replay.steps[replayStep].image && (
                          <img
                            src={replay.steps[replayStep].image}
                            alt={replay.steps[replayStep].title}
                          />
                        )}
                        <pre>
                          {JSON.stringify(
                            replay.steps[replayStep].evidence,
                            null,
                            2,
                          )}
                        </pre>
                      </div>
                      <Button
                        onClick={() =>
                          setReplayStep((replayStep + 1) % replay.steps.length)
                        }
                      >
                        Next chapter <ArrowRight size={15} />
                      </Button>
                    </>
                  ) : (
                    <p>
                      The recording has not been generated yet. Run the
                      documented capture journey to create it.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          <footer className="page-footer">
            <span>AgentOS · Independent portfolio demonstration</span>
            <span>Built with care. Backed by evidence.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
