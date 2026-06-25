let selectedText = "";
let iconEl = null;
let bubbleEl = null;
const BUBBLE_SOURCE_LANGUAGE_KEY = "deepseekTranslatorBubbleSourceLanguage";
const SETTINGS_KEY = "deepseekTranslatorSettings";

function hasRuntimeMessaging() {
  return typeof chrome !== "undefined" && !!chrome.runtime && typeof chrome.runtime.sendMessage === "function";
}

function hasStorageLocal() {
  return typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
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
    if (!window.speechSynthesis) {
      resolve([]);
      return;
    }

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
  const settings = (await storageGet("deepseekTranslatorSettings")) || {};
  const selectedName = (settings.speechVoiceName || "auto").trim();
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

function storageGet(key) {
  return new Promise((resolve) => {
    if (!hasStorageLocal()) {
      resolve(undefined);
      return;
    }

    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}

function storageSet(key, value) {
  return new Promise((resolve) => {
    if (!hasStorageLocal()) {
      resolve();
      return;
    }

    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function normalizeTerm(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

async function translateSelectionToBubble(anchorX, anchorY, sourceText) {
  showBubbleAt(anchorX, anchorY, "Traduzindo...");

  try {
    const savedBubbleSource = ((await storageGet(BUBBLE_SOURCE_LANGUAGE_KEY)) || "").trim();
    const settings = (await storageGet(SETTINGS_KEY)) || {};
    const sourceLanguage = (savedBubbleSource || settings.sourceLanguage || "auto").trim();

    const response = await sendRuntimeMessage({
      type: "TRANSLATE_TEXT",
      text: sourceText,
      sourceLanguage
    });

    if (!response?.ok) {
      throw new Error(response?.error || "Falha na traducao.");
    }

    showTranslatedBubble(anchorX, anchorY, sourceText, response.translatedText, sourceLanguage);
  } catch (error) {
    showBubbleAt(anchorX, anchorY, "Erro: " + error.message, true);
  }
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

function normalizeWord(text) {
  return (text || "").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
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

function getCurrentSelectedText() {
  const selection = window.getSelection();
  if (!selection) {
    return "";
  }

  return selection.toString().trim();
}

function removeIcon() {
  if (iconEl) {
    iconEl.remove();
    iconEl = null;
  }
}

function removeBubble() {
  if (bubbleEl) {
    bubbleEl.remove();
    bubbleEl = null;
  }
}

function getSelectionRect() {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (range.collapsed) {
    return null;
  }

  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) {
    return null;
  }

  return rect;
}

function ensureIcon() {
  if (iconEl) {
    return iconEl;
  }

  iconEl = document.createElement("button");
  iconEl.type = "button";
  iconEl.textContent = "T";
  iconEl.title = "Traduzir selecao";
  iconEl.style.position = "absolute";
  iconEl.style.zIndex = "2147483647";
  iconEl.style.width = "28px";
  iconEl.style.height = "28px";
  iconEl.style.border = "none";
  iconEl.style.borderRadius = "999px";
  iconEl.style.background = "#0b63f3";
  iconEl.style.color = "#fff";
  iconEl.style.fontSize = "14px";
  iconEl.style.fontWeight = "700";
  iconEl.style.cursor = "pointer";
  iconEl.style.boxShadow = "0 3px 12px rgba(0,0,0,0.25)";

  iconEl.addEventListener("mousedown", (event) => {
    event.preventDefault();
  });

  iconEl.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedText) {
      return;
    }

    const rect = iconEl.getBoundingClientRect();
    await translateSelectionToBubble(rect.left + window.scrollX, rect.bottom + window.scrollY, selectedText);
  });

  document.body.appendChild(iconEl);
  return iconEl;
}

function showIconForSelection() {
  const text = getCurrentSelectedText();
  const rect = getSelectionRect();

  if (!text || !rect) {
    removeIcon();
    return;
  }

  selectedText = text;
  const icon = ensureIcon();
  const left = rect.right + window.scrollX + 6;
  const top = rect.top + window.scrollY - 2;

  icon.style.left = `${left}px`;
  icon.style.top = `${top}px`;
}

function showBubbleAt(x, y, text, isError = false) {
  removeBubble();

  bubbleEl = document.createElement("div");
  bubbleEl.style.position = "absolute";
  bubbleEl.style.left = `${x}px`;
  bubbleEl.style.top = `${y + 8}px`;
  bubbleEl.style.zIndex = "2147483647";
  bubbleEl.style.maxWidth = "320px";
  bubbleEl.style.padding = "10px";
  bubbleEl.style.borderRadius = "10px";
  bubbleEl.style.background = "#ffffff";
  bubbleEl.style.color = isError ? "#b00020" : "#10213d";
  bubbleEl.style.border = "1px solid #d8e0ef";
  bubbleEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  bubbleEl.style.fontSize = "13px";
  bubbleEl.style.lineHeight = "1.4";
  bubbleEl.style.whiteSpace = "pre-wrap";
  bubbleEl.textContent = text;

  document.body.appendChild(bubbleEl);
}

function showTranslatedBubble(x, y, sourceText, translatedText, initialSourceLanguage = "auto") {
  removeBubble();

  bubbleEl = document.createElement("div");
  bubbleEl.style.position = "absolute";
  bubbleEl.style.left = `${x}px`;
  bubbleEl.style.top = `${y + 8}px`;
  bubbleEl.style.zIndex = "2147483647";
  bubbleEl.style.maxWidth = "360px";
  bubbleEl.style.padding = "10px";
  bubbleEl.style.borderRadius = "10px";
  bubbleEl.style.background = "#ffffff";
  bubbleEl.style.color = "#10213d";
  bubbleEl.style.border = "1px solid #d8e0ef";
  bubbleEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";

  const textEl = document.createElement("div");
  textEl.style.fontSize = "16px";
  textEl.style.fontWeight = "700";
  textEl.style.lineHeight = "1.4";
  textEl.style.whiteSpace = "pre-wrap";
  textEl.textContent = normalizeTranslatedText(translatedText);

  const languageRow = document.createElement("div");
  languageRow.style.marginTop = "8px";
  languageRow.style.display = "flex";
  languageRow.style.alignItems = "center";
  languageRow.style.gap = "6px";

  const languageLabel = document.createElement("span");
  languageLabel.textContent = "Origem:";
  languageLabel.style.fontSize = "11px";
  languageLabel.style.color = "#586a86";

  const sourceSelect = document.createElement("select");
  sourceSelect.style.fontSize = "11px";
  sourceSelect.style.padding = "3px 5px";
  sourceSelect.style.border = "1px solid #d8e0ef";
  sourceSelect.style.borderRadius = "6px";
  sourceSelect.style.background = "#fff";
  sourceSelect.style.color = "#10213d";
  sourceSelect.style.minWidth = "64px";

  const sourceOptions = [
    { value: "auto", label: "Auto" },
    { value: "en-US", label: "EN" },
    { value: "de-DE", label: "DE" },
    { value: "pt-BR", label: "PT" },
    { value: "es-ES", label: "ES" },
    { value: "fr-FR", label: "FR" }
  ];

  sourceOptions.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.value;
    option.textContent = item.label;
    sourceSelect.appendChild(option);
  });

  const buttonRow = document.createElement("div");
  buttonRow.style.marginTop = "8px";
  buttonRow.style.display = "flex";
  buttonRow.style.gap = "6px";
  buttonRow.style.flexWrap = "wrap";
  buttonRow.style.alignItems = "center";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.textContent = "Salvar no flashcard";
  saveBtn.style.border = "none";
  saveBtn.style.borderRadius = "6px";
  saveBtn.style.padding = "4px 6px";
  saveBtn.style.background = "#0b63f3";
  saveBtn.style.color = "#fff";
  saveBtn.style.fontSize = "11px";
  saveBtn.style.lineHeight = "1.2";
  saveBtn.style.cursor = "pointer";

  const statusEl = document.createElement("span");
  statusEl.style.fontSize = "11px";
  statusEl.style.color = "#586a86";
  statusEl.style.display = "inline-flex";
  statusEl.style.alignItems = "center";

  let selectedSourceLanguage = "auto";
  let selectedTargetLanguage = "pt-BR";

  const formatLanguagePairLabel = () => {
    const source = sourceSelect.value || selectedSourceLanguage || "auto";
    const sourceCode = source === "auto" ? "AUTO" : source.slice(0, 2).toUpperCase();
    const targetCode = (selectedTargetLanguage || "pt-BR").slice(0, 2).toUpperCase();
    return `${sourceCode}-${targetCode}`;
  };

  const updateFooterPairLabel = () => {
    statusEl.textContent = formatLanguagePairLabel();
  };

  const sourceTerm = normalizeTerm(sourceText);
  const canShowAdvancedOptions = isAdvancedTerm(sourceTerm);

  const setInitialSourceLanguage = async () => {
    const savedBubbleSource = ((await storageGet(BUBBLE_SOURCE_LANGUAGE_KEY)) || "").trim();
    const settings = (await storageGet("deepseekTranslatorSettings")) || {};
    const currentSource = (savedBubbleSource || initialSourceLanguage || settings.sourceLanguage || "auto").trim();
    selectedTargetLanguage = (settings.targetLanguage || "pt-BR").trim();

    sourceSelect.value = currentSource;
    if (sourceSelect.value !== currentSource) {
      sourceSelect.value = "auto";
    }

    selectedSourceLanguage = sourceSelect.value || "auto";
    updateFooterPairLabel();
  };

  setInitialSourceLanguage().catch(() => {
    sourceSelect.value = "auto";
    selectedSourceLanguage = "auto";
    selectedTargetLanguage = "pt-BR";
    updateFooterPairLabel();
  });

  saveBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    statusEl.textContent = "Salvando...";

    try {
      const response = await sendRuntimeMessage({
        type: "SAVE_FLASHCARD",
        sourceText: sourceTerm,
        translatedText: textEl.textContent || translatedText
      });

      if (!response?.ok) {
        throw new Error(response?.error || "Falha ao salvar.");
      }

      if (response.alreadyExists) {
        statusEl.textContent = "Ja estava salvo.";
        return;
      }

      statusEl.textContent = "Salvo.";
    } catch (_error) {
      statusEl.textContent = "Erro ao salvar.";
    }
  });

  const pronounceBtn = document.createElement("button");
  pronounceBtn.type = "button";
  pronounceBtn.textContent = "Pronunciar";
  pronounceBtn.style.border = "none";
  pronounceBtn.style.borderRadius = "6px";
  pronounceBtn.style.padding = "4px 6px";
  pronounceBtn.style.background = "#138a3d";
  pronounceBtn.style.color = "#fff";
  pronounceBtn.style.fontSize = "11px";
  pronounceBtn.style.lineHeight = "1.2";
  pronounceBtn.style.cursor = "pointer";

  pronounceBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const utterance = new SpeechSynthesisUtterance(sourceText);
    utterance.lang = await detectSpeechLanguage(sourceText, selectedSourceLanguage);
    const voice = await resolveConfiguredVoice(utterance.lang);
    if (voice) {
      utterance.voice = voice;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    updateFooterPairLabel();
  });

  const youglishBtn = document.createElement("button");
  youglishBtn.type = "button";
  youglishBtn.textContent = "YouGlish";
  youglishBtn.style.border = "none";
  youglishBtn.style.borderRadius = "6px";
  youglishBtn.style.padding = "4px 6px";
  youglishBtn.style.background = "#7a4dd9";
  youglishBtn.style.color = "#fff";
  youglishBtn.style.fontSize = "11px";
  youglishBtn.style.lineHeight = "1.2";
  youglishBtn.style.cursor = "pointer";

  youglishBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const response = await sendRuntimeMessage({
      type: "OPEN_YOUGLISH",
      text: sourceTerm,
      language: selectedSourceLanguage
    });

    if (!response?.ok) {
      statusEl.textContent = "Erro no YouGlish.";
      return;
    }

    statusEl.textContent = "YouGlish aberto.";
  });

  buttonRow.appendChild(pronounceBtn);
  if (canShowAdvancedOptions) {
    buttonRow.appendChild(youglishBtn);
    buttonRow.appendChild(saveBtn);
  }
  buttonRow.appendChild(statusEl);

  sourceSelect.addEventListener("change", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    selectedSourceLanguage = sourceSelect.value || "auto";
    statusEl.textContent = "Traduzindo...";

    try {
      await storageSet(BUBBLE_SOURCE_LANGUAGE_KEY, selectedSourceLanguage);

      const settings = (await storageGet("deepseekTranslatorSettings")) || {};
      const targetLanguage = (settings.targetLanguage || "pt-BR").trim();
      selectedTargetLanguage = targetLanguage;

      const response = await sendRuntimeMessage({
        type: "TRANSLATE_TEXT",
        text: sourceText,
        sourceLanguage: selectedSourceLanguage,
        targetLanguage
      });

      if (!response?.ok || !response.translatedText) {
        throw new Error(response?.error || "Falha na traducao.");
      }

      textEl.textContent = normalizeTranslatedText(response.translatedText);
      updateFooterPairLabel();
    } catch (_error) {
      statusEl.textContent = "Erro ao traduzir.";
    }
  });

  bubbleEl.appendChild(textEl);
  languageRow.appendChild(languageLabel);
  languageRow.appendChild(sourceSelect);
  bubbleEl.appendChild(languageRow);
  bubbleEl.appendChild(buttonRow);
  document.body.appendChild(bubbleEl);
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    if (!hasRuntimeMessaging()) {
      reject(new Error("Extensao indisponivel nesta aba. Recarregue a pagina."));
      return;
    }

    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage?.addListener) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "GET_SELECTED_TEXT") {
      return;
    }

    sendResponse({ text: getCurrentSelectedText() });
  });
}

document.addEventListener("mouseup", () => {
  setTimeout(showIconForSelection, 0);
});

document.addEventListener("keyup", () => {
  setTimeout(showIconForSelection, 0);
});

document.addEventListener("dblclick", async () => {
  const text = getCurrentSelectedText();
  const rect = getSelectionRect();
  if (!text || !rect || !hasRuntimeMessaging()) {
    return;
  }

  let openedMainWindow = false;
  try {
    const response = await sendRuntimeMessage({
      type: "DOUBLE_CLICK_TEXT",
      text
    });
    openedMainWindow = !!response?.openedMainWindow;
  } catch (_error) {
    openedMainWindow = false;
  }

  if (!openedMainWindow) {
    await translateSelectionToBubble(rect.left + window.scrollX, rect.bottom + window.scrollY, text);
  }
});

document.addEventListener("click", (event) => {
  if (iconEl && event.target === iconEl) {
    return;
  }

  if (bubbleEl && event.target === bubbleEl) {
    return;
  }

  const selectionText = getCurrentSelectedText();
  if (!selectionText) {
    removeIcon();
  }

  if (bubbleEl && !bubbleEl.contains(event.target)) {
    removeBubble();
  }
});

window.addEventListener("scroll", () => {
  removeIcon();
  removeBubble();
});
