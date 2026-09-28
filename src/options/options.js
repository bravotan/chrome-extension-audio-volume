(function () {
  const RULES = window.VolumeDomain.rules;
  const STORAGE = window.VolumeDomain.storage;
  const I18N = window.VolumeDomain.i18n;

  const els = {
    langSelect: document.getElementById("langSelect"),
    tabs: document.querySelectorAll(".tab"),
    panels: document.querySelectorAll(".tab-panel"),
    refreshBtn: document.getElementById("refreshBtn"),
    addDomainBtn: document.getElementById("addDomainBtn"),
    ruleTableBody: document.getElementById("ruleTableBody"),
    emptyState: document.getElementById("emptyState"),
    importFile: document.getElementById("importFile"),
    importBtn: document.getElementById("importBtn"),
    exportBtn: document.getElementById("exportBtn"),
    deleteAllBtn: document.getElementById("deleteAllBtn"),

    dialogBackdrop: document.getElementById("ruleDialogBackdrop"),
    dialogTitle: document.getElementById("dialogTitle"),
    dialogDomain: document.getElementById("dialogDomain"),
    dialogScope: document.getElementById("dialogScope"),
    dialogPathField: document.getElementById("dialogPathField"),
    dialogPath: document.getElementById("dialogPath"),
    dialogVolume: document.getElementById("dialogVolume"),
    dialogVolumeReadout: document.getElementById("dialogVolumeReadout"),
    dialogMute: document.getElementById("dialogMute"),
    dialogCancel: document.getElementById("dialogCancel"),
    dialogSave: document.getElementById("dialogSave"),
  };

  let lang = "en";
  let editingId = null;

  function applyI18n() {
    I18N.applyToDom(document, lang);
    els.langSelect.value = lang;
  }

  function scopeLabel(rule) {
    return rule.scope === RULES.SCOPE_PATH ? I18N.t(lang, "pathScopeShort") : I18N.t(lang, "domainScopeShort");
  }

  async function renderTable() {
    const rules = RULES.sortRulesForDisplay(await STORAGE.getRules());
    els.ruleTableBody.innerHTML = "";
    els.emptyState.classList.toggle("hidden", rules.length > 0);

    rules.forEach((rule) => {
      const tr = document.createElement("tr");

      const domainTd = document.createElement("td");
      domainTd.className = "domain-cell";
      domainTd.textContent = rule.pattern;
      if (rule.scope === RULES.SCOPE_PATH) {
        const pathSpan = document.createElement("span");
        pathSpan.className = "domain-path";
        pathSpan.textContent = " " + rule.path;
        domainTd.appendChild(pathSpan);
      }

      const scopeTd = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "scope-badge";
      badge.textContent = scopeLabel(rule);
      scopeTd.appendChild(badge);

      const volumeTd = document.createElement("td");
      const volumeCell = document.createElement("div");
      volumeCell.className = "volume-cell";
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "100";
      slider.step = "5";
      slider.value = String(RULES.clampVolume(rule.volume));
      slider.className = "volume-mini-slider";
      const valueSpan = document.createElement("span");
      valueSpan.className = "volume-mini-value";
      valueSpan.textContent = `${RULES.clampVolume(rule.volume)}%`;
      slider.addEventListener("input", () => {
        valueSpan.textContent = `${slider.value}%`;
      });
      slider.addEventListener("change", async () => {
        await STORAGE.upsertRule({ ...rule, volume: RULES.clampVolume(slider.value) });
      });
      volumeCell.appendChild(slider);
      volumeCell.appendChild(valueSpan);
      volumeTd.appendChild(volumeCell);

      const muteTd = document.createElement("td");
      muteTd.className = "mute-cell";
      const muteCheckbox = document.createElement("input");
      muteCheckbox.type = "checkbox";
      muteCheckbox.checked = Boolean(rule.muted);
      muteCheckbox.addEventListener("change", async () => {
        await STORAGE.upsertRule({ ...rule, muted: muteCheckbox.checked });
      });
      muteTd.appendChild(muteCheckbox);

      const actionsTd = document.createElement("td");
      actionsTd.className = "actions-cell";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-action";
      editBtn.title = I18N.t(lang, "edit");
      editBtn.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
      editBtn.addEventListener("click", () => openDialog(rule));

      const delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "icon-action delete";
      delBtn.title = I18N.t(lang, "delete");
      delBtn.innerHTML =
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>';
      delBtn.addEventListener("click", async () => {
        await STORAGE.deleteRule(rule.id);
        renderTable();
      });

      actionsTd.appendChild(editBtn);
      actionsTd.appendChild(delBtn);

      tr.appendChild(domainTd);
      tr.appendChild(scopeTd);
      tr.appendChild(volumeTd);
      tr.appendChild(muteTd);
      tr.appendChild(actionsTd);
      els.ruleTableBody.appendChild(tr);
    });
  }

  function updateDialogPathVisibility() {
    els.dialogPathField.classList.toggle("hidden", els.dialogScope.value !== RULES.SCOPE_PATH);
  }

  function openDialog(rule) {
    editingId = rule ? rule.id : null;
    els.dialogTitle.textContent = I18N.t(lang, rule ? "editDomainTitle" : "addDomainTitle");
    els.dialogDomain.value = rule ? rule.pattern : "";
    els.dialogScope.value = rule ? rule.scope : RULES.SCOPE_DOMAIN;
    els.dialogPath.value = rule && rule.scope === RULES.SCOPE_PATH ? rule.path : "/";
    els.dialogVolume.value = String(rule ? RULES.clampVolume(rule.volume) : 100);
    els.dialogVolumeReadout.textContent = `${els.dialogVolume.value}%`;
    els.dialogMute.checked = Boolean(rule && rule.muted);
    updateDialogPathVisibility();
    els.dialogBackdrop.classList.remove("hidden");
    els.dialogDomain.focus();
  }

  function closeDialog() {
    els.dialogBackdrop.classList.add("hidden");
    editingId = null;
  }

  async function saveDialog() {
    const pattern = RULES.normalizeDomain(els.dialogDomain.value);
    if (!pattern) {
      els.dialogDomain.focus();
      return;
    }
    const wildcard = els.dialogDomain.value.trim().toLowerCase().startsWith("*.");
    const scope = els.dialogScope.value;
    const rawPath = els.dialogPath.value.trim() || "/";
    const path = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;

    await STORAGE.upsertRule({
      id: editingId || RULES.createRuleId(),
      pattern: wildcard ? `*.${pattern}` : pattern,
      scope,
      path: scope === RULES.SCOPE_PATH ? path : "/",
      volume: RULES.clampVolume(els.dialogVolume.value),
      muted: els.dialogMute.checked,
    });

    closeDialog();
    renderTable();
  }

  function switchTab(name) {
    els.tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    els.panels.forEach((panel) => panel.classList.toggle("active", panel.id === `tab${name.charAt(0).toUpperCase()}${name.slice(1)}`));
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function init() {
    const settings = await STORAGE.getSettings();
    lang = I18N.SUPPORTED.includes(settings.language) ? settings.language : "en";
    applyI18n();
    await renderTable();

    els.tabs.forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));

    els.refreshBtn.addEventListener("click", renderTable);
    els.addDomainBtn.addEventListener("click", () => openDialog(null));

    els.dialogScope.addEventListener("change", updateDialogPathVisibility);
    els.dialogVolume.addEventListener("input", () => {
      els.dialogVolumeReadout.textContent = `${els.dialogVolume.value}%`;
    });
    els.dialogCancel.addEventListener("click", closeDialog);
    els.dialogSave.addEventListener("click", saveDialog);
    els.dialogBackdrop.addEventListener("click", (e) => {
      if (e.target === els.dialogBackdrop) closeDialog();
    });

    els.deleteAllBtn.addEventListener("click", async () => {
      if (confirm(I18N.t(lang, "deleteAllConfirm"))) {
        await STORAGE.deleteAllRules();
        renderTable();
      }
    });

    els.exportBtn.addEventListener("click", async () => {
      const data = await STORAGE.exportData();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `per-site-volume-export-${date}.json`);
    });

    els.importBtn.addEventListener("click", () => els.importFile.click());
    els.importFile.addEventListener("change", async () => {
      const file = els.importFile.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        await STORAGE.importData(data, { merge: true });
        await renderTable();
        alert(I18N.t(lang, "importSuccess"));
      } catch (err) {
        alert(I18N.t(lang, "importError"));
      } finally {
        els.importFile.value = "";
      }
    });

    els.langSelect.addEventListener("change", async (e) => {
      lang = e.target.value;
      await STORAGE.saveSettings({ language: lang });
      applyI18n();
      renderTable();
    });

    STORAGE.onRulesChanged(() => renderTable());
  }

  init();
})();
