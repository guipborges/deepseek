const FALLBACK_APP_LANGUAGE = "en-US";
const SUPPORTED_APP_LANGUAGES = ["en-US", "pt-BR", "de-DE"];

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

const YOUGLISH_LANGUAGE_SLUGS = {
  ar: "arabic",
  zh: "chinese",
  nl: "dutch",
  en: "english",
  fr: "french",
  de: "german",
  el: "greek",
  he: "hebrew",
  hi: "hindi",
  it: "italian",
  ja: "japanese",
  ko: "korean",
  fa: "persian",
  pl: "polish",
  pt: "portuguese",
  ro: "romanian",
  ru: "russian",
  es: "spanish",
  sv: "swedish",
  th: "thai",
  tr: "turkish",
  uk: "ukrainian",
  vi: "vietnamese"
};
const FORVO_LANGUAGE_CODES = {
  ar: "ar",
  cs: "cs",
  da: "da",
  de: "de",
  el: "el",
  en: "en",
  es: "es",
  fi: "fi",
  fr: "fr",
  he: "he",
  hi: "hi",
  hu: "hu",
  id: "ind",
  it: "it",
  ja: "ja",
  ko: "ko",
  nb: "no",
  nl: "nl",
  nn: "nn",
  no: "no",
  pl: "pl",
  pt: "pt",
  ro: "ro",
  ru: "ru",
  sv: "sv",
  th: "th",
  tr: "tr",
  uk: "uk",
  vi: "vi",
  zh: "zh"
};
const LANGUAGE_CATALOG = [
  { value: "en-US", short: "EN", label: "English" },
  { value: "pt-BR", short: "PT", label: "Portuguese" },
  { value: "es-ES", short: "ES", label: "Spanish" },
  { value: "de-DE", short: "DE", label: "German" },
  { value: "fr-FR", short: "FR", label: "French" },
  { value: "it-IT", short: "IT", label: "Italian" },
  { value: "nl-NL", short: "NL", label: "Dutch" },
  { value: "ru-RU", short: "RU", label: "Russian" },
  { value: "ja-JP", short: "JA", label: "Japanese" },
  { value: "ko-KR", short: "KO", label: "Korean" },
  { value: "zh-CN", short: "ZH", label: "Chinese" },
  { value: "ar-SA", short: "AR", label: "Arabic" },
  { value: "hi-IN", short: "HI", label: "Hindi" },
  { value: "tr-TR", short: "TR", label: "Turkish" },
  { value: "pl-PL", short: "PL", label: "Polish" },
  { value: "sv-SE", short: "SV", label: "Swedish" },
  { value: "nb-NO", short: "NO", label: "Norwegian" },
  { value: "da-DK", short: "DA", label: "Danish" },
  { value: "fi-FI", short: "FI", label: "Finnish" },
  { value: "uk-UA", short: "UK", label: "Ukrainian" },
  { value: "el-GR", short: "EL", label: "Greek" },
  { value: "he-IL", short: "HE", label: "Hebrew" },
  { value: "id-ID", short: "ID", label: "Indonesian" },
  { value: "vi-VN", short: "VI", label: "Vietnamese" },
  { value: "th-TH", short: "TH", label: "Thai" },
  { value: "cs-CZ", short: "CS", label: "Czech" },
  { value: "ro-RO", short: "RO", label: "Romanian" },
  { value: "hu-HU", short: "HU", label: "Hungarian" }
];

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

  if (code.startsWith("ja")) {
    return "ja-JP";
  }

  if (code.startsWith("ko")) {
    return "ko-KR";
  }

  if (code.startsWith("zh")) {
    return "zh-CN";
  }

  if (code.startsWith("ar")) {
    return "ar-SA";
  }

  if (code.startsWith("hi")) {
    return "hi-IN";
  }

  if (code.startsWith("tr")) {
    return "tr-TR";
  }

  if (code.startsWith("pl")) {
    return "pl-PL";
  }

  if (code.startsWith("sv")) {
    return "sv-SE";
  }

  if (code.startsWith("no") || code.startsWith("nb") || code.startsWith("nn")) {
    return "nb-NO";
  }

  if (code.startsWith("da")) {
    return "da-DK";
  }

  if (code.startsWith("fi")) {
    return "fi-FI";
  }

  if (code.startsWith("uk")) {
    return "uk-UA";
  }

  if (code.startsWith("el")) {
    return "el-GR";
  }

  if (code.startsWith("he")) {
    return "he-IL";
  }

  if (code.startsWith("id")) {
    return "id-ID";
  }

  if (code.startsWith("vi")) {
    return "vi-VN";
  }

  if (code.startsWith("th")) {
    return "th-TH";
  }

  if (code.startsWith("cs")) {
    return "cs-CZ";
  }

  if (code.startsWith("ro")) {
    return "ro-RO";
  }

  if (code.startsWith("hu")) {
    return "hu-HU";
  }

  return "en-US";
}

function mapLanguageToYouGlish(language) {
  const normalized = (language || "").trim().toLowerCase();
  if (!normalized || normalized === "auto" || normalized === "und") {
    return null;
  }

  const primary = getPrimaryLanguageCode(normalized);
  return YOUGLISH_LANGUAGE_SLUGS[primary] || null;
}

function isYouGlishSupportedLanguage(language, { allowAuto = false } = {}) {
  const normalized = (language || "").trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return allowAuto;
  }

  return !!mapLanguageToYouGlish(normalized);
}

function mapLanguageToForvoCode(language) {
  const normalized = (language || "").trim().toLowerCase();
  if (!normalized || normalized === "auto" || normalized === "und") {
    return "en";
  }

  const primary = getPrimaryLanguageCode(normalized);
  return FORVO_LANGUAGE_CODES[primary] || "en";
}

function isForvoSupportedLanguage(language, { allowAuto = true } = {}) {
  const normalized = (language || "").trim().toLowerCase();
  if (!normalized || normalized === "auto") {
    return allowAuto;
  }

  return !!FORVO_LANGUAGE_CODES[getPrimaryLanguageCode(normalized)];
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

function getDefaultAppLanguage() {
  const browserLanguage =
    (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage ? chrome.i18n.getUILanguage() : "") ||
    (typeof navigator !== "undefined" ? navigator.language : "") ||
    FALLBACK_APP_LANGUAGE;
  const browserPrimary = browserLanguage.toLowerCase().split("-")[0];
  return SUPPORTED_APP_LANGUAGES.find((language) => language.toLowerCase().startsWith(`${browserPrimary}-`)) || FALLBACK_APP_LANGUAGE;
}

function getUiLanguageCode(language) {
  const code = (language || getDefaultAppLanguage()).toLowerCase();
  if (code.startsWith("pt")) {
    return "pt";
  }
  if (code.startsWith("de")) {
    return "de";
  }
  return "en";
}

function getDefaultTargetLanguage() {
  const browserLanguage =
    (typeof chrome !== "undefined" && chrome.i18n?.getUILanguage ? chrome.i18n.getUILanguage() : "") ||
    (typeof navigator !== "undefined" ? navigator.language : "") ||
    "en-US";
  const browserPrimary = browserLanguage.toLowerCase().split("-")[0];
  return LANGUAGE_CATALOG.find((language) => language.value.toLowerCase().startsWith(`${browserPrimary}-`))?.value || "en-US";
}

function getLanguageDisplayName(languageCode) {
  const code = (languageCode || "").toLowerCase();
  if (code.startsWith("de")) return "Alemao";
  if (code.startsWith("en")) return "Ingles";
  if (code.startsWith("pt")) return "Portugues";
  if (code.startsWith("es")) return "Espanhol";
  if (code.startsWith("fr")) return "Frances";
  if (code.startsWith("it")) return "Italiano";
  if (code.startsWith("nl")) return "Holandes";
  if (code.startsWith("ru")) return "Russo";
  return languageCode || "Desconhecido";
}
