const SETTINGS_KEY = "deepseekTranslatorSettings";

const apiKeyInput = document.getElementById("apiKey");
const targetLanguageInput = document.getElementById("targetLanguage");
const modelInput = document.getElementById("model");
const popupWidthInput = document.getElementById("popupWidth");
const popupHeightInput = document.getElementById("popupHeight");
const themeModeSelect = document.getElementById("themeMode");
const appLanguageSelect = document.getElementById("appLanguage");
const openOnTClickInput = document.getElementById("openOnTClick");
const openOnDoubleClickInput = document.getElementById("openOnDoubleClick");
const toggleApiKeyEditBtn = document.getElementById("toggleApiKeyEditBtn");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

let currentUiLanguage = "pt-BR";
let isApiKeyEditEnabled = false;

const UI_TEXTS = {
  pt: {
    pageTitle: "Configuracoes - DeepSeek Translator",
    title: "Configuracoes",
    apiKey: "API Key DeepSeek",
    targetLanguage: "Idioma de destino",
    model: "Modelo",
    popupWidth: "Largura do popup (px)",
    popupHeight: "Altura do popup (px)",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Escuro",
    appLanguage: "Lingua do app",
    popupOpenTriggerLegend: "Abertura do popup principal",
    openOnTClick: "Abre popup ao clicar no T",
    openOnDoubleClick: "Abre popup so com duplo clique na palavra",
    unlockApiKeyEdit: "Liberar edicao da API Key",
    lockApiKeyEdit: "Bloquear edicao da API Key",
    save: "Salvar",
    saved: "Configuracoes salvas.",
    saveFailed: "Falha ao salvar: ",
    loadFailed: "Falha ao carregar: "
  },
  en: {
    pageTitle: "Settings - DeepSeek Translator",
    title: "Settings",
    apiKey: "DeepSeek API Key",
    targetLanguage: "Target language",
    model: "Model",
    popupWidth: "Popup width (px)",
    popupHeight: "Popup height (px)",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    appLanguage: "App language",
    popupOpenTriggerLegend: "Main popup opening",
    openOnTClick: "Open popup when clicking the T button",
    openOnDoubleClick: "Open popup only on word double-click",
    unlockApiKeyEdit: "Unlock API key editing",
    lockApiKeyEdit: "Lock API key editing",
    save: "Save",
    saved: "Settings saved.",
    saveFailed: "Failed to save: ",
    loadFailed: "Failed to load: "
  },
  de: {
    pageTitle: "Einstellungen - DeepSeek Translator",
    title: "Einstellungen",
    apiKey: "DeepSeek API-Schluessel",
    targetLanguage: "Zielsprache",
    model: "Modell",
    popupWidth: "Popup-Breite (px)",
    popupHeight: "Popup-Hoehe (px)",
    theme: "Design",
    themeLight: "Hell",
    themeDark: "Dunkel",
    appLanguage: "App-Sprache",
    popupOpenTriggerLegend: "Haupt-Popup oeffnen",
    openOnTClick: "Popup bei Klick auf T oeffnen",
    openOnDoubleClick: "Popup nur bei Doppelklick auf Wort oeffnen",
    unlockApiKeyEdit: "Bearbeitung des API-Schluessels freigeben",
    lockApiKeyEdit: "Bearbeitung des API-Schluessels sperren",
    save: "Speichern",
    saved: "Einstellungen gespeichert.",
    saveFailed: "Speichern fehlgeschlagen: ",
    loadFailed: "Laden fehlgeschlagen: "
  }
};

function getUiLanguageCode(language) {
  const code = (language || "pt-BR").toLowerCase();
  if (code.startsWith("pt")) {
    return "pt";
  }
  if (code.startsWith("de")) {
    return "de";
  }
  return "en";
}

function t(key) {
  const ui = UI_TEXTS[getUiLanguageCode(currentUiLanguage)] || UI_TEXTS.pt;
  return ui[key] || UI_TEXTS.pt[key] || key;
}

function updateOptionsLabels() {
  document.documentElement.lang = currentUiLanguage;
  document.title = t("pageTitle");

  const titleEl = document.querySelector("h1");
  if (titleEl) {
    titleEl.textContent = t("title");
  }

  const apiLabel = document.querySelector('label[for="apiKey"]');
  const targetLabel = document.querySelector('label[for="targetLanguage"]');
  const modelLabel = document.querySelector('label[for="model"]');
  const widthLabel = document.querySelector('label[for="popupWidth"]');
  const heightLabel = document.querySelector('label[for="popupHeight"]');
  const themeLabel = document.querySelector('label[for="themeMode"]');
  const appLangLabel = document.querySelector('label[for="appLanguage"]');
  const popupOpenTriggerLegend = document.getElementById("popupOpenTriggerLegend");
  const openOnTClickLabel = document.querySelector('label[for="openOnTClick"]');
  const openOnDoubleClickLabel = document.querySelector('label[for="openOnDoubleClick"]');

  if (apiLabel) apiLabel.textContent = t("apiKey");
  if (targetLabel) targetLabel.textContent = t("targetLanguage");
  if (modelLabel) modelLabel.textContent = t("model");
  if (widthLabel) widthLabel.textContent = t("popupWidth");
  if (heightLabel) heightLabel.textContent = t("popupHeight");
  if (themeLabel) themeLabel.textContent = t("theme");
  if (appLangLabel) appLangLabel.textContent = t("appLanguage");
  if (popupOpenTriggerLegend) popupOpenTriggerLegend.textContent = t("popupOpenTriggerLegend");
  if (openOnTClickLabel) {
    const textNodes = Array.from(openOnTClickLabel.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    for (const node of textNodes) {
      openOnTClickLabel.removeChild(node);
    }
    openOnTClickLabel.appendChild(document.createTextNode(` ${t("openOnTClick")}`));
  }
  if (openOnDoubleClickLabel) {
    const textNodes = Array.from(openOnDoubleClickLabel.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE);
    for (const node of textNodes) {
      openOnDoubleClickLabel.removeChild(node);
    }
    openOnDoubleClickLabel.appendChild(document.createTextNode(` ${t("openOnDoubleClick")}`));
  }

  if (themeModeSelect.options.length >= 2) {
    themeModeSelect.options[0].textContent = t("themeLight");
    themeModeSelect.options[1].textContent = t("themeDark");
  }

  updateApiKeyEditUi();

  saveBtn.textContent = t("save");
}

function updateApiKeyEditUi() {
  if (!apiKeyInput || !toggleApiKeyEditBtn) {
    return;
  }

  apiKeyInput.readOnly = !isApiKeyEditEnabled;
  toggleApiKeyEditBtn.setAttribute("aria-pressed", isApiKeyEditEnabled ? "true" : "false");

  const titleKey = isApiKeyEditEnabled ? "lockApiKeyEdit" : "unlockApiKeyEdit";
  const title = t(titleKey);
  toggleApiKeyEditBtn.title = title;
  toggleApiKeyEditBtn.setAttribute("aria-label", title);
}

function toggleApiKeyEdit() {
  isApiKeyEditEnabled = !isApiKeyEditEnabled;
  updateApiKeyEditUi();

  if (isApiKeyEditEnabled) {
    apiKeyInput.focus();
    const len = apiKeyInput.value.length;
    apiKeyInput.setSelectionRange(len, len);
  } else {
    apiKeyInput.blur();
  }
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
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

function resolvePopupOpenTrigger(settings) {
  const explicitTrigger = (settings?.popupOpenTrigger || "").trim();
  if (explicitTrigger === "t-click" || explicitTrigger === "double-click") {
    return explicitTrigger;
  }

  return settings?.openMainWindowOnDoubleClick ? "double-click" : "t-click";
}

async function loadSettings() {
  const data = await storageGet(SETTINGS_KEY);

  if (!data) {
    return;
  }

  apiKeyInput.value = data.apiKey || "";
  targetLanguageInput.value = data.targetLanguage || "pt-BR";
  modelInput.value = data.model || "deepseek-chat";
  popupWidthInput.value = data.popupWidth || 340;
  popupHeightInput.value = data.popupHeight || 520;
  themeModeSelect.value = data.themeMode || "light";
  appLanguageSelect.value = data.appLanguage || "pt-BR";
  if (appLanguageSelect.value !== (data.appLanguage || "pt-BR")) {
    appLanguageSelect.value = "pt-BR";
  }
  if (themeModeSelect.value !== (data.themeMode || "light")) {
    themeModeSelect.value = "light";
  }
  const popupOpenTrigger = resolvePopupOpenTrigger(data);
  openOnTClickInput.checked = popupOpenTrigger === "t-click";
  openOnDoubleClickInput.checked = popupOpenTrigger === "double-click";
  currentUiLanguage = appLanguageSelect.value;
  updateOptionsLabels();
  applyTheme(themeModeSelect.value);
}

async function saveSettings() {
  const current = (await storageGet(SETTINGS_KEY)) || {};
  const popupOpenTrigger = openOnDoubleClickInput.checked ? "double-click" : "t-click";

  const payload = {
    ...current,
    apiKey: apiKeyInput.value.trim(),
    sourceLanguage: current.sourceLanguage || "auto",
    targetLanguage: targetLanguageInput.value.trim() || "pt-BR",
    model: modelInput.value.trim() || "deepseek-chat",
    popupWidth: clampNumber(popupWidthInput.value, 280, 780, 340),
    popupHeight: clampNumber(popupHeightInput.value, 260, 780, 520),
    themeMode: themeModeSelect.value || "light",
    appLanguage: appLanguageSelect.value || "pt-BR",
    popupOpenTrigger,
    openMainWindowOnDoubleClick: popupOpenTrigger === "double-click"
  };

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

themeModeSelect.addEventListener("change", () => {
  applyTheme(themeModeSelect.value);
});

appLanguageSelect.addEventListener("change", () => {
  currentUiLanguage = appLanguageSelect.value || "pt-BR";
  updateOptionsLabels();
});

toggleApiKeyEditBtn?.addEventListener("click", toggleApiKeyEdit);

currentUiLanguage = appLanguageSelect.value || "pt-BR";
updateApiKeyEditUi();
updateOptionsLabels();

loadSettings().catch((error) => {
  setStatus(t("loadFailed") + error.message, true);
});
