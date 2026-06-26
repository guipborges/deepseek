const PENDING_TEXT_KEY = "deepseekTranslatorPendingText";
const SETTINGS_KEY = "deepseekTranslatorSettings";
const FLASHCARDS_KEY = "deepseekTranslatorFlashcards";
const MIGRATION_FLAG_KEY = "deepseekTranslatorFlashcardsMigrated";
const MAIN_WINDOW_ID_KEY = "deepseekTranslatorMainWindowId";
const SELECTION_HISTORY_KEY = "deepseekTranslatorSelectionHistory";

const DB_NAME = "deepseek-translator-db";
const DB_VERSION = 1;
const FLASHCARDS_STORE = "flashcards";
const MAX_TRANSLATION_CHARS = 12000;

importScripts("shared/utils.js", "shared/language.js", "auth.js");

const TRANSLATION_LANGUAGES = LANGUAGE_CATALOG.map((language) => language.value);

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "AYVU_SUPABASE_AUTH") {
    return false;
  }

  const session = message.session || {};
  if (!session.accessToken) {
    sendResponse({ ok: false, error: "Missing access token." });
    return false;
  }

  setSupabaseSession(session)
    .then(() => openOrFocusMainWindow())
    .then(() => chrome.runtime.sendMessage({ type: "AYVU_AUTH_UPDATED" }).catch(() => {}))
    .then(() => sendResponse({ ok: true }))
    .catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

function setPendingText(text) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [PENDING_TEXT_KEY]: text }, () => resolve());
  });
}

function storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function normalizeHistoryText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
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
}

function createMainWindowUrl() {
  return chrome.runtime.getURL("src/popup.html?pinned=1");
}

async function createMainWindow() {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const popupWidth = Math.max(420, Math.min(820, Number(settings.popupWidth || 340) + 40));
  const popupHeight = Math.max(560, Math.min(900, Number(settings.popupHeight || 520) + 120));

  const created = await chrome.windows.create({
    url: createMainWindowUrl(),
    type: "popup",
    width: popupWidth,
    height: popupHeight,
    focused: true
  });

  if (created?.id) {
    await storageSet(MAIN_WINDOW_ID_KEY, created.id);
  }

  return created;
}

async function openOrFocusMainWindow() {
  const savedWindowId = await storageGet(MAIN_WINDOW_ID_KEY);

  if (savedWindowId) {
    try {
      const existing = await chrome.windows.get(savedWindowId, { populate: true });
      if (existing?.id) {
        await chrome.windows.update(existing.id, { focused: true });
        return existing;
      }
    } catch (_error) {
      // Window may have been closed; fallback to search/create below.
    }
  }

  const all = await chrome.windows.getAll({ populate: true });
  const targetUrlPrefix = createMainWindowUrl();

  for (const win of all) {
    const hasPopupTab = (win.tabs || []).some((tab) => (tab.url || "").startsWith(targetUrlPrefix));
    if (hasPopupTab && win.id) {
      await storageSet(MAIN_WINDOW_ID_KEY, win.id);
      await chrome.windows.update(win.id, { focused: true });
      return win;
    }
  }

  return createMainWindow();
}

async function focusExistingMainWindowIfOpen() {
  const savedWindowId = await storageGet(MAIN_WINDOW_ID_KEY);

  if (savedWindowId) {
    try {
      const existing = await chrome.windows.get(savedWindowId, { populate: true });
      if (existing?.id) {
        await chrome.windows.update(existing.id, { focused: true });
        return true;
      }
    } catch (_error) {
      // Saved id is stale; continue lookup by URL.
    }
  }

  const all = await chrome.windows.getAll({ populate: true });
  const targetUrlPrefix = createMainWindowUrl();

  for (const win of all) {
    const hasPopupTab = (win.tabs || []).some((tab) => (tab.url || "").startsWith(targetUrlPrefix));
    if (hasPopupTab && win.id) {
      await storageSet(MAIN_WINDOW_ID_KEY, win.id);
      await chrome.windows.update(win.id, { focused: true });
      return true;
    }
  }

  return false;
}

function resolvePopupOpenTrigger(settings) {
  const explicitTrigger = (settings?.popupOpenTrigger || "").trim();
  if (explicitTrigger === "t-click" || explicitTrigger === "double-click") {
    return explicitTrigger;
  }

  return settings?.openMainWindowOnDoubleClick ? "double-click" : "t-click";
}

chrome.windows.onRemoved.addListener(async (windowId) => {
  const savedWindowId = await storageGet(MAIN_WINDOW_ID_KEY);
  if (savedWindowId && savedWindowId === windowId) {
    await storageSet(MAIN_WINDOW_ID_KEY, null);
  }
});

chrome.action.onClicked.addListener(() => {
  openOrFocusMainWindow().catch(() => {
    // Ignore click failures silently.
  });
});

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FLASHCARDS_STORE)) {
        db.createObjectStore(FLASHCARDS_STORE, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Falha ao abrir IndexedDB."));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Erro na operacao do IndexedDB."));
  });
}

async function listFlashcardsFromDb() {
  const db = await openDatabase();

  try {
    const tx = db.transaction(FLASHCARDS_STORE, "readonly");
    const store = tx.objectStore(FLASHCARDS_STORE);
    const items = (await requestToPromise(store.getAll())) || [];

    items.sort((a, b) => {
      const aDate = a.createdAt || "";
      const bDate = b.createdAt || "";
      return bDate.localeCompare(aDate);
    });

    return items;
  } finally {
    db.close();
  }
}

async function putFlashcardInDb(entry) {
  const db = await openDatabase();

  try {
    const tx = db.transaction(FLASHCARDS_STORE, "readwrite");
    const store = tx.objectStore(FLASHCARDS_STORE);
    await requestToPromise(store.put(entry));
  } finally {
    db.close();
  }
}

async function removeFlashcardFromDb(id) {
  const db = await openDatabase();

  try {
    const tx = db.transaction(FLASHCARDS_STORE, "readwrite");
    const store = tx.objectStore(FLASHCARDS_STORE);
    await requestToPromise(store.delete(id));
  } finally {
    db.close();
  }
}

async function clearFlashcardsFromDb() {
  const db = await openDatabase();

  try {
    const tx = db.transaction(FLASHCARDS_STORE, "readwrite");
    const store = tx.objectStore(FLASHCARDS_STORE);
    await requestToPromise(store.clear());
  } finally {
    db.close();
  }
}

async function migrateStorageFlashcardsIfNeeded() {
  const migrated = await storageGet(MIGRATION_FLAG_KEY);
  if (migrated) {
    return;
  }

  const legacyList = (await storageGet(FLASHCARDS_KEY)) || [];
  for (const item of legacyList) {
    if (!item?.id) {
      continue;
    }

    await putFlashcardInDb(item);
  }

  await storageSet(MIGRATION_FLAG_KEY, true);
}





async function translateWithDeepSeek(text, overrides = {}) {
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const sourceLanguage = (overrides.sourceLanguage || settings.sourceLanguage || "auto").trim();
  const targetLanguage = (overrides.targetLanguage || settings.targetLanguage || getDefaultTargetLanguage()).trim();

  if (!(await getCurrentSession())?.accessToken) {
    throw new Error("Entre com seu email no popup para traduzir.");
  }

  if (text.length > MAX_TRANSLATION_CHARS) {
    throw new Error("Texto muito longo. Selecione um trecho menor para traduzir.");
  }

  const data = await translateWithBackend({
    text,
    sourceLanguage,
    targetLanguage
  });

  const translatedText = data?.translatedText?.trim();
  if (!translatedText) {
    throw new Error("Resposta da API sem texto traduzido.");
  }

  return normalizeTranslatedText(translatedText);
}


async function saveFlashcard(sourceText, translatedText, overrides = {}) {
  await migrateStorageFlashcardsIfNeeded();

  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const configuredSourceLanguage = (overrides.sourceLanguage || settings.sourceLanguage || "auto").trim();
  const targetLanguage = (overrides.targetLanguage || settings.targetLanguage || getDefaultTargetLanguage()).trim();

  const list = await listFlashcardsFromDb();
  const normalizedSource = normalizeTerm(sourceText);
  const normalizedTranslated = (translatedText || "").trim();

  if (!normalizedSource || !normalizedTranslated) {
    throw new Error("Dados invalidos para salvar flashcard.");
  }

  if (!isAdvancedTerm(normalizedSource)) {
    throw new Error("Flashcard aceita apenas palavra unica ou phrasal verb.");
  }

  const detectedLanguage = await detectLanguageSmart(normalizedSource, configuredSourceLanguage);
  const sourceLanguage =
    detectedLanguage && detectedLanguage !== "und" ? detectedLanguage : configuredSourceLanguage;

  const alreadyExists = list.some(
    (item) =>
      (item.sourceText || "").toLowerCase() === normalizedSource.toLowerCase() &&
      (item.sourceLanguage || "") === sourceLanguage &&
      (item.targetLanguage || "") === targetLanguage
  );

  if (alreadyExists) {
    return { alreadyExists: true };
  }

  const entry = {
    id: Date.now().toString(),
    sourceText: normalizedSource,
    translatedText: normalizedTranslated,
    sourceLanguage,
    targetLanguage,
    createdAt: new Date().toISOString()
  };

  await putFlashcardInDb(entry);

  return { alreadyExists: false };
}

async function listFlashcards() {
  await migrateStorageFlashcardsIfNeeded();
  return listFlashcardsFromDb();
}

async function removeFlashcard(id) {
  await migrateStorageFlashcardsIfNeeded();
  await removeFlashcardFromDb(id);
}

async function clearFlashcards() {
  await migrateStorageFlashcardsIfNeeded();
  await clearFlashcardsFromDb();
}

function detectLanguageWithChrome(text) {
  return new Promise((resolve) => {
    if (!chrome?.i18n?.detectLanguage || !text) {
      resolve(null);
      return;
    }

    chrome.i18n.detectLanguage(text, (result) => {
      if (chrome.runtime.lastError || !result?.languages?.length) {
        resolve(null);
        return;
      }

      const best = result.languages[0] || null;
      resolve(
        best
          ? {
              language: best.language || null,
              percentage: typeof best.percentage === "number" ? best.percentage : 0,
              isReliable: !!result.isReliable
            }
          : null
      );
    });
  });
}

async function detectLanguageWithDeepSeek(_text) {
  return null;
}

async function detectLanguageSmart(text, fallbackLanguage) {
  const normalizedFallback = (fallbackLanguage || "").trim().toLowerCase();
  if (normalizedFallback && normalizedFallback !== "auto") {
    return fallbackLanguage;
  }

  const chromeDetection = await detectLanguageWithChrome(text);
  const chromeCode = chromeDetection?.language || null;
  const chromeConfidence = chromeDetection?.percentage || 0;
  const normalized = normalizeWord(text);
  const isShortWord = normalized.length > 0 && normalized.length <= 6;

  if (chromeCode && chromeCode !== "und") {
    const lowConfidence = chromeConfidence < 70 || (isShortWord && chromeConfidence < 92);

    if (!lowConfidence) {
      return chromeCode;
    }
  }

  const deepSeekCode = await detectLanguageWithDeepSeek(text);
  if (deepSeekCode) {
    return deepSeekCode;
  }

  if (chromeCode && chromeCode !== "und") {
    return chromeCode;
  }

  return fallbackLanguage || null;
}

async function detectYouGlishLanguage(text, fallbackLanguage) {
  const detected = await detectLanguageSmart(text, fallbackLanguage);
  if (detected && detected !== "und") {
    const detectedLanguage = mapLanguageToYouGlish(detected);
    if (detectedLanguage) {
      return detectedLanguage;
    }

    throw new Error("YouGlish nao aceita o idioma detectado.");
  }

  const fallbackYouGlishLanguage = mapLanguageToYouGlish(fallbackLanguage);
  if (fallbackYouGlishLanguage) {
    return fallbackYouGlishLanguage;
  }

  return "english";
}

async function openYouGlishWindow(text, languageHint) {
  const cleanText = normalizeTerm(text);
  if (!cleanText) {
    throw new Error("Texto invalido para YouGlish.");
  }

  if (!isAdvancedTerm(cleanText)) {
    throw new Error("YouGlish aceita apenas palavra unica ou phrasal verb.");
  }

  const safeLang = await detectYouGlishLanguage(cleanText, languageHint);
  const variant = safeLang === "english" ? "/us" : "";
  const url =
    `https://youglish.com/pronounce/${encodeURIComponent(cleanText)}/` +
    `${encodeURIComponent(safeLang)}${variant}`;

  return chrome.windows.create({
    url,
    type: "popup",
    width: 560,
    height: 520
  });
}

async function openForvoWindow(text, languageHint) {
  const cleanText = normalizeTerm(text);
  if (!cleanText) {
    throw new Error("Texto invalido para Forvo.");
  }

  if (!isAdvancedTerm(cleanText)) {
    throw new Error("Forvo aceita apenas palavra unica ou phrasal verb.");
  }

  const detectedLanguage = await detectLanguageSmart(cleanText, languageHint);
  const forvoCode = mapLanguageToForvoCode(detectedLanguage || languageHint);

  let url = `https://forvo.com/search/${encodeURIComponent(cleanText)}/`;
  if (forvoCode === "de") {
    url = `https://forvo.com/word/${encodeURIComponent(cleanText)}/#de`;
  } else if (forvoCode) {
    url = `https://forvo.com/search/${encodeURIComponent(cleanText)}/#${encodeURIComponent(forvoCode)}`;
  }

  return chrome.windows.create({
    url,
    type: "popup",
    width: 560,
    height: 520
  });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "OPEN_MAIN_WINDOW_WITH_TEXT") {
    const text = (message.text || "").trim();

    if (!text) {
      sendResponse({ ok: false, error: "Nenhum texto para abrir no popup." });
      return;
    }

    Promise.all([setPendingText(text), addToSelectionHistory(text)])
      .then(() => openOrFocusMainWindow())
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao abrir popup principal." }));

    return true;
  }

  if (message?.type === "DOUBLE_CLICK_TEXT") {
    const text = (message.text || "").trim();

    if (!text) {
      sendResponse({ ok: false });
      return;
    }

    Promise.all([setPendingText(text), addToSelectionHistory(text)])
      .then(async () => {
        const settings = (await storageGet(SETTINGS_KEY)) || {};
        const popupOpenTrigger = resolvePopupOpenTrigger(settings);
        let openedMainWindow = false;
        if (popupOpenTrigger === "double-click") {
          await openOrFocusMainWindow();
          openedMainWindow = true;
        } else {
          openedMainWindow = await focusExistingMainWindowIfOpen();
        }

        sendResponse({ ok: true, openedMainWindow });
      })
      .catch(() => sendResponse({ ok: false, openedMainWindow: false }));

    return true;
  }

  if (message?.type === "OPEN_MAIN_WINDOW") {
    openOrFocusMainWindow()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao abrir janela principal." }));

    return true;
  }

  if (message?.type === "TRANSLATE_TEXT") {
    const text = (message.text || "").trim();
    const sourceLanguage = (message.sourceLanguage || "").trim();
    const targetLanguage = (message.targetLanguage || "").trim();

    if (!text) {
      sendResponse({ ok: false, error: "Nenhum texto para traduzir." });
      return;
    }

    translateWithDeepSeek(text, {
      sourceLanguage,
      targetLanguage
    })
      .then((translatedText) => {
        sendResponse({ ok: true, translatedText });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || "Falha na traducao." });
      });

    return true;
  }

  if (message?.type === "SAVE_FLASHCARD") {
    const sourceText = (message.sourceText || "").trim();
    const translatedText = (message.translatedText || "").trim();
    const sourceLanguage = (message.sourceLanguage || "").trim();
    const targetLanguage = (message.targetLanguage || "").trim();

    saveFlashcard(sourceText, translatedText, {
      sourceLanguage,
      targetLanguage
    })
      .then((result) => {
        sendResponse({ ok: true, alreadyExists: result.alreadyExists });
      })
      .catch((error) => {
        sendResponse({ ok: false, error: error.message || "Falha ao salvar flashcard." });
      });

    return true;
  }

  if (message?.type === "LIST_FLASHCARDS") {
    listFlashcards()
      .then((cards) => sendResponse({ ok: true, cards }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao listar flashcards." }));

    return true;
  }

  if (message?.type === "REMOVE_FLASHCARD") {
    const id = (message.id || "").trim();
    if (!id) {
      sendResponse({ ok: false, error: "ID invalido." });
      return;
    }

    removeFlashcard(id)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao remover flashcard." }));

    return true;
  }

  if (message?.type === "CLEAR_FLASHCARDS") {
    clearFlashcards()
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao limpar flashcards." }));

    return true;
  }

  if (message?.type === "GET_SETTINGS") {
    storageGet(SETTINGS_KEY)
      .then((settings) => sendResponse({ ok: true, settings: settings || {} }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao ler configuracoes." }));

    return true;
  }

  if (message?.type === "OPEN_YOUGLISH") {
    const text = (message.text || "").trim();
    const language = (message.language || "").trim();

    openYouGlishWindow(text, language)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao abrir YouGlish." }));

    return true;
  }

  if (message?.type === "OPEN_FORVO") {
    const text = (message.text || "").trim();
    const language = (message.language || "").trim();

    openForvoWindow(text, language)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message || "Falha ao abrir Forvo." }));

    return true;
  }

  return;
});
