# Privacy Policy — Volume Reducer

_Last updated: 2026-09-28_

Volume Reducer ("the extension") does not collect, transmit, or sell any user
data.

## What the extension stores

The extension stores only the volume/mute preferences you configure for
specific domains or page paths (e.g. "youtube.com → 60%"). This data is
saved using Chrome's built-in `chrome.storage.sync` API (falling back to
`chrome.storage.local` if sync is unavailable), which means:

- It stays inside your own Google account's Chrome sync, the same mechanism
  Chrome uses for your bookmarks and settings.
- It is never sent to any server operated by the developer of this
  extension, or to any third party.
- The extension makes no network requests of its own — it contains no
  analytics, tracking, or telemetry code.

## What the extension can access

To apply your volume settings, the extension's content script runs on the
pages you visit and reads:

- The page's URL (domain and path), to determine which of your saved rules
  applies.
- `<audio>`/`<video>` elements on the page, to set their `volume` and
  `muted` properties.

It does not read, log, or transmit page content, form data, browsing
history, or any other information from the pages you visit.

## Permissions used

| Permission | Why it's needed |
| --- | --- |
| `storage` | Save your per-domain/per-page volume rules. |
| `tabs` | Read the active tab's URL so the popup can show/apply settings for the site you're currently on, and so the toolbar badge can reflect it. |
| Host permissions (`http://*/*`, `https://*/*`) | Let the content script run on any site you choose to set a volume rule for. |

## Changes to this policy

If this policy changes, the updated version will be posted at this same
URL.

## Contact

For questions about this extension, please open an issue on the project's
GitHub repository.

---

# プライバシーポリシー — 音量絞り器 (Volume Reducer)

_最終更新日: 2026-09-28_

音量絞り器(以下「本拡張機能」)は、ユーザーのデータを収集・送信・販売することは一切ありません。

## 本拡張機能が保存する情報

本拡張機能が保存するのは、ユーザーがドメインまたはページのパスごとに設定した音量・ミュートの設定のみです(例:「youtube.com → 60%」)。このデータはChrome標準の`chrome.storage.sync` API(同期が利用できない場合は`chrome.storage.local`)を使って保存されます。つまり:

- ブックマークや設定と同様、ユーザー自身のGoogleアカウントのChrome同期内に保存されます。
- 開発者が運営するサーバーや第三者に送信されることは一切ありません。
- 本拡張機能自体が外部への通信を行うことはありません(アナリティクスやトラッキング等のコードは含まれていません)。

## 本拡張機能がアクセスする情報

音量設定を適用するため、本拡張機能のコンテンツスクリプトは閲覧中のページ上で以下を読み取ります:

- ページのURL(ドメイン・パス)— どの保存済みルールを適用するか判定するため。
- ページ内の`<audio>`/`<video>`要素 — `volume`・`muted`プロパティを設定するため。

ページの内容、フォームの入力内容、閲覧履歴などの情報を読み取ったり、記録したり、送信したりすることはありません。

## 使用している権限

| 権限 | 必要な理由 |
| --- | --- |
| `storage` | ドメイン/パスごとの音量ルールを保存するため |
| `tabs` | 現在のタブのURLを読み取り、ポップアップでそのサイト向けの設定を表示・適用し、ツールバーのバッジに反映するため |
| ホスト権限 (`http://*/*`, `https://*/*`) | ユーザーが音量ルールを設定した任意のサイトでコンテンツスクリプトを実行できるようにするため |

## 本ポリシーの変更について

本ポリシーを変更した場合は、同じURLで更新版を公開します。

## お問い合わせ

本拡張機能に関するご質問は、プロジェクトのGitHubリポジトリのIssueにてお願いします。
