# Money Pace Human-Crafted Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Money Paceをカード依存のダッシュボードから、数字・台帳・整列で品質を感じる金融Webアプリへ再設計する。

**Architecture:** Express SSRと既存POSTルート、モデル、ホーム・管理のhash遷移を維持する。`appController.js`は新しい表示構造と文言を出力し、`style.css`はホームの金融サマリーと管理ワークスペースを再構成する。`app.js`は既存ナビゲーションと通知挙動を維持する。

**Tech Stack:** Node.js 20+, Express 5, HTML, CSS, Vanilla JavaScript

## Global Constraints

- 既存POST URL、フォーム`name`、データ構造、計算処理を変更しない。
- 外部UIライブラリ、グラフライブラリ、フォント依存を追加しない。
- 操作領域は44px以上を維持する。
- 390px、768px、1280px以上で横溢れを出さない。
- JavaScript無効時のホーム・管理内容への到達性を維持する。

---

### Task 1: Home Information Composition

**Files:**
- Modify: `controllers/appController.js`
- Test: `test/app.test.js`

**Interfaces:**
- Consumes: `store.calculateDashboard()`の既存返却値
- Produces: `.balance-stage`、`.quick-entry`、`.activity-layout`の新しい表示構造

- [ ] **Step 1: Extend the HTML contract test**

`test/app.test.js`で、ホームが`.balance-overview`、`.pace-strip`、`.quick-command`、`.ledger-layout`を出力することを検証する。

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `npm test`
Expected: 新しいホーム識別子が存在しないためFAIL。

- [ ] **Step 3: Recompose the home markup**

`renderPage()`で、残額・今日の目安・月末見込み・予算進捗を左の概要面へ、クイック入力を右のコマンド面へ置く。最近の支出と月次指標を台帳レイアウトに再配置し、既存フォームactionとdata属性は維持する。

- [ ] **Step 4: Verify GREEN**

Run: `npm test && node --check controllers/appController.js`
Expected: 全テストPASS、構文エラーなし。

### Task 2: Human-Crafted Visual System

**Files:**
- Modify: `public/style.css`

**Interfaces:**
- Consumes: Task 1の`.balance-overview`、`.pace-strip`、`.quick-command`、`.ledger-layout`
- Produces: 罫線中心のホーム、台帳、コンパクトな管理画面、レスポンシブ状態

- [ ] **Step 1: Confirm old visual patterns exist**

Run: `rg 'border-radius: 18px|box-shadow: var\(--shadow\)|min-height: min\(650px' public/style.css`
Expected: 現行の大きなカード表現が検出される。

- [ ] **Step 2: Replace the visual system**

白、冷たいグレー、インク色、エメラルドに限定し、基本角丸を8〜12pxにする。ホームは大きなカードではなく罫線で区切った1枚のキャンバスにし、最近の支出は台帳行、月次指標はコンパクトな右レールにする。管理タイトル、サイドナビ、フォーム、テーブルの密度を揃える。

- [ ] **Step 3: Add focused motion and accessibility states**

数字、ビュー、入力フォーカス、ボタン押下だけに140〜220msの反応を付ける。`focus-visible`と`prefers-reduced-motion`を維持する。

- [ ] **Step 4: Verify CSS contract**

Run: `rg 'balance-overview|quick-command|ledger-layout|prefers-reduced-motion|max-width: 390px' public/style.css && git diff --check`
Expected: 必須識別子とレスポンシブ規則が存在し、空白エラーなし。

### Task 3: Responsive And Interaction QA

**Files:**
- Verify: `controllers/appController.js`
- Verify: `public/app.js`
- Verify: `public/style.css`
- Test: `test/app.test.js`

**Interfaces:**
- Consumes: 完成したホーム、管理画面、既存フォームとhash遷移
- Produces: 検証済みの公開候補

- [ ] **Step 1: Run regression tests**

Run: `npm test && node --check server.js && node --check routes/index.js && node --check controllers/appController.js && node --check public/app.js`
Expected: 全テストPASS、構文エラーなし。

- [ ] **Step 2: Verify browser interactions**

実ブラウザでホーム、管理、5つの管理パネル、ブラウザの戻る、成功通知、エラー通知を確認する。

- [ ] **Step 3: Verify responsive layouts**

1280px以上、768px、390pxでスクリーンショットを確認し、`scrollWidth === clientWidth`、固定ナビが操作を隠さないこと、文字が切れないことを確認する。

- [ ] **Step 4: Request review and fix findings**

第三者レビューでCriticalとImportantを修正し、`npm test`とブラウザ確認を再実行する。

### Task 4: Publish And Verify

**Files:**
- Publish: GitHub `main`
- Verify: Render公開URL

**Interfaces:**
- Consumes: Task 3の検証済み差分
- Produces: GitHub commitとRender公開版

- [ ] **Step 1: Commit and push**

Run: `git add controllers/appController.js public/style.css test/app.test.js docs/superpowers/specs/2026-07-14-money-pace-human-crafted-redesign-design.md docs/superpowers/plans/2026-07-14-money-pace-human-crafted-redesign-implementation.md`

Run: `git commit -m "Refine Money Pace visual system"`

Run: `git push origin main`
Expected: GitHub `main`に新コミットが反映される。

- [ ] **Step 2: Wait for Render**

公開HTMLとCSSに新しい識別子が現れるまで自動デプロイを監視する。

- [ ] **Step 3: Verify production**

公開URLでデスクトップと390pxのホーム・管理遷移、横溢れ、HTTP 200を確認する。
