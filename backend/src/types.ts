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

export type RequestType = "translate" | "word_details";

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

export interface UsageMonthly {
  id?: string;
  user_id: string;
  month: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  translation_count: number;
  details_count: number;
}

export interface UsageDaily {
  id?: string;
  user_id: string;
  day: string;
  translation_count: number;
  details_count: number;
}

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
