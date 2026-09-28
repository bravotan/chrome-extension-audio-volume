// Runs in every page (and every frame). Finds <audio>/<video> elements and drives
// their volume, boosting past 100% via a shared AudioContext + GainNode when needed.
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

  let sharedCtx = null;
  const registry = new WeakMap(); // element -> { source, gainNode, failed }

  // IMPORTANT: once an element is routed through createMediaElementSource(), that
  // routing can never be undone — the element can no longer play directly to
  // speakers, only through the (possibly suspended) AudioContext graph. Wiring an
  // element up before we're confident audio will actually flow permanently
  // silences it, with no way back short of a page reload. So we only ever create
  // that routing once we know a) the user has interacted with the page (needed
  // for the context to run at all under the autoplay policy) and b) the element
  // isn't DRM-protected (Chrome silently blackouts Web-Audio-routed EME content,
  // without throwing, which would otherwise hit the same irreversible trap).
  let gestureSeen = false;

  function isProtectedMedia(el) {
    return Boolean(el.mediaKeys);
  }

  function onGesture() {
    if (sharedCtx && sharedCtx.state === "suspended") {
      sharedCtx.resume().catch(() => {});
    }
    if (!gestureSeen) {
      gestureSeen = true;
      // Retroactively wire up any elements that were capped at 100% while we
      // were waiting for permission to actually produce sound.
      applyToAllKnown(document);
    }
  }
  ["click", "keydown", "touchstart", "pointerdown"].forEach((evt) =>
    document.addEventListener(evt, onGesture, { capture: true, passive: true })
  );

  function getSharedContext() {
    if (!sharedCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      sharedCtx = new AudioCtx();
      sharedCtx.resume().catch(() => {});
      // Belt-and-suspenders: in a cross-origin iframe the gesture that unlocks
      // audio may land in a different frame than this one, so our own
      // click/keydown listeners never fire. Keep quietly retrying resume()
      // rather than staying stuck suspended forever.
      const retry = setInterval(() => {
        if (!sharedCtx || sharedCtx.state === "running") {
          clearInterval(retry);
          return;
        }
        sharedCtx.resume().catch(() => {});
      }, 1000);
    }
    return sharedCtx;
  }

  function applyToElement(el) {
    if (!(el instanceof HTMLMediaElement)) return;

    const safeVolume = RULES.clampVolume(effectiveVolume);
    const baseVol = Math.min(1, safeVolume / 100);
    const boostGain = Math.max(1, safeVolume / 100);

    try {
      el.volume = baseVol;
    } catch {
      /* some elements briefly throw while not yet attached to a media resource */
    }
    el.muted = Boolean(effectiveMuted) || safeVolume === 0;

    let entry = registry.get(el);
    const canBoost = boostGain > 1.0001 && gestureSeen && !isProtectedMedia(el);

    if (canBoost) {
      if (!entry) {
        entry = createRoutingEntry(el);
      }
      if (entry && entry.gainNode) {
        entry.gainNode.gain.value = boostGain;
      }
    } else if (entry && entry.gainNode) {
      entry.gainNode.gain.value = 1;
    }
  }

  function createRoutingEntry(el) {
    let entry;
    try {
      const ctx = getSharedContext();
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      source.connect(gainNode).connect(ctx.destination);
      entry = { source, gainNode, failed: false };
    } catch (err) {
      // The element was already connected elsewhere, or some other one-off
      // failure. Volume stays capped at 100% for it.
      entry = { source: null, gainNode: null, failed: true };
    }
    registry.set(el, entry);
    return entry;
  }

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
