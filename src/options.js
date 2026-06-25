const SETTINGS_KEY = "deepseekTranslatorSettings";

const backendApiUrlInput = document.getElementById("backendApiUrl");
const checkoutUrlInput = document.getElementById("checkoutUrl");
const accountStatusText = document.getElementById("accountStatusText");
const accountUsageText = document.getElementById("accountUsageText");
const logoutBtn = document.getElementById("logoutBtn");
const targetLanguageInput = document.getElementById("targetLanguage");
const popupWidthInput = document.getElementById("popupWidth");
const popupHeightInput = document.getElementById("popupHeight");
const themeModeSelect = document.getElementById("themeMode");
const appLanguageSelect = document.getElementById("appLanguage");
const openOnTClickInput = document.getElementById("openOnTClick");
const openOnDoubleClickInput = document.getElementById("openOnDoubleClick");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

let currentUiLanguage = "pt-BR";

const UI_TEXTS = {
  pt: {
    pageTitle: "Configuracoes - DeepSeek Translator",
    title: "Configuracoes",
    backendApiUrl: "URL da API",
    checkoutUrl: "Link de checkout",
    accountDisconnected: "Conta nao conectada",
    accountDisconnectedHelp: "Entre pelo popup para ativar o trial.",
    accountTrial: "Trial ativo",
    accountPro: "Plano anual ativo",
    accountExpired: "Trial encerrado",
    accountUsage: "{used}/{limit} tokens este mes",
    logout: "Sair",
    targetLanguage: "Idioma de destino",
    popupWidth: "Largura do popup (px)",
    popupHeight: "Altura do popup (px)",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Escuro",
    appLanguage: "Lingua do app",
    popupOpenTriggerLegend: "Abertura do popup principal",
    openOnTClick: "Abre popup ao clicar no T",
    openOnDoubleClick: "Abre popup so com duplo clique na palavra",
    save: "Salvar",
    saved: "Configuracoes salvas.",
    signedOut: "Sessao encerrada.",
    saveFailed: "Falha ao salvar: ",
    loadFailed: "Falha ao carregar: "
  },
  en: {
    pageTitle: "Settings - DeepSeek Translator",
    title: "Settings",
    backendApiUrl: "API URL",
    checkoutUrl: "Checkout link",
    accountDisconnected: "Account not connected",
    accountDisconnectedHelp: "Sign in from the popup to start the trial.",
    accountTrial: "Trial active",
    accountPro: "Annual plan active",
    accountExpired: "Trial ended",
    accountUsage: "{used}/{limit} tokens this month",
    logout: "Sign out",
    targetLanguage: "Target language",
    popupWidth: "Popup width (px)",
    popupHeight: "Popup height (px)",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    appLanguage: "App language",
    popupOpenTriggerLegend: "Main popup opening",
    openOnTClick: "Open popup when clicking the T button",
    openOnDoubleClick: "Open popup only on word double-click",
    save: "Save",
    saved: "Settings saved.",
    signedOut: "Signed out.",
    saveFailed: "Failed to save: ",
    loadFailed: "Failed to load: "
  },
  de: {
    pageTitle: "Einstellungen - DeepSeek Translator",
    title: "Einstellungen",
    backendApiUrl: "API-URL",
    checkoutUrl: "Checkout-Link",
    accountDisconnected: "Konto nicht verbunden",
    accountDisconnectedHelp: "Melden Sie sich im Popup an, um die Testphase zu starten.",
    accountTrial: "Testphase aktiv",
    accountPro: "Jahresplan aktiv",
    accountExpired: "Testphase beendet",
    accountUsage: "{used}/{limit} Tokens diesen Monat",
    logout: "Abmelden",
    targetLanguage: "Zielsprache",
    popupWidth: "Popup-Breite (px)",
    popupHeight: "Popup-Hoehe (px)",
    theme: "Design",
    themeLight: "Hell",
    themeDark: "Dunkel",
    appLanguage: "App-Sprache",
    popupOpenTriggerLegend: "Haupt-Popup oeffnen",
    openOnTClick: "Popup bei Klick auf T oeffnen",
    openOnDoubleClick: "Popup nur bei Doppelklick auf Wort oeffnen",
    save: "Speichern",
    saved: "Einstellungen gespeichert.",
    signedOut: "Abgemeldet.",
    saveFailed: "Speichern fehlgeschlagen: ",
    loadFailed: "Laden fehlgeschlagen: "
  }
};

function getUiLanguageCode(language) {
  const code = (language || "pt-BR").toLowerCase();
  if (code.startsWith("pt")) return "pt";
  if (code.startsWith("de")) return "de";
  return "en";
}

function t(key) {
  const ui = UI_TEXTS[getUiLanguageCode(currentUiLanguage)] || UI_TEXTS.pt;
  return ui[key] || UI_TEXTS.pt[key] || key;
}

function updateTextNodeForLabel(label, text) {
  const textNodes = Array.from(label.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
  for (const node of textNodes) {
    label.removeChild(node);
  }
  label.appendChild(document.createTextNode(` ${text}`));
}

function updateOptionsLabels() {
  document.documentElement.lang = currentUiLanguage;
  document.title = t("pageTitle");

  const titleEl = document.querySelector("h1");
  if (titleEl) titleEl.textContent = t("title");

  const labels = {
    backendApiUrl: document.querySelector('label[for="backendApiUrl"]'),
    checkoutUrl: document.querySelector('label[for="checkoutUrl"]'),
    targetLanguage: document.querySelector('label[for="targetLanguage"]'),
    popupWidth: document.querySelector('label[for="popupWidth"]'),
    popupHeight: document.querySelector('label[for="popupHeight"]'),
    themeMode: document.querySelector('label[for="themeMode"]'),
    appLanguage: document.querySelector('label[for="appLanguage"]')
  };

  if (labels.backendApiUrl) labels.backendApiUrl.textContent = t("backendApiUrl");
  if (labels.checkoutUrl) labels.checkoutUrl.textContent = t("checkoutUrl");
  if (labels.targetLanguage) labels.targetLanguage.textContent = t("targetLanguage");
  if (labels.popupWidth) labels.popupWidth.textContent = t("popupWidth");
  if (labels.popupHeight) labels.popupHeight.textContent = t("popupHeight");
  if (labels.themeMode) labels.themeMode.textContent = t("theme");
  if (labels.appLanguage) labels.appLanguage.textContent = t("appLanguage");

  const popupOpenTriggerLegend = document.getElementById("popupOpenTriggerLegend");
  const openOnTClickLabel = document.querySelector('label[for="openOnTClick"]');
  const openOnDoubleClickLabel = document.querySelector('label[for="openOnDoubleClick"]');
  if (popupOpenTriggerLegend) popupOpenTriggerLegend.textContent = t("popupOpenTriggerLegend");
  if (openOnTClickLabel) updateTextNodeForLabel(openOnTClickLabel, t("openOnTClick"));
  if (openOnDoubleClickLabel) updateTextNodeForLabel(openOnDoubleClickLabel, t("openOnDoubleClick"));

  if (themeModeSelect.options.length >= 2) {
    themeModeSelect.options[0].textContent = t("themeLight");
    themeModeSelect.options[1].textContent = t("themeDark");
  }

  logoutBtn.textContent = t("logout");
  saveBtn.textContent = t("save");
}

function applyTheme(themeMode) {
  const normalized = (themeMode || "light").toLowerCase();
  document.body.setAttribute("data-theme", normalized === "dark" ? "dark" : "light");
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#586a86";
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [SETTINGS_KEY]: value }, () => resolve());
  });
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function resolvePopupOpenTrigger(settings) {
  const explicitTrigger = (settings?.popupOpenTrigger || "").trim();
  if (explicitTrigger === "t-click" || explicitTrigger === "double-click") return explicitTrigger;
  return settings?.openMainWindowOnDoubleClick ? "double-click" : "t-click";
}

function getPlanLabel(plan) {
  if (plan === "pro") return t("accountPro");
  if (plan === "expired") return t("accountExpired");
  return t("accountTrial");
}

async function refreshAccountBox() {
  const session = await getCurrentSession();
  if (!session?.accessToken) {
    accountStatusText.textContent = t("accountDisconnected");
    accountUsageText.textContent = t("accountDisconnectedHelp");
    logoutBtn.disabled = true;
    return;
  }

  logoutBtn.disabled = false;
  try {
    const account = await getBackendAccount();
    const user = account.user || {};
    const used = Number(user?.usage?.monthlyTokens || 0);
    const limit = Number(user?.limits?.monthlyTokens || 0) || "-";
    accountStatusText.textContent = `${getPlanLabel(user.plan)} - ${user.email || session.email || ""}`.trim();
    accountUsageText.textContent = t("accountUsage").replace("{used}", String(used)).replace("{limit}", String(limit));
  } catch (_error) {
    accountStatusText.textContent = t("accountDisconnected");
    accountUsageText.textContent = t("accountDisconnectedHelp");
  }
}

async function loadSettings() {
  const data = (await storageGet(SETTINGS_KEY)) || {};
  const backendConfig = await getBackendConfig();

  // Backend URLs are now hardcoded and read-only
  backendApiUrlInput.value = backendConfig.apiBaseUrl || "";
  backendApiUrlInput.disabled = true;
  checkoutUrlInput.value = backendConfig.checkoutUrl || "";
  checkoutUrlInput.disabled = true;
  
  targetLanguageInput.value = data.targetLanguage || "pt-BR";
  popupWidthInput.value = data.popupWidth || 340;
  popupHeightInput.value = data.popupHeight || 520;
  themeModeSelect.value = data.themeMode || "light";
  appLanguageSelect.value = data.appLanguage || "pt-BR";
  if (appLanguageSelect.value !== (data.appLanguage || "pt-BR")) appLanguageSelect.value = "pt-BR";
  if (themeModeSelect.value !== (data.themeMode || "light")) themeModeSelect.value = "light";

  const popupOpenTrigger = resolvePopupOpenTrigger(data);
  openOnTClickInput.checked = popupOpenTrigger === "t-click";
  openOnDoubleClickInput.checked = popupOpenTrigger === "double-click";
  currentUiLanguage = appLanguageSelect.value;
  updateOptionsLabels();
  applyTheme(themeModeSelect.value);
  await refreshAccountBox();
}

async function saveSettings() {
  const current = (await storageGet(SETTINGS_KEY)) || {};
  const popupOpenTrigger = openOnDoubleClickInput.checked ? "double-click" : "t-click";

  const payload = {
    ...current,
    sourceLanguage: current.sourceLanguage || "auto",
    targetLanguage: targetLanguageInput.value.trim() || "pt-BR",
    popupWidth: clampNumber(popupWidthInput.value, 280, 780, 340),
    popupHeight: clampNumber(popupHeightInput.value, 260, 780, 520),
    themeMode: themeModeSelect.value || "light",
    appLanguage: appLanguageSelect.value || "pt-BR",
    popupOpenTrigger,
    openMainWindowOnDoubleClick: popupOpenTrigger === "double-click"
  };

  delete payload.apiKey;
  delete payload.model;

  // Backend URLs are hardcoded and not editable
  await storageSet(payload);
  currentUiLanguage = payload.appLanguage;
  updateOptionsLabels();
  setStatus(t("saved"));
}

saveBtn.addEventListener("click", () => {
  saveSettings().catch((error) => {
    setStatus(t("saveFailed") + error.message, true);
  });
});

logoutBtn.addEventListener("click", () => {
  signOut()
    .then(refreshAccountBox)
    .then(() => setStatus(t("signedOut")))
    .catch((error) => setStatus(t("saveFailed") + error.message, true));
});

themeModeSelect.addEventListener("change", () => {
  applyTheme(themeModeSelect.value);
});

appLanguageSelect.addEventListener("change", () => {
  currentUiLanguage = appLanguageSelect.value || "pt-BR";
  updateOptionsLabels();
  refreshAccountBox().catch(() => {});
});

currentUiLanguage = appLanguageSelect.value || "pt-BR";
updateOptionsLabels();

loadSettings().catch((error) => {
  setStatus(t("loadFailed") + error.message, true);
});
