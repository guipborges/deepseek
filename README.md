# DeepSeek Chrome Translator

Chrome extension to translate selected text with DeepSeek API, with flashcards, pronunciation, and YouGlish integration.

## Features

- Double-click a word or sentence on any page to translate quickly.
- Translation popup with source and target language controls.
- Dedicated settings page.
- Save translated words as flashcards.
- Flashcards review screen.
- Text-to-speech pronunciation.
- YouGlish shortcut for real-world pronunciation examples.
- App UI language setting (PT-BR, EN-US, DE-DE).

## Load Locally (Unpacked)

1. Open Chrome at `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `deepseek-chrome-translator` folder.

## Configuration

1. Open the extension popup.
2. Click **Settings**.
3. Configure:
- DeepSeek API Key
- Source language (for example: `auto`, `en`, `pt-BR`)
- Target language (for example: `pt-BR`, `en`, `es`)
- Model (default: `deepseek-chat`)
- Popup width and height (px)
- App language (PT-BR / EN-US / DE-DE)
4. Click **Save**.

## Flashcards

1. Translate a word or phrase in the popup.
2. Click **Save FlashCard**.
3. Open **Flashcards** to review.
4. Use previous/next, flip card, remove current card, or clear all cards.

## Double-click Workflow

1. Select text on a webpage.
2. Click the floating `T` icon shown near the selection.
3. Use the bubble actions to save, pronounce, or open YouGlish.

## Data Storage

- Settings and API key are stored in `chrome.storage.local`.
- Flashcards are stored in browser local database (`IndexedDB`).
- Selected text is sent to DeepSeek API to generate translations.

## Chrome Web Store Readiness

This repository is now aligned with common Chrome extension packaging standards:

- Manifest V3.
- 16/32/48/128 icons configured.
- English metadata in `manifest.json`.
- URL match scope limited to `http://*/*` and `https://*/*`.
- README in English.
- Privacy policy file included in repository.

Before publishing, you still need to complete Chrome Web Store console requirements:

1. Create store listing text, screenshots, and promotional assets.
2. Host the privacy policy at a public URL and add it in the store form.
3. Upload a ZIP package of the extension root.
4. Declare permissions and data usage exactly as implemented.
5. Pass Google review and policy checks.

## GitHub Pages (Privacy Policy URL)

This repository includes a ready-to-publish policy site in the `docs/` folder:

- `docs/index.html`
- `docs/privacy-policy.html`

To publish it on GitHub Pages:

1. Push this repository to GitHub.
2. Open repository **Settings** > **Pages**.
3. In **Build and deployment**, choose **Deploy from a branch**.
4. Select your branch (usually `main`) and folder `/docs`.
5. Save and wait for GitHub to publish.

Your public privacy policy URL will be:

`https://<your-github-user>.github.io/<your-repo>/privacy-policy.html`

Use this exact URL in Chrome Web Store privacy policy field.
