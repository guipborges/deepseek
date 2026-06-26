// Selection handlers for content script
// Loaded via importScripts from content.js

let iconEl = null;

function getCurrentSelectedText() {
  if (shouldIgnoreSelection()) return "";
  const selection = window.getSelection();
  if (!selection) return "";
  return selection.toString().trim();
}

function removeIcon() {
  if (iconEl) {
    iconEl.remove();
    iconEl = null;
  }
}

function getSelectionRect() {
  if (shouldIgnoreSelection()) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (range.collapsed) return null;
  const rect = range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;
  return rect;
}

function ensureIcon() {
  if (iconEl) return iconEl;
  iconEl = document.createElement("div");
  iconEl.style.cssText =
    "position:absolute;z-index:2147483647;width:28px;height:28px;" +
    "background:#0b63f3;color:#fff;border-radius:8px;display:grid;place-items:center;" +
    "cursor:pointer;font-size:14px;line-height:1;box-shadow:0 2px 8px rgba(0,0,0,0.25);" +
    "border:1px solid rgba(255,255,255,0.2);user-select:none;";
  iconEl.textContent = "T";
  iconEl.title = "Traduzir";

  iconEl.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });

  iconEl.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedText) return;
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
  icon.style.left = `${Math.min(rect.right + window.scrollX + 6, window.scrollX + window.innerWidth - 34)}px`;
  icon.style.top = `${Math.max(rect.top + window.scrollY - 2, window.scrollY + 6)}px`;
}
