import { Env, HttpError, normalizeEmail, envNumber, addDays, nowIso } from "./shared";

export async function supabase<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const url = `${env.SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${path}`;
  const headers = new Headers(init.headers);
  headers.set("apikey", env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("authorization", `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`);
  headers.set("content-type", "application/json");
  headers.set("prefer", headers.get("prefer") || "return=representation");

  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new HttpError(response.status, "supabase_error", body?.message || "Database request failed.");
  }

  return body as T;
}

export function eq(value: string): string {
  return `eq.${encodeURIComponent(value)}`;
}

export interface User {
  id: string;
  email: string;
  plan: "trial" | "pro" | "expired";
  trial_started_at: string;
  trial_ends_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const rows = await supabase<User[]>(
    env,
    `users?email=${eq(email)}&select=id,email,plan,trial_started_at,trial_ends_at&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}

export async function getUserById(env: Env, id: string): Promise<User | null> {
  const rows = await supabase<User[]>(
    env,
    `users?id=${eq(id)}&select=id,email,plan,trial_started_at,trial_ends_at&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}

export async function findAuthUserByEmail(env: Env, email: string): Promise<AuthUser | null> {
  const targetEmail = normalizeEmail(email);

  for (let page = 1; page <= 20; page += 1) {
    const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/admin/users?page=${page}&per_page=100`, {
      method: "GET",
      headers: {
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    if (!response.ok) {
      throw new HttpError(response.status, "supabase_auth_error", "Could not inspect Supabase Auth users.");
    }

    const data = (await response.json()) as { users?: Array<{ id?: string; email?: string }> };
    const authUser = (data.users || []).find((candidate) => normalizeEmail(candidate.email || "") === targetEmail);
    if (authUser?.id && authUser.email) {
      return { id: authUser.id, email: normalizeEmail(authUser.email) };
    }

    if ((data.users || []).length < 100) {
      return null;
    }
  }

  return null;
}

export async function ensureUser(env: Env, authId: string, email: string): Promise<User> {
  const existing = await getUserById(env, authId);
  if (existing) return existing;

  const trialDays = envNumber(env, "TRIAL_DAYS", 30);
  const now = new Date();
  const rows = await supabase<User[]>(env, "users", {
    method: "POST",
    body: JSON.stringify({
      id: authId,
      email,
      plan: "trial",
      trial_started_at: now.toISOString(),
      trial_ends_at: addDays(now, trialDays).toISOString()
    })
  });
  return rows[0];
}

export async function ensureUserByEmail(env: Env, email: string): Promise<User | null> {
  const existing = await getUserByEmail(env, email);
  if (existing) return existing;

  const authUser = await findAuthUserByEmail(env, email);
  if (!authUser) return null;

  return ensureUser(env, authUser.id, authUser.email);
}

export function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function verifySupabaseJwt(env: Env, token: string): Promise<{ id: string; email: string }> {
  const response = await fetch(`${env.SUPABASE_URL.replace(/\/$/, "")}/auth/v1/user`, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
      apikey: env.SUPABASE_ANON_KEY
    }
  });

  if (!response.ok) {
    throw new HttpError(401, "invalid_token", "Invalid or expired session. Sign in again.");
  }

  const data = (await response.json()) as { id?: string; email?: string };
  if (!data?.id || !data?.email) {
    throw new HttpError(401, "invalid_token", "Invalid session data.");
  }

  return { id: data.id, email: data.email };
}

export async function authenticate(request: Request, env: Env): Promise<{ user: User }> {
  const token = getBearerToken(request);
  if (!token) {
    throw new HttpError(401, "missing_token", "Sign in required.");
  }

  const authUser = await verifySupabaseJwt(env, token);
  const user = await ensureUser(env, authUser.id, authUser.email);
  return { user };
}
