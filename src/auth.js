// Supabase Auth client for Ayvu Extension.

const SUPABASE_CONFIG_KEY = "ayvuSupabaseConfig";
const SUPABASE_SESSION_KEY = "ayvuSupabaseSession";
const BACKEND_CONFIG_KEY = "ayvuBackendConfig";

const DEFAULT_SUPABASE_CONFIG = {
  supabaseUrl: "https://vvjsgjaesyxguudvwdrb.supabase.co",
  supabaseAnonKey: "sb_publishable_DCnMqDfnT9NcExjtmOzd0w_0KPJ2dv4"
};

const DEFAULT_BACKEND_CONFIG = {
  apiBaseUrl: "https://ayvu-api.ayvu-app.workers.dev",
  checkoutUrl: "https://buy.stripe.com/test_7sY8wR8Wa3JV6Ji3qX2go00"
};

function getStorage(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function setStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function getSupabaseConfig() {
  return {
    ...DEFAULT_SUPABASE_CONFIG,
    ...((await getStorage(SUPABASE_CONFIG_KEY)) || {})
  };
}

async function getBackendConfig() {
  return {
    ...DEFAULT_BACKEND_CONFIG,
    ...((await getStorage(BACKEND_CONFIG_KEY)) || {})
  };
}

async function updateBackendConfig(config) {
  const current = await getBackendConfig();
  await setStorage(BACKEND_CONFIG_KEY, {
    ...current,
    ...config
  });
}

async function getSupabaseSession() {
  return (await getStorage(SUPABASE_SESSION_KEY)) || null;
}

async function setSupabaseSession(session) {
  await setStorage(SUPABASE_SESSION_KEY, session);
}

async function clearSupabaseSession() {
  await setStorage(SUPABASE_SESSION_KEY, null);
}

async function getAuthRedirectUrl() {
  const backendConfig = await getBackendConfig();
  const apiBaseUrl = (backendConfig.apiBaseUrl || "").replace(/\/$/, "");
  return `${apiBaseUrl}/auth/callback?extension_id=${encodeURIComponent(chrome.runtime.id)}`;
}

async function signInWithOtp(email) {
  const config = await getSupabaseConfig();
  const url = new URL(`${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/otp`);
  url.searchParams.set("redirect_to", await getAuthRedirectUrl());

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey
    },
    body: JSON.stringify({
      email,
      create_user: true,
      data: {}
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error_description || error?.msg || "Failed to send login email");
  }

  return { ok: true };
}

async function verifyOtp(email, token) {
  const config = await getSupabaseConfig();
  const response = await fetch(`${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey
    },
    body: JSON.stringify({
      type: "email",
      email,
      token
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error_description || error?.msg || "Failed to verify code");
  }

  const data = await response.json();
  const session = {
    accessToken: data?.session?.access_token,
    refreshToken: data?.session?.refresh_token,
    userId: data?.user?.id,
    email: data?.user?.email,
    expiresAt: data?.session?.expires_at,
    expiresIn: data?.session?.expires_in
  };

  await setSupabaseSession(session);
  return { ok: true, session };
}

function normalizeSupabaseSession(data) {
  const sessionData = data?.session || data || {};
  const user = data?.user || sessionData?.user || {};
  return {
    accessToken: sessionData?.access_token,
    refreshToken: sessionData?.refresh_token,
    userId: user?.id,
    email: user?.email,
    expiresAt: sessionData?.expires_at,
    expiresIn: sessionData?.expires_in,
    tokenType: sessionData?.token_type || "bearer"
  };
}

function isSessionExpiringSoon(session) {
  const expiresAt = Number(session?.expiresAt || 0);
  if (!expiresAt) {
    return false;
  }

  const refreshWindowSeconds = 120;
  return expiresAt - Math.floor(Date.now() / 1000) <= refreshWindowSeconds;
}

async function refreshSupabaseSession(session) {
  if (!session?.refreshToken) {
    return session;
  }

  const config = await getSupabaseConfig();
  const url = new URL(`${config.supabaseUrl.replace(/\/$/, "")}/auth/v1/token`);
  url.searchParams.set("grant_type", "refresh_token");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.supabaseAnonKey
    },
    body: JSON.stringify({
      refresh_token: session.refreshToken
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.error_description || error?.msg || "Failed to refresh session");
  }

  const refreshed = normalizeSupabaseSession(await response.json());
  const nextSession = {
    ...session,
    ...refreshed,
    refreshToken: refreshed.refreshToken || session.refreshToken
  };

  await setSupabaseSession(nextSession);
  return nextSession;
}

async function getCurrentSession() {
  const session = await getSupabaseSession();
  if (!session?.accessToken) {
    return session;
  }

  if (!isSessionExpiringSoon(session)) {
    return session;
  }

  return refreshSupabaseSession(session);
}

async function signOut() {
  await clearSupabaseSession();
}

async function handleSupabaseAuthRedirectFromUrl() {
  return null;
}

async function backendRequest(path, options = {}) {
  const config = await getBackendConfig();
  const apiBaseUrl = (config.apiBaseUrl || "").replace(/\/$/, "");

  if (!apiBaseUrl) {
    throw new Error("Backend API URL is not configured.");
  }

  let session = await getCurrentSession();
  const headers = new Headers(options.headers || {});
  headers.set("content-type", "application/json");

  if (session?.accessToken) {
    headers.set("authorization", `Bearer ${session.accessToken}`);
  }

  let response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers
  });

  let data = await response.json().catch(() => null);

  if (response.status === 401 && session?.refreshToken) {
    session = await refreshSupabaseSession(session);
    headers.set("authorization", `Bearer ${session.accessToken}`);
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers
    });
    data = await response.json().catch(() => null);
  }

  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || `Backend request failed (${response.status}).`);
  }

  return data;
}

async function getBackendAccount() {
  return backendRequest("/me", { method: "GET" });
}

async function translateWithBackend(payload) {
  return backendRequest("/translate", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function wordDetailsWithBackend(payload) {
  return backendRequest("/word-details", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function getCheckoutUrl() {
  const config = await getBackendConfig();
  return (config.checkoutUrl || "").trim();
}
