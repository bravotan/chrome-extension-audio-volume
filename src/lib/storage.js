// Storage helpers shared by background, popup and options scripts.
// Rules live in chrome.storage.sync so they roam with the user's Chrome profile;
// settings (UI language) live there too. Falls back to chrome.storage.local
// automatically if sync is unavailable or the quota is exceeded.
(function (global) {
  const RULES_KEY = "vd_rules";
  const SETTINGS_KEY = "vd_settings";

  const DEFAULT_SETTINGS = { language: "en" };

  function getArea() {
    return chrome.storage.sync || chrome.storage.local;
  }

  function get(area, keys) {
    return new Promise((resolve, reject) => {
      area.get(keys, (result) => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve(result);
      });
    });
  }

  function set(area, items) {
    return new Promise((resolve, reject) => {
      area.set(items, () => {
        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
        else resolve();
      });
    });
  }

  async function setWithFallback(items) {
    try {
      await set(chrome.storage.sync, items);
    } catch (err) {
      console.warn("Volume Domain: sync storage failed, falling back to local", err);
      await set(chrome.storage.local, items);
    }
  }

  async function getRules() {
    const result = await get(getArea(), [RULES_KEY]);
    return Array.isArray(result[RULES_KEY]) ? result[RULES_KEY] : [];
  }

  async function saveRules(rules) {
    await setWithFallback({ [RULES_KEY]: rules });
    return rules;
  }

  async function upsertRule(rule) {
    const rules = await getRules();
    const idx = rules.findIndex((r) => r.id === rule.id);
    const now = Date.now();
    if (idx >= 0) {
      rules[idx] = { ...rules[idx], ...rule, updatedAt: now };
    } else {
      rules.push({ ...rule, createdAt: now, updatedAt: now });
    }
    await saveRules(rules);
    return rules;
  }

  async function deleteRule(id) {
    const rules = await getRules();
    const next = rules.filter((r) => r.id !== id);
    await saveRules(next);
    return next;
  }

  async function deleteAllRules() {
    await saveRules([]);
    return [];
  }

  async function getSettings() {
    const result = await get(getArea(), [SETTINGS_KEY]);
    return { ...DEFAULT_SETTINGS, ...(result[SETTINGS_KEY] || {}) };
  }

  async function saveSettings(partial) {
    const current = await getSettings();
    const next = { ...current, ...partial };
    await setWithFallback({ [SETTINGS_KEY]: next });
    return next;
  }

  async function exportData() {
    const [rules, settings] = await Promise.all([getRules(), getSettings()]);
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      rules,
      settings,
    };
  }

  async function importData(data, { merge = false } = {}) {
    if (!data || !Array.isArray(data.rules)) {
      throw new Error("Invalid import file: missing rules array");
    }
    const incoming = data.rules.map((r) => ({
      id: r.id || global.VolumeDomain.rules.createRuleId(),
      pattern: String(r.pattern || "").trim(),
      scope: r.scope === global.VolumeDomain.rules.SCOPE_PATH ? global.VolumeDomain.rules.SCOPE_PATH : global.VolumeDomain.rules.SCOPE_DOMAIN,
      path: r.path || "/",
      volume: global.VolumeDomain.rules.clampVolume(r.volume),
      muted: Boolean(r.muted),
      createdAt: r.createdAt || Date.now(),
      updatedAt: Date.now(),
    })).filter((r) => r.pattern.length > 0);

    let finalRules = incoming;
    if (merge) {
      const existing = await getRules();
      const byKey = new Map();
      for (const r of existing) byKey.set(r.pattern + "|" + r.scope + "|" + r.path, r);
      for (const r of incoming) byKey.set(r.pattern + "|" + r.scope + "|" + r.path, r);
      finalRules = Array.from(byKey.values());
    }
    await saveRules(finalRules);
    if (data.settings) {
      await saveSettings(data.settings);
    }
    return finalRules;
  }

  function onRulesChanged(callback) {
    const listener = (changes, areaName) => {
      if ((areaName === "sync" || areaName === "local") && changes[RULES_KEY]) {
        callback(changes[RULES_KEY].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }

  global.VolumeDomain = global.VolumeDomain || {};
  global.VolumeDomain.storage = {
    getRules,
    saveRules,
    upsertRule,
    deleteRule,
    deleteAllRules,
    getSettings,
    saveSettings,
    exportData,
    importData,
    onRulesChanged,
  };
})(typeof self !== "undefined" ? self : this);
