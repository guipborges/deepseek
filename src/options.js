const SETTINGS_KEY = "deepseekTranslatorSettings";

const accountStatusText = document.getElementById("accountStatusText");
const accountUsageText = document.getElementById("accountUsageText");
const usageRing = document.getElementById("usageRing");
const usageRingText = document.getElementById("usageRingText");
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

const TRANSLATION_LANGUAGES = LANGUAGE_CATALOG.map(({ value, label }) => ({ value, label }));
let currentUiLanguage = FALLBACK_APP_LANGUAGE;

const UI_TEXTS = {
  pt: {
    pageTitle: "Configuracoes - Ayvu Translator",
    title: "Configuracoes",
    accountDisconnected: "Conta nao conectada",
    accountDisconnectedHelp: "Entre pelo popup para ativar o trial.",
    accountTrial: "Trial ativo",
    accountPro: "Plano anual ativo",
    accountExpired: "Trial encerrado",
    accountUsage: "{percent}% usado este mes",
    accountUsageTitle: "{used}/{limit} tokens este mes",
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
    pageTitle: "Settings - Ayvu Translator",
    title: "Settings",
    accountDisconnected: "Account not connected",
    accountDisconnectedHelp: "Sign in from the popup to start the trial.",
    accountTrial: "Trial active",
    accountPro: "Annual plan active",
    accountExpired: "Trial ended",
    accountUsage: "{percent}% used this month",
    accountUsageTitle: "{used}/{limit} tokens this month",
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
    pageTitle: "Einstellungen - Ayvu Translator",
    title: "Einstellungen",
    accountDisconnected: "Konto nicht verbunden",
    accountDisconnectedHelp: "Melden Sie sich im Popup an, um die Testphase zu starten.",
    accountTrial: "Testphase aktiv",
    accountPro: "Jahresplan aktiv",
    accountExpired: "Testphase beendet",
    accountUsage: "{percent}% diesen Monat genutzt",
    accountUsageTitle: "{used}/{limit} Tokens diesen Monat",
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


function populateTargetLanguageSelect() {
  const current = targetLanguageInput.value;
  targetLanguageInput.innerHTML = "";

  for (const language of TRANSLATION_LANGUAGES) {
    const option = document.createElement("option");
    option.value = language.value;
    option.textContent = language.label;
    targetLanguageInput.appendChild(option);
  }

  if (current) {
    targetLanguageInput.value = current;
  }
}

function updateOptionsLabels() {
  document.documentElement.lang = currentUiLanguage;
  document.title = t("pageTitle");

  const titleEl = document.querySelector("h1");
  if (titleEl) titleEl.textContent = t("title");

  const labels = {
    targetLanguage: document.querySelector('label[for="targetLanguage"]'),
    popupWidth: document.querySelector('label[for="popupWidth"]'),
    popupHeight: document.querySelector('label[for="popupHeight"]'),
    themeMode: document.querySelector('label[for="themeMode"]'),
    appLanguage: document.querySelector('label[for="appLanguage"]')
  };

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

function getAccountUsageStats(user) {
  const used = Number(user?.usage?.total_tokens || 0);
  const limit = Number(user?.limits?.monthlyTokens || 0);
  const exactPercent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const percent = exactPercent >= 1 ? Math.floor(exactPercent) : 0;
  const percentLabel = exactPercent > 0 && exactPercent < 1 ? "<1" : String(percent);
  return { used, limit, percent, percentLabel };
}

function formatAccountUsage(user) {
  const { percentLabel } = getAccountUsageStats(user);
  return t("accountUsage").replace("{percent}", percentLabel);
}

function formatAccountUsageTitle(user) {
  const { used, limit } = getAccountUsageStats(user);
  if (!limit) {
    return t("accountUsageTitle").replace("{used}", String(used)).replace("{limit}", "-");
  }
  return t("accountUsageTitle").replace("{used}", String(used)).replace("{limit}", String(limit));
}

async function refreshAccountBox() {
  const session = await getCurrentSession();
  if (!session?.accessToken) {
    accountStatusText.textContent = t("accountDisconnected");
    accountUsageText.textContent = t("accountDisconnectedHelp");
    usageRing?.classList.add("hidden");
    logoutBtn.disabled = true;
    return;
  }

  logoutBtn.disabled = false;
  try {
    const account = await getBackendAccount();
    const user = account.user || {};
    const stats = getAccountUsageStats(user);
    const usageTitle = formatAccountUsageTitle(user);
    accountStatusText.textContent = `${getPlanLabel(user.plan)} - ${user.email || session.email || ""}`.trim();
    accountUsageText.textContent = formatAccountUsage(user);
    accountUsageText.title = usageTitle;
    if (usageRing) {
      usageRing.classList.remove("hidden");
      usageRing.style.setProperty("--usage", `${stats.percent}%`);
      usageRing.title = usageTitle;
      usageRing.setAttribute("aria-label", usageTitle);
      usageRing.setAttribute("aria-valuenow", String(stats.percent));
    }
    if (usageRingText) {
      usageRingText.textContent = `${stats.percentLabel}%`;
    }
  } catch (_error) {
    accountStatusText.textContent = t("accountDisconnected");
    accountUsageText.textContent = t("accountDisconnectedHelp");
    usageRing?.classList.add("hidden");
  }
}

async function loadSettings() {
  const data = (await storageGet(SETTINGS_KEY)) || {};
  const defaultTargetLanguage = getDefaultTargetLanguage();
  const defaultAppLanguage = getDefaultAppLanguage();
  
  populateTargetLanguageSelect();
  targetLanguageInput.value = data.targetLanguage || defaultTargetLanguage;
  if (targetLanguageInput.value !== (data.targetLanguage || defaultTargetLanguage)) {
    targetLanguageInput.value = defaultTargetLanguage;
  }
  popupWidthInput.value = data.popupWidth || 340;
  popupHeightInput.value = data.popupHeight || 520;
  themeModeSelect.value = data.themeMode || "light";
  appLanguageSelect.value = data.appLanguage || defaultAppLanguage;
  if (appLanguageSelect.value !== (data.appLanguage || defaultAppLanguage)) appLanguageSelect.value = defaultAppLanguage;
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
    targetLanguage: targetLanguageInput.value || getDefaultTargetLanguage(),
    popupWidth: clampNumber(popupWidthInput.value, 280, 780, 340),
    popupHeight: clampNumber(popupHeightInput.value, 260, 780, 520),
    themeMode: themeModeSelect.value || "light",
    appLanguage: appLanguageSelect.value || getDefaultAppLanguage(),
    popupOpenTrigger,
    openMainWindowOnDoubleClick: popupOpenTrigger === "double-click"
  };

  delete payload.apiKey;
  delete payload.model;

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
  currentUiLanguage = appLanguageSelect.value || getDefaultAppLanguage();
  updateOptionsLabels();
  refreshAccountBox().catch(() => {});
});

populateTargetLanguageSelect();
currentUiLanguage = appLanguageSelect.value || getDefaultAppLanguage();
updateOptionsLabels();

loadSettings().catch((error) => {
  setStatus(t("loadFailed") + error.message, true);
});
