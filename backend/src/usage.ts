import { Env, User, UsageMonthly, UsageDaily, RequestType, HttpError } from "./types";
import { envNumber, monthKey, dayKey, nowIso } from "./helpers";
import { supabase, eq } from "./db";

export function isTrialActive(user: User): boolean {
  return user.plan === "trial" && new Date(user.trial_ends_at).getTime() > Date.now();
}

export function effectivePlan(user: User): "trial" | "pro" | "expired" {
  if (user.plan === "pro") return "pro";
  if (isTrialActive(user)) return "trial";
  return "expired";
}

export function getLimits(env: Env, plan: "trial" | "pro" | "expired"): Record<string, number> {
  if (plan === "pro") {
    return {
      monthlyTokens: envNumber(env, "PRO_MONTHLY_TOKENS", 1000000),
      dailyTranslations: envNumber(env, "PRO_DAILY_TRANSLATIONS", 300),
      dailyDetails: 999999,
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

export function publicUser(user: User, env: Env, usage?: UsageMonthly, daily?: UsageDaily): Record<string, unknown> {
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

export async function getMonthlyUsage(env: Env, userId: string): Promise<UsageMonthly> {
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

export async function getDailyUsage(env: Env, userId: string): Promise<UsageDaily> {
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

export function assertCanUse(
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

export async function recordUsage(
  env: Env,
  userId: string,
  requestType: RequestType,
  inputTokens: number,
  outputTokens: number,
  currentMonthly: UsageMonthly,
  currentDaily: UsageDaily
): Promise<{ monthly: UsageMonthly; daily: UsageDaily }> {
  const totalTokens = inputTokens + outputTokens;
  const month = monthKey();
  const day = dayKey();

  const nextMonthly = {
    user_id: userId,
    month,
    input_tokens: currentMonthly.input_tokens + inputTokens,
    output_tokens: currentMonthly.output_tokens + outputTokens,
    total_tokens: currentMonthly.total_tokens + totalTokens,
    translation_count: currentMonthly.translation_count + (requestType === "translate" ? 1 : 0),
    details_count: currentMonthly.details_count + (requestType === "word_details" ? 1 : 0),
    updated_at: nowIso()
  };

  const nextDaily = {
    user_id: userId,
    day,
    translation_count: currentDaily.translation_count + (requestType === "translate" ? 1 : 0),
    details_count: currentDaily.details_count + (requestType === "word_details" ? 1 : 0),
    updated_at: nowIso()
  };

  await Promise.all([
    supabase(env, "usage_monthly?on_conflict=user_id,month", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(nextMonthly)
    }),
    supabase(env, "usage_daily?on_conflict=user_id,day", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(nextDaily)
    }),
    supabase(env, "translation_logs", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        request_type: requestType,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens
      })
    })
  ]);

  return { monthly: nextMonthly, daily: nextDaily };
}
