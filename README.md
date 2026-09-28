# Volume Reducer

A Chrome extension (Manifest V3) that lets you lower audio volume — 0% to
100% — per domain or per page path. Settings are saved with
`chrome.storage.sync` so they follow you across signed-in devices, and apply
automatically every time you visit a matching page.

This is an original, from-scratch implementation (not a fork or port of any
existing extension).

## How it works

- Volume is applied via the native `HTMLMediaElement.volume` / `.muted` APIs
  only — no Web Audio API routing. An earlier version boosted volume past
  100% with a `GainNode`, but that routing is irreversible once made (an
  element can never go back to playing directly to speakers) and silently,
  permanently mutes the page if the browser's autoplay policy hasn't yet
  allowed audio to play, or if the media is DRM-protected. Sticking to native
  volume avoids that failure mode entirely, at the cost of not being able to
  boost past 100%.
- Rules are matched by domain (exact or `*.wildcard`) and, optionally, a page
  path. When both a domain-level and a path-level rule could apply, the more
  specific (path-level) rule wins.
- New `<audio>`/`<video>` elements — including ones added dynamically (SPA
  navigation, infinite scroll, elements inside open shadow DOM) — are picked
  up automatically via a `MutationObserver` and `attachShadow` hook.

## Project structure

```
manifest.json
icons/                  Generated extension icons
_locales/en, _locales/ja  Chrome Web Store listing strings
src/
  lib/
    rules.js            Domain/path rule matching (shared everywhere)
    storage.js          chrome.storage read/write/import/export helpers
    i18n.js              UI string dictionary (English / Japanese)
  background/
    background.js       Service worker: toolbar badge, install defaults
  content/
    content.js           Injected into every page: applies volume rules
  popup/
    popup.html/css/js    Toolbar popup: quick per-page volume control
  options/
    options.html/css/js  Full settings page: manage all saved domains
```

## Loading the extension locally

1. Open `chrome://extensions` in Chrome (or any Chromium-based browser, e.g.
   Brave, Edge).
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked** and select this project's root folder.
4. Pin the extension, open any page with audio/video, and use the toolbar
   popup to adjust its volume.

## Features

- Volume control, 0%–100%, with quick presets (25/50/75/100%) and a
  per-site mute toggle.
- Apply a rule to an entire domain (with `*.` wildcard support for
  subdomains) or to a single page path.
- Full settings page with a sortable domain table, inline edit/delete, and a
  "Delete all" action.
- Import/export your rules as JSON for backup or sharing between machines.
- English / Japanese UI language switch.
- Settings sync automatically via `chrome.storage.sync` (falls back to local
  storage if sync is unavailable).
