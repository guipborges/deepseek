let selectedText = "";
let iconEl = null;
let bubbleEl = null;
const BUBBLE_SOURCE_LANGUAGE_KEY = "deepseekTranslatorBubbleSourceLanguage";
const SETTINGS_KEY = "deepseekTranslatorSettings";
const FLOATING_Z_INDEX = "2147483647";
const SENSITIVE_INPUT_TYPES = new Set(["password", "email", "tel", "number", "date", "datetime-local", "month", "time", "week"]);
const TRANSLATION_LANGUAGES = LANGUAGE_CATALOG.map(({ value, short }) => ({ value, short }));

function hasRuntimeMessaging() {
  return typeof chrome !== "undefined" && !!chrome.runtime && typeof chrome.runtime.sendMessage === "function";
}

function hasStorageLocal() {
  return typeof chrome !== "undefined" && !!chrome.storage && !!chrome.storage.local;
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


function isEditableOrSensitiveElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }

  const editable = element.closest("input, textarea, [contenteditable=''], [contenteditable='true']");
  if (!editable) {
    return false;
  }

  const tagName = editable.tagName?.toLowerCase();
  if (tagName === "textarea" || editable.isContentEditable) {
    return true;
  }

  if (tagName === "input") {
    const type = (editable.getAttribute("type") || "text").toLowerCase();
    return SENSITIVE_INPUT_TYPES.has(type) || type === "text" || type === "search" || type === "url";
  }

  return true;
}

function shouldIgnoreSelection() {
  const selection = window.getSelection();
  const activeElement = document.activeElement;

  if (isEditableOrSensitiveElement(activeElement)) {
    return true;
  }

  if (!selection || selection.rangeCount === 0) {
    return false;
  }

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;
  const element = container.nodeType === Node.ELEMENT_NODE ? container : container.parentElement;
  return isEditableOrSensitiveElement(element);
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







function getCurrentSelectedText() {
  if (shouldIgnoreSelection()) {
    return "";
  }

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
  if (shouldIgnoreSelection()) {
    return null;
  }

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
  iconEl.style.zIndex = FLOATING_Z_INDEX;
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
  iconEl.style.fontFamily = "Segoe UI, Tahoma, sans-serif";

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
  const left = Math.min(rect.right + window.scrollX + 6, window.scrollX + window.innerWidth - 34);
  const top = Math.max(rect.top + window.scrollY - 2, window.scrollY + 6);

  icon.style.left = `${left}px`;
  icon.style.top = `${top}px`;
}

function positionFloatingElement(element, x, y, offsetY = 8) {
  const margin = 8;
  const viewportLeft = window.scrollX + margin;
  const viewportTop = window.scrollY + margin;
  const viewportRight = window.scrollX + window.innerWidth - margin;
  const viewportBottom = window.scrollY + window.innerHeight - margin;

  let left = x;
  let top = y + offsetY;

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;

  const rect = element.getBoundingClientRect();
  const width = rect.width || 320;
  const height = rect.height || 120;

  if (left + width > viewportRight) {
    left = Math.max(viewportLeft, viewportRight - width);
  }

  if (top + height > viewportBottom) {
    top = Math.max(viewportTop, y - height - offsetY);
  }

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function createBubbleActionButton(label, background) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.style.border = "none";
  button.style.borderRadius = "6px";
  button.style.padding = "5px 7px";
  button.style.background = background;
  button.style.color = "#fff";
  button.style.fontSize = "11px";
  button.style.lineHeight = "1.2";
  button.style.cursor = "pointer";
  button.style.fontFamily = "Segoe UI, Tahoma, sans-serif";
  return button;
}

function setBubbleActionDisabled(button, disabled, title = "") {
  button.disabled = disabled;
  button.title = title;
  button.style.opacity = disabled ? "0.45" : "1";
  button.style.cursor = disabled ? "not-allowed" : "pointer";
}

function showBubbleAt(x, y, text, isError = false) {
  removeBubble();

  bubbleEl = document.createElement("div");
  bubbleEl.style.position = "absolute";
  bubbleEl.style.zIndex = FLOATING_Z_INDEX;
  bubbleEl.style.maxWidth = "320px";
  bubbleEl.style.padding = "10px";
  bubbleEl.style.borderRadius = "10px";
  bubbleEl.style.background = "#ffffff";
  bubbleEl.style.color = isError ? "#b00020" : "#10213d";
  bubbleEl.style.border = "1px solid #d8e0ef";
  bubbleEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  bubbleEl.style.fontSize = "13px";
  bubbleEl.style.fontFamily = "Segoe UI, Tahoma, sans-serif";
  bubbleEl.style.lineHeight = "1.4";
  bubbleEl.style.whiteSpace = "pre-wrap";
  bubbleEl.textContent = text;
  bubbleEl.addEventListener("mousedown", (event) => event.stopPropagation());
  bubbleEl.addEventListener("click", (event) => event.stopPropagation());

  document.body.appendChild(bubbleEl);
  positionFloatingElement(bubbleEl, x, y);
}

function showTranslatedBubble(x, y, sourceText, translatedText, initialSourceLanguage = "auto") {
  removeBubble();

  bubbleEl = document.createElement("div");
  bubbleEl.style.position = "absolute";
  bubbleEl.style.zIndex = FLOATING_Z_INDEX;
  bubbleEl.style.maxWidth = "360px";
  bubbleEl.style.padding = "10px";
  bubbleEl.style.borderRadius = "10px";
  bubbleEl.style.background = "#ffffff";
  bubbleEl.style.color = "#10213d";
  bubbleEl.style.border = "1px solid #d8e0ef";
  bubbleEl.style.boxShadow = "0 8px 24px rgba(0,0,0,0.18)";
  bubbleEl.style.fontFamily = "Segoe UI, Tahoma, sans-serif";
  bubbleEl.addEventListener("mousedown", (event) => event.stopPropagation());
  bubbleEl.addEventListener("click", (event) => event.stopPropagation());

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

  const sourceOptions = [{ value: "auto", label: "Auto" }, ...TRANSLATION_LANGUAGES.map((language) => ({
    value: language.value,
    label: language.short
  }))];

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

  const saveBtn = createBubbleActionButton("Salvar", "#0b63f3");

  const statusEl = document.createElement("span");
  statusEl.style.fontSize = "11px";
  statusEl.style.color = "#586a86";
  statusEl.style.display = "inline-flex";
  statusEl.style.alignItems = "center";

  let selectedSourceLanguage = "auto";
  let selectedTargetLanguage = getDefaultTargetLanguage();

  const formatLanguagePairLabel = () => {
    const source = sourceSelect.value || selectedSourceLanguage || "auto";
    const sourceCode = source === "auto" ? "AUTO" : source.slice(0, 2).toUpperCase();
    const targetCode = (selectedTargetLanguage || getDefaultTargetLanguage()).slice(0, 2).toUpperCase();
    return `${sourceCode}-${targetCode}`;
  };

  const updateFooterPairLabel = () => {
    statusEl.textContent = formatLanguagePairLabel();
  };

  const updateYouGlishButtonState = () => {
    setBubbleActionDisabled(
      youglishBtn,
      !isYouGlishSupportedLanguage(selectedSourceLanguage, { allowAuto: true }),
      "YouGlish nao aceita este idioma."
    );
  };

  const sourceTerm = normalizeTerm(sourceText);
  const canShowAdvancedOptions = isAdvancedTerm(sourceTerm);

  const setInitialSourceLanguage = async () => {
    const savedBubbleSource = ((await storageGet(BUBBLE_SOURCE_LANGUAGE_KEY)) || "").trim();
    const settings = (await storageGet("deepseekTranslatorSettings")) || {};
    const currentSource = (savedBubbleSource || initialSourceLanguage || settings.sourceLanguage || "auto").trim();
    selectedTargetLanguage = (settings.targetLanguage || getDefaultTargetLanguage()).trim();

    sourceSelect.value = currentSource;
    if (sourceSelect.value !== currentSource) {
      sourceSelect.value = "auto";
    }

    selectedSourceLanguage = sourceSelect.value || "auto";
    updateFooterPairLabel();
    updateYouGlishButtonState();
  };

  saveBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    statusEl.textContent = "Salvando...";

    try {
      const response = await sendRuntimeMessage({
        type: "SAVE_FLASHCARD",
        sourceText: sourceTerm,
        translatedText: textEl.textContent || translatedText,
        sourceLanguage: selectedSourceLanguage,
        targetLanguage: selectedTargetLanguage
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

  const pronounceBtn = createBubbleActionButton("Ouvir", "#138a3d");

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

  const youglishBtn = createBubbleActionButton("YouGlish", "#7a4dd9");

  youglishBtn.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isYouGlishSupportedLanguage(selectedSourceLanguage, { allowAuto: true })) {
      statusEl.textContent = "YouGlish nao aceita este idioma.";
      return;
    }

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

  setInitialSourceLanguage().catch(() => {
    sourceSelect.value = "auto";
    selectedSourceLanguage = "auto";
    selectedTargetLanguage = getDefaultTargetLanguage();
    updateFooterPairLabel();
    updateYouGlishButtonState();
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
    updateYouGlishButtonState();

    try {
      await storageSet(BUBBLE_SOURCE_LANGUAGE_KEY, selectedSourceLanguage);

      const settings = (await storageGet("deepseekTranslatorSettings")) || {};
      const targetLanguage = (settings.targetLanguage || getDefaultTargetLanguage()).trim();
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
  positionFloatingElement(bubbleEl, x, y);
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
  if (iconEl && iconEl.contains(event.target)) {
    return;
  }

  if (bubbleEl && bubbleEl.contains(event.target)) {
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
