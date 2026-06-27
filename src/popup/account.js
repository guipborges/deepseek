// Account and onboarding functions for popup — loaded via <script> before popup.js

/* Account panel */

function updateUsageRing(user) {
  if (!usageRing) return;
  const used = Number(user?.usage?.total_tokens || 0);
  const limit = Number(user?.limits?.monthlyTokens || 0);
  const hasLimit = Number.isFinite(limit) && limit > 0;
  usageRing.classList.toggle("hidden", !hasLimit);
  if (!hasLimit) return;
  const percent = Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
  usageRing.style.setProperty("--usage", `${percent}%`);
  usageRing.setAttribute("aria-valuenow", String(percent));
  if (usageRingText) usageRingText.textContent = `${percent}%`;
}

function getAccountPlanLabel(plan) {
  if (plan === "pro") return t("accountPro");
  if (plan === "expired") return t("accountExpired");
  return t("accountTrial");
}

function formatAccountUsage(user) {
  const used = Number(user?.usage?.monthlyTokens || 0);
  const limit = Number(user?.limits?.monthlyTokens || 0);
  if (!limit) return t("accountUsage").replace("{used}", String(used)).replace("{limit}", "-");
  return t("accountUsage").replace("{used}", String(used)).replace("{limit}", String(limit));
}

function updateAccountPanel(user = null) {
  if (!accountPanel) return;
  accountPanel.classList.toggle("hidden", !user);
  if (!user) {
    upgradeBtn?.classList.remove("pro-badge");
    if (upgradeBtn) { upgradeBtn.disabled = false; upgradeBtn.setAttribute("aria-disabled", "false"); upgradeBtn.textContent = t("accountUpgrade"); }
    usageRing?.classList.add("hidden");
    return;
  }
  updateUsageRing(user);
  if (upgradeBtn) {
    const isPro = user.plan === "pro";
    upgradeBtn.classList.toggle("pro-badge", isPro);
    upgradeBtn.disabled = isPro;
    upgradeBtn.setAttribute("aria-disabled", isPro ? "true" : "false");
    upgradeBtn.textContent = isPro ? "PRO" : t("accountUpgrade");
  }
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
