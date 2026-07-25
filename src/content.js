// Content script — orchestrator
// Modules loaded first: shared/utils.js, shared/language.js, content/selection.js, content/bubble.js

let selectedText = "";
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
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const filtered = candidates.filter((item) => item?.language && item.language !== "und");
  if (!filtered.length) return null;
  const best = filtered[0];
  const normalized = normalizeWord(text).toLowerCase();
  const isAsciiWord = /^[a-z][a-z'-]*$/.test(normalized);
  if (isAsciiWord && normalized.length <= 10) {
    const en = filtered.find((item) => getPrimaryLanguageCode(item.language) === "en");
    const bestConf = typeof best.percentage === "number" ? best.percentage : 0;
    const enConf = en && typeof en.percentage === "number" ? en.percentage : 0;
    if (en && getPrimaryLanguageCode(best.language) !== "en" && bestConf - enConf <= 12) return en.language;
  }
  return best.language;
}

function getVoicesAsync() {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve([]); return; }
    const n = window.speechSynthesis.getVoices();
    if (n.length) { resolve(n); return; }
    const cb = () => { const l = window.speechSynthesis.getVoices(); if (l.length) { window.speechSynthesis.removeEventListener("voiceschanged", cb); resolve(l); } };
    window.speechSynthesis.addEventListener("voiceschanged", cb);
    setTimeout(() => { window.speechSynthesis.removeEventListener("voiceschanged", cb); resolve(window.speechSynthesis.getVoices()); }, 800);
  });
}

async function resolveConfiguredVoice(speechLanguage) {
  const settings = (await storageGet("deepseekTranslatorSettings")) || {};
  const name = (settings.speechVoiceName || "auto").trim();
  const voices = await getVoicesAsync();
  if (!voices.length) return null;
  if (name && name !== "auto") {
    const v = voices.find((x) => x.name === name);
    if (v && isVoiceCompatibleWithLanguage(v, speechLanguage)) return v;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(speechLanguage.toLowerCase().split("-")[0])) || null;
}

function storageGet(key) {
  return new Promise((r) => { if (!hasStorageLocal()) { r(undefined); return; } chrome.storage.local.get([key], (x) => r(x[key])); });
}

function storageSet(key, value) {
  return new Promise((r) => { if (!hasStorageLocal()) { r(); return; } chrome.storage.local.set({ [key]: value }, () => r()); });
}

function isEditableOrSensitiveElement(element) {
  if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
  const e = element.closest("input, textarea, [contenteditable=''], [contenteditable='true']");
  if (!e) return false;
  const tag = e.tagName?.toLowerCase();
  if (tag === "textarea" || e.isContentEditable) return true;
  if (tag === "input") { const t = (e.getAttribute("type") || "text").toLowerCase(); return SENSITIVE_INPUT_TYPES.has(t) || t === "text" || t === "search" || t === "url"; }
  return true;
}

function shouldIgnoreSelection() {
  const sel = window.getSelection();
  if (isEditableOrSensitiveElement(document.activeElement)) return true;
  if (!sel || sel.rangeCount === 0) return false;
  const r = sel.getRangeAt(0);
  const c = r.commonAncestorContainer;
  return isEditableOrSensitiveElement(c.nodeType === Node.ELEMENT_NODE ? c : c.parentElement);
}

async function translateSelectionToBubble(anchorX, anchorY, sourceText) {
  showBubbleAt(anchorX, anchorY, "Traduzindo...");
  try {
    const saved = ((await storageGet(BUBBLE_SOURCE_LANGUAGE_KEY)) || "").trim();
    const settings = (await storageGet(SETTINGS_KEY)) || {};
    const sl = (saved || settings.sourceLanguage || "auto").trim();
    const tl = (settings.targetLanguage || getDefaultTargetLanguage()).trim();
    const res = await sendRuntimeMessage({ type: "TRANSLATE_TEXT", text: sourceText, sourceLanguage: sl, targetLanguage: tl });
    if (!res?.ok) throw new Error(res?.error || "Falha na traducao.");
    // If the API returned the same text (not translated), show an error instead
    const translatedText = res.translatedText;
    if (translatedText && translatedText.toLowerCase().trim() === sourceText.toLowerCase().trim()) {
      showBubbleAt(anchorX, anchorY, "Falha ao traduzir. Tente novamente.", true);
      return;
    }
    showTranslatedBubble(anchorX, anchorY, sourceText, translatedText, sl);
  } catch (e) { showBubbleAt(anchorX, anchorY, "Erro: " + e.message, true); }
}

async function detectSpeechLanguage(text, fallback) {
  const n = (fallback || "").trim().toLowerCase();
  if (n && n !== "auto") return mapLanguageToSpeechLanguage(fallback);
  const c = await detectLanguageCandidates(text);
  const d = pickDetectedLanguage(c, text);
  if (d && d !== "und") return mapLanguageToSpeechLanguage(d);
  return mapLanguageToSpeechLanguage(fallback);
}

function showTranslatedBubble(x, y, sourceText, translatedText, initialSourceLanguage = "auto") {
  removeBubble();
  bubbleEl = document.createElement("div");
  Object.assign(bubbleEl.style, {
    position: "absolute", zIndex: FLOATING_Z_INDEX, maxWidth: "360px", padding: "10px",
    borderRadius: "10px", background: "#ffffff", color: "#10213d", border: "1px solid #d8e0ef",
    boxShadow: "0 8px 24px rgba(0,0,0,0.18)", fontFamily: "Segoe UI, Tahoma, sans-serif"
  });
  bubbleEl.addEventListener("mousedown", (e) => e.stopPropagation());
  bubbleEl.addEventListener("click", (e) => e.stopPropagation());

  const textEl = document.createElement("div");
  Object.assign(textEl.style, { fontSize: "16px", fontWeight: "700", lineHeight: "1.4", whiteSpace: "pre-wrap" });
  textEl.textContent = normalizeTranslatedText(translatedText);

  const langRow = document.createElement("div");
  Object.assign(langRow.style, { marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" });

  const langLabel = document.createElement("span");
  langLabel.textContent = "Origem:";
  Object.assign(langLabel.style, { fontSize: "11px", color: "#586a86" });

  const sourceSelect = document.createElement("select");
  Object.assign(sourceSelect.style, { fontSize: "11px", padding: "3px 5px", border: "1px solid #d8e0ef", borderRadius: "6px", background: "#fff", color: "#10213d", minWidth: "64px" });

  const opts = [{ value: "auto", short: "Auto" }, ...TRANSLATION_LANGUAGES];
  opts.forEach((o) => { const opt = document.createElement("option"); opt.value = o.value; opt.textContent = o.short || o.label; sourceSelect.appendChild(opt); });

  const btnRow = document.createElement("div");
  Object.assign(btnRow.style, { marginTop: "8px", display: "flex", gap: "6px", flexWrap: "wrap", alignItems: "center" });

  const saveBtn = createBubbleActionButton("Salvar", "#0b63f3");
  const statusEl = document.createElement("span");
  Object.assign(statusEl.style, { fontSize: "11px", color: "#586a86", display: "inline-flex", alignItems: "center" });

  let selSrcLang = "auto";
  let selTgtLang = getDefaultTargetLanguage();
  const updateStatus = () => {
    const s = sourceSelect.value || selSrcLang || "auto";
    const sc = s === "auto" ? "AUTO" : s.slice(0, 2).toUpperCase();
    const tc = (selTgtLang || getDefaultTargetLanguage()).slice(0, 2).toUpperCase();
    statusEl.textContent = `${sc}-${tc}`;
  };
  const srcTerm = normalizeTerm(sourceText);
  const canShowAdvanced = isAdvancedTerm(srcTerm);

  const initLang = async () => {
    const saved = ((await storageGet(BUBBLE_SOURCE_LANGUAGE_KEY)) || "").trim();
    const settings = (await storageGet("deepseekTranslatorSettings")) || {};
    const cur = saved || initialSourceLanguage || settings.sourceLanguage || "auto";
    selTgtLang = (settings.targetLanguage || getDefaultTargetLanguage()).trim();
    sourceSelect.value = cur;
    if (sourceSelect.value !== cur) sourceSelect.value = "auto";
    selSrcLang = sourceSelect.value || "auto";
    updateStatus();
  };

  saveBtn.addEventListener("click", async (e) => {
    e.preventDefault(); e.stopPropagation();
    statusEl.textContent = "Salvando...";
    try {
      const r = await sendRuntimeMessage({ type: "SAVE_FLASHCARD", sourceText: srcTerm, translatedText: textEl.textContent || translatedText, sourceLanguage: selSrcLang, targetLanguage: selTgtLang });
      if (!r?.ok) throw new Error(r?.error || "Falha ao salvar.");
      statusEl.textContent = r.alreadyExists ? "Ja estava salvo." : "Salvo.";
    } catch (_) { statusEl.textContent = "Erro ao salvar."; }
  });

  const pronounceBtn = createBubbleActionButton("Ouvir", "#138a3d");
  pronounceBtn.addEventListener("click", async (e) => {
    e.preventDefault(); e.stopPropagation();
    const u = new SpeechSynthesisUtterance(sourceText);
    u.lang = await detectSpeechLanguage(sourceText, selSrcLang);
    const v = await resolveConfiguredVoice(u.lang);
    if (v) u.voice = v;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    updateStatus();
  });

  const youglishBtn = createBubbleActionButton("YouGlish", "#7a4dd9");
  youglishBtn.addEventListener("click", async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!isYouGlishSupportedLanguage(selSrcLang, { allowAuto: true })) { statusEl.textContent = "YouGlish nao aceita este idioma."; return; }
    const r = await sendRuntimeMessage({ type: "OPEN_YOUGLISH", text: srcTerm, language: selSrcLang });
    statusEl.textContent = r?.ok ? "YouGlish aberto." : "Erro no YouGlish.";
  });

  initLang().catch(() => { sourceSelect.value = "auto"; selSrcLang = "auto"; selTgtLang = getDefaultTargetLanguage(); updateStatus(); });

  btnRow.appendChild(pronounceBtn);
  if (canShowAdvanced) { btnRow.appendChild(youglishBtn); btnRow.appendChild(saveBtn); }
  btnRow.appendChild(statusEl);

  sourceSelect.addEventListener("change", async (e) => {
    e.preventDefault(); e.stopPropagation();
    selSrcLang = sourceSelect.value || "auto";
    statusEl.textContent = "Traduzindo...";
    try {
      await storageSet(BUBBLE_SOURCE_LANGUAGE_KEY, selSrcLang);
      const settings = (await storageGet("deepseekTranslatorSettings")) || {};
      const tl = (settings.targetLanguage || getDefaultTargetLanguage()).trim();
      selTgtLang = tl;
      const r = await sendRuntimeMessage({ type: "TRANSLATE_TEXT", text: sourceText, sourceLanguage: selSrcLang, targetLanguage: tl });
      if (!r?.ok || !r.translatedText) throw new Error(r?.error || "Falha na traducao.");
      const newText = normalizeTranslatedText(r.translatedText);
      if (newText.toLowerCase().trim() === sourceText.toLowerCase().trim()) {
        throw new Error("Traducao retornou o mesmo texto.");
      }
      textEl.textContent = newText;
      updateStatus();
    } catch (_) { statusEl.textContent = "Erro ao traduzir."; }
  });

  bubbleEl.appendChild(textEl);
  langRow.appendChild(langLabel);
  langRow.appendChild(sourceSelect);
  bubbleEl.appendChild(langRow);
  bubbleEl.appendChild(btnRow);
  document.body.appendChild(bubbleEl);
  positionFloatingElement(bubbleEl, x, y);
}

function sendRuntimeMessage(payload) {
  return new Promise((resolve, reject) => {
    if (!hasRuntimeMessaging()) { reject(new Error("Extensao indisponivel nesta aba. Recarregue a pagina.")); return; }
    chrome.runtime.sendMessage(payload, (r) => {
      if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
      resolve(r);
    });
  });
}

// --- Message listener ---
if (typeof chrome !== "undefined" && chrome.runtime?.onMessage?.addListener) {
  chrome.runtime.onMessage.addListener((msg, _s, send) => {
    if (msg?.type !== "GET_SELECTED_TEXT") return;
    send({ text: getCurrentSelectedText() });
  });
}

// --- Event listeners ---
document.addEventListener("mouseup", () => { setTimeout(showIconForSelection, 0); });
document.addEventListener("keyup", () => { setTimeout(showIconForSelection, 0); });

document.addEventListener("dblclick", async () => {
  const text = getCurrentSelectedText();
  const rect = getSelectionRect();
  if (!text || !rect || !hasRuntimeMessaging()) return;
  let opened = false;
  try { const r = await sendRuntimeMessage({ type: "DOUBLE_CLICK_TEXT", text }); opened = !!r?.openedMainWindow; } catch (_) {}
  if (!opened) await translateSelectionToBubble(rect.left + window.scrollX, rect.bottom + window.scrollY, text);
});

document.addEventListener("click", (event) => {
  if (iconEl && iconEl.contains(event.target)) return;
  if (bubbleEl && bubbleEl.contains(event.target)) return;
  if (!getCurrentSelectedText()) removeIcon();
  if (bubbleEl && !bubbleEl.contains(event.target)) removeBubble();
});

window.addEventListener("scroll", () => { removeIcon(); removeBubble(); });
