function getParam(name) {
  const url = new URL(window.location.href);
  return (url.searchParams.get(name) || "").trim();
}

function storageGet(key) {
  return new Promise((resolve) => {
    if (!chrome?.storage?.local) {
      resolve(undefined);
      return;
    }

    chrome.storage.local.get([key], (result) => resolve(result[key]));
  });
}



const UI_TEXTS = {
  pt: {
    pageTitle: "YouGlish - Pronuncia",
    openExternal: "Abrir em nova aba",
    hint: 'Se o site nao permitir embed, use "Abrir em nova aba".',
    frameTitle: "YouGlish"
  },
  en: {
    pageTitle: "YouGlish - Pronunciation",
    openExternal: "Open in new tab",
    hint: 'If the site does not allow embed, use "Open in new tab".',
    frameTitle: "YouGlish"
  },
  de: {
    pageTitle: "YouGlish - Aussprache",
    openExternal: "In neuem Tab oeffnen",
    hint: 'Wenn die Seite kein Embed erlaubt, nutzen Sie "In neuem Tab oeffnen".',
    frameTitle: "YouGlish"
  }
};

function t(language, key) {
  const ui = UI_TEXTS[getUiLanguageCode(language)] || UI_TEXTS.en;
  return ui[key] || UI_TEXTS.en[key] || key;
}

const text = decodeURIComponent(getParam("text") || "");
const lang = decodeURIComponent(getParam("lang") || "english");
const titleEl = document.getElementById("title");
const frameEl = document.getElementById("youglishFrame");
const linkEl = document.getElementById("openExternalLink");
const hintEl = document.getElementById("hint");

const safeText = text || "word";
const safeLang = lang || "english";
const youglishUrl = `https://youglish.com/pronounce/${encodeURIComponent(safeText)}/${encodeURIComponent(safeLang)}`;

async function init() {
  const settings = (await storageGet("deepseekTranslatorSettings")) || {};
  const appLanguage = settings.appLanguage || getDefaultAppLanguage();

  document.documentElement.lang = appLanguage;
  document.title = t(appLanguage, "pageTitle");
  titleEl.textContent = `YouGlish: ${safeText}`;
  linkEl.textContent = t(appLanguage, "openExternal");
  if (hintEl) {
    hintEl.textContent = t(appLanguage, "hint");
  }
  frameEl.title = t(appLanguage, "frameTitle");
  frameEl.src = youglishUrl;
  linkEl.href = youglishUrl;
}

init();
