// Runs in every page (and every frame). Finds <audio>/<video> elements and applies
// the matching domain/path volume rule via the native HTMLMediaElement.volume API
// (0-100%). Deliberately does not attempt to boost past 100% via the Web Audio
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

  // Some sites' own players (Reddit's included) keep their own volume state
  // and periodically write it back to the <video> element, silently undoing
  // whatever we just set. We don't want to permanently fight the user's own
  // manual adjustments via the native player controls, so instead of always
  // watching "volumechange", we only enforce our value for a short window
  // right after we apply it — long enough to win against a site's own
  // re-assertion, short enough to leave later, genuinely user-driven changes
  // alone. Capped retries guard against a site that fights on every frame.
  const ENFORCE_WINDOW_MS = 3000;
  const MAX_ENFORCE_RETRIES = 5;
  const enforcement = new WeakMap(); // element -> { volume, muted, until, retries }

  function applyToElement(el, { enforce = true } = {}) {
    if (!(el instanceof HTMLMediaElement)) return;
    const safeVolume = RULES.clampVolume(effectiveVolume);
    const targetVolume = safeVolume / 100;
    const targetMuted = Boolean(effectiveMuted) || safeVolume === 0;
    try {
      el.volume = targetVolume;
    } catch {
      /* some elements briefly throw while not yet attached to a media resource */
    }
    el.muted = targetMuted;
    if (enforce) {
      enforcement.set(el, { volume: targetVolume, muted: targetMuted, until: Date.now() + ENFORCE_WINDOW_MS, retries: 0 });
    }
  }

  function onVolumeChange(evt) {
    const el = evt.target;
    if (!(el instanceof HTMLMediaElement)) return;
    const entry = enforcement.get(el);
    if (!entry) return;
    if (Date.now() > entry.until || entry.retries >= MAX_ENFORCE_RETRIES) {
      enforcement.delete(el);
      return;
    }
    const driftedVolume = Math.abs(el.volume - entry.volume) > 0.01;
    const driftedMuted = el.muted !== entry.muted;
    if (!driftedVolume && !driftedMuted) return;
    // The site just overwrote our value — reassert it without resetting the
    // enforcement window's expiry, so this can't be extended indefinitely.
    el.volume = entry.volume;
    el.muted = entry.muted;
    entry.retries += 1;
  }
  document.addEventListener("volumechange", onVolumeChange, true);

  function applyToAllKnown(root) {
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
