// MV3 service worker: keeps the toolbar badge in sync with the active tab's
// effective volume and seeds default settings on install.
importScripts("../lib/rules.js", "../lib/storage.js");

const RULES = self.VolumeDomain.rules;
const STORAGE = self.VolumeDomain.storage;

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === "install") {
    await STORAGE.saveSettings({ language: guessDefaultLanguage() });
  }
});

function guessDefaultLanguage() {
  const uiLang = (chrome.i18n && chrome.i18n.getUILanguage && chrome.i18n.getUILanguage()) || "en";
  return uiLang.toLowerCase().startsWith("ja") ? "ja" : "en";
}

async function updateBadgeForTab(tabId, url) {
  const target = RULES.parseTargetUrl(url || "");
  if (!target) {
    await chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  try {
    const rules = await STORAGE.getRules();
    const rule = RULES.findBestRule(rules, target.host, target.path);
    if (!rule) {
      await chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }
    if (rule.muted) {
      await chrome.action.setBadgeBackgroundColor({ tabId, color: "#DC2626" });
      await chrome.action.setBadgeText({ tabId, text: "mute" });
      return;
    }
    const volume = RULES.clampVolume(rule.volume);
    if (volume === RULES.DEFAULT_VOLUME) {
      await chrome.action.setBadgeText({ tabId, text: "" });
      return;
    }
    await chrome.action.setBadgeBackgroundColor({ tabId, color: "#6B7280" });
    await chrome.action.setBadgeText({ tabId, text: String(volume) });
  } catch (err) {
    // Storage briefly unavailable during startup; leave the badge as-is.
  }
}

async function refreshActiveTabBadge() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (tab && tab.id !== undefined) {
    await updateBadgeForTab(tab.id, tab.url);
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" || changeInfo.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    updateBadgeForTab(tabId, tab.url);
  } catch {
    /* tab may have closed already */
  }
});

STORAGE.onRulesChanged(() => {
  refreshActiveTabBadge();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.target !== "VD_BACKGROUND") return;
  if (message.type === "VD_REFRESH_BADGE") {
    refreshActiveTabBadge().then(() => sendResponse({ ok: true }));
    return true;
  }
});
