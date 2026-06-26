import { Env, HttpError } from "./types";

export async function readJson<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch (_error) {
    throw new HttpError(400, "invalid_json", "Invalid JSON body.");
  }
}

export function envNumber(env: Env, key: keyof Env, fallback: number): number {
  const value = Number(env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function deepSeekModel(env: Env): string {
  return env.DEEPSEEK_MODEL || "deepseek-v4-flash";
}

export function normalizeEmail(email: string): string {
  return (email || "").trim().toLowerCase();
}

export function assertEmail(email: string): void {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "invalid_email", "Enter a valid email address.");
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

export function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
