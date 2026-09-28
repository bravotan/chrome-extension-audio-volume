(function () {
  const RULES = window.VolumeDomain.rules;
  const STORAGE = window.VolumeDomain.storage;
  const I18N = window.VolumeDomain.i18n;

  const els = {
    langSelect: document.getElementById("langSelect"),
    settingsBtn: document.getElementById("settingsBtn"),
    favicon: document.getElementById("favicon"),
    hostLabel: document.getElementById("hostLabel"),
    unsupportedNote: document.getElementById("unsupportedNote"),
    controls: document.getElementById("controls"),
    scopeSelect: document.getElementById("scopeSelect"),
    volumeReadout: document.getElementById("volumeReadout"),
    volumeSlider: document.getElementById("volumeSlider"),
    presets: document.getElementById("presets"),
    muteCheckbox: document.getElementById("muteCheckbox"),
    savedToggle: document.getElementById("savedToggle"),
    savedListBody: document.getElementById("savedListBody"),
    savedEmpty: document.getElementById("savedEmpty"),
    savedListItems: document.getElementById("savedListItems"),
    openSettingsLink: document.getElementById("openSettingsLink"),
  };

  let lang = "en";
  let activeTabId = null;
  let host = null;
  let path = "/";
  let scope = RULES.SCOPE_DOMAIN;
  let existingRuleId = null;
  let volume = RULES.DEFAULT_VOLUME;
  let muted = false;
  let persistTimer = null;

  function applyI18n() {
    I18N.applyToDom(document, lang);
    els.langSelect.value = lang;
  }

  function sendPreview() {
    if (activeTabId === null) return;
    chrome.tabs.sendMessage(
      activeTabId,
      { target: "VD_CONTENT", type: "VD_PREVIEW", volume, muted },
      () => void chrome.runtime.lastError // ignore: content script may be absent
    );
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    persistTimer = setTimeout(persistRule, 250);
  }

  async function persistRule() {
    if (!host) return;
    const isDefault = volume === RULES.DEFAULT_VOLUME && !muted;
    if (isDefault) {
      if (existingRuleId) {
        await STORAGE.deleteRule(existingRuleId);
        existingRuleId = null;
      }
    } else {
      const id = existingRuleId || RULES.createRuleId();
      await STORAGE.upsertRule({
        id,
        pattern: host,
        scope,
        path: scope === RULES.SCOPE_PATH ? path : "/",
        volume,
        muted,
      });
      existingRuleId = id;
    }
    renderSavedList();
  }

  function updateVolumeUi() {
    els.volumeReadout.textContent = `${volume}%`;
    els.volumeSlider.value = String(volume);
    els.muteCheckbox.checked = muted;
    els.presets.querySelectorAll("button").forEach((btn) => {
      btn.classList.toggle("active", Number(btn.dataset.value) === volume);
    });
  }

  function onVolumeInput(newVolume) {
    volume = RULES.clampVolume(newVolume);
    updateVolumeUi();
    sendPreview();
    schedulePersist();
  }

  async function loadForScope(newScope) {
    scope = newScope;
    const rules = await STORAGE.getRules();
    const exact = rules.find(
      (r) => r.pattern === host && r.scope === scope && (scope !== RULES.SCOPE_PATH || r.path === path)
    );
    if (exact) {
      existingRuleId = exact.id;
      volume = RULES.clampVolume(exact.volume);
      muted = Boolean(exact.muted);
    } else {
      existingRuleId = null;
      const best = RULES.findBestRule(rules, host, path);
      volume = best ? RULES.clampVolume(best.volume) : RULES.DEFAULT_VOLUME;
      muted = best ? Boolean(best.muted) : false;
    }
    updateVolumeUi();
  }

  function scopeLabel(rule) {
    return rule.scope === RULES.SCOPE_PATH ? I18N.t(lang, "pathScopeShort") : I18N.t(lang, "domainScopeShort");
  }

  async function renderSavedList() {
    const rules = RULES.sortRulesForDisplay(await STORAGE.getRules());
    els.savedListItems.innerHTML = "";
    els.savedEmpty.classList.toggle("hidden", rules.length > 0);
    rules.slice(0, 20).forEach((rule) => {
      const li = document.createElement("li");

      const domainSpan = document.createElement("div");
      domainSpan.className = "saved-item-domain";
      domainSpan.textContent = rule.pattern + (rule.scope === RULES.SCOPE_PATH ? rule.path : "");
      domainSpan.title = domainSpan.textContent;

      const scopeSpan = document.createElement("span");
      scopeSpan.className = "saved-item-scope";
      scopeSpan.textContent = scopeLabel(rule);

      const volSpan = document.createElement("div");
      volSpan.className = "saved-item-volume";
      volSpan.textContent = rule.muted ? "🔇" : `${RULES.clampVolume(rule.volume)}%`;

      const actions = document.createElement("div");
      actions.className = "saved-item-actions";

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "delete";
      delBtn.title = I18N.t(lang, "delete");
      delBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
      delBtn.addEventListener("click", async () => {
        await STORAGE.deleteRule(rule.id);
        if (rule.id === existingRuleId) {
          existingRuleId = null;
          volume = RULES.DEFAULT_VOLUME;
          muted = false;
          updateVolumeUi();
        }
        renderSavedList();
      });

      actions.appendChild(delBtn);
      li.appendChild(domainSpan);
      li.appendChild(scopeSpan);
      li.appendChild(volSpan);
      li.appendChild(actions);
      els.savedListItems.appendChild(li);
    });
  }

  function setupUnsupported() {
    els.unsupportedNote.classList.remove("hidden");
    els.controls.classList.add("hidden");
    els.hostLabel.textContent = "—";
  }

  async function init() {
    const settings = await STORAGE.getSettings();
    lang = I18N.SUPPORTED.includes(settings.language) ? settings.language : "en";
    applyI18n();
    await renderSavedList();

    // Controls that make sense regardless of whether the active tab supports
    // per-page volume rules (settings/language/saved-list management).
    els.savedToggle.addEventListener("click", () => {
      const isHidden = els.savedListBody.classList.toggle("hidden");
      els.savedToggle.classList.toggle("expanded", !isHidden);
    });
    els.settingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
    els.openSettingsLink.addEventListener("click", () => chrome.runtime.openOptionsPage());
    els.langSelect.addEventListener("change", async (e) => {
      lang = e.target.value;
      await STORAGE.saveSettings({ language: lang });
      applyI18n();
      renderSavedList();
    });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      setupUnsupported();
      return;
    }
    activeTabId = tab.id;
    const target = RULES.parseTargetUrl(tab.url);
    if (!target) {
      setupUnsupported();
      return;
    }
    host = target.host;
    path = target.path;
    els.hostLabel.textContent = host;
    if (tab.favIconUrl) {
      els.favicon.src = tab.favIconUrl;
    } else {
      els.favicon.style.visibility = "hidden";
    }

    await loadForScope(RULES.SCOPE_DOMAIN);

    els.scopeSelect.addEventListener("change", (e) => loadForScope(e.target.value));
    els.volumeSlider.addEventListener("input", (e) => onVolumeInput(e.target.value));
    els.presets.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-value]");
      if (!btn) return;
      onVolumeInput(btn.dataset.value);
    });
    els.muteCheckbox.addEventListener("change", (e) => {
      muted = e.target.checked;
      sendPreview();
      schedulePersist();
    });
  }

  init();
})();
