# Money Pace App Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ホームと管理をアプリ内遷移で分離し、Money Paceを公開製品水準の金融アプリUIへ再構成する。

**Architecture:** ExpressのSSRと既存POSTルートを維持し、`appController.js`が2ビューと管理パネルを出力する。`app.js`がhashベースのビュー・パネル状態を管理し、`style.css`がホームと管理の異なるレイアウトを提供する。

**Tech Stack:** Node.js 20+, Express 5, HTML, CSS, Vanilla JavaScript

## Global Constraints

- 既存POST URL、フォームname、データ構造、計算処理を変更しない。
- 新しいライブラリを追加しない。
- 390px、768px、1280px以上で横溢れを出さない。
- すべての操作対象を44px以上にする。

---

### Task 1: Two-view HTML contract

**Files:**
- Modify: `controllers/appController.js`
- Modify: `public/index.html`

**Interfaces:**
- Produces: `[data-view="home"]`, `[data-view="manage"]`, `[data-route]`, `[data-manage-target]`, `[data-manage-panel]`

- [ ] RED: `rg 'data-view="manage"|data-route="manage"' controllers/appController.js`が失敗することを確認する。
- [ ] GREEN: ヘッダー、ホームビュー、管理ビュー、管理ナビを出力する。
- [ ] VERIFY: Node構文確認とHTML識別子の存在を確認する。

### Task 2: View and panel navigation

**Files:**
- Modify: `public/app.js`

**Interfaces:**
- Consumes: Task 1のdata属性
- Produces: `setRoute(route, options)`, `setManagePanel(target)`, History API連携

- [ ] RED: `rg 'function setRoute|function setManagePanel' public/app.js`が失敗することを確認する。
- [ ] GREEN: hash、戻る操作、フォーカス、管理パネル切り替えを実装する。
- [ ] VERIFY: JavaScript構文確認とdata属性契約を確認する。

### Task 3: Product-level visual system

**Files:**
- Modify: `public/style.css`

**Interfaces:**
- Consumes: Task 1のビュー、管理シェル、タブ、パネル
- Produces: 非対称ホーム、管理ワークスペース、モバイル下部ナビ、遷移状態

- [ ] RED: `rg '^\.view-shell|^\.manage-workspace|^\.mobile-nav' public/style.css`が失敗することを確認する。
- [ ] GREEN: 新しいレイアウト、タイポグラフィ、フォーム、状態、レスポンシブを実装する。
- [ ] VERIFY: 必須クラス、4ブレークポイント、reduced-motion、44px操作領域を確認する。

### Task 4: Regression and visual QA

**Files:**
- Verify: `controllers/appController.js`
- Verify: `public/app.js`
- Verify: `public/style.css`
- Modify: `package.json`
- Create: `test/app.test.js`

**Interfaces:**
- Consumes: 全UIと既存controller/store contract
- Produces: 公開可能な検証済み差分

- [ ] Nodeで空状態、登録後、エラー、全フォーム、削除を検証する。
- [ ] ブラウザでホーム→管理→各管理パネル→ホームを確認する。
- [ ] 390pxとデスクトップ幅でスクリーンショット、横溢れ、フォーカスを確認する。
- [ ] 第三者レビューのCriticalとImportantを修正する。
- [ ] GitHubへpushし、Render公開版を確認する。
