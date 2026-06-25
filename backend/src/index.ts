export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  DEEPSEEK_API_KEY: string;
  DEEPSEEK_MODEL: string;
  STRIPE_WEBHOOK_SECRET: string;
  APP_NAME: string;
  APP_URL: string;
  CHECKOUT_URL: string;
  CORS_ORIGIN: string;
  TRIAL_DAYS: string;
  TRIAL_TRANSLATIONS: string;
  TRIAL_TOKENS: string;
  PRO_MONTHLY_TOKENS: string;
  PRO_DAILY_TRANSLATIONS: string;
  PRO_DAILY_DETAILS: string;
  MAX_TRANSLATION_CHARS: string;
}

type RequestType = "translate" | "word_details";

interface User {
  id: string;
  email: string;
  plan: "trial" | "pro" | "expired";
  trial_started_at: string;
  trial_ends_at: string;
}

interface UsageMonthly {
  id?: string;
  user_id: string;
  month: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  translation_count: number;
  details_count: number;
}

interface UsageDaily {
  id?: string;
  user_id: string;
  day: string;
  translation_count: number;
  details_count: number;
}

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(data: unknown, init: ResponseInit = {}, env?: Env): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  setCorsHeaders(headers, env);
  return new Response(JSON.stringify(data), { ...init, headers });
}

function setCorsHeaders(headers: Headers, env?: Env): void {
  headers.set("access-control-allow-origin", env?.CORS_ORIGIN || "*");
  headers.set("access-control-allow-methods", "GET,POST,OPTIONS");
  headers.set("access-control-allow-headers", "authorization,content-type,x-device-id");
  headers.set("access-control-max-age", "86400");
}

function textResponse(body: string, init: ResponseInit = {}, env?: Env): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/plain; charset=utf-8");
  setCorsHeaders(headers, env);
  return new Response(body, { ...init, headers });
}

async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch (_error) {
    throw new HttpError(400, "invalid_json", "Invalid JSON body.");
  }
}

function envNumber(env: Env, key: keyof Env, fallback: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function deepSeekModel(env: Env): string {
  return env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid_email", "Enter a valid email address.");
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

async function supabase<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
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

function eq(value: string): string {
  return `eq.${encodeURIComponent(value)}`;
}

async function getUserByEmail(env: Env, email: string): Promise<User | null> {
  const rows = await supabase<User[]>(
    env,
    `users?email=${eq(email)}&select=id,email,plan,trial_started_at,trial_ends_at&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}

async function getUserById(env: Env, id: string): Promise<User | null> {
  const rows = await supabase<User[]>(
    env,
    `users?id=${eq(id)}&select=id,email,plan,trial_started_at,trial_ends_at&limit=1`,
    { method: "GET" }
  );
  return rows[0] || null;
}

async function ensureUser(env: Env, authId: string, email: string): Promise<User> {
  const existing = await getUserById(env, authId);
  if (existing) {
    return existing;
  }

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

function getBearerToken(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

async function verifySupabaseJwt(env: Env, token: string): Promise<{ id: string; email: string }> {
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

async function authenticate(request: Request, env: Env): Promise<{ user: User }> {
  const token = getBearerToken(request);
  if (!token) {
    throw new HttpError(401, "missing_token", "Sign in required.");
  }

  const authUser = await verifySupabaseJwt(env, token);
  const user = await ensureUser(env, authUser.id, authUser.email);
  return { user };
}

function isTrialActive(user: User): boolean {
  return user.plan === "trial" && new Date(user.trial_ends_at).getTime() > Date.now();
}

function effectivePlan(user: User): "trial" | "pro" | "expired" {
  if (user.plan === "pro") {
    return "pro";
  }
  if (isTrialActive(user)) {
    return "trial";
  }
  return "expired";
}

function publicUser(user: User, env: Env, usage?: UsageMonthly, daily?: UsageDaily): Record<string, unknown> {
  const plan = effectivePlan(user);
  const limits = getLimits(env, plan);
  return {
    id: user.id,
    email: user.email,
    plan,
    trialEndsAt: user.trial_ends_at,
    checkoutUrl: env.CHECKOUT_URL,
    limits,
    usage: usage || null,
    dailyUsage: daily || null
  };
}

function getLimits(env: Env, plan: "trial" | "pro" | "expired"): Record<string, number> {
  if (plan === "pro") {
    return {
      monthlyTokens: envNumber(env, "PRO_MONTHLY_TOKENS", 100000),
      dailyTranslations: envNumber(env, "PRO_DAILY_TRANSLATIONS", 300),
      dailyDetails: envNumber(env, "PRO_DAILY_DETAILS", 20),
      maxTranslationChars: envNumber(env, "MAX_TRANSLATION_CHARS", 2000)
    };
  }

  if (plan === "trial") {
    return {
      monthlyTokens: envNumber(env, "TRIAL_TOKENS", 10000),
      totalTranslations: envNumber(env, "TRIAL_TRANSLATIONS", 100),
      dailyTranslations: 50,
      dailyDetails: 5,
      maxTranslationChars: envNumber(env, "MAX_TRANSLATION_CHARS", 2000)
    };
  }

  return {
    monthlyTokens: 0,
    totalTranslations: 0,
    dailyTranslations: 0,
    dailyDetails: 0,
    maxTranslationChars: envNumber(env, "MAX_TRANSLATION_CHARS", 2000)
  };
}

async function getMonthlyUsage(env: Env, userId: string): Promise<UsageMonthly> {
  const month = monthKey();
  const rows = await supabase<UsageMonthly[]>(
    env,
    `usage_monthly?user_id=${eq(userId)}&month=${eq(month)}&select=*&limit=1`,
    { method: "GET" }
  );
  return (
    rows[0] || {
      user_id: userId,
      month,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
      translation_count: 0,
      details_count: 0
    }
  );
}

async function getDailyUsage(env: Env, userId: string): Promise<UsageDaily> {
  const day = dayKey();
  const rows = await supabase<UsageDaily[]>(
    env,
    `usage_daily?user_id=${eq(userId)}&day=${eq(day)}&select=*&limit=1`,
    { method: "GET" }
  );
  return (
    rows[0] || {
      user_id: userId,
      day,
      translation_count: 0,
      details_count: 0
    }
  );
}

async function handleMe(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const usage = await getMonthlyUsage(env, user.id);
  const daily = await getDailyUsage(env, user.id);
  return json({ ok: true, user: publicUser(user, env, usage, daily) }, {}, env);
}

function htmlResponse(body: string, init: ResponseInit = {}, env?: Env): Response {
  const headers = new Headers(init.headers);
  headers.set("content-type", "text/html; charset=utf-8");
  setCorsHeaders(headers, env);
  return new Response(body, { ...init, headers });
}

function handleAuthCallback(env: Env): Response {
  const appName = env.APP_NAME || "Ayvu";
  return htmlResponse(
    `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${appName} Login</title>
    <style>
      body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Segoe UI,Tahoma,sans-serif;background:#f5f7fb;color:#10213d}
      main{width:min(92vw,520px);background:#fff;border:1px solid #d8e0ef;border-radius:8px;padding:22px}
      h1{margin:0 0 8px;font-size:22px}p{color:#586a86;line-height:1.5}.error{color:#b00020}
    </style>
  </head>
  <body>
    <main>
      <h1>${appName}</h1>
      <p id="status">Finalizando login...</p>
    </main>
    <script>
      const statusEl = document.getElementById("status");
      const query = new URLSearchParams(location.search);
      const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
      const extensionId = query.get("extension_id") || "";
      const session = {
        accessToken: hash.get("access_token") || "",
        refreshToken: hash.get("refresh_token") || "",
        tokenType: hash.get("token_type") || "bearer",
        expiresAt: Number(hash.get("expires_at") || "0") || null,
        expiresIn: Number(hash.get("expires_in") || "0") || null
      };

      function fail(message) {
        statusEl.textContent = message;
        statusEl.className = "error";
      }

      if (!extensionId) {
        fail("Extensao nao informada. Solicite um novo email pelo popup.");
      } else if (!session.accessToken) {
        fail("Sessao nao encontrada. Solicite um novo email pelo popup.");
      } else if (!window.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        fail("Abra este link no Google Chrome com a extensao instalada.");
      } else {
        chrome.runtime.sendMessage(extensionId, { type: "AYVU_SUPABASE_AUTH", session }, (response) => {
          if (chrome.runtime.lastError || !response || response.ok === false) {
            fail(chrome.runtime.lastError?.message || response?.error || "Nao foi possivel conectar com a extensao.");
            return;
          }
          statusEl.textContent = "Login concluido. Voce pode fechar esta aba e voltar para a extensao.";
          setTimeout(() => window.close(), 1200);
        });
      }
    </script>
  </body>
</html>`,
    {},
    env
  );
}

function assertCanUse(
  env: Env,
  user: User,
  monthly: UsageMonthly,
  daily: UsageDaily,
  requestType: RequestType,
  text: string
): void {
  const plan = effectivePlan(user);
  const limits = getLimits(env, plan);

  if (plan === "expired") {
    throw new HttpError(402, "trial_expired", "Your free trial has ended. Upgrade to continue translating.");
  }

  if (text.length > limits.maxTranslationChars) {
    throw new HttpError(400, "text_too_long", "Text is too long. Select a shorter passage.");
  }

  if (monthly.total_tokens >= limits.monthlyTokens) {
    throw new HttpError(402, "quota_exceeded", "Monthly usage limit reached.");
  }

  if (plan === "trial" && monthly.translation_count >= (limits.totalTranslations || 0)) {
    throw new HttpError(402, "trial_quota_exceeded", "Free trial translation limit reached.");
  }

  if (requestType === "translate" && daily.translation_count >= limits.dailyTranslations) {
    throw new HttpError(429, "daily_translation_limit", "Daily translation limit reached.");
  }

  if (requestType === "word_details" && daily.details_count >= limits.dailyDetails) {
    throw new HttpError(429, "daily_details_limit", "Daily word-details limit reached.");
  }
}

async function recordUsage(
  env: Env,
  userId: string,
  requestType: RequestType,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  const totalTokens = inputTokens + outputTokens;
  const month = monthKey();
  const day = dayKey();
  const monthly = await getMonthlyUsage(env, userId);
  const daily = await getDailyUsage(env, userId);

  const nextMonthly = {
    user_id: userId,
    month,
    input_tokens: monthly.input_tokens + inputTokens,
    output_tokens: monthly.output_tokens + outputTokens,
    total_tokens: monthly.total_tokens + totalTokens,
    translation_count: monthly.translation_count + (requestType === "translate" ? 1 : 0),
    details_count: monthly.details_count + (requestType === "word_details" ? 1 : 0),
    updated_at: nowIso()
  };

  const nextDaily = {
    user_id: userId,
    day,
    translation_count: daily.translation_count + (requestType === "translate" ? 1 : 0),
    details_count: daily.details_count + (requestType === "word_details" ? 1 : 0),
    updated_at: nowIso()
  };

  await supabase(env, "usage_monthly?on_conflict=user_id,month", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(nextMonthly)
  });

  await supabase(env, "usage_daily?on_conflict=user_id,day", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(nextDaily)
  });

  await supabase(env, "translation_logs", {
    method: "POST",
    body: JSON.stringify({
      user_id: userId,
      request_type: requestType,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens
    })
  });
}

async function deepSeekChat(env: Env, body: Record<string, unknown>): Promise<Record<string, any>> {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = (await response.json().catch(() => null)) as Record<string, any> | null;

  if (!response.ok) {
    throw new HttpError(response.status, "deepseek_error", data?.error?.message || "AI service failed.");
  }

  return data || {};
}

function usageFromDeepSeek(data: Record<string, any>): { inputTokens: number; outputTokens: number } {
  return {
    inputTokens: Number(data?.usage?.prompt_tokens || 0),
    outputTokens: Number(data?.usage?.completion_tokens || 0)
  };
}

function normalizeTranslatedText(text: string): string {
  return (text || "").trim();
}

async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const body = await readJson<{
    text?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  }>(request);
  const text = (body.text || "").trim();
  const sourceLanguage = (body.sourceLanguage || "auto").trim();
  const targetLanguage = (body.targetLanguage || "pt-BR").trim();
  const monthly = await getMonthlyUsage(env, user.id);
  const daily = await getDailyUsage(env, user.id);

  if (!text) {
    throw new HttpError(400, "missing_text", "Enter text to translate.");
  }

  assertCanUse(env, user, monthly, daily, "translate", text);

  const data = await deepSeekChat(env, {
    model: deepSeekModel(env),
    temperature: 0,
    messages: [
      {
        role: "system",
        content: "You are a translation engine. Translate faithfully and naturally. Return only the translated text."
      },
      {
        role: "user",
        content:
          `Translate the following text from ${sourceLanguage} to ${targetLanguage}. ` +
          "Keep formatting and return only the translation.\n\n" +
          text
      }
    ]
  });

  const translatedText = normalizeTranslatedText(data?.choices?.[0]?.message?.content || "");
  if (!translatedText) {
    throw new HttpError(502, "empty_ai_response", "AI response did not include translated text.");
  }

  const usage = usageFromDeepSeek(data);
  await recordUsage(env, user.id, "translate", usage.inputTokens, usage.outputTokens);
  const nextMonthly = await getMonthlyUsage(env, user.id);
  const nextDaily = await getDailyUsage(env, user.id);
  return json(
    {
      ok: true,
      translatedText,
      usage,
      account: publicUser(user, env, nextMonthly, nextDaily)
    },
    {},
    env
  );
}

async function handleWordDetails(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const body = await readJson<{
    word?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
  }>(request);
  const word = (body.word || "").trim();
  const sourceLanguage = (body.sourceLanguage || "auto").trim();
  const targetLanguage = (body.targetLanguage || "pt-BR").trim();
  const monthly = await getMonthlyUsage(env, user.id);
  const daily = await getDailyUsage(env, user.id);

  if (!word) {
    throw new HttpError(400, "missing_word", "Enter a word or short term.");
  }

  assertCanUse(env, user, monthly, daily, "word_details", word);

  const data = await deepSeekChat(env, {
    model: deepSeekModel(env),
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Return only valid JSON with fields: pronunciation, synonym, antonym, synonymTranslation, antonymTranslation, example1, example2, pastExample, futureExample, example1Translation, example2Translation, pastExampleTranslation, futureExampleTranslation. Keep each field concise."
      },
      {
        role: "user",
        content:
          `Word/term: ${word}\nSource language: ${sourceLanguage}\nTarget language: ${targetLanguage}\n` +
          "Provide concise language-learning details and translations."
      }
    ]
  });

  const rawText = normalizeTranslatedText(data?.choices?.[0]?.message?.content || "");
  if (!rawText) {
    throw new HttpError(502, "empty_ai_response", "AI response did not include word details.");
  }

  const usage = usageFromDeepSeek(data);
  await recordUsage(env, user.id, "word_details", usage.inputTokens, usage.outputTokens);
  const nextMonthly = await getMonthlyUsage(env, user.id);
  const nextDaily = await getDailyUsage(env, user.id);
  return json({ ok: true, detailsText: rawText, usage, account: publicUser(user, env, nextMonthly, nextDaily) }, {}, env);
}

async function verifyStripeSignature(secret: string, rawBody: string, sigHeader: string): Promise<void> {
  // Stripe signature format: t=timestamp,v1=sig1,v1=sig2,...
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => p.split("=") as [string, string])
  );
  const timestamp = parts["t"];
  const v1 = sigHeader.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));

  if (!timestamp || v1.length === 0) {
    throw new HttpError(401, "invalid_signature", "Invalid Stripe signature format.");
  }

  // Reject webhooks older than 5 minutes to prevent replay attacks
  const tolerance = 300;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > tolerance) {
    throw new HttpError(401, "invalid_signature", "Stripe webhook timestamp too old.");
  }

  const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
  if (!v1.some((sig) => timingSafeEqual(sig, expected))) {
    throw new HttpError(401, "invalid_signature", "Invalid Stripe webhook signature.");
  }
}

async function handleBillingWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature") || "";

  await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, sigHeader);

  const event = JSON.parse(rawBody) as Record<string, any>;
  const eventType = String(event?.type || "");

  // Only handle relevant payment events
  const handled = ["checkout.session.completed", "payment_intent.succeeded", "charge.succeeded"];
  if (!handled.includes(eventType)) {
    return json({ ok: true, skipped: true }, {}, env);
  }

  const obj = event?.data?.object as Record<string, any>;
  const email = normalizeEmail(
    obj?.customer_details?.email ||
    obj?.receipt_email ||
    obj?.billing_details?.email ||
    ""
  );
  assertEmail(email);

  const user = await getUserByEmail(env, email);
  if (!user) {
    throw new HttpError(404, "user_not_found", "No account found for this email.");
  }

  const paymentIntentId = String(obj?.payment_intent || obj?.id || "");
  const customerId = String(obj?.customer || "");

  await supabase(env, "subscriptions?on_conflict=provider_subscription_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({
      user_id: user.id,
      provider: "stripe",
      provider_customer_id: customerId || null,
      provider_subscription_id: paymentIntentId || `${email}:${eventType}:${Date.now()}`,
      status: "active",
      renews_at: null,
      ends_at: null,
      updated_at: nowIso()
    })
  });

  await supabase(env, `users?id=${eq(user.id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      plan: "pro",
      updated_at: nowIso()
    })
  });

  return json({ ok: true }, {}, env);
}

async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "OPTIONS") {
    return textResponse("", { status: 204 }, env);
  }

  if (request.method === "GET" && path === "/health") {
    return json({ ok: true, service: "ayvu-api" }, {}, env);
  }

  if (request.method === "GET" && path === "/auth/callback") {
    return handleAuthCallback(env);
  }

  if (request.method === "GET" && path === "/me") {
    return handleMe(request, env);
  }

  if (request.method === "GET" && path === "/usage") {
    return handleMe(request, env);
  }

  if (request.method === "POST" && path === "/translate") {
    return handleTranslate(request, env);
  }

  if (request.method === "POST" && path === "/word-details") {
    return handleWordDetails(request, env);
  }

  if (request.method === "POST" && path === "/billing/webhook") {
    return handleBillingWebhook(request, env);
  }

  throw new HttpError(404, "not_found", "Route not found.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await route(request, env);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ ok: false, code: error.code, error: error.message }, { status: error.status }, env);
      }

      const message = error instanceof Error ? error.message : "Unexpected error.";
      return json({ ok: false, code: "internal_error", error: message }, { status: 500 }, env);
    }
  }
};
