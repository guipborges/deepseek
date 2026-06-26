const counterEl = document.getElementById("counter");
const appEl = document.querySelector(".app");
const sectionsEl = document.getElementById("sections");
const emptyStateEl = document.getElementById("emptyState");
const cardEl = document.getElementById("card");
const searchInput = document.getElementById("searchInput");
const frontTextEl = document.getElementById("frontText");
const backTextEl = document.getElementById("backText");
const metaTextEl = document.getElementById("metaText");
const flipHintEl = document.querySelector(".flip-hint");
const statusEl = document.getElementById("status");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const removeBtn = document.getElementById("removeBtn");
const exportTopBtn = document.getElementById("exportTopBtn");
const exportCardsBtn = document.getElementById("exportCardsBtn");
const pronounceCardBtn = document.getElementById("pronounceCardBtn");
const youglishCardBtn = document.getElementById("youglishCardBtn");
const frontLabelEl = document.getElementById("frontLabel");
const backLabelEl = document.getElementById("backLabel");

let allCards = [];
let visibleCards = [];
let currentIndex = 0;
let isFrontVisible = true;
let activeSection = "all";
let searchQuery = "";
let touchStartX = null;
let cardTransitionDirection = "next";
let currentUiLanguage = FALLBACK_APP_LANGUAGE;

const SETTINGS_KEY = "deepseekTranslatorSettings";

const UI_TEXTS = {
  pt: {
    pageTitle: "Flashcards - Ayvu Translator",
    headerTitle: "Flashcards",
    emptyState: "Nenhuma palavra salva ainda.",
    emptyFiltered: "Nenhum flashcard encontrado com os filtros atuais.",
    frontLabel: "Frente",
    backLabel: "Verso",
    prev: "Anterior",
    next: "Próximo",
    flip: "Virar",
    showBack: "Mostrar verso",
    showFront: "Mostrar frente",
    flipHint: "Clique para virar",
    removeCurrent: "Remover atual",
    pronounceWord: "Pronunciar palavra",
    youglish: "YouGlish",
    dangerText: "Zona de risco: esta ação remove todos os flashcards salvos.",
    clearAll: "Limpar toda a base",
    searchPlaceholder: "Buscar palavra ou tradução",
    exportCsv: "Exportar CSV",
    sectionAll: "Todos",
    counter: "{current} de {total}",
    filteredCounter: "{current} de {visible} ({total} total)",
    meta: "Seção: {section} | Origem: {source} | Destino: {target}",
    languageAuto: "Auto",
    languageUnknown: "Outro",
    language_en: "Inglês",
    language_de: "Alemão",
    language_fr: "Francês",
    language_es: "Espanhol",
    language_pt: "Português",
    language_it: "Italiano",
    language_nl: "Holandês",
    language_ru: "Russo",
    language_ja: "Japonês",
    language_ko: "Coreano",
    language_zh: "Chinês",
    language_ar: "Árabe",
    language_hi: "Hindi",
    language_tr: "Turco",
    language_pl: "Polonês",
    language_sv: "Sueco",
    language_no: "Norueguês",
    language_da: "Dinamarquês",
    language_fi: "Finlandês",
    language_uk: "Ucraniano",
    language_el: "Grego",
    language_he: "Hebraico",
    language_id: "Indonésio",
    language_vi: "Vietnamita",
    language_th: "Tailandês",
    language_cs: "Tcheco",
    language_ro: "Romeno",
    language_hu: "Húngaro",
    statusNoCardRemove: "Nenhum cartão para remover.",
    statusRemoved: "Cartão removido.",
    statusNoCardClear: "Nenhum cartão para limpar.",
    statusClearCanceled: "Limpeza cancelada.",
    statusAllRemoved: "Todos os cartões foram removidos.",
    statusNoCardExport: "Nenhum cartão para exportar.",
    statusExported: "CSV exportado com {count} cartões.",
    statusNoCardPronounce: "Nenhum cartão para pronunciar.",
    statusNoSourceWord: "Cartão sem palavra de origem.",
    statusPronouncing: "Pronunciando...",
    statusPronouncingWith: "Pronunciando com {voice}...",
    statusNoCardYouglish: "Nenhum cartão para abrir no YouGlish.",
    statusYouglishOnlyWord: "O YouGlish aceita apenas palavra ou phrasal verb.",
    statusYouglishUnsupported: "YouGlish nao aceita este idioma.",
    statusLoadFailed: "Falha ao carregar flashcards: {error}",
    statusRemoveFailed: "Erro ao remover: {error}",
    statusClearFailed: "Erro ao limpar: {error}",
    statusPronounceFailed: "Erro na pronúncia: {error}",
    statusYouglishFailed: "Erro no YouGlish: {error}",
    errorListFlashcards: "Falha ao listar flashcards.",
    errorRemoveFlashcard: "Falha ao remover flashcard.",
    errorClearFlashcards: "Falha ao limpar flashcards.",
    errorOpenYouglish: "Falha ao abrir YouGlish.",
    confirmClearFirst: "Deseja limpar {count} flashcards?",
    confirmClearSecond: "Isso vai apagar tudo da base de flashcards e não pode ser desfeito. Confirmar mesmo?"
  },
  en: {
    pageTitle: "Flashcards - Ayvu Translator",
    headerTitle: "Flashcards",
    emptyState: "No saved words yet.",
    emptyFiltered: "No flashcards found with the current filters.",
    frontLabel: "Front",
    backLabel: "Back",
    prev: "Previous",
    next: "Next",
    flip: "Flip",
    showBack: "Show back",
    showFront: "Show front",
    flipHint: "Click to flip",
    removeCurrent: "Remove current",
    pronounceWord: "Pronounce word",
    youglish: "YouGlish",
    dangerText: "Danger zone: this action removes all saved flashcards.",
    clearAll: "Clear entire database",
    searchPlaceholder: "Search word or translation",
    exportCsv: "Export CSV",
    sectionAll: "All",
    counter: "{current} of {total}",
    filteredCounter: "{current} of {visible} ({total} total)",
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
    language_ja: "Japanese",
    language_ko: "Korean",
    language_zh: "Chinese",
    language_ar: "Arabic",
    language_hi: "Hindi",
    language_tr: "Turkish",
    language_pl: "Polish",
    language_sv: "Swedish",
    language_no: "Norwegian",
    language_da: "Danish",
    language_fi: "Finnish",
    language_uk: "Ukrainian",
    language_el: "Greek",
    language_he: "Hebrew",
    language_id: "Indonesian",
    language_vi: "Vietnamese",
    language_th: "Thai",
    language_cs: "Czech",
    language_ro: "Romanian",
    language_hu: "Hungarian",
    statusNoCardRemove: "No card to remove.",
    statusRemoved: "Card removed.",
    statusNoCardClear: "No card to clear.",
    statusClearCanceled: "Clear canceled.",
    statusAllRemoved: "All cards were removed.",
    statusNoCardExport: "No cards to export.",
    statusExported: "CSV exported with {count} cards.",
    statusNoCardPronounce: "No card to pronounce.",
    statusNoSourceWord: "Card has no source word.",
    statusPronouncing: "Pronouncing...",
    statusPronouncingWith: "Pronouncing with {voice}...",
    statusNoCardYouglish: "No card to open on YouGlish.",
    statusYouglishOnlyWord: "YouGlish only supports a word or phrasal verb.",
    statusYouglishUnsupported: "YouGlish does not support this language.",
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
    pageTitle: "Flashcards - Ayvu Translator",
    headerTitle: "Flashcards",
    emptyState: "Noch keine gespeicherten Woerter.",
    emptyFiltered: "Keine Flashcards mit den aktuellen Filtern gefunden.",
    frontLabel: "Vorderseite",
    backLabel: "Rueckseite",
    prev: "Zurueck",
    next: "Weiter",
    flip: "Drehen",
    showBack: "Rueckseite zeigen",
    showFront: "Vorderseite zeigen",
    flipHint: "Zum Drehen klicken",
    removeCurrent: "Aktuelle entfernen",
    pronounceWord: "Wort aussprechen",
    youglish: "YouGlish",
    dangerText: "Gefahrenbereich: diese Aktion entfernt alle gespeicherten Flashcards.",
    clearAll: "Gesamte Datenbank leeren",
    searchPlaceholder: "Wort oder Uebersetzung suchen",
    exportCsv: "CSV exportieren",
    sectionAll: "Alle",
    counter: "{current} von {total}",
    filteredCounter: "{current} von {visible} ({total} gesamt)",
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
    language_ja: "Japanisch",
    language_ko: "Koreanisch",
    language_zh: "Chinesisch",
    language_ar: "Arabisch",
    language_hi: "Hindi",
    language_tr: "Tuerkisch",
    language_pl: "Polnisch",
    language_sv: "Schwedisch",
    language_no: "Norwegisch",
    language_da: "Daenisch",
    language_fi: "Finnisch",
    language_uk: "Ukrainisch",
    language_el: "Griechisch",
    language_he: "Hebraeisch",
    language_id: "Indonesisch",
    language_vi: "Vietnamesisch",
    language_th: "Thai",
    language_cs: "Tschechisch",
    language_ro: "Rumaenisch",
    language_hu: "Ungarisch",
    statusNoCardRemove: "Keine Karte zum Entfernen.",
    statusRemoved: "Karte entfernt.",
    statusNoCardClear: "Keine Karte zum Loeschen.",
    statusClearCanceled: "Loeschen abgebrochen.",
    statusAllRemoved: "Alle Karten wurden entfernt.",
    statusNoCardExport: "Keine Karten zum Exportieren.",
    statusExported: "CSV mit {count} Karten exportiert.",
    statusNoCardPronounce: "Keine Karte zum Aussprechen.",
    statusNoSourceWord: "Karte ohne Quellwort.",
    statusPronouncing: "Spricht aus...",
    statusPronouncingWith: "Spricht mit {voice} aus...",
    statusNoCardYouglish: "Keine Karte fuer YouGlish.",
    statusYouglishOnlyWord: "YouGlish unterstuetzt nur Wort oder Phrasal Verb.",
    statusYouglishUnsupported: "YouGlish unterstuetzt diese Sprache nicht.",
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

  if (emptyStateEl) emptyStateEl.textContent = allCards.length ? t("emptyFiltered") : t("emptyState");
  if (frontLabelEl) frontLabelEl.textContent = t("frontLabel");
  if (backLabelEl) backLabelEl.textContent = t("backLabel");
  if (flipHintEl) flipHintEl.textContent = t("flipHint");
  if (searchInput) searchInput.placeholder = t("searchPlaceholder");

  if (prevBtn) {
    prevBtn.title = t("prev");
    prevBtn.setAttribute("aria-label", t("prev"));
  }
  if (nextBtn) {
    nextBtn.title = t("next");
    nextBtn.setAttribute("aria-label", t("next"));
  }
  if (removeBtn) {
    removeBtn.title = t("removeCurrent");
    removeBtn.setAttribute("aria-label", t("removeCurrent"));
  }
  if (exportTopBtn) {
    exportTopBtn.title = t("exportCsv");
    exportTopBtn.setAttribute("aria-label", t("exportCsv"));
  }
  if (exportCardsBtn) {
    exportCardsBtn.title = t("exportCsv");
    exportCardsBtn.setAttribute("aria-label", t("exportCsv"));
  }
  if (pronounceCardBtn) {
    pronounceCardBtn.title = t("pronounceWord");
    pronounceCardBtn.setAttribute("aria-label", t("pronounceWord"));
  }
  if (youglishCardBtn) {
    youglishCardBtn.title = t("youglish");
    youglishCardBtn.setAttribute("aria-label", t("youglish"));
  }
}


function applyTheme(themeMode) {
  const normalized = (themeMode || "light").toLowerCase();
  document.body.setAttribute("data-theme", normalized === "dark" ? "dark" : "light");
}

async function applyThemeFromSettings() {
  const settingsResponse = await sendRuntimeMessage({ type: "GET_SETTINGS" });
  const settings = settingsResponse?.settings || {};
  applyTheme(settings.themeMode || "light");
  currentUiLanguage = settings.appLanguage || getDefaultAppLanguage();
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
    currentUiLanguage = nextSettings.appLanguage || getDefaultAppLanguage();
    applyFlashcardsLanguage();
    renderSections();
    render();
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", Boolean(isError));
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      resolve(response);
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
    ja: t("language_ja"),
    ko: t("language_ko"),
    zh: t("language_zh"),
    ar: t("language_ar"),
    hi: t("language_hi"),
    tr: t("language_tr"),
    pl: t("language_pl"),
    sv: t("language_sv"),
    no: t("language_no"),
    da: t("language_da"),
    fi: t("language_fi"),
    uk: t("language_uk"),
    el: t("language_el"),
    he: t("language_he"),
    id: t("language_id"),
    vi: t("language_vi"),
    th: t("language_th"),
    cs: t("language_cs"),
    ro: t("language_ro"),
    hu: t("language_hu"),
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

function cardMatchesSearch(card, query) {
  const normalized = (query || "").trim().toLowerCase();
  if (!normalized) {
    return true;
  }

  const haystack = [
    card.sourceText,
    card.translatedText,
    card.sourceLanguage,
    card.targetLanguage
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

function applySectionFilter() {
  visibleCards = allCards.filter((card) => {
    const sectionMatches =
      activeSection === "all" || (card.sourceLanguage || "auto").toLowerCase() === activeSection;
    return sectionMatches && cardMatchesSearch(card, searchQuery);
  });

  if (currentIndex >= visibleCards.length) {
    currentIndex = 0;
  }
}

function renderSections() {
  if (!sectionsEl) {
    return;
  }

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
  appEl.classList.toggle("is-empty", !total);
  if (!total) {
    counterEl.textContent = allCards.length
      ? t("filteredCounter", { current: 0, visible: 0, total: allCards.length })
      : t("counter", { current: 0, total: 0 });
    emptyStateEl.textContent = allCards.length ? t("emptyFiltered") : t("emptyState");
    emptyStateEl.classList.remove("hidden");
    cardEl.classList.add("hidden");
    cardEl.classList.remove("is-flipped", "is-changing");
    if (youglishCardBtn) {
      youglishCardBtn.disabled = true;
      youglishCardBtn.title = t("statusNoCardYouglish");
    }
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

  const isFiltered = total !== allCards.length;
  counterEl.textContent = isFiltered
    ? t("filteredCounter", { current: currentIndex + 1, visible: total, total: allCards.length })
    : t("counter", { current: currentIndex + 1, total });
  emptyStateEl.classList.add("hidden");
  cardEl.classList.remove("hidden");
  cardEl.classList.toggle("is-flipped", !isFrontVisible);

  if (isFrontVisible) {
    frontTextEl.textContent = sourceText;
    backTextEl.textContent = translatedText;
  } else {
    frontTextEl.textContent = sourceText;
    backTextEl.textContent = translatedText;
  }

  metaTextEl.textContent = t("meta", {
    section: getLanguageLabel(card.sourceLanguage || "auto"),
    source: card.sourceLanguage || "auto",
    target: card.targetLanguage || "pt-BR"
  });

  if (youglishCardBtn) {
    const languageSupported = isYouGlishSupportedLanguage(card.sourceLanguage || "auto", { allowAuto: true });
    youglishCardBtn.disabled = !isAdvancedTerm(sourceText) || !languageSupported;
    youglishCardBtn.title = languageSupported ? t("youglish") : t("statusYouglishUnsupported");
  }
}

function transitionToCard(updateCard) {
  if (!visibleCards.length) {
    updateCard();
    render();
    return;
  }

  const directionClass = cardTransitionDirection === "prev" ? "is-changing-prev" : "is-changing-next";
  cardEl.classList.remove("is-changing-next", "is-changing-prev");
  cardEl.classList.add("is-changing", directionClass);
  window.setTimeout(() => {
    updateCard();
    render();
    window.requestAnimationFrame(() => {
      cardEl.classList.remove("is-changing", "is-changing-next", "is-changing-prev");
    });
  }, 150);
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

  cardTransitionDirection = "next";
  transitionToCard(() => {
    currentIndex = (currentIndex + 1) % visibleCards.length;
    isFrontVisible = true;
  });
}

function prevCard() {
  if (!visibleCards.length) {
    return;
  }

  cardTransitionDirection = "prev";
  transitionToCard(() => {
    currentIndex = (currentIndex - 1 + visibleCards.length) % visibleCards.length;
    isFrontVisible = true;
  });
}

function flipCard() {
  if (!visibleCards.length) {
    return;
  }

  isFrontVisible = !isFrontVisible;
  render();
}

function handleCardTouchStart(event) {
  if (!visibleCards.length || !event.touches?.length) {
    return;
  }

  touchStartX = event.touches[0].clientX;
}

function handleCardTouchEnd(event) {
  if (!visibleCards.length || touchStartX === null || !event.changedTouches?.length) {
    touchStartX = null;
    return;
  }

  const endX = event.changedTouches[0].clientX;
  const deltaX = endX - touchStartX;
  touchStartX = null;

  if (Math.abs(deltaX) < 45) {
    return;
  }

  if (deltaX < 0) {
    nextCard();
  } else {
    prevCard();
  }
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

function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildFlashcardsCsv(cards) {
  const rows = [
    ["sourceText", "translatedText", "sourceLanguage", "targetLanguage", "createdAt"],
    ...cards.map((card) => [
      card.sourceText || "",
      card.translatedText || "",
      card.sourceLanguage || "auto",
      card.targetLanguage || "pt-BR",
      card.createdAt || ""
    ])
  ];

  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function exportVisibleCardsCsv() {
  if (!visibleCards.length) {
    setStatus(t("statusNoCardExport"), true);
    return;
  }

  const csv = buildFlashcardsCsv(visibleCards);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `deepseek-flashcards-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  setStatus(t("statusExported", { count: visibleCards.length }));
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
  if (!isYouGlishSupportedLanguage(language, { allowAuto: true })) {
    setStatus(t("statusYouglishUnsupported"), true);
    return;
  }

  const response = await sendRuntimeMessage({
    type: "OPEN_YOUGLISH",
    text,
    language
  });

  if (!response?.ok) {
    throw new Error(response?.error || t("errorOpenYouglish"));
  }
}

if (prevBtn) {
  prevBtn.addEventListener("click", prevCard);
}
if (cardEl) {
  cardEl.addEventListener("click", flipCard);
  cardEl.addEventListener("touchstart", handleCardTouchStart, { passive: true });
  cardEl.addEventListener("touchend", handleCardTouchEnd, { passive: true });
}
if (nextBtn) {
  nextBtn.addEventListener("click", nextCard);
}
if (searchInput) {
  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    currentIndex = 0;
    isFrontVisible = true;
    applySectionFilter();
    render();
  });
}
if (exportTopBtn) {
  exportTopBtn.addEventListener("click", exportVisibleCardsCsv);
}
if (exportCardsBtn) {
  exportCardsBtn.addEventListener("click", exportVisibleCardsCsv);
}
if (removeBtn) {
  removeBtn.addEventListener("click", () => {
    removeCurrentCard().catch((error) => setStatus(t("statusRemoveFailed", { error: error.message }), true));
  });
}
if (pronounceCardBtn) {
  pronounceCardBtn.addEventListener("click", () => {
    pronounceCurrentCard().catch((error) => {
      setStatus(t("statusPronounceFailed", { error: error.message }), true);
    });
  });
}
if (youglishCardBtn) {
  youglishCardBtn.addEventListener("click", () => {
    openCurrentCardOnYouGlish().catch((error) => {
      setStatus(t("statusYouglishFailed", { error: error.message }), true);
    });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") {
    nextCard();
  } else if (event.key === "ArrowLeft") {
    prevCard();
  } else if (event.key === " " || event.key === "Enter") {
    if (event.target === cardEl || event.target === document.body) {
      event.preventDefault();
      flipCard();
    }
  }
});

Promise.all([applyThemeFromSettings(), loadCards()]).catch((error) => {
  setStatus(t("statusLoadFailed", { error: error.message }), true);
});

listenThemeChanges();
