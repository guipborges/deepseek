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
    model: "deepseek-v4-flash",
    max_tokens: Math.min(4000, Math.max(128, text.length * 2)),
    messages: [
      { role: "user", content: sourceLanguage === "auto"
        ? `Translate to ${targetLanguage}: ${text}`
        : `Translate from ${sourceLanguage} to ${targetLanguage}: ${text}` }
    ]
  });

  // The model always puts the final answer at the end of reasoning_content.
  // We extract it from there instead of fighting the thinking mode.
  const translatedText = extractFromDeepSeek(data, text);

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

  const rawText = assistantContentText(data, word);
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

/** Extract JSON object from text that may contain markdown code fences or surrounding text. */
/**
 * Extract the translation from a DeepSeek v4-flash response.
 *
 * The model puts the answer in EITHER content or reasoning_content.
 * Strategy:
 * 1. If there's quoted text, extract from inside quotes (handles word + phrase translations)
 * 2. If no quotes, check if the text itself IS the translation (short, different from source)
 * 3. Fall back to extracting the last word
 */
function extractFromDeepSeek(data: Record<string, any>, sourceText: string): string {
  const msg = data?.choices?.[0]?.message || {};
  const src = (sourceText || "").trim().toLowerCase();

  for (const field of ["content", "reasoning_content"]) {
    const text = msg[field];
    if (typeof text !== "string" || text.length < 1) continue;
    const trimmed = text.trim();

    // Priority 1: If the entire text is short and different from source, it IS the translation
    if (trimmed.length < 200 && trimmed.toLowerCase() !== src && !isExplanation(trimmed, src)) {
      return trimmed;
    }

    // Priority 2: Extract from quotes
    const quoted = extractQuotedText(trimmed, src);
    if (quoted) return quoted;

    // Priority 3: Extract last word
    const lastWord = extractLastTranslationWord(trimmed, src);
    if (lastWord) return lastWord;
  }

  return "";
}

/** Check if text looks like an explanation rather than a translation. */
function isExplanation(text: string, sourceText: string): boolean {
  const t = text.toLowerCase();
  // Explanation markers
  if (/^(the |in |here is|this |note |answer:)/i.test(t)) return true;
  if (t.includes("can refer") || t.includes("can be") || t.includes("depending") ||
      t.includes("context") || t.includes("meaning") || t.includes("translation") ||
      t.includes("so the answer") || t.includes("the word") || t.includes("is both") ||
      t.includes("masculine") || t.includes("feminine") || t.includes("singular") ||
      t.includes("plural") || t.includes("gender")) return true;
  return false;
}

/** Extract the best translation candidate from quoted segments in text. */
function extractQuotedText(text: string, sourceText: string): string | null {
  const src = sourceText.toLowerCase();
  const skipWords = new Set(["can","be","the","a","an","in","to","of","is","as","but","or","so"]);
  const quotes = [...text.matchAll(/["""']([^""']{1,200})["""']/g)];
  if (!quotes.length) return null;

  // Score each quote: prefer longer quotes (phrases) over short stop-words
  let best: { text: string; score: number } | null = null;
  for (const match of quotes) {
    const q = match[1].trim();
    if (!q || q.toLowerCase() === src) continue;
    // Skip very short quotes that are just stop-words
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 1 && skipWords.has(words[0].toLowerCase())) continue;
    const score = q.length;
    if (!best || score > best.score) best = { text: q, score };
  }

  return best?.text || null;
}

/**
 * Extract the last word or phrase that looks like a valid translation
 * from a block of explanatory text.
 */
function extractLastTranslationWord(text: string, sourceText: string): string | null {
  const src = sourceText.toLowerCase();
  const skipWords = new Set([
    "the","a","an","in","to","of","is","as","but","or","can","be","this","that","for","with",
    "on","at","by","from","so","if","no","not","up","down","out","off","over","under","also",
    "word","meaning","translate","called","refers","depending","context","since","without",
    "given","appropriate","likely","simple","past","tense","verb","noun","adjective","form",
    "singular","plural","portuguese","english","gender","number","masculine","feminine",
    "here","note","answer","translation","output","result","final","however","although",
    "therefore","because","then","both","answer","raised","colleague"
  ]);

  const valid = (s: string): string | null => {
    const v = s.trim();
    if (!v || v.length < 1 || v.length > 80) return null;
    const lc = v.toLowerCase();
    if (lc === src) return null;
    if (skipWords.has(lc)) return null;
    if (!/^[a-zA-Z\u00C0-\u024F]+(?:[\s-][a-zA-Z\u00C0-\u024F]+)*$/.test(v)) return null;
    return v;
  };

  // Strategy 1: text inside quotes (most reliable)
  const quotes = [...text.matchAll(/["""']([^""']{1,80})["""']/g)];
  for (let i = quotes.length - 1; i >= 0; i--) {
    const t = valid(quotes[i][1]);
    if (t) return t;
  }

  // Strategy 2: last word on last line, working backwards
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].replace(/^["""']|["""']$/g, "").trim();
    // Skip lines that end with punctuation that indicates continuation
    if (line.endsWith(":") || line.endsWith(",") || line.endsWith(".")) continue;
    const words = line.split(/[\s,;:()]+/)
      .map(w => w.replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "").trim())
      .filter(Boolean);
    for (let j = words.length - 1; j >= 0; j--) {
      const t = valid(words[j]);
      if (t) return t;
    }
  }

  // Strategy 3: scan all words backwards, find the first with PT-like suffix
  const allWords = [...text.matchAll(/\b([a-zA-Z\u00C0-\u024F]{2,})\b/g)];
  const ptSuffix = /[ãõâêîôûàèìòùáéíóúç]/;
  for (let i = allWords.length - 1; i >= 0; i--) {
    const w = allWords[i][1];
    const t = valid(w);
    if (t && ptSuffix.test(t)) return t;
  }

  return null;
}

/** Extract JSON object from text that may contain markdown code fences or surrounding text. */

/**
 * Extract the final answer from reasoning_content.
 * The model structures its reasoning like:
 *   "thinking... thinking... Finally, the translation is 'perseguido'."
 * We use multiple strategies from most to least reliable.
 */
function extractFinalAnswer(text: string, sourceText: string): string | null {
  const src = sourceText.toLowerCase();

  // Helper: check if a candidate is a valid translation
  const valid = (s: string): string | null => {
    const v = s.trim();
    if (!v || v.length < 1 || v.length > 100) return null;
    if (v.toLowerCase() === src) return null;
    if (/^(the|a|an|in|to|of|is|as|but|or|can|be|this|that|for|with|on|at|by|from)$/i.test(v)) return null;
    return v;
  };

  // Strategy 1: Look for the last text inside a code block — the model often
  // wraps the final answer in markdown code fences (``` ... ```)
  const fences = [...text.matchAll(/```(?:\w+)?\s*\n([\s\S]*?)```/g)];
  if (fences.length) {
    const last = fences[fences.length - 1][1].trim();
    const t = valid(last);
    if (t) return t;
  }

  // Strategy 2: Look for the last quoted text (single or double quotes)
  const quotes = [...text.matchAll(/["""']([^""']{1,80})["""']/g)];
  for (let i = quotes.length - 1; i >= 0; i--) {
    const t = valid(quotes[i][1]);
    if (t) return t;
  }

  // Strategy 3: Look for the last line that isn't a question/intro/sentence
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const skipWords = new Set([
    "the", "a", "an", "in", "to", "of", "is", "as", "but", "or", "can", "be",
    "word", "meaning", "translate", "called", "refers", "depending", "context",
    "since", "without", "given", "appropriate", "likely", "simple", "past",
    "tense", "verb", "noun", "adjective", "form", "singular", "plural",
    "portuguese", "english", "gender", "number", "masculine", "feminine",
    "here", "note", "answer", "translation", "output", "result", "final",
    "however", "although", "therefore", "because", "then", "so"
  ]);

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].replace(/^["""']|["""']$/g, "").trim();
    // Skip lines that are questions, start with lowercase (continuations), or contain skip words
    if (line.endsWith("?") || line.endsWith(":") || /^[a-z]/.test(line)) continue;
    // Extract the last word from the line (most likely the translation)
    const words = line.split(/[\s,;:]+/).map(w => w.replace(/^[^a-zA-Z\u00C0-\u024F]+|[^a-zA-Z\u00C0-\u024F]+$/g, "").trim()).filter(Boolean);
    for (let j = words.length - 1; j >= 0; j--) {
      const w = words[j];
      const t = valid(w);
      if (t && !skipWords.has(t.toLowerCase())) return t;
    }
  }

  // Strategy 4: Scan all words backwards, find the first word that looks like
  // Portuguese (has accent or common PT suffix)
  const allWords = [...text.matchAll(/\b([a-zA-Z\u00C0-\u024F]{2,})\b/g)];
  const ptSuffix = /[ãõâêîôûàèìòùáéíóúç].*|(?:[ao]s?|[ãõ]o|[çc][aã]o|dade|mente|idade|ndo|ção|[ck]now|[i]ng)$/i;
  for (let i = allWords.length - 1; i >= 0; i--) {
    const w = allWords[i][1];
    const t = valid(w);
    if (t && ptSuffix.test(t)) return t;
  }

  return null;
}

function extractJsonFromText(text: string): string {
  const raw = (text || "").trim();
  if (!raw) throw new Error("Empty response.");
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) return codeBlockMatch[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return raw.slice(firstBrace, lastBrace + 1);
  return raw;
}

/** Try to parse translation from JSON response. */
function tryParseJsonTranslation(raw: string): string {
  try {
    const json = extractJsonFromText(raw);
    const parsed = JSON.parse(json);
    const t = (parsed.translation || "").trim();
    if (t) return t;
  } catch (_) { /* not JSON */ }
  return "";
}

/** Extract the last word from explanatory text that differs from the source. */
function extractLastWord(text: string, sourceText: string): string {
  const src = (sourceText || "").toLowerCase();

  // Strategy 1: find the last quoted word
  const dq = [...text.matchAll(/["""']([^""']+)["""']/g)];
  for (let i = dq.length - 1; i >= 0; i--) {
    const c = dq[i][1].trim();
    if (c && c.toLowerCase() !== src && c.length < 60 && /^[a-zA-Z\u00C0-\u024F\s-]+$/.test(c)) return c;
  }

  // Strategy 2: look for the last standalone word (not stop-word) that differs from source
  const stopWords = new Set(["the", "a", "an", "in", "to", "of", "is", "as", "but", "or", "can", "be",
    "word", "meaning", "translate", "portuguese", "português", "english", "refers", "depending",
    "context", "since", "typically", "usually", "however", "without", "given", "appropriate",
    "likely", "simple", "past", "tense", "verb", "noun", "adjective", "form", "singular", "plural"]);
  const words = text.split(/[\s,;.()]+/).map(w => w.replace(/^["""']|["""']$/g, "").trim()).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const w = words[i].toLowerCase();
    if (w.length >= 2 && w !== src && !stopWords.has(w) && /^[a-zA-Z\u00C0-\u024F]+$/.test(w)) return words[i];
  }

  return "";
}

function assistantContentText(data: Record<string, any>, sourceText?: string): string {
  const msg = data?.choices?.[0]?.message || {};
  const src = (sourceText || "").trim().toLowerCase();

  // Helper: return text only if it's non-empty and different from source
  const valid = (t: string): string | null => {
    const v = t.trim();
    if (!v) return null;
    if (src && v.toLowerCase() === src) return null; // same as source = not a real translation
    return v;
  };

  // Try content first
  const c = msg.content;
  if (typeof c === "string") { const t = valid(c); if (t) return t; }
  if (Array.isArray(c)) {
    for (const part of c) {
      if (typeof part === "string") { const t = valid(part); if (t) return t; }
      if (part?.text) { const t = valid(part.text); if (t) return t; }
    }
  }

  // Fallback: extract translation from reasoning_content.
  // DeepSeek reasoning models (v4-flash, R1) return content: null and put
  // the final answer at the END of reasoning_content, often after markers
  // like "Final answer:", "Output:", "Translation:", "Therefore,", or after "```".
  const r = msg.reasoning_content;
  if (typeof r === "string" && r.length > 10) {
    // Strategy 1: find text after common answer markers like "Final answer:", "Translation:"
    const markerMatch = r.match(
      /(?:final\s+answer|translation|output|result|the translation\s+is|in\s+portuguese|portugu[eê]s)[:\s]*["""']?\s*(.+?)\s*["""']?\s*$/im
    );
    if (markerMatch?.[1]) { const t = valid(markerMatch[1]); if (t) return t; }

    // Strategy 2: look for text after a code-fence block
    const fenceMatch = r.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
    if (fenceMatch?.[1]) { const t = valid(fenceMatch[1]); if (t) return t; }

    // Strategy 3: take everything after the LAST occurrence of "Answer:" or "Translation:" or "Output:"
    const lastMarker = r.match(
      /(?:final\s+answer|translation|output|result|answer)[:\s]*["""']?\s*((?:.|\n)+?)\s*["""']?\s*$/im
    );
    if (lastMarker?.[1]) { const t = valid(lastMarker[1]); if (t) return t; }

    // Strategy 4: find the LAST quoted text that differs from the source
    const dq = [...r.matchAll(/"([^"]+)"/g)];
    if (dq.length) {
      for (let i = dq.length - 1; i >= 0; i--) {
        const t = valid(dq[i][1]);
        if (t) return t;
      }
    }

    // Strategy 5: look for phrases like "I'll go with", "equivalent is", "would use",
    // "the best", "I think", followed by a quoted word or a Portuguese-looking word
    const choiceMatch = r.match(
      /(?:i(?:'ll|\s+would)\s+(?:go\s+with|use|choose|say|pick)|equivalent\s+is|best\s+translation|most\s+common|likely\s+is|probably\s+is|would\s+be|translate\s+to|in\s+portuguese|\u00e9\s+[""'']?)\s*["""']?\s*([a-zA-Z\u00C0-\u024F]+(?:[\s-][a-zA-Z\u00C0-\u024F]+)?)\b/i
    );
    if (choiceMatch?.[1]) { const t = valid(choiceMatch[1]); if (t) return t; }

    // Strategy 6: find the last word in the text that looks like Portuguese
    // (ends with -o, -a, -ão, -ar, -er, -ir, -ndo, -ção, -dade, -mente, etc.)
    // and is not the source word
    const ptWordMatches = [...r.matchAll(/\b([a-zA-Z\u00C0-\u024F]+(?:[-\s][a-zA-Z\u00C0-\u024F]+)?)\b/g)];
    const ptSuffixRe = /[a-zA-Z\u00C0-\u024F]*(?:[ãõâêîôûàèìòùáéíóúç][a-z]*|[ao]s?|[ãõ]o|[çc][aã]o|[dD]ade|[mM]ente|[iI]dade|[vV]el|[vV]elmente)[a-z]*$/i;
    for (let i = ptWordMatches.length - 1; i >= 0; i--) {
      const word = ptWordMatches[i][1].trim();
      const t = valid(word);
      if (t && t.length >= 3 && t.length < 60 && ptSuffixRe.test(t)) return t;
    }

    // Strategy 7: last non-empty line after splitting, filtered
    const lines = r.split("\n").map((l) => l.trim()).filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].replace(/^[""']|[""']$/g, "").trim();
      const t = valid(line);
      if (t && t.length < 120 &&
          !t.toLowerCase().includes("translate") &&
          !t.toLowerCase().includes("called") &&
          !t.toLowerCase().includes("meaning") &&
          !t.toLowerCase().includes("word") &&
          !t.toLowerCase().includes("origin") &&
          !t.toLowerCase().includes("equivalent") &&
          !t.toLowerCase().includes("cognate") &&
          !t.toLowerCase().includes("gender") &&
          !t.toLowerCase().includes("context") &&
          !t.toLowerCase().includes("neutral")) return t;
    }

    return "";
  }

  const f = data?.choices?.[0]?.text;
  if (typeof f === "string") { const t = valid(f); if (t) return t; }
  return "";
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
