// Runs in every page (and every frame). Finds <audio>/<video> elements and applies
// the matching domain/path volume rule as a 0-100% multiplier on top of the page's
// own volume (see main-world.js). Deliberately does not attempt to boost past 100% via the Web Audio
// API — that routing is irreversible once made (an element can never go back to
// playing directly to speakers) and silently breaks forever on autoplay-suspended
// contexts or DRM-protected media, so it isn't worth the fragility.
(function () {
  const RULES = self.VolumeDomain.rules;
  const STORAGE = self.VolumeDomain.storage;

  const target = RULES.parseTargetUrl(location.href);
  if (!target) return; // chrome://, extension pages, etc. — nothing to do here.

  let host = target.host;
  let path = target.path;

  let effectiveVolume = RULES.DEFAULT_VOLUME;
  let effectiveMuted = false;
  let previewTimer = null;

  // The actual volume change happens in main-world.js (it wraps the page's own
  // el.volume so the site's slider/normalisation is respected and multiplied by
  // this rule's factor). This script only tells it which factor to use and which
  // elements exist, and handles the mute flag.
  function sendFactor() {
    const v = RULES.clampVolume(effectiveVolume);
    document.dispatchEvent(new CustomEvent("__vd_factor", { detail: String(v / 100) }));
  }

  // Elements we muted ourselves, so un-muting the rule doesn't undo a mute the
  // user set with the site's own controls.
  const mutedByUs = new WeakSet();

  function applyToElement(el) {
    if (!(el instanceof HTMLMediaElement)) return;
    try {
      el.dispatchEvent(new CustomEvent("__vd_adopt", { bubbles: true, composed: true }));
    } catch {
      /* ignore */
    }
    if (effectiveMuted) {
      if (!el.muted) {
        el.muted = true;
        mutedByUs.add(el);
      }
    } else if (mutedByUs.has(el)) {
      el.muted = false;
      mutedByUs.delete(el);
    }
  }

  function applyToAllKnown(root) {
    sendFactor();
    collectMediaElements(root || document).forEach(applyToElement);
  }

  // Collects audio/video elements within `root` (root included), recursing into
  // open shadow roots. Called with a narrow root (a single added node) from the
  // mutation observer to keep re-scans cheap on dynamic pages.
  function collectMediaElements(root, out) {
    out = out || [];
    if (!root) return out;
    if (root instanceof HTMLMediaElement) {
      out.push(root);
      return out;
    }
    if (typeof root.querySelectorAll !== "function") return out;
    root.querySelectorAll("audio, video").forEach((el) => out.push(el));
    root.querySelectorAll("*").forEach((el) => {
      if (el.shadowRoot) collectMediaElements(el.shadowRoot, out);
    });
    return out;
  }

  // Auto-observe shadow roots created after this script runs, so media inside
  // web components (common on sites like YouTube) is still caught.
  const nativeAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (...args) {
    const root = nativeAttachShadow.apply(this, args);
    observe(root);
    setTimeout(() => applyToAllKnown(root), 0);
    return root;
  };

  const observers = [];
  function observe(root) {
    try {
      const mo = new MutationObserver((mutations) => {
        for (const m of mutations) {
          m.addedNodes.forEach((node) => {
            collectMediaElements(node).forEach(applyToElement);
          });
        }
      });
      mo.observe(root, { childList: true, subtree: true });
      observers.push(mo);
    } catch {
      /* root not observable (e.g. closed shadow root) */
    }
  }

  function onMediaEvent(evt) {
    const el = evt.target;
    if (el instanceof HTMLMediaElement) applyToElement(el);
  }
  // Note: deliberately not listening for "volumechange" here — that would
  // fight the page's own volume slider every time the user nudges it. The
  // rule only re-asserts itself on load, on new elements, and when it changes.
  document.addEventListener("play", onMediaEvent, true);
  document.addEventListener("loadeddata", onMediaEvent, true);

  async function refreshFromStorage() {
    try {
      const rules = await STORAGE.getRules();
      const rule = RULES.findBestRule(rules, host, path);
      effectiveVolume = rule ? RULES.clampVolume(rule.volume) : RULES.DEFAULT_VOLUME;
      effectiveMuted = rule ? Boolean(rule.muted) : false;
    } catch {
      effectiveVolume = RULES.DEFAULT_VOLUME;
      effectiveMuted = false;
    }
    applyToAllKnown(document);
  }

  STORAGE.onRulesChanged(() => {
    if (previewTimer) return; // a live preview is in control; storage echo will follow
    refreshFromStorage();
  });

  // Ephemeral live-preview while the popup slider is being dragged, before the
  // value is committed to storage.
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.target !== "VD_CONTENT") return;
    if (message.type === "VD_PREVIEW") {
      effectiveVolume = RULES.clampVolume(message.volume);
      effectiveMuted = Boolean(message.muted);
      applyToAllKnown(document);
      clearTimeout(previewTimer);
      previewTimer = setTimeout(() => {
        previewTimer = null;
        // Storage echoes during the preview were skipped; reconcile now so the
        // page always ends up matching what is actually saved.
        refreshFromStorage();
      }, 1500);
      sendResponse({ ok: true });
    } else if (message.type === "VD_GET_STATE") {
      sendResponse({ ok: true, host, path, volume: effectiveVolume, muted: effectiveMuted });
    }
    return true;
  });

  function handleLocationChange() {
    const t = RULES.parseTargetUrl(location.href);
    if (!t) return;
    if (t.host !== host || t.path !== path) {
      host = t.host;
      path = t.path;
      refreshFromStorage();
    }
  }
  const nativePushState = history.pushState;
  const nativeReplaceState = history.replaceState;
  history.pushState = function (...args) {
    const ret = nativePushState.apply(this, args);
    handleLocationChange();
    return ret;
  };
  history.replaceState = function (...args) {
    const ret = nativeReplaceState.apply(this, args);
    handleLocationChange();
    return ret;
  };
  window.addEventListener("popstate", handleLocationChange);

  observe(document);
  refreshFromStorage();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyToAllKnown(document));
  }
})();