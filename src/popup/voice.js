// Voice functions for popup — loaded via <script> before popup.js
// Depends on: shared/utils.js, shared/language.js
// Variables voicePickerBtn, voiceSelect, voiceControlPanel are declared in popup.js

function initVoiceElements() {
  voicePickerBtn = document.getElementById("voicePickerBtn");
  voiceSelect = document.getElementById("voiceSelect");
  voiceControlPanel = document.getElementById("voiceControlPanel");
}

function updateVoicePickerState() {
  if (!voicePickerBtn || !voiceSelect?.selectedOptions?.length) return;
  const label = voiceSelect.selectedOptions[0].textContent || "Auto";
  voicePickerBtn.title = `${t("voicePickerTitle")}: ${label}`;
  voicePickerBtn.setAttribute("aria-label", `${t("voicePickerTitle")}: ${label}`);
}

function toggleVoicePanel(forceOpen = null) {
  const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : voiceControlPanel.classList.contains("hidden");
  voiceControlPanel.classList.toggle("hidden", !shouldOpen);
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
  if (voiceSelect.value !== selectedName) voiceSelect.value = "auto";
  updateVoicePickerState();
}

async function updateSelectedVoice() {
  const currentSettings = (await storageGet(SETTINGS_KEY)) || {};
  const updated = { ...currentSettings, speechVoiceName: voiceSelect.value || "auto" };
  await storageSet(SETTINGS_KEY, updated);
  updateVoicePickerState();
  setStatus(tl("Voz atualizada.", "Voice updated.", "Stimme aktualisiert."));
}

function toDictionaryLanguageCode(language) {
  const code = (language || "").toLowerCase();
  if (code.startsWith("en")) return "en";
  if (code.startsWith("de")) return "de";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("es")) return "es";
  if (code.startsWith("it")) return "it";
  if (code.startsWith("pt")) return "pt";
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

  if (!voices.length) return { voice: null, selectedName: "" };
  if (selectedName && selectedName !== "auto") {
    const explicit = voices.find((v) => v.name === selectedName);
    if (explicit && isVoiceCompatibleWithLanguage(explicit, speechLanguage)) return { voice: explicit, selectedName: explicit.name };
  }

  const byLang = voices.find((v) => v.lang.toLowerCase().startsWith(speechLanguage.toLowerCase().split("-")[0]));
  if (byLang) return { voice: byLang, selectedName: byLang.name };
  return { voice: voices[0], selectedName: voices[0].name };
}

function speakUtteranceWithSignal(utterance, timeoutMs = 1800) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timeoutId = setTimeout(() => {
      if (done) return;
      done = true;
      resolve(false);
    }, timeoutMs);

    utterance.onstart = () => {
      if (done) return;
      done = true;
      clearTimeout(timeoutId);
      resolve(true);
    };

    utterance.onerror = (event) => {
      if (done) return;
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
  if (voiceData.voice) utterance.voice = voiceData.voice;

  let started = false;
  try { started = await speakUtteranceWithSignal(utterance); } catch (_) {}
  if (!started) {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const fallback = new SpeechSynthesisUtterance(word);
    fallback.lang = speechLanguage;
    fallback.rate = 1;
    fallback.pitch = 1;
    fallback.volume = 1;
    await speakUtteranceWithSignal(fallback, 2200);
  }

  if (voiceData.selectedName) {
    setStatus(tl(
      `Pronunciando em ${displayName} (${speechLanguage}) com ${voiceData.selectedName}.`,
      `Pronouncing in ${displayName} (${speechLanguage}) with ${voiceData.selectedName}.`,
      `Aussprache in ${displayName} (${speechLanguage}) mit ${voiceData.selectedName}.`
    ));
    return;
  }
  setStatus(tl(
    `Pronunciando em ${displayName} (${speechLanguage}).`,
    `Pronouncing in ${displayName} (${speechLanguage}).`,
    `Aussprache in ${displayName} (${speechLanguage}).`
  ));
}

function pickAudioFromDictionaryResponse(data) {
  if (!Array.isArray(data)) return "";
  for (const entry of data) {
    const phonetics = entry?.phonetics;
    if (!Array.isArray(phonetics)) continue;
    for (const item of phonetics) {
      const url = (item?.audio || "").trim();
      if (url) return url;
    }
  }
  return "";
}

async function fetchDictionaryAudioUrl(word, languageCode) {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/${encodeURIComponent(languageCode)}/${encodeURIComponent(word)}`
    );
    if (!response.ok) return "";
    const data = await readJsonResponse(response);
    return pickAudioFromDictionaryResponse(data);
  } catch (_) { return ""; }
}

async function pronounceCurrentWord() {
  const text = normalizeTerm(inputText.value);
  if (!text) {
    setStatus(tl("Informe um texto para pronunciar.", "Enter text to pronounce.", "Geben Sie einen Text zur Aussprache ein."), true);
    return;
  }
  const language = await resolvePronunciationLanguage(normalizeWord(text) || text);
  await speakWord(text, language.speechLanguage, language.displayName);
}

async function playNativeDictionaryAudio() {
  const text = normalizeTerm(inputText.value);
  if (!text) {
    setStatus(tl("Informe um texto para audio nativo.", "Enter text for native audio.", "Geben Sie einen Text fuer natives Audio ein."), true);
    return;
  }
  const firstWord = normalizeWord(text);
  const language = await resolvePronunciationLanguage(firstWord || text);
  const dictionaryCode = language.dictionaryLanguageCode;

  setStatus(tl(
    `Buscando audio nativo em ${language.displayName} (${dictionaryCode})...`,
    `Fetching native audio in ${language.displayName} (${dictionaryCode})...`,
    `Natives Audio wird gesucht in ${language.displayName} (${dictionaryCode})...`
  ));
  const audioUrl = await fetchDictionaryAudioUrl(firstWord || text, dictionaryCode);

  if (!audioUrl) {
    setStatus(tl(
      `Sem audio nativo em ${language.displayName}. Usando pronuncia local...`,
      `No native audio in ${language.displayName}. Using local pronunciation...`,
      `Kein natives Audio in ${language.displayName}. Lokale Aussprache wird verwendet...`
    ));
    await speakWord(firstWord || text, language.speechLanguage, language.displayName);
    return;
  }

  const audio = new Audio(audioUrl);
  await audio.play();
  setStatus(tl(
    `Reproduzindo audio nativo em ${language.displayName} (${dictionaryCode}).`,
    `Playing native audio in ${language.displayName} (${dictionaryCode}).`,
    `Natives Audio wird abgespielt in ${language.displayName} (${dictionaryCode}).`
  ));
}
