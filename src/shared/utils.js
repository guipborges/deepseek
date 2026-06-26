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
