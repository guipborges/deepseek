// Account and onboarding functions for popup — loaded via <script> before popup.js

function updateAccountPanel(user = null) {
  if (!onboardingPanel) return;
  const hasSession = !!user;
  onboardingPanel.classList.toggle("hidden", hasSession);
  if (!user) return;
}

async function refreshOnboarding() {
  if (!onboardingPanel) return;
  const settings = (await storageGet(SETTINGS_KEY)) || {};
  const hasSession = await hasBackendSession();
  const shouldShow = !hasSession;

  onboardingPanel.classList.toggle("hidden", !shouldShow);
  updateAccountPanel(null);
  if (!shouldShow) {
    try {
      const account = await getBackendAccount();
      updateAccountPanel(account.user);
    } catch (_error) {
      await signOut();
      onboardingPanel.classList.remove("hidden");
      updateAccountPanel(null);
    }
    return;
  }

  onboardingEmailInput.value = "";
  onboardingCodeInput.value = "";
  onboardingTargetLanguageSelect.value = settings.targetLanguage || quickTargetLanguageSelect.value || "pt-BR";
  if (onboardingTargetLanguageSelect.value !== (settings.targetLanguage || quickTargetLanguageSelect.value || "pt-BR")) {
    onboardingTargetLanguageSelect.value = "pt-BR";
  }
}

async function requestOnboardingMagicLink() {
  const email = (onboardingEmailInput?.value || "").trim();
  if (!email) { setStatus(t("onboardingMissingEmail"), true); onboardingEmailInput?.focus(); return; }
  try {
    await signInWithOtp(email);
    setStatus(t("onboardingCodeSent"));
    onboardingCodeInput?.focus();
  } catch (error) { setStatus(`Erro: ${error.message}`, true); }
}

async function saveOnboardingSettings() {
  const email = (onboardingEmailInput?.value || "").trim();
  const code = (onboardingCodeInput?.value || "").trim();
  if (!email) { setStatus(t("onboardingMissingEmail"), true); onboardingEmailInput?.focus(); return; }
  if (!code) { setStatus(t("onboardingMissingCode"), true); onboardingCodeInput?.focus(); return; }

  try {
    await verifyOtp(email, code);
    const currentSettings = (await storageGet(SETTINGS_KEY)) || {};
    const targetLanguage = onboardingTargetLanguageSelect?.value || "pt-BR";
    const updated = {
      ...currentSettings,
      sourceLanguage: currentSettings.sourceLanguage || "auto",
      targetLanguage,
      popupWidth: currentSettings.popupWidth || 340,
      popupHeight: currentSettings.popupHeight || 540,
      themeMode: currentSettings.themeMode || "light",
      appLanguage: currentSettings.appLanguage || currentUiLanguage || "pt-BR",
      popupOpenTrigger: currentSettings.popupOpenTrigger || "t-click",
      openMainWindowOnDoubleClick: currentSettings.openMainWindowOnDoubleClick || false
    };
    await storageSet(SETTINGS_KEY, updated);
    await storageSet(ONBOARDING_DISMISSED_KEY, true);
    quickTargetLanguageSelect.value = targetLanguage;
    onboardingPanel?.classList.add("hidden");
    const account = await getBackendAccount();
    updateAccountPanel(account.user);
    setStatus(t("onboardingSaved"));
  } catch (error) { setStatus(`Erro: ${error.message}`, true); }
}

async function dismissOnboarding() {
  await storageSet(ONBOARDING_DISMISSED_KEY, true);
  onboardingPanel?.classList.add("hidden");
}
