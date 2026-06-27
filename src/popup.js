const inputText = document.getElementById("inputText");
const outputText = document.getElementById("outputText");
const statusEl = document.getElementById("status");
const quickSourceLanguageSelect = document.getElementById("quickSourceLanguage");
const quickTargetLanguageSelect = document.getElementById("quickTargetLanguage");
const resetSizeBtn = document.getElementById("resetSizeBtn");
const voicePickerBtn = document.getElementById("voicePickerBtn");
const voiceSelect = document.getElementById("voiceSelect");
const voiceSettingsBtn = document.getElementById("voiceSettingsBtn");
const voiceControlPanel = document.getElementById("voiceControlPanel");
const onboardingPanel = document.getElementById("onboardingPanel");
const onboardingEyebrow = document.getElementById("onboardingEyebrow");
const onboardingTitle = document.getElementById("onboardingTitle");
const onboardingSteps = document.getElementById("onboardingSteps");
const onboardingEmailLabel = document.getElementById("onboardingEmailLabel");
const onboardingEmailInput = document.getElementById("onboardingEmail");
const onboardingCodeLabel = document.getElementById("onboardingCodeLabel");
const onboardingCodeInput = document.getElementById("onboardingCode");
const onboardingTargetLanguageLabel = document.getElementById("onboardingTargetLanguageLabel");
const onboardingTargetLanguageSelect = document.getElementById("onboardingTargetLanguage");
const requestMagicLinkBtn = document.getElementById("requestMagicLinkBtn");
const saveOnboardingBtn = document.getElementById("saveOnboardingBtn");
const openOnboardingSettingsBtn = document.getElementById("openOnboardingSettingsBtn");
const dismissOnboardingBtn = document.getElementById("dismissOnboardingBtn");


const translateBtn = document.getElementById("translateBtn");
const copyBtn = document.getElementById("copyBtn");
const openSettingsBtn = document.getElementById("openSettingsBtn");
const saveWordBtn = document.getElementById("saveWordBtn");
const openFlashcardsBtn = document.getElementById("openFlashcardsBtn");
const pronounceBtn = document.getElementById("pronounceBtn");
const youglishBtn = document.getElementById("youglishBtn");
const forvoBtn = document.getElementById("forvoBtn");
const nativeAudioBtn = document.getElementById("nativeAudioBtn");
const translatorTabPanel = document.getElementById("translatorTabPanel");
const detailsTabPanel = document.getElementById("detailsTabPanel");
const tabTranslatorBtn = document.getElementById("tabTranslatorBtn");
const tabDetailsBtn = document.getElementById("tabDetailsBtn");
const generateDetailsBtn = document.getElementById("generateDetailsBtn");
const detailPronunciation = document.getElementById("detailPronunciation");
const detailSynonym = document.getElementById("detailSynonym");
const detailAntonym = document.getElementById("detailAntonym");
const detailSynonymTranslation = document.getElementById("detailSynonymTranslation");
const detailAntonymTranslation = document.getElementById("detailAntonymTranslation");
const detailExample1 = document.getElementById("detailExample1");
const detailExample2 = document.getElementById("detailExample2");
const detailPast = document.getElementById("detailPast");
const detailFuture = document.getElementById("detailFuture");
const detailExample1Translation = document.getElementById("detailExample1Translation");
const detailExample2Translation = document.getElementById("detailExample2Translation");
const detailPastTranslation = document.getElementById("detailPastTranslation");
const detailFutureTranslation = document.getElementById("detailFutureTranslation");
const detailExample1AudioBtn = document.getElementById("detailExample1Audio");
const detailExample2AudioBtn = document.getElementById("detailExample2Audio");
const detailPastAudioBtn = document.getElementById("detailPastAudio");
const detailFutureAudioBtn = document.getElementById("detailFutureAudio");
const historySearchInput = document.getElementById("historySearchInput");
const historySelect = document.getElementById("historySelect");
const useHistoryBtn = document.getElementById("useHistoryBtn");
const removeHistoryBtn = document.getElementById("removeHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const SETTINGS_KEY = "deepseekTranslatorSettings";
const PENDING_TEXT_KEY = "deepseekTranslatorPendingText";
const SELECTION_HISTORY_KEY = "deepseekTranslatorSelectionHistory";
const ONBOARDING_DISMISSED_KEY = "deepseekTranslatorOnboardingDismissed";
const MAX_TRANSLATION_CHARS = 12000;
const MAX_DETAILS_CHARS = 160;
let currentUiLanguage = "pt-BR";
let isApplyingPendingText = false;
let lastDetailsKey = "";
let autoDetailsTimer = null;
let isGeneratingDetails = false;
let detailsSpeechLanguage = "en-US";
let selectionHistoryCache = [];
const TRANSLATION_LANGUAGES =
  typeof LANGUAGE_CATALOG !== "undefined" && Array.isArray(LANGUAGE_CATALOG) && LANGUAGE_CATALOG.length
    ? LANGUAGE_CATALOG
    : [
        { value: "en-US", short: "EN", label: "English" },
        { value: "pt-BR", short: "PT", label: "Portuguese" },
        { value: "es-ES", short: "ES", label: "Spanish" },
        { value: "de-DE", short: "DE", label: "German" },
        { value: "fr-FR", short: "FR", label: "French" }
      ];

function normalizeHistoryText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function getFilteredHistory() {
  const query = normalizeHistoryText(historySearchInput.value).toLowerCase();
  if (!query) {
    return selectionHistoryCache;
  }

  return selectionHistoryCache.filter((item) => normalizeHistoryText(item).toLowerCase().includes(query));
}

async function loadHistorySelect() {
  selectionHistoryCache = ((await storageGet(SELECTION_HISTORY_KEY)) || []).map(normalizeHistoryText).filter(Boolean);
  renderHistorySelect();
}

function renderHistorySelect() {
  const filteredHistory = getFilteredHistory();
  historySelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = historySearchInput.value
    ? tl(
        `Historico filtrado (${filteredHistory.length})`,
        `Filtered history (${filteredHistory.length})`,
        `Gefilterter Verlauf (${filteredHistory.length})`
      )
    : t("historyPlaceholder");
  historySelect.appendChild(placeholder);

  for (const item of filteredHistory) {
    const value = normalizeHistoryText(item);
    if (!value) {
      continue;
    }

    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    historySelect.appendChild(option);
  }

  historySelect.value = "";
}

async function addToSelectionHistory(text) {
  const normalized = normalizeHistoryText(text);
  if (!normalized) {
    return;
  }

  const history = (await storageGet(SELECTION_HISTORY_KEY)) || [];
  const filtered = history.filter((item) => (item || "").toLowerCase() !== normalized.toLowerCase());
  const next = [normalized, ...filtered].slice(0, 20);
  await storageSet(SELECTION_HISTORY_KEY, next);
  await loadHistorySelect();
}

function useSelectedHistoryItem() {
  const selected = normalizeHistoryText(historySelect.value);
  if (!selected) {
    setStatus(
      tl("Selecione um item do historico.", "Select a history item.", "Waehlen Sie einen Verlaufseintrag aus."),
      true
    );
    return;
  }

  inputText.value = selected;
  resetWordDetails();
  scheduleAutoDetailsGeneration(120);
  setStatus(tl("Texto carregado do historico.", "Text loaded from history.", "Text aus Verlauf geladen."));
}

async function removeSelectedHistoryItem() {
  const selected = normalizeHistoryText(historySelect.value);
  if (!selected) {
    setStatus(
      tl("Selecione um item do historico.", "Select a history item.", "Waehlen Sie einen Verlaufseintrag aus."),
      true
    );
    return;
  }

  const next = selectionHistoryCache.filter((item) => normalizeHistoryText(item).toLowerCase() !== selected.toLowerCase());
  await storageSet(SELECTION_HISTORY_KEY, next);
  selectionHistoryCache = next;
  renderHistorySelect();
  setStatus(tl("Item removido do historico.", "History item removed.", "Verlaufseintrag entfernt."));
}

async function clearSelectionHistory() {
  const history = selectionHistoryCache.length ? selectionHistoryCache : (await storageGet(SELECTION_HISTORY_KEY)) || [];
  if (!history.length) {
    setStatus(tl("Historico ja esta vazio.", "History is already empty.", "Verlauf ist bereits leer."));
    return;
  }

  const confirmClear = window.confirm(`Limpar historico de selecoes (${history.length} itens)?`);
  if (!confirmClear) {
    setStatus(tl("Limpeza do historico cancelada.", "History clear canceled.", "Verlaufsloeschung abgebrochen."));
    return;
  }

  await storageSet(SELECTION_HISTORY_KEY, []);
  selectionHistoryCache = [];
  await loadHistorySelect();
  setStatus(tl("Historico limpo.", "History cleared.", "Verlauf geloescht."));
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#586a86";
}

async function readJsonResponse(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function setActiveTab(tabName) {
  const showDetails = tabName === "details";
  translatorTabPanel.classList.toggle("active", !showDetails);
  detailsTabPanel.classList.toggle("active", showDetails);
  tabTranslatorBtn.classList.toggle("active", !showDetails);
  tabDetailsBtn.classList.toggle("active", showDetails);
  tabTranslatorBtn.setAttribute("aria-selected", showDetails ? "false" : "true");
  tabDetailsBtn.setAttribute("aria-selected", showDetails ? "true" : "false");

  if (showDetails) {
    scheduleAutoDetailsGeneration(120);
  }
}

function resetWordDetails() {
  detailPronunciation.textContent = "-";
  detailSynonym.textContent = "-";
  detailAntonym.textContent = "-";
  detailSynonymTranslation.textContent = "-";
  detailAntonymTranslation.textContent = "-";
  detailExample1.textContent = "-";
  detailExample2.textContent = "-";
  detailPast.textContent = "-";
  detailFuture.textContent = "-";
  detailExample1Translation.textContent = "-";
  detailExample2Translation.textContent = "-";
  detailPastTranslation.textContent = "-";
  detailFutureTranslation.textContent = "-";
  detailsSpeechLanguage = "en-US";
  lastDetailsKey = "";
}

function buildDetailsKey(word, sourceLanguage, targetLanguage) {
  return `${(word || "").trim().toLowerCase()}|${(sourceLanguage || "").trim().toLowerCase()}|${
    (targetLanguage || "").trim().toLowerCase()
  }`;
}

function scheduleAutoDetailsGeneration(delayMs = 450) {
  if (autoDetailsTimer) {
    clearTimeout(autoDetailsTimer);
  }

  autoDetailsTimer = setTimeout(() => {
    autoDetailsTimer = null;
    generateWordDetails({ silent: true }).catch(() => {
      // Silent mode: keep background generation unobtrusive.
    });
  }, delayMs);
}

function extractJsonFromText(text) {
  const raw = (text || "").trim();
  if (!raw) {
    throw new Error("Resposta vazia ao gerar detalhes.");
  }

  const codeBlockMatch = raw.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(raw.slice(firstBrace, lastBrace + 1));
  }

  return JSON.parse(raw);
}

function applyGeneratedWordDetails(details) {
  detailPronunciation.textContent = (details.pronunciation || "-").toString();
  detailSynonym.textContent = (details.synonym || "-").toString();
  detailAntonym.textContent = (details.antonym || "-").toString();
  detailSynonymTranslation.textContent = (details.synonymTranslation || "-").toString();
  detailAntonymTranslation.textContent = (details.antonymTranslation || "-").toString();
  detailExample1.textContent = (details.example1 || "-").toString();
  detailExample2.textContent = (details.example2 || "-").toString();
  detailPast.textContent = (details.pastExample || "-").toString();
  detailFuture.textContent = (details.futureExample || "-").toString();
  detailExample1Translation.textContent = (details.example1Translation || "-").toString();
  detailExample2Translation.textContent = (details.example2Translation || "-").toString();
  detailPastTranslation.textContent = (details.pastExampleTranslation || "-").toString();
  detailFutureTranslation.textContent = (details.futureExampleTranslation || "-").toString();
}

function getDetailsLanguageName(languageCode) {
  const code = (languageCode || "").toLowerCase();

  if (code.startsWith("en")) {
    return "English";
  }

  if (code.startsWith("de")) {
    return "German";
  }

  if (code.startsWith("pt")) {
    return "Portuguese";
  }

  if (code.startsWith("es")) {
    return "Spanish";
  }

  if (code.startsWith("fr")) {
    return "French";
  }

  if (code.startsWith("it")) {
    return "Italian";
  }

  if (code.startsWith("nl")) {
    return "Dutch";
  }

  if (code.startsWith("ru")) {
    return "Russian";
  }

  return "English";
}

async function resolveDetailsLanguage(word, configuredSourceLanguage) {
  const normalizedSource = (configuredSourceLanguage || "").trim().toLowerCase();
  if (normalizedSource && normalizedSource !== "auto") {
    return configuredSourceLanguage;
  }

  const candidates = await detectLanguageCandidates(word);
  const detected = pickDetectedLanguage(candidates, word);
  if (detected && detected !== "und") {
    return detected;
  }

  return "en-US";
}

async function generateWordDetails(options = {}) {
  const { silent = false, force = false } = options;
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const sourceLanguage = (settings.sourceLanguage || "auto").trim();
  const targetLanguage = (settings.targetLanguage || "pt-BR").trim();
  const word = normalizeTerm(inputText.value);
  const detailsKey = buildDetailsKey(word, sourceLanguage, targetLanguage);

  if (!(await hasBackendSession())) {
    if (!silent) {
      setStatus(
        tl(
          "Entre com seu email para gerar detalhes.",
          "Sign in with your email to generate details.",
          "Melden Sie sich mit Ihrer E-Mail an, um Details zu erzeugen."
        ),
        true
      );
      await refreshOnboarding();
    }
    return;
  }

  if (!word) {
    if (!silent) {
      setStatus(
        tl(
          "Informe uma palavra ou termo para gerar detalhes.",
          "Enter a word or term to generate details.",
          "Geben Sie ein Wort oder einen Begriff ein, um Details zu erzeugen."
        ),
        true
      );
    }
    return;
  }

  if (word.length > MAX_DETAILS_CHARS) {
    if (!silent) {
      setStatus(
        tl(
          "Detalhes estao disponiveis para palavras ou termos curtos.",
          "Details are available for words or short terms.",
          "Details sind fuer Woerter oder kurze Begriffe verfuegbar."
        ),
        true
      );
    }
    return;
  }

  if (!force && detailsKey === lastDetailsKey) {
    return;
  }

  if (isGeneratingDetails) {
    return;
  }

  if (!silent) {
    setStatus(tl("Gerando detalhes...", "Generating details...", "Details werden erstellt..."));
  }
  isGeneratingDetails = true;
  generateDetailsBtn.disabled = true;

  try {
    const detailsLanguageCode = await resolveDetailsLanguage(word, sourceLanguage);
    detailsSpeechLanguage = mapLanguageToSpeechLanguage(detailsLanguageCode);

    const data = await wordDetailsWithBackend({
      word,
      sourceLanguage: detailsLanguageCode || sourceLanguage,
      targetLanguage
    });

    const rawText = data?.detailsText || "";
    const parsed = extractJsonFromText(rawText);
    applyGeneratedWordDetails(parsed);
    lastDetailsKey = detailsKey;
    if (!silent) {
      setStatus(tl("Detalhes gerados.", "Details generated.", "Details erstellt."));
    }
  } catch (error) {
    if (!silent) {
      setStatus(
        tl("Falha ao gerar detalhes: ", "Failed to generate details: ", "Fehler beim Erstellen der Details: ") +
          error.message,
        true
      );
    }
  } finally {
    isGeneratingDetails = false;
    generateDetailsBtn.disabled = false;
  }
}

function normalizeDetailExampleText(text) {
  const value = (text || "").trim();
  if (!value || value === "-") {
    return "";
  }

  return value;
}

async function playDetailExampleAudio(detailElement) {
  const exampleText = normalizeDetailExampleText(detailElement?.textContent || "");
  if (!exampleText) {
    setStatus(t("detailExampleAudioMissing"), true);
    return;
  }

  const speechLanguage = detailsSpeechLanguage || (await detectSpeechLanguage(exampleText, "en-US"));
  const displayName = getLanguageDisplayName(speechLanguage);
  await speakWord(exampleText, speechLanguage, displayName);
}

function getActiveTab() {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (!tabs.length || !tabs[0].id) {
        reject(new Error("Nenhuma aba ativa encontrada."));
        return;
      }

      resolve(tabs[0]);
    });
  });
}

function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key]);
    });
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

async function hasBackendSession() {
  const session = await getCurrentSession();
  return !!session?.accessToken;
}

async function pickSelection() {
  try {
    setStatus(tl("Lendo selecao da aba...", "Reading tab selection...", "Tab-Auswahl wird gelesen..."));
    const tab = await getActiveTab();
    const response = await sendMessageToTab(tab.id, { type: "GET_SELECTED_TEXT" });
    const selected = response?.text || "";

    if (!selected) {
      setStatus(tl("Nenhum texto selecionado na pagina.", "No text selected on the page.", "Kein Text auf der Seite ausgewaehlt."), true);
      return;
    }

    inputText.value = selected;
    await addToSelectionHistory(selected);
    resetWordDetails();
    scheduleAutoDetailsGeneration();
    setStatus(tl("Texto selecionado carregado.", "Selected text loaded.", "Ausgewaehlter Text geladen."));
  } catch (error) {
    setStatus(tl("Falha ao obter selecao: ", "Failed to get selection: ", "Fehler beim Lesen der Auswahl: ") + error.message, true);
  }
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, parsed));
}

async function resetToDefaultSize() {
  const currentSettings = (await storageGet(SETTINGS_KEY)) || {};
  const updated = {
    ...currentSettings,
    popupWidth: 340,
    popupHeight: 540
  };

  await storageSet(SETTINGS_KEY, updated);
  await applyPopupSizeFromSettings();

  if (isPinnedMode()) {
    const width = Math.max(420, updated.popupWidth + 40);
    const height = Math.max(560, updated.popupHeight + 120);

    const currentWindow = await chrome.windows.getCurrent();
    if (currentWindow?.id) {
      await chrome.windows.update(currentWindow.id, {
        width,
        height
      });
    }
  }

  setStatus(tl("Tamanho padrao restaurado.", "Default size restored.", "Standardgroesse wiederhergestellt."));
}

function isPinnedMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("pinned") === "1";
}

async function openPinnedWindow() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const popupWidth = clampNumber(settings.popupWidth, 280, 780, 340);
  const popupHeight = clampNumber(settings.popupHeight, 260, 780, 540);
  const width = Math.max(420, popupWidth + 40);
  const height = Math.max(560, popupHeight + 120);
  const url = chrome.runtime.getURL("src/popup.html?pinned=1");

  await chrome.windows.create({
    url,
    type: "popup",
    width,
    height
  });
}

async function openYouGlish() {
  const text = normalizeTerm(inputText.value);
  if (!text) {
    setStatus(tl("Informe uma palavra para abrir no YouGlish.", "Enter a word to open on YouGlish.", "Geben Sie ein Wort ein, um YouGlish zu oeffnen."), true);
    return;
  }

  if (!isAdvancedTerm(text)) {
    setStatus(tl("YouGlish so aparece para palavra ou phrasal verb.", "YouGlish is only available for a word or phrasal verb.", "YouGlish ist nur fuer ein Wort oder Phrasal Verb verfuegbar."), true);
    return;
  }

  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const sourceLanguage = (settings.sourceLanguage || "en").trim();
  const response = await sendRuntimeMessage({
    type: "OPEN_YOUGLISH",
    text,
    language: sourceLanguage
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Falha ao abrir YouGlish.");
  }
}

async function openForvo() {
  const text = normalizeTerm(inputText.value);
  if (!text) {
    setStatus(
      tl(
        "Informe uma palavra para abrir no Forvo.",
        "Enter a word to open on Forvo.",
        "Geben Sie ein Wort ein, um Forvo zu oeffnen."
      ),
      true
    );
    return;
  }

  if (!isAdvancedTerm(text)) {
    setStatus(
      tl(
        "Forvo so aparece para palavra ou phrasal verb.",
        "Forvo is only available for a word or phrasal verb.",
        "Forvo ist nur fuer ein Wort oder Phrasal Verb verfuegbar."
      ),
      true
    );
    return;
  }

  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const sourceLanguage = (settings.sourceLanguage || "en").trim();
  const response = await sendRuntimeMessage({
    type: "OPEN_FORVO",
    text,
    language: sourceLanguage
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Falha ao abrir Forvo.");
  }
}

async function applyPopupSizeFromSettings() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const popupWidth = clampNumber(settings.popupWidth, 280, 780, 340);
  const popupHeight = clampNumber(settings.popupHeight, 260, 780, 540);

  const appEl = document.querySelector(".app");
  if (isPinnedMode()) {
    appEl.style.width = "100%";
    appEl.style.height = "100vh";
    appEl.style.maxHeight = "none";
    document.body.style.minWidth = "0";
    document.body.style.overflow = "hidden";
  } else {
    appEl.style.width = `${popupWidth}px`;
    appEl.style.height = `${popupHeight}px`;
    appEl.style.maxHeight = `${popupHeight}px`;
    document.body.style.minWidth = "0";
    document.body.style.overflow = "hidden";
  }

  quickSourceLanguageSelect.value = settings.sourceLanguage || "auto";
  quickTargetLanguageSelect.value = settings.targetLanguage || "pt-BR";
  updateSaveFlashcardButtonLabel();
}

async function updateQuickLanguages() {
  const currentSettings = (await storageGet(SETTINGS_KEY)) || {};
  const updated = {
    ...currentSettings,
    sourceLanguage: quickSourceLanguageSelect.value || "auto",
    targetLanguage: quickTargetLanguageSelect.value || "pt-BR"
  };

  await storageSet(SETTINGS_KEY, updated);
  setStatus(tl("Idiomas atualizados.", "Languages updated.", "Sprachen aktualisiert."));
}

async function translate() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const sourceLanguage = (settings.sourceLanguage || "auto").trim();
  const targetLanguage = (settings.targetLanguage || "pt-BR").trim();
  const text = inputText.value.trim();

  if (!(await hasBackendSession())) {
    setStatus(
      tl(
        "Entre com seu email para traduzir.",
        "Sign in with your email to translate.",
        "Melden Sie sich mit Ihrer E-Mail an, um zu uebersetzen."
      ),
      true
    );
    await refreshOnboarding();
    return;
  }

  if (!text) {
    setStatus(tl("Informe ou selecione um texto para traduzir.", "Enter or select text to translate.", "Geben Sie einen Text ein oder waehlen Sie einen Text zur Uebersetzung aus."), true);
    return;
  }

  if (text.length > MAX_TRANSLATION_CHARS) {
    setStatus(
      tl(
        "Texto muito longo. Selecione um trecho menor para traduzir.",
        "Text is too long. Select a shorter passage to translate.",
        "Text ist zu lang. Waehlen Sie einen kuerzeren Abschnitt zur Uebersetzung."
      ),
      true
    );
    return;
  }

  setStatus(tl("Traduzindo...", "Translating...", "Wird uebersetzt..."));
  outputText.value = "";

  try {
    const data = await translateWithBackend({
      text,
      sourceLanguage,
      targetLanguage
    });

    const translated = data?.translatedText?.trim();

    if (!translated) {
      throw new Error("Resposta da API sem texto traduzido.");
    }

    outputText.value = normalizeTranslatedText(translated);
    scheduleAutoDetailsGeneration(200);
    setStatus(tl("Traducao concluida.", "Translation completed.", "Uebersetzung abgeschlossen."));
  } catch (error) {
    setStatus(tl("Erro na traducao: ", "Translation error: ", "Uebersetzungsfehler: ") + error.message, true);
  }
}

async function copyResult() {
  const text = outputText.value.trim();

  if (!text) {
    setStatus(tl("Nada para copiar.", "Nothing to copy.", "Nichts zum Kopieren."), true);
    return;
  }

  await navigator.clipboard.writeText(text);
  setStatus(tl("Traducao copiada.", "Translation copied.", "Uebersetzung kopiert."));
}

async function saveCurrentWord() {
  const sourceText = normalizeTerm(inputText.value);
  const translatedText = outputText.value.trim();

  if (!sourceText) {
    setStatus(tl("Nada para salvar. Informe um texto.", "Nothing to save. Enter text first.", "Nichts zu speichern. Geben Sie zuerst Text ein."), true);
    return;
  }

  if (!isAdvancedTerm(sourceText)) {
    setStatus(tl("Flashcard so aceita palavra ou phrasal verb.", "Flashcard accepts only a word or phrasal verb.", "Flashcard akzeptiert nur ein Wort oder ein Phrasal Verb."), true);
    return;
  }

  if (!translatedText) {
    setStatus(tl("Traduza antes de salvar o flashcard.", "Translate before saving the flashcard.", "Uebersetzen Sie vor dem Speichern der Flashcard."), true);
    return;
  }

  const response = await sendRuntimeMessage({
    type: "SAVE_FLASHCARD",
    sourceText,
    translatedText
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Falha ao salvar flashcard.");
  }

  if (response.alreadyExists) {
    setStatus(tl("Essa palavra ja esta salva.", "This word is already saved.", "Dieses Wort ist bereits gespeichert."));
    return;
  }

  setStatus(tl("Palavra salva nos flashcards.", "Word saved to flashcards.", "Wort in Flashcards gespeichert."));
}

async function loadPendingTextAndTranslate() {
  const pendingText = ((await storageGet(PENDING_TEXT_KEY)) || "").trim();

  if (!pendingText) {
    return;
  }

  isApplyingPendingText = true;
  inputText.value = pendingText;
  await addToSelectionHistory(pendingText);
  await storageSet(PENDING_TEXT_KEY, "");
  try {
    await translate();
    scheduleAutoDetailsGeneration(200);
  } finally {
    isApplyingPendingText = false;
  }
}

function listenPendingTextUpdates() {
  if (!chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[PENDING_TEXT_KEY] || isApplyingPendingText) {
      return;
    }

    const nextText = (changes[PENDING_TEXT_KEY].newValue || "").trim();
    if (!nextText) {
      return;
    }

    loadPendingTextAndTranslate().catch((error) => {
      setStatus(tl("Falha ao atualizar texto: ", "Failed to refresh text: ", "Fehler beim Aktualisieren des Textes: ") + error.message, true);
    });

    resetWordDetails();
  });
}

function listenHistoryUpdates() {
  if (!chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[SELECTION_HISTORY_KEY]) {
      return;
    }

    loadHistorySelect().catch(() => {
      // History refresh is best-effort.
    });
  });
}

function openSettings() {
  const optionsUrl = chrome.runtime.getURL("src/options.html");

  chrome.windows.create({
    url: optionsUrl,
    type: "popup",
    width: 560,
    height: 720
  });
}

function openFlashcards() {
  const flashcardsUrl = chrome.runtime.getURL("src/flashcards.html");

  chrome.windows.create({
    url: flashcardsUrl,
    type: "popup",
    width: 680,
    height: 760
  });
}

translateBtn.addEventListener("click", translate);
copyBtn.addEventListener("click", copyResult);
openSettingsBtn.addEventListener("click", openSettings);
requestMagicLinkBtn?.addEventListener("click", () => {
  requestOnboardingMagicLink().catch((error) => {
    setStatus(
      tl("Falha ao enviar codigo: ", "Failed to send code: ", "Code konnte nicht gesendet werden: ") + error.message,
      true
    );
  });
});
saveOnboardingBtn?.addEventListener("click", () => {
  saveOnboardingSettings().catch((error) => {
    setStatus(tl("Falha ao entrar: ", "Sign-in failed: ", "Anmeldung fehlgeschlagen: ") + error.message, true);
  });
});
openOnboardingSettingsBtn?.addEventListener("click", openSettings);
dismissOnboardingBtn?.addEventListener("click", () => {
  dismissOnboarding().catch((error) => {
    setStatus(tl("Falha ao fechar introducao: ", "Failed to close setup: ", "Einrichtung konnte nicht geschlossen werden: ") + error.message, true);
  });
});
voiceSettingsBtn?.addEventListener("click", openSettings);
saveWordBtn.addEventListener("click", () => {
  saveCurrentWord().catch((error) => {
    setStatus(tl("Falha ao salvar: ", "Save failed: ", "Speichern fehlgeschlagen: ") + error.message, true);
  });
});
openFlashcardsBtn.addEventListener("click", openFlashcards);
pronounceBtn.addEventListener("click", () => {
  pronounceCurrentWord().catch((error) => {
    setStatus(tl("Falha na pronuncia: ", "Pronunciation failed: ", "Aussprache fehlgeschlagen: ") + error.message, true);
  });
});
youglishBtn.addEventListener("click", () => {
  openYouGlish().catch((error) => {
    setStatus(tl("Falha ao abrir YouGlish: ", "Failed to open YouGlish: ", "YouGlish konnte nicht geoeffnet werden: ") + error.message, true);
  });
});
forvoBtn?.addEventListener("click", () => {
  openForvo().catch((error) => {
    setStatus(tl("Falha ao abrir Forvo: ", "Failed to open Forvo: ", "Forvo konnte nicht geoeffnet werden: ") + error.message, true);
  });
});
nativeAudioBtn.addEventListener("click", () => {
  playNativeDictionaryAudio().catch((error) => {
    setStatus(tl("Falha no audio nativo: ", "Native audio failed: ", "Natives Audio fehlgeschlagen: ") + error.message, true);
  });
});
useHistoryBtn.addEventListener("click", useSelectedHistoryItem);
removeHistoryBtn.addEventListener("click", () => {
  removeSelectedHistoryItem().catch((error) => {
    setStatus(tl("Falha ao remover historico: ", "Failed to remove history: ", "Fehler beim Entfernen des Verlaufs: ") + error.message, true);
  });
});
clearHistoryBtn.addEventListener("click", () => {
  clearSelectionHistory().catch((error) => {
    setStatus(tl("Falha ao limpar historico: ", "Failed to clear history: ", "Fehler beim Loeschen des Verlaufs: ") + error.message, true);
  });
});
historySearchInput.addEventListener("input", renderHistorySelect);
historySelect.addEventListener("change", () => {
  const selected = normalizeHistoryText(historySelect.value);
  if (!selected) {
    return;
  }

  inputText.value = selected;
  resetWordDetails();
  scheduleAutoDetailsGeneration(120);
});
inputText.addEventListener("input", () => {
  resetWordDetails();
  scheduleAutoDetailsGeneration();
});
quickSourceLanguageSelect.addEventListener("change", () => {
  updateQuickLanguages().catch((error) => {
    setStatus(tl("Falha ao atualizar idiomas: ", "Failed to update languages: ", "Fehler beim Aktualisieren der Sprachen: ") + error.message, true);
  });
  resetWordDetails();
  scheduleAutoDetailsGeneration();
  updateSaveFlashcardButtonLabel();
});
quickTargetLanguageSelect.addEventListener("change", () => {
  updateQuickLanguages().catch((error) => {
    setStatus(tl("Falha ao atualizar idiomas: ", "Failed to update languages: ", "Fehler beim Aktualisieren der Sprachen: ") + error.message, true);
  });
  resetWordDetails();
  scheduleAutoDetailsGeneration();
});
voiceSelect.addEventListener("change", () => {
  updateSelectedVoice().catch((error) => {
    setStatus(tl("Falha ao atualizar voz: ", "Failed to update voice: ", "Fehler beim Aktualisieren der Stimme: ") + error.message, true);
  });
  toggleVoicePanel(false);
});
resetSizeBtn.addEventListener("click", () => {
  resetToDefaultSize().catch((error) => {
    setStatus(tl("Falha ao restaurar tamanho: ", "Failed to restore size: ", "Fehler beim Wiederherstellen der Groesse: ") + error.message, true);
  });
});
voicePickerBtn?.addEventListener("click", () => {
  toggleVoicePanel();
});
tabTranslatorBtn.addEventListener("click", () => setActiveTab("translator"));
tabDetailsBtn.addEventListener("click", () => setActiveTab("details"));
tabTranslatorBtn.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  setActiveTab("translator");
});
tabDetailsBtn.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  setActiveTab("details");
});
generateDetailsBtn.addEventListener("click", () => {
  generateWordDetails({ force: true }).catch((error) => {
    setStatus(tl("Falha ao gerar detalhes: ", "Failed to generate details: ", "Fehler beim Erstellen der Details: ") + error.message, true);
  });
});
detailExample1AudioBtn?.addEventListener("click", () => {
  playDetailExampleAudio(detailExample1).catch((error) => {
    setStatus(t("detailExampleAudioError") + error.message, true);
  });
});
detailExample2AudioBtn?.addEventListener("click", () => {
  playDetailExampleAudio(detailExample2).catch((error) => {
    setStatus(t("detailExampleAudioError") + error.message, true);
  });
});
detailPastAudioBtn?.addEventListener("click", () => {
  playDetailExampleAudio(detailPast).catch((error) => {
    setStatus(t("detailExampleAudioError") + error.message, true);
  });
});
detailFutureAudioBtn?.addEventListener("click", () => {
  playDetailExampleAudio(detailFuture).catch((error) => {
    setStatus(t("detailExampleAudioError") + error.message, true);
  });
});

listenPendingTextUpdates();
listenHistoryUpdates();
listenThemeChanges();
setActiveTab("translator");
resetWordDetails();

async function initPopup() {
  const authRedirect = await handleSupabaseAuthRedirectFromUrl();

  await Promise.all([
    applyThemeFromSettings(),
    Promise.resolve().then(() => populateTranslationLanguageSelects()),
    applyAppLanguageFromSettings(),
    applyPopupSizeFromSettings(),
    populateVoiceSelect(),
    refreshOnboarding(),
    loadPendingTextAndTranslate(),
    loadHistorySelect()
  ]);

  if (authRedirect?.ok) {
    setStatus(t("onboardingSaved"));
  }
}

initPopup().catch((error) => {
  setStatus(tl("Falha ao iniciar popup: ", "Failed to initialize popup: ", "Fehler beim Starten des Popups: ") + error.message, true);
});
