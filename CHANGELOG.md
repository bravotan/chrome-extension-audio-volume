# Changelog

## 1.0.3

- Rules now apply to audio/video inside embedded cross-origin iframes (for
  example a YouTube player embedded on another site). Frames use the rule
  for the page the tab is showing first, and fall back to the rule for
  their own domain.
- When the tab's URL changes (including single-page-app navigation), every
  frame re-applies the matching rule.

## 1.0.2

- The rule is now applied as a multiplier on top of the page's own volume
  instead of overwriting it. Sites with their own volume slider or loudness
  normalization (Reddit, Niconico, …) no longer undo the rule or end up
  louder than expected.
- Mute only unmutes elements the extension muted itself, so a mute set with
  the site's own controls is kept.
- Rules are saved to local storage first and mirrored to sync, so a failed
  sync write no longer leaves stale rules behind.
- Popup: opens in "This path only" when a path rule applies to the current
  page, and saves run one at a time so overlapping edits can't create
  duplicate rules.
- Requires Chrome 111 or later.

## 1.0.1

- Minor fixes.

## 1.0.0

- Initial release.
- Set 0–100% volume and mute per domain (including `*.` wildcard
  subdomains) or per page path.
- Popup for the current page, and a settings page to edit, delete, import
  and export rules as JSON.
- Rules sync across devices via Chrome sync.
- English and Japanese UI.
