# Chrome Web Store listing draft — Volume Reducer

Copy/paste these into the Developer Dashboard (chrome.google.com/webstore/devconsole).
Not part of the extension package itself.

## Basics

- **Name**: Volume Reducer (English) / 音量絞り器 (Japanese — pulled automatically
  from `_locales` once you set "English" as the default language and Chrome
  detects the viewer's locale, or you can list it as a separate localized
  listing).
- **Category**: Tools (or Productivity — both fit)
- **Language**: English (default), with Japanese `_locales` already bundled
- **Version**: 1.0.2

**Privacy Policy URL**: `main` now carries the same content as the feature
branch, so use the stable URL:
`https://github.com/bravotan/chrome-extension-audio-volume/blob/main/PRIVACY.md`

## Short description (≤132 characters)

EN:
```
Set a custom volume (0-100%) for specific websites. Rules apply automatically and sync across your devices.
```
(109 chars)

JA:
```
サイトごとに音量(0〜100%)を設定できます。ルールは自動で適用され、デバイス間で同期されます。
```

## Detailed description

EN:
```
Volume Reducer lets you set a quieter, custom volume for individual
websites — something Chrome itself doesn't offer per site.

FEATURES
• Set 0–100% volume for a domain (youtube.com) or a wildcard subdomain
  (*.spotify.com)
• Or scope a rule to a single page path only, e.g. example.com/ads
• Works with the site's own volume instead of against it — your rule is
  applied as a multiplier on top of whatever volume the page itself sets,
  so its slider and loudness normalization keep working
• Mute a site entirely
• Rules apply automatically every time you visit — set it once and forget it
• Manage everything from one settings page: edit, delete, import/export as
  JSON for backup
• Settings save locally and sync across your signed-in devices via your
  Google account when sync is available
• English and Japanese interface, switchable from the popup or settings page

HOW IT WORKS
Click the toolbar icon on any page to see and adjust its volume. Choose
whether the rule applies to the whole domain or just the current page path,
move the slider, and it's saved instantly — no page reload needed for most
sites. Because the rule scales the page's own volume rather than
overriding it, sites that manage their own volume state (custom players,
loudness normalization) keep working the way they're supposed to.

PRIVACY
Volume Reducer collects no data and makes no network requests of its own.
Your volume rules are saved locally and synced only through your own
Google account via Chrome's built-in sync. Full privacy policy:
https://github.com/bravotan/chrome-extension-audio-volume/blob/main/PRIVACY.md
```

JA:
```
「音量絞り器」は、サイトごとに音量を下げて設定できる拡張機能です。Chrome自体には
サイト別の音量設定機能がありません。

主な機能
• ドメイン単位(youtube.com)やワイルドカードのサブドメイン(*.spotify.com)ごとに
  音量(0〜100%)を設定
• ページのパス単位(例: example.com/ads)だけに適用することも可能
• サイト自身の音量設定と戦わず、その上から比率で調整 — ページ自身が設定する音量に
  対してルールを倍率として適用するので、サイト独自の音量スライダーやラウドネス正規化を
  壊しません
• サイトを完全にミュート
• 一度設定すれば、次回訪問時から自動で適用
• 設定ページから一覧管理・編集・削除・JSONでのインポート/エクスポートが可能
• 設定はローカルに保存され、同期が利用できる場合はGoogleアカウント経由で
  サインイン済みデバイス間に自動同期
• 日本語・英語のUI切り替えに対応

使い方
好きなページでツールバーのアイコンをクリックすると、そのページの音量を確認・調整できます。
ドメイン全体に適用するか、現在のパスのみに適用するかを選び、スライダーを動かすだけで
即座に保存されます。ルールはページ自身の音量を上書きするのではなく比率で調整するため、
独自の音量管理を行うプレイヤー(カスタムプレイヤーやラウドネス正規化)でも本来の挙動が
保たれます。

プライバシーについて
「音量絞り器」はユーザーデータを収集せず、外部通信も一切行いません。設定はローカルに
保存され、お使いのGoogleアカウント経由のChrome同期のみを通じて同期されます。
プライバシーポリシー全文:
https://github.com/bravotan/chrome-extension-audio-volume/blob/main/PRIVACY.md
```

## Permission justifications (Privacy practices tab)

Chrome Web Store review requires a short justification for each requested
permission. Suggested text:

- **storage** — "Used to save the user's per-domain and per-page volume/mute
  preferences so they can be re-applied automatically on future visits."
- **tabs** — "Used to read the active tab's URL so the popup can display and
  apply the volume rule for the site the user is currently on, and to update
  the toolbar badge with the current site's volume."
- **Host permissions (http://\*/\*, https://\*/\*)** — "The set of sites a
  user might set a volume rule for isn't known in advance, so two content
  scripts need to be able to run on any site. One reads the page's URL to
  determine which rule applies. The other runs in the page's own JavaScript
  world (MAIN) and wraps the standard `HTMLMediaElement.volume` property so
  the rule is applied as a multiplier on top of whatever volume the page
  itself sets — this lets a site's own volume slider or loudness
  normalization keep working, instead of being overridden. Neither script
  reads or transmits anything beyond the URL and that one audio/video
  property."
- **Are you using remote code?** — No. All code ships in the package; no
  `eval`, remote scripts, or dynamically fetched code.
- **Data usage disclosure** — Select "This item does not collect or use
  user data" (the extension makes no network requests and stores everything
  locally/synced via the user's own browser).

## Screenshots

Generated at `1280x800` (options page, two tabs) and `640x400` (popup) in
your session's scratchpad — download them from the chat and upload directly;
Chrome Web Store accepts either size per screenshot, mixed is fine.

## Package

Upload the ZIP built from this repo's `manifest.json`, `icons/`,
`_locales/`, and `src/` (no `README.md`, `PRIVACY.md`, `STORE_LISTING.md`,
or `.git` — those aren't part of the runtime extension).
