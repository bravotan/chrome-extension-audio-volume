// Runs in the page's own JavaScript world (manifest "world": "MAIN"), at document_start.
//
// Problem it solves: if the extension simply assigns el.volume = rule%, it
// overwrites whatever the site's own player set (its slider, its loudness
// normalisation), and the player then overwrites us back. Sites like Niconico
// end up louder than the user's slider says.
//
// Instead we wrap the volume property: the page keeps reading and writing "its"
// volume, and the value actually sent to the media element is
//   pageVolume * factor
// where factor (0..1) comes from the extension's rule for the site.
//
// The isolated-world content script talks to this file through two DOM events:
//   "__vd_factor" on document  (detail: factor as a string, e.g. "0.3")
//   "__vd_adopt"  on a media element (start managing it / re-apply the factor)
(function () {
  if (window.__vdMainWorldLoaded) return;
  window.__vdMainWorldLoaded = true;

  const desc = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, "volume");
  if (!desc || !desc.get || !desc.set) return;
  const nativeGet = desc.get;
  const nativeSet = desc.set;

  const pageVolume = new WeakMap(); // element -> volume the page believes it has (0..1)
  const tracked = new Set(); // WeakRef<HTMLMediaElement>
  let factor = 1;

  function actualFor(v) {
    return Math.min(1, Math.max(0, v * factor));
  }

  // Start managing an element. Invariant: for a tracked element,
  // real volume === pageVolume * factor. An untracked element has never been
  // scaled, so its real volume is still the page's volume.
  function track(el) {
    if (pageVolume.has(el)) return;
    pageVolume.set(el, nativeGet.call(el));
    tracked.add(new WeakRef(el));
  }

  function reapply(el) {
    try {
      nativeSet.call(el, actualFor(pageVolume.get(el)));
    } catch {
      /* element not ready yet */
    }
  }

  Object.defineProperty(HTMLMediaElement.prototype, "volume", {
    configurable: true,
    enumerable: desc.enumerable,
    get() {
      return pageVolume.has(this) ? pageVolume.get(this) : nativeGet.call(this);
    },
    set(v) {
      const n = Number(v);
      // Out-of-range / NaN: let the browser raise its usual IndexSizeError.
      if (!(n >= 0 && n <= 1)) return nativeSet.call(this, v);
      track(this);
      pageVolume.set(this, n);
      nativeSet.call(this, actualFor(n));
    },
  });

  function reapplyAll() {
    for (const ref of tracked) {
      const el = ref.deref();
      if (!el) {
        tracked.delete(ref);
        continue;
      }
      reapply(el);
    }
  }

  document.addEventListener("__vd_factor", (e) => {
    const f = Number(e.detail);
    if (Number.isNaN(f)) return;
    factor = Math.min(1, Math.max(0, f));
    reapplyAll();
  });

  window.addEventListener(
    "__vd_adopt",
    (e) => {
      const el = typeof e.composedPath === "function" ? e.composedPath()[0] : e.target;
      if (!(el instanceof HTMLMediaElement)) return;
      track(el);
      reapply(el);
    },
    true
  );

  // Elements we haven't been told about yet (e.g. created by the parser and never
  // touched by the page's scripts) get picked up when they start playing.
  function adoptFromEvent(e) {
    const el = e.target;
    if (el instanceof HTMLMediaElement) {
      track(el);
      reapply(el);
    }
  }
  document.addEventListener("play", adoptFromEvent, true);
  document.addEventListener("loadeddata", adoptFromEvent, true);
})();