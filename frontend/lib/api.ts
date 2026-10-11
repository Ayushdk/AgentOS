const configuredApi = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function apiBase() {
  if (typeof window === "undefined") return configuredApi;
  const configured = new URL(configuredApi);
  const pageHost = window.location.hostname;
  const loopback = new Set(["localhost", "127.0.0.1"]);
  if (loopback.has(configured.hostname) && loopback.has(pageHost)) configured.hostname = pageHost;
  return configured.origin;
}

let bearer: string | null = null;
export function setBearer(token: string | null) { bearer = token; }
type TokenProvider = (refresh: boolean) => Promise<string | null>;
let tokenProvider: TokenProvider | null = null;
export function setTokenProvider(provider: TokenProvider | null) { tokenProvider = provider; }
let authFailureHandler: (() => void) | null = null;
export function setAuthFailureHandler(handler: (() => void) | null) { authFailureHandler = handler; }

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number | null,
    public code: string,
    public kind: "auth" | "network" | "server" | "request",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TRANSIENT_STATUSES = new Set([502, 503, 504]);
const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const retryDelay = (attempt: number) => Math.round(600 * 2 ** attempt * (0.8 + Math.random() * 0.4));

async function fetchJson<T>(
  path: string,
  body: unknown,
  timeoutMs: number,
  includeAuthentication = true,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const token = includeAuthentication ? (tokenProvider ? await tokenProvider(false) : bearer) : null;
    const response = await fetch(apiBase() + path, {
      method: body === undefined ? "GET" : "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-AgentOS-Request": "1",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok) {
      const message = data?.error?.message || data?.detail?.[0]?.msg || (
        response.status === 401
          ? "Your session has expired. Sign in again."
          : TRANSIENT_STATUSES.has(response.status)
            ? "AgentOS is still connecting. Previously loaded data may be out of date. Please retry."
            : response.status >= 500
              ? "The service is temporarily unavailable. Please retry."
              : "The request could not be completed."
      );
      throw new ApiError(
        message,
        response.status,
        data?.error?.code || `http_${response.status}`,
        response.status === 401 ? "auth" : response.status >= 500 ? "server" : "request",
      );
    }
    if (!data) throw new ApiError("The service returned an invalid response. Please retry.", response.status, "invalid_response", "server");
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("AgentOS is taking longer than expected to respond. Previously loaded data may be out of date.", null, "timeout", "network");
    }
    throw new ApiError("Unable to reach AgentOS. Previously loaded data may be out of date. Check your connection and retry.", null, "network", "network");
  } finally {
    clearTimeout(timer);
  }
}

async function getWithRetry<T>(path: string): Promise<T> {
  const started = Date.now();
  const budgetMs = 30_000;
  let attempt = 0;
  while (true) {
    try {
      return await fetchJson<T>(path, undefined, Math.max(1_000, Math.min(20_000, budgetMs - (Date.now() - started))));
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && tokenProvider && attempt === 0) {
        const refreshed = await tokenProvider(true);
        if (refreshed) { attempt += 1; continue; }
      }
      const transient = error instanceof ApiError && (error.kind === "network" || (error.status !== null && TRANSIENT_STATUSES.has(error.status)));
      const delay = retryDelay(attempt);
      if (!transient || attempt >= 3 || Date.now() - started + delay >= budgetMs) {
        if (error instanceof ApiError && error.status === 401) authFailureHandler?.();
        throw error;
      }
      await sleep(delay);
      attempt += 1;
    }
  }
}

let readinessPromise: Promise<any> | null = null;
let backendReady = false;

export function ensureBackendReady<T = any>(force = false): Promise<T> {
  if (force) {
    backendReady = false;
    readinessPromise = null;
  }
  if (backendReady && readinessPromise) return readinessPromise as Promise<T>;
  if (readinessPromise) return readinessPromise as Promise<T>;

  readinessPromise = (async () => {
    const started = Date.now();
    const budgetMs = 75_000;
    let attempt = 0;
    while (true) {
      try {
        const health = await fetchJson("/health", undefined, Math.max(1_000, budgetMs - (Date.now() - started)), false);
        backendReady = true;
        return health;
      } catch (error) {
        const transient = error instanceof ApiError && (error.kind === "network" || (error.status !== null && TRANSIENT_STATUSES.has(error.status)));
        const delay = retryDelay(attempt);
        if (!transient || attempt >= 5 || Date.now() - started + delay >= budgetMs) throw error;
        await sleep(delay);
        attempt += 1;
      }
    }
  })().catch((error) => {
    readinessPromise = null;
    backendReady = false;
    throw error;
  });
  return readinessPromise as Promise<T>;
}

export async function api<T = any>(path: string, body?: unknown): Promise<T> {
  if (body === undefined) return getWithRetry<T>(path);
  try {
    return await fetchJson<T>(path, body, 30_000);
  } catch (error) {
    // Mutations are never replayed automatically, even after auth or gateway failures.
    if (error instanceof ApiError && error.status === 401) authFailureHandler?.();
    throw error;
  }
}

export type Identity={tenant_id:string;employee_id:string;role:'employee'|'manager'|'hr';name:string;demo?:boolean};
export type Citation={id:string;document_id:string;title:string;version:string;effective_date:string;section_id:string;heading:string;excerpt:string};
export type Run={id:string;question:string;status:string;mode:string;specialist:string;result:any;created_at:string;latency_ms:number;model_calls:number};
export type Leave={id:string;start_date:string;end_date:string;leave_type:string;days:number;status:string;employee_id:string;employee_name?:string};
export type Report={rows:Record<string,string|number>[];chart:{type:'bar';x:string;y:string;unit:string};report:string;period:{start:string;end:string};definition:string;total:number;query:string};
export type HolidayItem={date:string;title:string};
export type CalendarEventItem={id:string;title:string;starts_at:string;ends_at:string};
export type CalendarData={holidays:HolidayItem[];leaves:Leave[];events:CalendarEventItem[];team_leaves:(Leave&{employee_name?:string})[]};
export type PolicySummary={id:string;title:string;version:string;effective_date:string;expires_on:string|null;audience:string;sections_count:number};
export type PolicySection={id:string;section_id:string;heading:string;text:string;claim_key:string|null;claim_value:string|null};
export type PolicyDetail={id:string;title:string;version:string;effective_date:string;expires_on:string|null;audience:string;sections:PolicySection[]};
export type TeamMember={id:string;name:string;department:string;role:string;joined_on:string;exited_on:string|null;status:'Active'|'Exited'};
