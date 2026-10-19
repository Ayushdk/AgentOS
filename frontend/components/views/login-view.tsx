"use client";

import React, { useState } from "react";
import { ArrowRight, Info, Lock, Mail, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LoginViewProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSelectDemoPersona: (persona: "employee" | "manager" | "hr") => Promise<void>;
  demoEnabled: boolean;
  busy: boolean;
  error?: string;
}

const demoAccounts = [
  { email: "ayush@employee.com", role: "Employee", persona: "employee" as const, color: "var(--primary)" },
  { email: "rahul@manager.com", role: "Manager", persona: "manager" as const, color: "var(--purple)" },
  { email: "priya@hr.com", role: "HR Analyst", persona: "hr" as const, color: "var(--success)" },
];

export function LoginView({
  onLogin,
  onSelectDemoPersona,
  demoEnabled,
  busy,
  error,
}: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    void onLogin(email.trim(), password);
  };

  return (
    <main className="login-page">
      <section className="login-grid" aria-label="AgentOS sign in">
        <aside className="login-context">
          <div>
            <div className="login-brand">
              <span className="login-brand-mark"><Shield size={23} /></span>
              <div>
                <strong>AgentOS</strong>
                <span>Employee Operations</span>
              </div>
            </div>

            <p className="login-kicker">WORKSPACE ACCESS</p>
            <h2>One place for everyday people operations.</h2>
            <p className="login-context-copy">
              Review policies, manage leave, handle team approvals, and explore workforce reports through role-based workspaces.
            </p>

            <ul className="login-role-list">
              <li><i className="employee-dot" />Employee <span>Policies, leave, and support</span></li>
              <li><i className="manager-dot" />Manager <span>Approvals and team coverage</span></li>
              <li><i className="hr-dot" />HR Analyst <span>Tickets and aggregate reporting</span></li>
            </ul>
          </div>

          <p className="login-environment">Synthetic workspace · Portfolio demonstration</p>
        </aside>

        <section className="login-card">
          <header className="login-heading">
            <span className="login-heading-icon"><Shield size={23} /></span>
            <h1>Welcome back</h1>
            <p>Sign in to your company workspace</p>
          </header>

          {error && (
            <div className="banner error login-error" role="alert">
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="saas-form-group">
              <label htmlFor="login-email">Email address</label>
              <div className="login-input-wrap">
                <Mail size={17} />
                <input id="login-email" type="email" required autoComplete="email" className="saas-input" placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
            </div>

            <div className="saas-form-group">
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap">
                <Lock size={17} />
                <input id="login-password" type="password" required autoComplete="current-password" className="saas-input" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
            </div>

            <Button type="submit" disabled={busy} className="login-submit">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="login-credentials-tip" aria-label="Demo login credentials">
            <Info size={17} />
            <div>
              <strong>Demo access</strong>
              <p>Email: <code>demo@gmail.com</code></p>
              <p>Password: <code>demo123</code></p>
            </div>
          </div>

          {demoEnabled ? (
            <div className="login-demo-section">
              <div className="login-divider"><span>Demo workspaces</span></div>
              <div className="login-demo-list">
                {demoAccounts.map((account) => (
                  <button key={account.persona} type="button" className="btn-outline login-demo-account" onClick={() => { setEmail(account.email); void onSelectDemoPersona(account.persona); }} disabled={busy}>
                    <span><strong>{account.role}</strong><small>{account.email}</small></span>
                    <ArrowRight size={15} color={account.color} />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
