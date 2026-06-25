const counterEl = document.getElementById("counter");
const sectionsEl = document.getElementById("sections");
const emptyStateEl = document.getElementById("emptyState");
const cardEl = document.getElementById("card");
const frontTextEl = document.getElementById("frontText");
const backTextEl = document.getElementById("backText");
const metaTextEl = document.getElementById("metaText");
const statusEl = document.getElementById("status");

const prevBtn = document.getElementById("prevBtn");
const flipBtn = document.getElementById("flipBtn");
const nextBtn = document.getElementById("nextBtn");
const removeBtn = document.getElementById("removeBtn");
const clearBtn = document.getElementById("clearBtn");
const pronounceCardBtn = document.getElementById("pronounceCardBtn");
const youglishCardBtn = document.getElementById("youglishCardBtn");
const pageTitleEl = document.getElementById("pageTitle");
const frontLabelEl = document.getElementById("frontLabel");
const backLabelEl = document.getElementById("backLabel");
const dangerTextEl = document.getElementById("dangerText");

let allCards = [];
let visibleCards = [];
let currentIndex = 0;
let isFrontVisible = true;
let activeSection = "all";
let currentUiLanguage = "pt-BR";

const SETTINGS_KEY = "deepseekTranslatorSettings";

const UI_TEXTS = {
  pt: {
    pageTitle: "Flashcards - DeepSeek Translator",
    headerTitle: "Flashcards",
    emptyState: "Nenhuma palavra salva ainda.",
    frontLabel: "Frente",
    backLabel: "Verso",
    prev: "Anterior",
    next: "Proximo",
    flip: "Virar",
    showBack: "Mostrar verso",
    showFront: "Mostrar frente",
    removeCurrent: "Remover atual",
    pronounceWord: "Pronunciar palavra",
    youglish: "YouGlish",
    dangerText: "Zona de risco: esta acao remove todos os flashcards salvos.",
    clearAll: "Limpar toda a base",
    sectionAll: "Todos",
    counter: "{current} de {total}",
    meta: "Secao: {section} | Origem: {source} | Destino: {target}",
    languageAuto: "Auto",
    languageUnknown: "Outro",
    language_en: "Ingles",
    language_de: "Alemao",
    language_fr: "Frances",
    language_es: "Espanhol",
    language_pt: "Portugues",
    language_it: "Italiano",
    language_nl: "Holandes",
    language_ru: "Russo",
    statusNoCardRemove: "Nenhum card para remover.",
    statusRemoved: "Card removido.",
    statusNoCardClear: "Nenhum card para limpar.",
    statusClearCanceled: "Limpeza cancelada.",
    statusAllRemoved: "Todos os cards foram removidos.",
    statusNoCardPronounce: "Nenhum card para pronunciar.",
    statusNoSourceWord: "Card sem palavra de origem.",
    statusPronouncing: "Pronunciando...",
    statusPronouncingWith: "Pronunciando com {voice}...",
    statusNoCardYouglish: "Nenhum card para abrir no YouGlish.",
    statusYouglishOnlyWord: "YouGlish so aceita palavra ou phrasal verb.",
    statusLoadFailed: "Falha ao carregar flashcards: {error}",
    statusRemoveFailed: "Erro ao remover: {error}",
    statusClearFailed: "Erro ao limpar: {error}",
    statusPronounceFailed: "Erro na pronuncia: {error}",
    statusYouglishFailed: "Erro no YouGlish: {error}",
    errorListFlashcards: "Falha ao listar flashcards.",
    errorRemoveFlashcard: "Falha ao remover flashcard.",
    errorClearFlashcards: "Falha ao limpar flashcards.",
    errorOpenYouglish: "Falha ao abrir YouGlish.",
    confirmClearFirst: "Deseja limpar {count} flashcards?",
    confirmClearSecond: "Isso vai apagar tudo da base de flashcards e nao pode ser desfeito. Confirmar mesmo?"
  },
  en: {
    pageTitle: "Flashcards - DeepSeek Translator",
    headerTitle: "Flashcards",
    emptyState: "No saved words yet.",
    frontLabel: "Front",
    backLabel: "Back",
    prev: "Previous",
    next: "Next",
    flip: "Flip",
    showBack: "Show back",
    showFront: "Show front",
    removeCurrent: "Remove current",
    pronounceWord: "Pronounce word",
    youglish: "YouGlish",
    dangerText: "Danger zone: this action removes all saved flashcards.",
    clearAll: "Clear entire database",
    sectionAll: "All",
    counter: "{current} of {total}",
    meta: "Section: {section} | Source: {source} | Target: {target}",
    languageAuto: "Auto",
    languageUnknown: "Other",
    language_en: "English",
    language_de: "German",
    language_fr: "French",
    language_es: "Spanish",
    language_pt: "Portuguese",
    language_it: "Italian",
    language_nl: "Dutch",
    language_ru: "Russian",
    statusNoCardRemove: "No card to remove.",
    statusRemoved: "Card removed.",
    statusNoCardClear: "No card to clear.",
    statusClearCanceled: "Clear canceled.",
    statusAllRemoved: "All cards were removed.",
    statusNoCardPronounce: "No card to pronounce.",
    statusNoSourceWord: "Card has no source word.",
    statusPronouncing: "Pronouncing...",
    statusPronouncingWith: "Pronouncing with {voice}...",
    statusNoCardYouglish: "No card to open on YouGlish.",
    statusYouglishOnlyWord: "YouGlish only supports a word or phrasal verb.",
    statusLoadFailed: "Failed to load flashcards: {error}",
    statusRemoveFailed: "Remove error: {error}",
    statusClearFailed: "Clear error: {error}",
    statusPronounceFailed: "Pronunciation error: {error}",
    statusYouglishFailed: "YouGlish error: {error}",
    errorListFlashcards: "Failed to list flashcards.",
    errorRemoveFlashcard: "Failed to remove flashcard.",
    errorClearFlashcards: "Failed to clear flashcards.",
    errorOpenYouglish: "Failed to open YouGlish.",
    confirmClearFirst: "Do you want to clear {count} flashcards?",
    confirmClearSecond: "This will erase everything from flashcards and cannot be undone. Confirm?"
  },
  de: {
    pageTitle: "Flashcards - DeepSeek Translator",
    headerTitle: "Flashcards",
    emptyState: "Noch keine gespeicherten Woerter.",
    frontLabel: "Vorderseite",
    backLabel: "Rueckseite",
    prev: "Zurueck",
    next: "Weiter",
    flip: "Drehen",
    showBack: "Rueckseite zeigen",
    showFront: "Vorderseite zeigen",
    removeCurrent: "Aktuelle entfernen",
    pronounceWord: "Wort aussprechen",
    youglish: "YouGlish",
    dangerText: "Gefahrenbereich: diese Aktion entfernt alle gespeicherten Flashcards.",
    clearAll: "Gesamte Datenbank leeren",
    sectionAll: "Alle",
    counter: "{current} von {total}",
    meta: "Bereich: {section} | Quelle: {source} | Ziel: {target}",
    languageAuto: "Auto",
    languageUnknown: "Andere",
    language_en: "Englisch",
    language_de: "Deutsch",
    language_fr: "Franzoesisch",
    language_es: "Spanisch",
    language_pt: "Portugiesisch",
    language_it: "Italienisch",
    language_nl: "Niederlaendisch",
    language_ru: "Russisch",
    statusNoCardRemove: "Keine Karte zum Entfernen.",
    statusRemoved: "Karte entfernt.",
    statusNoCardClear: "Keine Karte zum Loeschen.",
    statusClearCanceled: "Loeschen abgebrochen.",
    statusAllRemoved: "Alle Karten wurden entfernt.",
    statusNoCardPronounce: "Keine Karte zum Aussprechen.",
    statusNoSourceWord: "Karte ohne Quellwort.",
    statusPronouncing: "Spricht aus...",
    statusPronouncingWith: "Spricht mit {voice} aus...",
    statusNoCardYouglish: "Keine Karte fuer YouGlish.",
    statusYouglishOnlyWord: "YouGlish unterstuetzt nur Wort oder Phrasal Verb.",
    statusLoadFailed: "Flashcards konnten nicht geladen werden: {error}",
    statusRemoveFailed: "Fehler beim Entfernen: {error}",
    statusClearFailed: "Fehler beim Loeschen: {error}",
    statusPronounceFailed: "Fehler bei Aussprache: {error}",
    statusYouglishFailed: "YouGlish-Fehler: {error}",
    errorListFlashcards: "Flashcards konnten nicht aufgelistet werden.",
    errorRemoveFlashcard: "Flashcard konnte nicht entfernt werden.",
    errorClearFlashcards: "Flashcards konnten nicht geloescht werden.",
    errorOpenYouglish: "YouGlish konnte nicht geoeffnet werden.",
    confirmClearFirst: "Moechten Sie {count} Flashcards loeschen?",
    confirmClearSecond: "Dies loescht alles aus der Flashcard-Datenbank und kann nicht rueckgaengig gemacht werden. Bestaetigen?"
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

function t(key, vars = {}) {
  const ui = UI_TEXTS[getUiLanguageCode(currentUiLanguage)] || UI_TEXTS.pt;
  const template = ui[key] || UI_TEXTS.pt[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    return Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : `{${name}}`;
  });
}

function applyFlashcardsLanguage() {
  document.documentElement.lang = currentUiLanguage;
  document.title = t("pageTitle");

  if (pageTitleEl) pageTitleEl.textContent = t("headerTitle");
  if (emptyStateEl) emptyStateEl.textContent = t("emptyState");
  if (frontLabelEl) frontLabelEl.textContent = t("frontLabel");
  if (backLabelEl) backLabelEl.textContent = t("backLabel");
  if (dangerTextEl) dangerTextEl.textContent = t("dangerText");

  prevBtn.textContent = t("prev");
  nextBtn.textContent = t("next");
  if (visibleCards.length) {
    flipBtn.textContent = isFrontVisible ? t("showBack") : t("showFront");
  } else {
    flipBtn.textContent = t("flip");
  }
  removeBtn.textContent = t("removeCurrent");
  clearBtn.textContent = t("clearAll");
  pronounceCardBtn.textContent = t("pronounceWord");
  youglishCardBtn.textContent = t("youglish");
}

function applyTheme(themeMode) {
  const normalized = (themeMode || "light").toLowerCase();
  document.body.setAttribute("data-theme", normalized === "dark" ? "dark" : "light");
}

async function applyThemeFromSettings() {
  const settingsResponse = await sendRuntimeMessage({ type: "GET_SETTINGS" });
  const settings = settingsResponse?.settings || {};
  applyTheme(settings.themeMode || "light");
  currentUiLanguage = settings.appLanguage || "pt-BR";
  applyFlashcardsLanguage();
}

function listenThemeChanges() {
  if (!chrome?.storage?.onChanged?.addListener) {
    return;
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes.deepseekTranslatorSettings) {
      return;
    }

    const nextSettings = changes.deepseekTranslatorSettings.newValue || {};
    applyTheme(nextSettings.themeMode || "light");
    currentUiLanguage = nextSettings.appLanguage || "pt-BR";
    applyFlashcardsLanguage();
    renderSections();
    render();
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b00020" : "#586a86";
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      resolve(response);
    });
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

function getPrimaryLanguageCode(code) {
  return (code || "").toLowerCase().split("-")[0];
}

function isVoiceCompatibleWithLanguage(voice, speechLanguage) {
  if (!voice?.lang || !speechLanguage) {
    return false;
  }

  return getPrimaryLanguageCode(voice.lang) === getPrimaryLanguageCode(speechLanguage);
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

async function resolveConfiguredVoice(speechLanguage) {
  const settingsResponse = await sendRuntimeMessage({ type: "GET_SETTINGS" });
  const selectedName = (settingsResponse?.settings?.speechVoiceName || "auto").trim();
  const voices = await getVoicesAsync();

  if (!voices.length) {
    return null;
  }

  if (selectedName && selectedName !== "auto") {
    const explicit = voices.find((voice) => voice.name === selectedName);
    if (explicit && isVoiceCompatibleWithLanguage(explicit, speechLanguage)) {
      return explicit;
    }
  }

  return voices.find((voice) => voice.lang.toLowerCase().startsWith(speechLanguage.toLowerCase().split("-")[0])) || null;
}

function normalizeWord(text) {
  return (text || "").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
}

function normalizeTerm(text) {
  return (text || "").trim().replace(/\s+/g, " ");
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

function getLanguageLabel(code) {
  const lower = (code || "").toLowerCase();
  const map = {
    en: t("language_en"),
    de: t("language_de"),
    fr: t("language_fr"),
    es: t("language_es"),
    pt: t("language_pt"),
    it: t("language_it"),
    nl: t("language_nl"),
    ru: t("language_ru"),
    auto: t("languageAuto")
  };

  const short = lower.split("-")[0];
  return map[short] || (code || t("languageUnknown"));
}

function getAvailableSections() {
  const codes = new Set();
  for (const card of allCards) {
    codes.add((card.sourceLanguage || "auto").toLowerCase());
  }

  const sorted = Array.from(codes).sort((a, b) => getLanguageLabel(a).localeCompare(getLanguageLabel(b)));
  return ["all", ...sorted];
}

function applySectionFilter() {
  if (activeSection === "all") {
    visibleCards = [...allCards];
  } else {
    visibleCards = allCards.filter(
      (card) => (card.sourceLanguage || "auto").toLowerCase() === activeSection
    );
  }

  if (currentIndex >= visibleCards.length) {
    currentIndex = 0;
  }
}

function renderSections() {
  sectionsEl.innerHTML = "";
  const sections = getAvailableSections();

  for (const sectionCode of sections) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "section-chip";
    chip.textContent = sectionCode === "all" ? t("sectionAll") : getLanguageLabel(sectionCode);

    if (sectionCode === activeSection) {
      chip.classList.add("active");
    }

    chip.addEventListener("click", () => {
      activeSection = sectionCode;
      currentIndex = 0;
      isFrontVisible = true;
      applySectionFilter();
      renderSections();
      render();
    });

    sectionsEl.appendChild(chip);
  }
}

function render() {
  const total = visibleCards.length;
  if (!total) {
    counterEl.textContent = t("counter", { current: 0, total: 0 });
    emptyStateEl.classList.remove("hidden");
    cardEl.classList.add("hidden");
    flipBtn.textContent = t("flip");
    return;
  }

  if (currentIndex < 0) {
    currentIndex = 0;
  }

  if (currentIndex >= total) {
    currentIndex = total - 1;
  }

  const card = visibleCards[currentIndex];
  const sourceText = card.sourceText || "";
  const translatedText = card.translatedText || "";

  counterEl.textContent = t("counter", { current: currentIndex + 1, total });
  emptyStateEl.classList.add("hidden");
  cardEl.classList.remove("hidden");

  if (isFrontVisible) {
    frontTextEl.textContent = sourceText;
    backTextEl.textContent = "???";
    flipBtn.textContent = t("showBack");
  } else {
    frontTextEl.textContent = sourceText;
    backTextEl.textContent = translatedText;
    flipBtn.textContent = t("showFront");
  }

  metaTextEl.textContent = t("meta", {
    section: getLanguageLabel(card.sourceLanguage || "auto"),
    source: card.sourceLanguage || "auto",
    target: card.targetLanguage || "pt-BR"
  });
}

async function loadCards() {
  const response = await sendRuntimeMessage({ type: "LIST_FLASHCARDS" });
  if (!response?.ok) {
    throw new Error(response?.error || t("errorListFlashcards"));
  }

  allCards = response.cards || [];
  applySectionFilter();
  renderSections();
  render();
}

function nextCard() {
  if (!visibleCards.length) {
    return;
  }

  currentIndex = (currentIndex + 1) % visibleCards.length;
  isFrontVisible = true;
  render();
}

function prevCard() {
  if (!visibleCards.length) {
    return;
  }

  currentIndex = (currentIndex - 1 + visibleCards.length) % visibleCards.length;
  isFrontVisible = true;
  render();
}

function flipCard() {
  if (!visibleCards.length) {
    return;
  }

  isFrontVisible = !isFrontVisible;
  render();
}

async function removeCurrentCard() {
  if (!visibleCards.length) {
    setStatus(t("statusNoCardRemove"), true);
    return;
  }

  const current = visibleCards[currentIndex];
  const response = await sendRuntimeMessage({ type: "REMOVE_FLASHCARD", id: current.id });
  if (!response?.ok) {
    throw new Error(response?.error || t("errorRemoveFlashcard"));
  }

  allCards = allCards.filter((card) => card.id !== current.id);
  applySectionFilter();
  renderSections();
  isFrontVisible = true;
  render();
  setStatus(t("statusRemoved"));
}

async function clearAllCards() {
  if (!allCards.length) {
    setStatus(t("statusNoCardClear"), true);
    return;
  }

  const totalCards = allCards.length;
  const firstConfirm = window.confirm(t("confirmClearFirst", { count: totalCards }));
  if (!firstConfirm) {
    setStatus(t("statusClearCanceled"));
    return;
  }

  const secondConfirm = window.confirm(t("confirmClearSecond"));
  if (!secondConfirm) {
    setStatus(t("statusClearCanceled"));
    return;
  }

  allCards = [];
  visibleCards = [];
  currentIndex = 0;
  isFrontVisible = true;
  activeSection = "all";
  const response = await sendRuntimeMessage({ type: "CLEAR_FLASHCARDS" });
  if (!response?.ok) {
    throw new Error(response?.error || t("errorClearFlashcards"));
  }

  renderSections();
  render();
  setStatus(t("statusAllRemoved"));
}

function getCurrentCard() {
  if (!visibleCards.length) {
    return null;
  }

  return visibleCards[currentIndex] || null;
}

async function pronounceCurrentCard() {
  const card = getCurrentCard();
  if (!card) {
    setStatus(t("statusNoCardPronounce"), true);
    return;
  }

  const text = (card.sourceText || "").trim();
  if (!text) {
    setStatus(t("statusNoSourceWord"), true);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = await detectSpeechLanguage(text, card.sourceLanguage || "en");
  const voice = await resolveConfiguredVoice(utterance.lang);
  if (voice) {
    utterance.voice = voice;
  }
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
  setStatus(voice ? t("statusPronouncingWith", { voice: voice.name }) : t("statusPronouncing"));
}

async function openCurrentCardOnYouGlish() {
  const card = getCurrentCard();
  if (!card) {
    setStatus(t("statusNoCardYouglish"), true);
    return;
  }

  const text = normalizeTerm(card.sourceText || "");
  if (!isAdvancedTerm(text)) {
    setStatus(t("statusYouglishOnlyWord"), true);
    return;
  }

  const language = (card.sourceLanguage || "en").trim();
  const response = await sendRuntimeMessage({
    type: "OPEN_YOUGLISH",
    text,
    language
  });

  if (!response?.ok) {
    throw new Error(response?.error || t("errorOpenYouglish"));
  }
}

prevBtn.addEventListener("click", prevCard);
flipBtn.addEventListener("click", flipCard);
nextBtn.addEventListener("click", nextCard);
removeBtn.addEventListener("click", () => {
  removeCurrentCard().catch((error) => setStatus(t("statusRemoveFailed", { error: error.message }), true));
});
clearBtn.addEventListener("click", () => {
  clearAllCards().catch((error) => setStatus(t("statusClearFailed", { error: error.message }), true));
});
pronounceCardBtn.addEventListener("click", () => {
  pronounceCurrentCard().catch((error) => {
    setStatus(t("statusPronounceFailed", { error: error.message }), true);
  });
});
youglishCardBtn.addEventListener("click", () => {
  openCurrentCardOnYouGlish().catch((error) => {
    setStatus(t("statusYouglishFailed", { error: error.message }), true);
  });
});

Promise.all([applyThemeFromSettings(), loadCards()]).catch((error) => {
  setStatus(t("statusLoadFailed", { error: error.message }), true);
});

listenThemeChanges();
