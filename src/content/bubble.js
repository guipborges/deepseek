// Bubble UI handlers for content script
// Loaded via importScripts from content.js

let bubbleEl = null;

function removeBubble() {
  if (bubbleEl) {
    bubbleEl.remove();
    bubbleEl = null;
  }
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
  const w = rect.width || 320;
  const h = rect.height || 120;

  if (left + w > viewportRight) left = Math.max(viewportLeft, viewportRight - w);
  if (top + h > viewportBottom) top = Math.max(viewportTop, y - h - offsetY);

  element.style.left = `${left}px`;
  element.style.top = `${top}px`;
}

function createBubbleActionButton(label, background) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = label;
  btn.style.cssText =
    `border:none;border-radius:6px;padding:5px 7px;background:${background};color:#fff;` +
    `font-size:11px;line-height:1.2;cursor:pointer;font-family:Segoe UI,Tahoma,sans-serif;`;
  return btn;
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
  bubbleEl.style.cssText =
    `position:absolute;z-index:2147483647;max-width:320px;padding:10px;border-radius:10px;` +
    `background:#ffffff;color:${isError ? "#b00020" : "#10213d"};` +
    `border:1px solid #d8e0ef;box-shadow:0 8px 24px rgba(0,0,0,0.18);` +
    `font-size:13px;font-family:Segoe UI,Tahoma,sans-serif;line-height:1.4;white-space:pre-wrap;`;
  bubbleEl.textContent = text;
  bubbleEl.addEventListener("mousedown", (e) => e.stopPropagation());
  bubbleEl.addEventListener("click", (e) => e.stopPropagation());
  document.body.appendChild(bubbleEl);
  positionFloatingElement(bubbleEl, x, y);
}
