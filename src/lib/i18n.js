// Lightweight UI-string dictionary. Independent from chrome.i18n so the user can pick
// the extension's display language from a dropdown instead of following browser locale.
(function (global) {
  const STRINGS = {
    en: {
      appName: "Per-Site Volume",
      settingsForThisPage: "Settings for this page",
      applyTo: "Apply to",
      applyToDomain: "All under this domain",
      applyToPath: "This path only",
      volume: "Volume",
      mute: "Mute",
      savedList: "Saved list",
      noSavedDomains: "No saved domains yet",
      openSettings: "Open settings page",
      settingsTitle: "Per-Site Volume settings",
      tabDomains: "Domains",
      tabSettings: "Settings",
      domain: "Domain",
      scope: "Scope",
      actions: "Actions",
      addDomain: "Add domain",
      edit: "Edit",
      delete: "Delete",
      deleteAll: "Delete all",
      deleteAllConfirm: "Delete all saved domains? This can't be undone.",
      export: "Export",
      import: "Import",
      refresh: "Refresh",
      language: "Language",
      domainPlaceholder: "e.g. youtube.com or *.spotify.com",
      pathPlaceholder: "e.g. /watch",
      save: "Save",
      cancel: "Cancel",
      scopeHint: "Domains are applied in order; more specific scopes take precedence.",
      addDomainTitle: "Add domain",
      editDomainTitle: "Edit domain",
      emptyState: "No domains saved. Adjust the volume on any page to get started, or add one manually.",
      importSuccess: "Import complete",
      importError: "Could not read that file",
      preciseControlTitle: "Precise Volume Control",
      preciseControlDesc: "Adjust volume from 0% to 100%",
      autoApplyTitle: "Auto-apply Rules",
      autoApplyDesc: "Set once and apply automatically",
      syncTitle: "Sync and backup",
      syncDesc: "Settings sync across your signed-in devices",
      pathScopeShort: "This path only",
      domainScopeShort: "All under this domain",
      currentTabUnsupported: "Volume control isn't available on this page",
    },
    ja: {
      appName: "サイト別音量",
      settingsForThisPage: "このページの設定",
      applyTo: "適用範囲",
      applyToDomain: "このドメイン全体",
      applyToPath: "このパスのみ",
      volume: "音量",
      mute: "ミュート",
      savedList: "保存済みリスト",
      noSavedDomains: "保存済みのドメインはありません",
      openSettings: "設定ページを開く",
      settingsTitle: "サイト別音量の設定",
      tabDomains: "ドメイン",
      tabSettings: "設定",
      domain: "ドメイン",
      scope: "範囲",
      actions: "操作",
      addDomain: "ドメインを追加",
      edit: "編集",
      delete: "削除",
      deleteAll: "すべて削除",
      deleteAllConfirm: "保存済みのドメインをすべて削除しますか?この操作は取り消せません。",
      export: "エクスポート",
      import: "インポート",
      refresh: "更新",
      language: "言語",
      domainPlaceholder: "例: youtube.com または *.spotify.com",
      pathPlaceholder: "例: /watch",
      save: "保存",
      cancel: "キャンセル",
      scopeHint: "ドメインは上から順に適用され、より詳細な範囲が優先されます。",
      addDomainTitle: "ドメインを追加",
      editDomainTitle: "ドメインを編集",
      emptyState: "保存済みのドメインはありません。ページで音量を調整するか、手動で追加してください。",
      importSuccess: "インポートが完了しました",
      importError: "ファイルを読み込めませんでした",
      preciseControlTitle: "精密な音量調整",
      preciseControlDesc: "0%から100%まで音量を調整",
      autoApplyTitle: "自動適用ルール",
      autoApplyDesc: "一度設定すれば自動的に適用されます",
      syncTitle: "同期とバックアップ",
      syncDesc: "サインイン済みのデバイス間で設定を同期",
      pathScopeShort: "このパスのみ",
      domainScopeShort: "ドメイン全体",
      currentTabUnsupported: "このページでは音量を調整できません",
    },
  };

  function t(lang, key) {
    const dict = STRINGS[lang] || STRINGS.en;
    return dict[key] || STRINGS.en[key] || key;
  }

  function applyToDom(root, lang) {
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(lang, el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(lang, el.getAttribute("data-i18n-placeholder")));
    });
    root.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", t(lang, el.getAttribute("data-i18n-title")));
    });
  }

  global.VolumeDomain = global.VolumeDomain || {};
  global.VolumeDomain.i18n = { t, applyToDom, SUPPORTED: Object.keys(STRINGS) };
})(typeof self !== "undefined" ? self : this);
