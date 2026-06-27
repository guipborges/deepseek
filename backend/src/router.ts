import { Env, HttpError } from "./shared";
import { authenticate, supabase, eq } from "./shared";
import { readJson } from "./shared";
import { getMonthlyUsage, getDailyUsage, assertCanUse, recordUsage, publicUser } from "./shared";
import { deepSeekModel, normalizeEmail, assertEmail, nowIso, envNumber } from "./shared";

export async function route(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "OPTIONS") return textResponse("", { status: 204 }, env);
  if (request.method === "GET" && path === "/health") return json({ ok: true, service: "ayvu-api" }, {}, env);
  if (request.method === "GET" && path === "/auth/callback") return handleAuthCallback(env);
  if ((request.method === "GET" && path === "/me") || path === "/usage") return handleMe(request, env);
  if (request.method === "POST" && path === "/translate") return handleTranslate(request, env);
  if (request.method === "POST" && path === "/word-details") return handleWordDetails(request, env);
  if (request.method === "POST" && path === "/billing/webhook") return handleBillingWebhook(request, env);

  throw new HttpError(404, "not_found", "Route not found.");
}

// --- Handlers ---

async function handleMe(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const [usage, daily] = await Promise.all([getMonthlyUsage(env, user.id), getDailyUsage(env, user.id)]);
  return json({ ok: true, user: publicUser(user, env, usage, daily) }, {}, env);
}

function handleAuthCallback(env: Env): Response {
  const appName = env.APP_NAME || "Ayvu";
  return htmlResponse(`<!doctype html>
<html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>${appName} Login</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Segoe UI,Tahoma,sans-serif;background:#f5f7fb;color:#10213d}
main{width:min(92vw,520px);background:#fff;border:1px solid #d8e0ef;border-radius:8px;padding:22px}
h1{margin:0 0 8px;font-size:22px}p{color:#586a86;line-height:1.5}.error{color:#b00020}</style></head>
<body><main><h1>${appName}</h1><p id="status">Finalizando login...</p></main>
<script>
const e=document.getElementById("status"),q=new URLSearchParams(location.search),h=new URLSearchParams(location.hash.replace(/^#/,"")),x=q.get("extension_id")||"",s={accessToken:h.get("access_token")||"",refreshToken:h.get("refresh_token")||"",tokenType:h.get("token_type")||"bearer",expiresAt:Number(h.get("expires_at")||"0")||null,expiresIn:Number(h.get("expires_in")||"0")||null};
function f(m){e.textContent=m;e.className="error"}
if(!x)f("Extensao nao informada.");
else if(!s.accessToken)f("Sessao nao encontrada.");
else if(!window.chrome||!chrome.runtime||!chrome.runtime.sendMessage)f("Abra no Chrome com a extensao.");
else chrome.runtime.sendMessage(x,{type:"AYVU_SUPABASE_AUTH",session:s},r=>{if(chrome.runtime.lastError||!r||r.ok===false){f(chrome.runtime.lastError?.message||r?.error||"Falha.");return}
e.textContent="Login concluido. Feche esta aba.";setTimeout(()=>window.close(),1200)});
</script></body></html>`, {}, env);
}

async function handleTranslate(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const body = await readJson<{ text?: string; sourceLanguage?: string; targetLanguage?: string }>(request);
  const text = (body.text || "").trim();
  const sourceLanguage = (body.sourceLanguage || "auto").trim();
  const targetLanguage = (body.targetLanguage || "pt-BR").trim();
  const [monthly, daily] = await Promise.all([getMonthlyUsage(env, user.id), getDailyUsage(env, user.id)]);

  if (!text) throw new HttpError(400, "missing_text", "Enter text to translate.");
  assertCanUse(env, user, monthly, daily, "translate", text);

  const data = await deepSeekChat(env, {
    model: deepSeekModel(env), temperature: 0,
    max_tokens: Math.min(4000, Math.max(128, text.length * 2)),
    messages: [
      { role: "system", content: "You are a translation engine. Translate faithfully and naturally. Return only the translated text." },
      { role: "user", content: `Translate from ${sourceLanguage} to ${targetLanguage}. Keep formatting.\n\n${text}` }
    ]
  });

  const translatedText = assistantContentText(data);
  if (!translatedText) throw new HttpError(502, "empty_ai_response", "AI response did not include translated text.");
  const usage = usageFromDeepSeek(data);
  const nextUsage = await recordUsage(env, user.id, "translate", usage.inputTokens, usage.outputTokens, monthly, daily);
  return json({ ok: true, translatedText, usage, account: publicUser(user, env, nextUsage.monthly, nextUsage.daily) }, {}, env);
}

async function handleWordDetails(request: Request, env: Env): Promise<Response> {
  const { user } = await authenticate(request, env);
  const body = await readJson<{ word?: string; sourceLanguage?: string; targetLanguage?: string }>(request);
  const word = (body.word || "").trim();
  const sourceLanguage = (body.sourceLanguage || "auto").trim();
  const targetLanguage = (body.targetLanguage || "pt-BR").trim();
  const [monthly, daily] = await Promise.all([getMonthlyUsage(env, user.id), getDailyUsage(env, user.id)]);

  if (!word) throw new HttpError(400, "missing_word", "Enter a word.");
  assertCanUse(env, user, monthly, daily, "word_details", word);

  const data = await deepSeekChat(env, {
    model: deepSeekModel(env), temperature: 0, max_tokens: 1000,
    messages: [
      { role: "system", content: "You are a language learning assistant. Return ONLY valid minified JSON with no markdown, no code fences, no explanation. Required fields: pronunciation (string), synonym (string), antonym (string), synonymTranslation (string), antonymTranslation (string), example1 (string), example2 (string), pastExample (string), futureExample (string), example1Translation (string), example2Translation (string), pastExampleTranslation (string), futureExampleTranslation (string). Use short values." },
      { role: "user", content: `Word: ${word}\nSource: ${sourceLanguage}\nTarget: ${targetLanguage}\nReturn only valid JSON.` }
    ]
  });

  const rawText = assistantContentText(data);
  if (!rawText) throw new HttpError(502, "empty_ai_response", "AI response did not include word details.");
  const usage = usageFromDeepSeek(data);
  const nextUsage = await recordUsage(env, user.id, "word_details", usage.inputTokens, usage.outputTokens, monthly, daily);
  return json({ ok: true, detailsText: rawText, usage, account: publicUser(user, env, nextUsage.monthly, nextUsage.daily) }, {}, env);
}

async function handleBillingWebhook(request: Request, env: Env): Promise<Response> {
  const rawBody = await request.text();
  const sigHeader = request.headers.get("stripe-signature") || "";
  await verifyStripeSignature(env.STRIPE_WEBHOOK_SECRET, rawBody, sigHeader);

  const event = JSON.parse(rawBody) as Record<string, any>;
  const eventType = String(event?.type || "");
  const handled = ["checkout.session.completed","payment_intent.succeeded","charge.succeeded",
    "customer.subscription.created","customer.subscription.updated","invoice.paid",
    "invoice.payment_succeeded","invoice_payment.paid"];
  if (!handled.includes(eventType)) return json({ ok: true, skipped: true }, {}, env);

  const obj = event?.data?.object as Record<string, any>;
  const email = stripeObjectEmail(obj);
  assertEmail(email);

  const { ensureUserByEmail } = await import("./shared");
  const user = await ensureUserByEmail(env, email);
  if (!user) throw new HttpError(404, "user_not_found", "No account found for this email.");

  const subscriptionId = stripeProviderSubscriptionId(obj, eventType, email);
  await supabase(env, "subscriptions?on_conflict=provider_subscription_id", {
    method: "POST",
    headers: { prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify({ user_id: user.id, provider: "stripe", provider_customer_id: String(obj?.customer||""),
      provider_subscription_id: subscriptionId, status:"active", renews_at:null, ends_at:null, updated_at:nowIso() })
  });
  await supabase(env, `users?id=${eq(user.id)}`, {
    method: "PATCH", body: JSON.stringify({ plan:"pro", updated_at:nowIso() })
  });
  return json({ ok: true }, {}, env);
}

// --- AI helpers ---

async function deepSeekChat(env: Env, body: Record<string, unknown>): Promise<Record<string, any>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${env.DEEPSEEK_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(body), signal: controller.signal
    });
    const data = (await response.json().catch(() => null)) as Record<string, any> | null;
    if (!response.ok) throw new HttpError(response.status, "deepseek_error", data?.error?.message || "AI service failed.");
    return data || {};
  } finally { clearTimeout(timeout); }
}

function usageFromDeepSeek(data: Record<string, any>): { inputTokens: number; outputTokens: number } {
  return { inputTokens: Number(data?.usage?.prompt_tokens || 0), outputTokens: Number(data?.usage?.completion_tokens || 0) };
}

function assistantContentText(data: Record<string, any>): string {
  const c = data?.choices?.[0]?.message?.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) return c.map((p: any) => (typeof p === "string" ? p : p?.text || "")).join("").trim();
  const f = data?.choices?.[0]?.text;
  return typeof f === "string" ? f.trim() : "";
}

// --- Stripe helpers ---

async function verifyStripeSignature(secret: string, rawBody: string, sigHeader: string): Promise<void> {
  const parts = Object.fromEntries(sigHeader.split(",").map(p => p.split("=") as [string, string]));
  const ts = parts["t"];
  const v1 = sigHeader.split(",").filter(p => p.startsWith("v1=")).map(p => p.slice(3));
  if (!ts || !v1.length) throw new HttpError(401, "invalid_signature", "Invalid Stripe signature format.");
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new HttpError(401, "invalid_signature", "Timestamp too old.");

  const { hmacSha256Hex } = await import("./helpers");
  const expected = await hmacSha256Hex(secret, `${ts}.${rawBody}`);
  if (!v1.some(sig => timingSafeEqual(sig, expected))) throw new HttpError(401, "invalid_signature", "Invalid signature.");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i += 1) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function stripeObjectEmail(o: Record<string, any>): string {
  return normalizeEmail(o?.customer_details?.email || o?.receipt_email || o?.billing_details?.email || o?.customer_email || o?.customer?.email || "");
}

function stripeProviderSubscriptionId(o: Record<string, any>, _: string, e: string): string {
  const s = o?.subscription || o?.parent?.subscription_details?.subscription || o?.subscription_details?.subscription || "";
  const p = o?.payment_intent || o?.payment?.payment_intent || o?.charge || o?.invoice || o?.id || "";
  return String(s || p || `${e}:${_}`);
}

// --- Response helpers ---

function json(data: unknown, init: ResponseInit = {}, env?: Env): Response {
  const h = new Headers(init.headers);
  h.set("content-type", "application/json; charset=utf-8");
  setCorsHeaders(h, env);
  return new Response(JSON.stringify(data), { ...init, headers: h });
}

function textResponse(b: string, init: ResponseInit = {}, env?: Env): Response {
  const h = new Headers(init.headers);
  h.set("content-type", "text/plain; charset=utf-8");
  setCorsHeaders(h, env);
  return new Response(b, { ...init, headers: h });
}

function htmlResponse(b: string, init: ResponseInit = {}, env?: Env): Response {
  const h = new Headers(init.headers);
  h.set("content-type", "text/html; charset=utf-8");
  setCorsHeaders(h, env);
  return new Response(b, { ...init, headers: h });
}

function setCorsHeaders(h: Headers, env?: Env): void {
  h.set("access-control-allow-origin", env?.CORS_ORIGIN || "*");
  h.set("access-control-allow-methods", "GET,POST,OPTIONS");
  h.set("access-control-allow-headers", "authorization,content-type,x-device-id");
  h.set("access-control-max-age", "86400");
}
