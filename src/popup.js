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
const historySelect = document.getElementById("historySelect");
const useHistoryBtn = document.getElementById("useHistoryBtn");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

const SETTINGS_KEY = "deepseekTranslatorSettings";
const PENDING_TEXT_KEY = "deepseekTranslatorPendingText";
const SELECTION_HISTORY_KEY = "deepseekTranslatorSelectionHistory";
let currentUiLanguage = "pt-BR";
let isApplyingPendingText = false;
let lastDetailsKey = "";
let autoDetailsTimer = null;
let isGeneratingDetails = false;
let detailsSpeechLanguage = "en-US";

const UI_TEXTS = {
  pt: {
    pageTitle: "DeepSeek Translator",
    sourceTitle: "Idioma de origem",
    targetTitle: "Idioma de destino",
    resetSizeTitle: "Voltar tamanho padrao",
    settingsTitle: "Configuracoes",
    voiceSettingsTitle: "Configuracoes de voz",
    voiceSettingsAria: "Abrir configuracoes",
    voicePickerTitle: "Selecionar voz",
    inputLabel: "Texto",
    inputPlaceholder: "De duplo clique numa palavra na pagina ou cole aqui",
    pronounceTitle: "Pronunciar",
    nativeAudioTitle: "Audio nativo",
    historyTitle: "Historico de selecoes",
    historyPlaceholder: "Historico (ultimas 20)",
    useHistory: "Usar",
    clearHistoryTitle: "Limpar historico",
    translate: "Traduzir",
    outputLabel: "Resultado",
    copy: "Copiar resultado",
    saveFlashcard: "Salvar FlashCard ({lang})",
    flashcards: "Flashcards",
    youglish: "YouGlish",
    forvo: "Forvo",
    detailsTitle: "Detalhes da palavra traduzida",
    generateDetails: "Gerar detalhes",
    pronunciationSimple: "Pronuncia (simplificada)",
    synonym: "Sinonimo",
    antonym: "Antonimo",
    example1: "Exemplo de uso 1",
    example2: "Exemplo de uso 2",
    pastExample: "Exemplo no passado",
    futureExample: "Exemplo no futuro",
    detailExampleAudioTitle: "Ouvir audio do exemplo",
    detailExampleAudioMissing: "Exemplo indisponivel para audio.",
    detailExampleAudioError: "Falha ao reproduzir audio do exemplo: ",
    tabTranslator: "Tradutor",
    tabDetails: "Detalhes",
    tabTranslatorTitle: "Aba Tradutor",
    tabDetailsTitle: "Aba Detalhes",
    tabsAria: "Abas",
    autoVoiceOption: "Auto (melhor disponivel)"
  },
  en: {
    pageTitle: "DeepSeek Translator",
    sourceTitle: "Source language",
    targetTitle: "Target language",
    resetSizeTitle: "Reset default size",
    settingsTitle: "Settings",
    voiceSettingsTitle: "Voice settings",
    voiceSettingsAria: "Open settings",
    voicePickerTitle: "Select voice",
    inputLabel: "Text",
    inputPlaceholder: "Double-click a word on the page or paste text here",
    pronounceTitle: "Pronounce",
    nativeAudioTitle: "Native audio",
    historyTitle: "Selection history",
    historyPlaceholder: "History (last 20)",
    useHistory: "Use",
    clearHistoryTitle: "Clear history",
    translate: "Translate",
    outputLabel: "Result",
    copy: "Copy result",
    saveFlashcard: "Save FlashCard ({lang})",
    flashcards: "Flashcards",
    youglish: "YouGlish",
    forvo: "Forvo",
    detailsTitle: "Translated word details",
    generateDetails: "Generate details",
    pronunciationSimple: "Pronunciation (simplified)",
    synonym: "Synonym",
    antonym: "Antonym",
    example1: "Usage example 1",
    example2: "Usage example 2",
    pastExample: "Past tense example",
    futureExample: "Future tense example",
    detailExampleAudioTitle: "Play example audio",
    detailExampleAudioMissing: "Example is unavailable for audio.",
    detailExampleAudioError: "Failed to play example audio: ",
    tabTranslator: "Translator",
    tabDetails: "Details",
    tabTranslatorTitle: "Translator tab",
    tabDetailsTitle: "Details tab",
    tabsAria: "Tabs",
    autoVoiceOption: "Auto (best available)"
  },
  de: {
    pageTitle: "DeepSeek Translator",
    sourceTitle: "Ausgangssprache",
    targetTitle: "Zielsprache",
    resetSizeTitle: "Standardgroesse zuruecksetzen",
    settingsTitle: "Einstellungen",
    voiceSettingsTitle: "Stimmeinstellungen",
    voiceSettingsAria: "Einstellungen oeffnen",
    voicePickerTitle: "Stimme auswaehlen",
    inputLabel: "Text",
    inputPlaceholder: "Doppelklick auf ein Wort oder Text hier einfuegen",
    pronounceTitle: "Aussprechen",
    nativeAudioTitle: "Original-Audio",
    historyTitle: "Auswahlverlauf",
    historyPlaceholder: "Verlauf (letzte 20)",
    useHistory: "Nutzen",
    clearHistoryTitle: "Verlauf loeschen",
    translate: "Uebersetzen",
    outputLabel: "Ergebnis",
    copy: "Ergebnis kopieren",
    saveFlashcard: "FlashCard speichern ({lang})",
    flashcards: "Flashcards",
    youglish: "YouGlish",
    forvo: "Forvo",
    detailsTitle: "Wortdetails der Uebersetzung",
    generateDetails: "Details erstellen",
    pronunciationSimple: "Aussprache (vereinfacht)",
    synonym: "Synonym",
    antonym: "Antonym",
    example1: "Beispielsatz 1",
    example2: "Beispielsatz 2",
    pastExample: "Beispiel Vergangenheit",
    futureExample: "Beispiel Zukunft",
    detailExampleAudioTitle: "Beispielaudio abspielen",
    detailExampleAudioMissing: "Beispiel ist fuer Audio nicht verfuegbar.",
    detailExampleAudioError: "Beispielaudio konnte nicht abgespielt werden: ",
    tabTranslator: "Uebersetzer",
    tabDetails: "Details",
    tabTranslatorTitle: "Uebersetzer-Tab",
    tabDetailsTitle: "Details-Tab",
    tabsAria: "Tabs",
    autoVoiceOption: "Auto (beste verfuegbar)"
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

function tl(pt, en, de) {
  const code = getUiLanguageCode(currentUiLanguage);
  if (code === "de") {
    return de;
  }
  if (code === "en") {
    return en;
  }
  return pt;
}

function applyPopupLanguage() {
  document.documentElement.lang = currentUiLanguage;
  document.title = t("pageTitle");

  quickSourceLanguageSelect.title = t("sourceTitle");
  quickTargetLanguageSelect.title = t("targetTitle");
  resetSizeBtn.title = t("resetSizeTitle");
  openSettingsBtn.title = t("settingsTitle");
  if (voicePickerBtn) {
    voicePickerBtn.title = t("voicePickerTitle");
    voicePickerBtn.setAttribute("aria-label", t("voicePickerTitle"));
  }
  if (voiceSettingsBtn) {
    voiceSettingsBtn.title = t("voiceSettingsTitle");
    voiceSettingsBtn.setAttribute("aria-label", t("voiceSettingsAria"));
  }
  pronounceBtn.title = t("pronounceTitle");
  nativeAudioBtn.title = t("nativeAudioTitle");
  historySelect.title = t("historyTitle");
  clearHistoryBtn.title = t("clearHistoryTitle");
  tabTranslatorBtn.title = t("tabTranslatorTitle");
  tabDetailsBtn.title = t("tabDetailsTitle");

  const tabsNav = document.querySelector(".tab-switcher");
  if (tabsNav) {
    tabsNav.setAttribute("aria-label", t("tabsAria"));
  }

  const inputLabel = document.querySelector('label[for="inputText"]');
  const outputLabel = document.querySelector('label[for="outputText"]');
  if (inputLabel) inputLabel.textContent = t("inputLabel");
  if (outputLabel) outputLabel.textContent = t("outputLabel");

  inputText.placeholder = t("inputPlaceholder");
  useHistoryBtn.textContent = t("useHistory");
  translateBtn.textContent = t("translate");
  copyBtn.textContent = t("copy");
  openFlashcardsBtn.textContent = t("flashcards");
  youglishBtn.textContent = t("youglish");
  if (forvoBtn) {
    forvoBtn.textContent = t("forvo");
  }
  generateDetailsBtn.textContent = t("generateDetails");

  const detailsTitleEl = document.querySelector(".details-title");
  if (detailsTitleEl) detailsTitleEl.textContent = t("detailsTitle");

  const detailLabels = document.querySelectorAll(".detail-label");
  if (detailLabels.length >= 7) {
    detailLabels[0].textContent = t("pronunciationSimple");
    detailLabels[1].textContent = t("synonym");
    detailLabels[2].textContent = t("antonym");
    detailLabels[3].textContent = t("example1");
    detailLabels[4].textContent = t("example2");
    detailLabels[5].textContent = t("pastExample");
    detailLabels[6].textContent = t("futureExample");
  }

  const detailAudioButtons = [detailExample1AudioBtn, detailExample2AudioBtn, detailPastAudioBtn, detailFutureAudioBtn];
  for (const button of detailAudioButtons) {
    if (!button) {
      continue;
    }

    button.title = t("detailExampleAudioTitle");
    button.setAttribute("aria-label", t("detailExampleAudioTitle"));
  }

  const translatorTabText = tabTranslatorBtn.querySelector("span:last-child");
  const detailsTabText = tabDetailsBtn.querySelector("span:last-child");
  if (translatorTabText) translatorTabText.textContent = t("tabTranslator");
  if (detailsTabText) detailsTabText.textContent = t("tabDetails");

  if (historySelect.options.length) {
    historySelect.options[0].textContent = t("historyPlaceholder");
  }

  if (voiceSelect?.options?.length) {
    voiceSelect.options[0].textContent = t("autoVoiceOption");
    updateVoicePickerState();
  }

  updateSaveFlashcardButtonLabel();
}

async function applyAppLanguageFromSettings() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  currentUiLanguage = settings.appLanguage || "pt-BR";
  applyPopupLanguage();
}

function getSourceLanguageShortLabel(language) {
  const code = (language || "auto").toLowerCase();

  if (code === "auto") {
    return "AUTO";
  }

  if (code.startsWith("de")) {
    return "DE";
  }

  if (code.startsWith("en")) {
    return "US";
  }

  if (code.startsWith("pt")) {
    return "PT";
  }

  if (code.startsWith("es")) {
    return "ES";
  }

  if (code.startsWith("fr")) {
    return "FR";
  }

  return code.slice(0, 2).toUpperCase() || "AUTO";
}

function updateSaveFlashcardButtonLabel() {
  const shortLabel = getSourceLanguageShortLabel(quickSourceLanguageSelect.value || "auto");
  saveWordBtn.textContent = t("saveFlashcard").replace("{lang}", shortLabel);
}

function updateVoicePickerState() {
  if (!voicePickerBtn || !voiceSelect?.selectedOptions?.length) {
    return;
  }

  const label = voiceSelect.selectedOptions[0].textContent || "Auto";
  voicePickerBtn.title = `${t("voicePickerTitle")}: ${label}`;
  voicePickerBtn.setAttribute("aria-label", `${t("voicePickerTitle")}: ${label}`);
}

function toggleVoicePanel(forceOpen = null) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : voiceControlPanel.classList.contains("hidden");
  voiceControlPanel.classList.toggle("hidden", !shouldOpen);
}

function normalizeHistoryText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

async function loadHistorySelect() {
  const history = (await storageGet(SELECTION_HISTORY_KEY)) || [];
  historySelect.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = t("historyPlaceholder");
  historySelect.appendChild(placeholder);

  for (const item of history) {
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

async function clearSelectionHistory() {
  const history = (await storageGet(SELECTION_HISTORY_KEY)) || [];
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
  await loadHistorySelect();
  setStatus(tl("Historico limpo.", "History cleared.", "Verlauf geloescht."));
}

function applyTheme(themeMode) {
  const normalized = (themeMode || "light").toLowerCase();
  document.body.setAttribute("data-theme", normalized === "dark" ? "dark" : "light");
}

async function applyThemeFromSettings() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  applyTheme(settings.themeMode || "light");
}

function listenThemeChanges() {
  if (!chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[SETTINGS_KEY]) {
      return;
    }

    const nextSettings = changes[SETTINGS_KEY].newValue || {};
    applyTheme(nextSettings.themeMode || "light");
    currentUiLanguage = nextSettings.appLanguage || "pt-BR";
    applyPopupLanguage();
  });
}

function normalizeWord(text) {
  return (text || "").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function normalizeTerm(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function normalizeTranslatedText(text) {
  const raw = (text || "").trim();
  if (!raw) {
    return "";
  }

  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return raw;
  }

  const firstLine = lines[0].toLowerCase();
  const looksLikePreamble =
    firstLine.startsWith("translating ") ||
    (firstLine.startsWith("translation") && firstLine.includes("from") && firstLine.includes("to"));

  if (looksLikePreamble && lines.length > 1) {
    return lines.slice(1).join("\n").trim();
  }

  return raw;
}

function splitTermWords(text) {
  return normalizeTerm(text)
    .split(" ")
    .map((part) => part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter(Boolean);
}

function isSingleWord(text) {
  const cleaned = normalizeWord(text);
  if (!cleaned) {
    return false;
  }

  if (/\s/u.test(cleaned)) {
    return false;
  }

  return /[\p{L}\p{N}]/u.test(cleaned);
}

function isPhrasalVerbLike(text) {
  const words = splitTermWords(text);
  if (words.length < 2 || words.length > 3) {
    return false;
  }

  const particles = new Set([
    "up",
    "down",
    "off",
    "on",
    "in",
    "out",
    "away",
    "back",
    "over",
    "through",
    "along",
    "around",
    "about",
    "across",
    "after",
    "apart",
    "with"
  ]);

  const firstWordLooksValid = /^[\p{L}][\p{L}'-]*$/u.test(words[0]);
  if (!firstWordLooksValid) {
    return false;
  }

  return words.slice(1).some((word) => particles.has(word.toLowerCase()));
}

function isAdvancedTerm(text) {
  return isSingleWord(text) || isPhrasalVerbLike(text);
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#586a86";
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
  const apiKey = (settings.apiKey || "").trim();
  const model = (settings.model || "deepseek-chat").trim();
  const sourceLanguage = (settings.sourceLanguage || "auto").trim();
  const targetLanguage = (settings.targetLanguage || "pt-BR").trim();
  const word = normalizeTerm(inputText.value);
  const detailsKey = buildDetailsKey(word, sourceLanguage, targetLanguage);

  if (!apiKey) {
    if (!silent) {
      setStatus(
        tl(
          "Configure a API key em Configuracoes.",
          "Configure an API key in Settings.",
          "Konfigurieren Sie einen API-Schluessel in den Einstellungen."
        ),
        true
      );
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
    const detailsLanguageName = getDetailsLanguageName(detailsLanguageCode);
    detailsSpeechLanguage = mapLanguageToSpeechLanguage(detailsLanguageCode);

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are a language assistant. Return only valid JSON with fields: pronunciation, synonym, antonym, synonymTranslation, antonymTranslation, example1, example2, pastExample, futureExample, example1Translation, example2Translation, pastExampleTranslation, futureExampleTranslation. Keep each field concise. " +
              `Fields pronunciation, synonym, antonym, example1, example2, pastExample and futureExample must be written in ${detailsLanguageName}. ` +
              `Fields synonymTranslation, antonymTranslation, example1Translation, example2Translation, pastExampleTranslation and futureExampleTranslation must be written in ${targetLanguage}.`
          },
          {
            role: "user",
            content:
              `Word/term: ${word}\nSource language: ${sourceLanguage}\nTarget language: ${targetLanguage}\nOutput language for details: ${detailsLanguageCode} (${detailsLanguageName})\n` +
              "Provide pronunciation using a simplified phonetic scheme with two strict rules: " +
              "use UPPERCASE letters for the stressed syllable and separate syllables with dots. " +
              "Example: TRA.kuhng. " +
              "Return two usage examples, plus one example in past tense and one in future tense. " +
              `Synonym, antonym and all examples must be entirely in ${detailsLanguageName}. ` +
              `Also return translations to ${targetLanguage} for synonym, antonym and each example. ` +
              "Use fields synonymTranslation, antonymTranslation, example1Translation, example2Translation, " +
              "pastExampleTranslation and futureExampleTranslation."
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      const details = data?.error?.message || JSON.stringify(data);
      throw new Error(details);
    }

    const rawText = data?.choices?.[0]?.message?.content || "";
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
    popupHeight: 520
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
  const popupHeight = clampNumber(settings.popupHeight, 260, 780, 520);
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

function mapLanguageToSpeechLanguage(language) {
  const code = (language || "").toLowerCase();

  if (code === "auto") {
    return "en-US";
  }

  if (code.startsWith("pt")) {
    return "pt-BR";
  }

  if (code.startsWith("en")) {
    return "en-US";
  }

  if (code.startsWith("es")) {
    return "es-ES";
  }

  if (code.startsWith("fr")) {
    return "fr-FR";
  }

  if (code.startsWith("de")) {
    return "de-DE";
  }

  if (code.startsWith("it")) {
    return "it-IT";
  }

  if (code.startsWith("nl")) {
    return "nl-NL";
  }

  if (code.startsWith("ru")) {
    return "ru-RU";
  }

  return "en-US";
}

function getLanguageDisplayName(languageCode) {
  const code = (languageCode || "").toLowerCase();

  if (code.startsWith("de")) {
    return "Alemao";
  }

  if (code.startsWith("en")) {
    return "Ingles";
  }

  if (code.startsWith("pt")) {
    return "Portugues";
  }

  if (code.startsWith("es")) {
    return "Espanhol";
  }

  if (code.startsWith("fr")) {
    return "Frances";
  }

  if (code.startsWith("it")) {
    return "Italiano";
  }

  if (code.startsWith("nl")) {
    return "Holandes";
  }

  if (code.startsWith("ru")) {
    return "Russo";
  }

  return languageCode || "Desconhecido";
}

function getVoicesAsync() {
  return new Promise((resolve) => {
    const voicesNow = window.speechSynthesis.getVoices();
    if (voicesNow.length) {
      resolve(voicesNow);
      return;
    }

    const onVoicesChanged = () => {
      const loaded = window.speechSynthesis.getVoices();
      if (loaded.length) {
        window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
        resolve(loaded);
      }
    };

    window.speechSynthesis.addEventListener("voiceschanged", onVoicesChanged);

    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onVoicesChanged);
      resolve(window.speechSynthesis.getVoices());
    }, 800);
  });
}

function getPrimaryLanguageCode(code) {
  return (code || "").toLowerCase().split("-")[0];
}

function isVoiceCompatibleWithLanguage(voice, speechLanguage) {
  if (!voice?.lang || !speechLanguage) {
    return false;
  }

  return getPrimaryLanguageCode(voice.lang) === getPrimaryLanguageCode(speechLanguage);
}

async function populateVoiceSelect() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const selectedName = settings.speechVoiceName || "auto";
  const voices = await getVoicesAsync();

  voiceSelect.innerHTML = "";

  const autoOption = document.createElement("option");
  autoOption.value = "auto";
  autoOption.textContent = t("autoVoiceOption");
  voiceSelect.appendChild(autoOption);

  voices
    .slice()
    .sort((a, b) => `${a.lang}-${a.name}`.localeCompare(`${b.lang}-${b.name}`))
    .forEach((voice) => {
      const option = document.createElement("option");
      option.value = voice.name;
      option.textContent = `${voice.name} (${voice.lang})`;
      voiceSelect.appendChild(option);
    });

  voiceSelect.value = selectedName;
  if (voiceSelect.value !== selectedName) {
    voiceSelect.value = "auto";
  }

  updateVoicePickerState();
}

async function updateSelectedVoice() {
  const currentSettings = (await storageGet(SETTINGS_KEY)) || {};
  const updated = {
    ...currentSettings,
    speechVoiceName: voiceSelect.value || "auto"
  };

  await storageSet(SETTINGS_KEY, updated);
  updateVoicePickerState();
  setStatus(tl("Voz atualizada.", "Voice updated.", "Stimme aktualisiert."));
}

function detectLanguageCandidates(text) {
  return new Promise((resolve) => {
    if (!chrome?.i18n?.detectLanguage || !text) {
      resolve([]);
      return;
    }

    chrome.i18n.detectLanguage(text, (result) => {
      if (chrome.runtime.lastError || !result?.languages?.length) {
        resolve([]);
        return;
      }

      resolve(result.languages);
    });
  });
}

function pickDetectedLanguage(candidates, text) {
  if (!Array.isArray(candidates) || !candidates.length) {
    return null;
  }

  const filtered = candidates.filter((item) => item?.language && item.language !== "und");
  if (!filtered.length) {
    return null;
  }

  const best = filtered[0];
  const normalized = normalizeWord(text).toLowerCase();
  const isAsciiWord = /^[a-z][a-z'-]*$/.test(normalized);

  // For short ASCII words, prefer English when it is close in confidence.
  if (isAsciiWord && normalized.length <= 10) {
    const englishCandidate = filtered.find((item) => getPrimaryLanguageCode(item.language) === "en");
    const bestConfidence = typeof best.percentage === "number" ? best.percentage : 0;
    const englishConfidence =
      englishCandidate && typeof englishCandidate.percentage === "number" ? englishCandidate.percentage : 0;

    if (
      englishCandidate &&
      getPrimaryLanguageCode(best.language) !== "en" &&
      bestConfidence - englishConfidence <= 12
    ) {
      return englishCandidate.language;
    }
  }

  return best.language;
}

async function detectSpeechLanguage(text, fallbackLanguage) {
  const normalizedFallback = (fallbackLanguage || "").trim().toLowerCase();
  if (normalizedFallback && normalizedFallback !== "auto") {
    return mapLanguageToSpeechLanguage(fallbackLanguage);
  }

  const candidates = await detectLanguageCandidates(text);
  const detected = pickDetectedLanguage(candidates, text);
  if (detected && detected !== "und") {
    return mapLanguageToSpeechLanguage(detected);
  }

  return mapLanguageToSpeechLanguage(fallbackLanguage);
}

function toDictionaryLanguageCode(language) {
  const code = (language || "").toLowerCase();

  if (code.startsWith("en")) {
    return "en";
  }

  if (code.startsWith("de")) {
    return "de";
  }

  if (code.startsWith("fr")) {
    return "fr";
  }

  if (code.startsWith("es")) {
    return "es";
  }

  if (code.startsWith("it")) {
    return "it";
  }

  if (code.startsWith("pt")) {
    return "pt";
  }

  return "en";
}

async function resolvePronunciationLanguage(word) {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const configuredSourceLanguage = (settings.sourceLanguage || "auto").trim();

  let speechLanguage = "en-US";
  if (configuredSourceLanguage && configuredSourceLanguage.toLowerCase() !== "auto") {
    speechLanguage = mapLanguageToSpeechLanguage(configuredSourceLanguage);
  } else {
    speechLanguage = await detectSpeechLanguage(word, configuredSourceLanguage);
  }

  return {
    speechLanguage,
    dictionaryLanguageCode: toDictionaryLanguageCode(speechLanguage),
    displayName: getLanguageDisplayName(speechLanguage)
  };
}

async function resolveVoiceForSpeech(speechLanguage) {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const selectedName = (settings.speechVoiceName || "auto").trim();
  const voices = await getVoicesAsync();

  if (!voices.length) {
    return { voice: null, selectedName: "" };
  }

  if (selectedName && selectedName !== "auto") {
    const explicit = voices.find((voice) => voice.name === selectedName);
    if (explicit && isVoiceCompatibleWithLanguage(explicit, speechLanguage)) {
      return { voice: explicit, selectedName: explicit.name };
    }
  }

  const byLanguage = voices.find((voice) => voice.lang.toLowerCase().startsWith(speechLanguage.toLowerCase().split("-")[0]));
  if (byLanguage) {
    return { voice: byLanguage, selectedName: byLanguage.name };
  }

  return { voice: voices[0], selectedName: voices[0].name };
}

function speakUtteranceWithSignal(utterance, timeoutMs = 1800) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeoutId = setTimeout(() => {
      if (done) {
        return;
      }

      done = true;
      resolve(false);
    }, timeoutMs);

    utterance.onstart = () => {
      if (done) {
        return;
      }

      done = true;
      clearTimeout(timeoutId);
      resolve(true);
    };

    utterance.onerror = (event) => {
      if (done) {
        return;
      }

      done = true;
      clearTimeout(timeoutId);
      reject(new Error(event?.error || "speech_synthesis_error"));
    };

    window.speechSynthesis.speak(utterance);
  });
}

async function speakWord(word, speechLanguage, displayName) {
  const voiceData = await resolveVoiceForSpeech(speechLanguage);

  window.speechSynthesis.cancel();
  window.speechSynthesis.resume();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = speechLanguage;
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  if (voiceData.voice) {
    utterance.voice = voiceData.voice;
  }

  let started = false;
  try {
    started = await speakUtteranceWithSignal(utterance);
  } catch (_error) {
    started = false;
  }

  if (!started) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();

    const fallbackUtterance = new SpeechSynthesisUtterance(word);
    fallbackUtterance.lang = speechLanguage;
    fallbackUtterance.rate = 1;
    fallbackUtterance.pitch = 1;
    fallbackUtterance.volume = 1;
    await speakUtteranceWithSignal(fallbackUtterance, 2200);
  }

  if (voiceData.selectedName) {
    setStatus(
      tl(
        `Pronunciando em ${displayName} (${speechLanguage}) com ${voiceData.selectedName}.`,
        `Pronouncing in ${displayName} (${speechLanguage}) with ${voiceData.selectedName}.`,
        `Aussprache in ${displayName} (${speechLanguage}) mit ${voiceData.selectedName}.`
      )
    );
    return;
  }

  setStatus(
    tl(
      `Pronunciando em ${displayName} (${speechLanguage}).`,
      `Pronouncing in ${displayName} (${speechLanguage}).`,
      `Aussprache in ${displayName} (${speechLanguage}).`
    )
  );
}

function pickAudioFromDictionaryResponse(data) {
  if (!Array.isArray(data)) {
    return "";
  }

  for (const entry of data) {
    const phonetics = entry?.phonetics;
    if (!Array.isArray(phonetics)) {
      continue;
    }

    for (const item of phonetics) {
      const url = (item?.audio || "").trim();
      if (url) {
        return url;
      }
    }
  }

  return "";
}

async function fetchDictionaryAudioUrl(word, languageCode) {
  const response = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(languageCode)}/${encodeURIComponent(word)}`
  );

  if (!response.ok) {
    return "";
  }

  const data = await response.json();
  return pickAudioFromDictionaryResponse(data);
}

async function pronounceCurrentWord() {
  const text = normalizeWord(inputText.value);
  if (!text) {
    setStatus(tl("Informe uma palavra para pronunciar.", "Enter a word to pronounce.", "Geben Sie ein Wort zur Aussprache ein."), true);
    return;
  }

  if (!isSingleWord(text)) {
    setStatus(tl("Pronuncia disponivel apenas para uma palavra.", "Pronunciation is available only for one word.", "Aussprache ist nur fuer ein einzelnes Wort verfuegbar."), true);
    return;
  }

  const language = await resolvePronunciationLanguage(text);
  await speakWord(text, language.speechLanguage, language.displayName);
}

async function playNativeDictionaryAudio() {
  const word = normalizeWord(inputText.value);
  if (!word) {
    setStatus(tl("Informe uma palavra para audio nativo.", "Enter a word for native audio.", "Geben Sie ein Wort fuer natives Audio ein."), true);
    return;
  }

  if (!isSingleWord(word)) {
    setStatus(tl("Audio nativo disponivel apenas para uma palavra.", "Native audio is available only for one word.", "Natives Audio ist nur fuer ein einzelnes Wort verfuegbar."), true);
    return;
  }

  const language = await resolvePronunciationLanguage(word);
  const dictionaryCode = language.dictionaryLanguageCode;

  setStatus(
    tl(
      `Buscando audio nativo em ${language.displayName} (${dictionaryCode})...`,
      `Fetching native audio in ${language.displayName} (${dictionaryCode})...`,
      `Natives Audio wird gesucht in ${language.displayName} (${dictionaryCode})...`
    )
  );
  const audioUrl = await fetchDictionaryAudioUrl(word, dictionaryCode);

  if (!audioUrl) {
    setStatus(
      tl(
        `Sem audio nativo em ${language.displayName}. Usando pronuncia local...`,
        `No native audio in ${language.displayName}. Using local pronunciation...`,
        `Kein natives Audio in ${language.displayName}. Lokale Aussprache wird verwendet...`
      )
    );
    await speakWord(word, language.speechLanguage, language.displayName);
    return;
  }

  const audio = new Audio(audioUrl);
  await audio.play();
  setStatus(
    tl(
      `Reproduzindo audio nativo em ${language.displayName} (${dictionaryCode}).`,
      `Playing native audio in ${language.displayName} (${dictionaryCode}).`,
      `Natives Audio wird abgespielt in ${language.displayName} (${dictionaryCode}).`
    )
  );
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
  const popupHeight = clampNumber(settings.popupHeight, 260, 780, 520);

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
  const apiKey = (settings.apiKey || "").trim();
  const sourceLanguage = (settings.sourceLanguage || "auto").trim();
  const targetLanguage = (settings.targetLanguage || "pt-BR").trim();
  const model = (settings.model || "deepseek-chat").trim();
  const text = inputText.value.trim();

  if (!apiKey) {
    setStatus(tl("Configure a API key em Configuracoes.", "Configure an API key in Settings.", "Konfigurieren Sie einen API-Schluessel in den Einstellungen."), true);
    return;
  }

  if (!text) {
    setStatus(tl("Informe ou selecione um texto para traduzir.", "Enter or select text to translate.", "Geben Sie einen Text ein oder waehlen Sie einen Text zur Uebersetzung aus."), true);
    return;
  }

  setStatus(tl("Traduzindo...", "Translating...", "Wird uebersetzt..."));
  outputText.value = "";

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You are a translation engine. Translate faithfully and naturally. Return only the translated text."
          },
          {
            role: "user",
            content:
              `Translate the following text from ${sourceLanguage} to ${targetLanguage}. ` +
              "Keep formatting and return only the translation.\n\n" +
              text
          }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const details = data?.error?.message || JSON.stringify(data);
      throw new Error(details);
    }

    const translated = data?.choices?.[0]?.message?.content?.trim();

    if (!translated) {
      throw new Error("Resposta da API sem texto traduzido.");
    }

    outputText.value = normalizeTranslatedText(translated);
    scheduleAutoDetailsGeneration(200);
    setStatus(tl("Traducao concluida.", "Translation completed.", "Uebersetzung abgeschlossen."));
  } catch (error) {
    setStatus(tl("Translation error: ", "Translation error: ", "Uebersetzungsfehler: ") + error.message, true);
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
clearHistoryBtn.addEventListener("click", () => {
  clearSelectionHistory().catch((error) => {
    setStatus(tl("Falha ao limpar historico: ", "Failed to clear history: ", "Fehler beim Loeschen des Verlaufs: ") + error.message, true);
  });
});
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

Promise.all([
  applyThemeFromSettings(),
  applyAppLanguageFromSettings(),
  applyPopupSizeFromSettings(),
  populateVoiceSelect(),
  loadPendingTextAndTranslate(),
  loadHistorySelect()
]).catch((error) => {
  setStatus(tl("Falha ao iniciar popup: ", "Failed to initialize popup: ", "Fehler beim Starten des Popups: ") + error.message, true);
});
