# Privacy Policy — Volume Reducer

_Last updated: 2026-10-25_

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

To apply your volume settings, two content scripts run on the pages you
visit:

- An isolated-world script that reads the page's URL (domain and path) to
  determine which of your saved rules applies, and sets `muted` on
  `<audio>`/`<video>` elements accordingly.
- A main-world script (`src/content/main-world.js`) that wraps the
  standard `HTMLMediaElement.volume` property so your rule is applied as a
  multiplier on top of whatever volume the page itself sets — this way a
  site's own volume slider or loudness normalization keeps working, and
  your rule just scales it, rather than fighting it. This script only
  reads and adjusts that one property; it does not read page content, form
  data, or any other information.

Neither script reads, logs, or transmits page content, form data, browsing
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

_最終更新日: 2026-10-25_

音量絞り器(以下「本拡張機能」)は、ユーザーのデータを収集・送信・販売することは一切ありません。

## 本拡張機能が保存する情報

本拡張機能が保存するのは、ユーザーがドメインまたはページのパスごとに設定した音量・ミュートの設定のみです(例:「youtube.com → 60%」)。このデータはChrome標準の`chrome.storage.sync` API(同期が利用できない場合は`chrome.storage.local`)を使って保存されます。つまり:

- ブックマークや設定と同様、ユーザー自身のGoogleアカウントのChrome同期内に保存されます。
- 開発者が運営するサーバーや第三者に送信されることは一切ありません。
- 本拡張機能自体が外部への通信を行うことはありません(アナリティクスやトラッキング等のコードは含まれていません)。

## 本拡張機能がアクセスする情報

音量設定を適用するため、閲覧中のページ上で2つのコンテンツスクリプトが動作します:

- 分離環境(isolated world)で動作するスクリプト — ページのURL(ドメイン・パス)を読み取り、どの保存済みルールを適用するか判定し、`<audio>`/`<video>`要素の`muted`プロパティを設定します。
- ページ本体の実行環境(main world)で動作するスクリプト(`src/content/main-world.js`)— 標準の`HTMLMediaElement.volume`プロパティをラップし、ページ自身が設定する音量に対してルールを倍率として適用します。これにより、サイト自体の音量スライダーやラウドネス正規化を壊さずに、その上から比率で音量を調整できます。このスクリプトが読み書きするのはこのプロパティのみで、ページの内容やフォームの入力内容などを読み取ることはありません。

いずれのスクリプトも、ページの内容、フォームの入力内容、閲覧履歴などの情報を読み取ったり、記録したり、送信したりすることはありません。

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
