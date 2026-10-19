import { expect, test } from "@playwright/test";

const transient = (status: number) => ({
  status,
  contentType: "application/json",
  body: JSON.stringify({ error: { code: `test_${status}`, message: "Temporary gateway failure." } }),
});

test.describe("backend readiness and retry safety", () => {
  test("a 20-second cold start uses one shared readiness request", async ({ page }) => {
    let healthRequests = 0;
    await page.route("**/health", async (route) => {
      healthRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 20_000));
      await route.continue();
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Connecting to AgentOS" })).toBeVisible();
    await expect(page.getByText("Hello, Ari.")).toBeVisible({ timeout: 60_000 });
    expect(healthRequests).toBe(1);
  });

  test("a 60-second cold start remains inside the readiness budget", async ({ page }) => {
    test.setTimeout(85_000);
    let healthRequests = 0;
    await page.route("**/health", async (route) => {
      healthRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Connecting to AgentOS" })).toBeVisible();
    await expect(page.getByText("Hello, Ari.")).toBeVisible({ timeout: 75_000 });
    expect(healthRequests).toBe(1);
  });

  test("idempotent GET retries transient 502, 503, and 504 responses", async ({ page }) => {
    const statuses = [502, 503, 504];
    let runRequests = 0;
    await page.route("**/runs", async (route) => {
      const status = statuses[runRequests++];
      if (status) await route.fulfill(transient(status));
      else await route.continue();
    });

    await page.goto("/");
    await expect(page.getByText("Hello, Ari.")).toBeVisible({ timeout: 60_000 });
    expect(runRequests).toBe(4);
  });

  test("permanent unavailability preserves data state and offers retry", async ({ page }) => {
    let healthRequests = 0;
    await page.route("**/health", async (route) => {
      healthRequests += 1;
      await route.fulfill(transient(503));
    });

    await page.goto("/");
    await expect(page.getByRole("heading", { name: "AgentOS backend is still resuming" })).toBeVisible({ timeout: 40_000 });
    await expect(page.getByRole("button", { name: "Retry connection" })).toBeVisible();
    await expect(page.getByText("No session data was cleared.", { exact: false })).toBeVisible();
    expect(healthRequests).toBe(6);
  });

  test("mutations are never automatically retried", async ({ page }) => {
    let chatRequests = 0;
    await page.route("**/chat", async (route) => {
      chatRequests += 1;
      await route.fulfill(transient(503));
    });
    await page.goto("/");
    await expect(page.getByText("Hello, Ari.")).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Employee assistant" }).click();
    await page.getByLabel("Ask your employee assistant").fill("Explain the leave policy");
    await page.getByRole("button", { name: "Send question" }).click();
    await expect(page.locator(".banner.error")).toContainText("Temporary gateway failure.");
    expect(chatRequests).toBe(1);
  });

  test("manager bootstrap requests the approval queue once", async ({ page }) => {
    let queueRequests = 0;
    await page.route("**/manager/queue", async (route) => {
      queueRequests += 1;
      await route.continue();
    });
    await page.goto("/");
    await expect(page.getByText("Hello, Ari.")).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Demo identity").selectOption("manager");
    await expect(page.getByText("Manager workspace", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Approval inbox" })).toBeVisible();
    expect(queueRequests).toBe(1);
  });

  test("a fresh hosted visitor sees sign in without an expired-session error", async ({ page }) => {
    let identityRequests = 0;
    await page.route("**/health", (route) => route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "ok", auth_mode: "supabase", model_mode: "development", public_demo: false }),
    }));
    await page.route("**/auth/me", (route) => {
      identityRequests += 1;
      return route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Your session has expired. Sign in again to continue.")).not.toBeVisible();
    await expect(page.getByText("AI OPERATIONAL ASSISTANT")).not.toBeVisible();
    await expect(page.getByLabel("Email address")).toHaveValue("");
    await expect(page.getByLabel("Password")).toHaveValue("");
    expect(identityRequests).toBe(0);
    await expect(page.getByRole("heading", { name: "Connecting to AgentOS" })).not.toBeVisible();
  });

  test("a GET retries once after Supabase refreshes an expired session", async ({ page }) => {
    const now = Math.floor(Date.now() / 1000);
    const token = (exp: number) => `eyJhbGciOiJFUzI1NiJ9.${Buffer.from(JSON.stringify({ sub: "test-user", exp, aud: "authenticated" })).toString("base64url")}.signature`;
    await page.addInitScript(({ storageKey, session }) => localStorage.setItem(storageKey, JSON.stringify(session)), {
      storageKey: "sb-kazregjijjsajdxlipsl-auth-token",
      session: { access_token: token(now + 3600), refresh_token: "authorized-test-refresh", expires_at: now + 3600, expires_in: 3600, token_type: "bearer", user: { id: "test-user", aud: "authenticated", role: "authenticated", email: "manager@gmail.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() } },
    });
    let refreshes = 0;
    let identityRequests = 0;
    await page.route("**/health", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ status: "ok", auth_mode: "supabase", model_mode: "development", public_demo: false }) }));
    await page.route("**/auth/v1/token?grant_type=refresh_token", (route) => {
      refreshes += 1;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ access_token: token(now + 7200), refresh_token: "rotated-test-refresh", expires_in: 3600, token_type: "bearer", user: { id: "test-user", aud: "authenticated", role: "authenticated", email: "manager@gmail.com", app_metadata: {}, user_metadata: {}, identities: [], created_at: new Date().toISOString() } }) });
    });
    await page.route("**/auth/me", (route) => {
      identityRequests += 1;
      if (identityRequests === 1) return route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ error: { code: "unauthorized", message: "Expired." } }) });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ tenant_id: "test", employee_id: "E010", role: "manager", name: "Tara Sen" }) });
    });
    await page.route("**/runs", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/balances", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ balances: [] }) }));
    await page.route("**/leave", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/manager/queue", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/manager/team", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await page.route("**/calendar", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ holidays: [], leaves: [], events: [], team_leaves: [] }) }));
    await page.goto("/");
    await expect(page.getByText("Good morning, Tara")).toBeVisible({ timeout: 30_000 });
    expect(identityRequests).toBe(2);
    expect(refreshes).toBe(1);
  });
});
