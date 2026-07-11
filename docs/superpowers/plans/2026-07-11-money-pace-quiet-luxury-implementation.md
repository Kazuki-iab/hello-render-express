# Money Pace Quiet Luxury UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Money Paceの既存機能を維持したまま、残額とクイック入力を一体化したQuiet Luxury UIへ刷新する。

**Architecture:** Expressのサーバーサイドレンダリングと通常フォーム送信を維持する。`controllers/appController.js`は表示構造と既存データの整形、`public/style.css`はデザインシステムとレスポンシブ、`public/app.js`は操作に対する短いフィードバックだけを担当する。

**Tech Stack:** Node.js 20+, Express 5, HTML, CSS, Vanilla JavaScript

## Global Constraints

- `routes/index.js`のURL、HTTPメソッド、送信フィールドを変更しない。
- `models/store.js`のデータ構造と計算方法を変更しない。
- 新しい機能、API、DB、外部ライブラリを追加しない。
- 主な変更対象は`controllers/appController.js`、`public/style.css`、`public/app.js`に限定する。
- 支出、収入、固定費、予算、分析、削除の既存機能を維持する。
- `prefers-reduced-motion`を尊重する。

---

## File Map

- `controllers/appController.js`: Daily Balanceサーフェス、最近の支出、月次パルス、管理パネルのHTMLを生成する。
- `public/style.css`: Quiet Luxuryの色、余白、タイポグラフィ、非対称レイアウト、状態、レスポンシブを定義する。
- `public/app.js`: クイック入力、パネル、送信中、成功通知の操作フィードバックを制御する。
- `docs/superpowers/specs/2026-07-11-money-pace-quiet-luxury-design.md`: 合意済みデザイン要件。

### Task 1: Daily Balanceの表示構造

**Files:**
- Modify: `controllers/appController.js`

**Interfaces:**
- Consumes: `store.calculateDashboard()`, `store.yen()`, `data.remaining`, `data.dailyRemaining`, `data.projectedBalance`, `data.daysLeft`, `data.budgetUsed`
- Produces: `.balance-surface`, `.balance-primary`, `.quick-entry`, `.balance-context`, `#quickText`, `[data-focus-quick]`

- [ ] **Step 1: 現行HTMLに対する失敗確認を作る**

ローカルサーバー起動後、次を実行する。

```bash
curl -fsS http://127.0.0.1:3000/ | rg 'balance-surface|balance-primary|quick-entry|balance-context'
```

Expected: exit 1。新しい構造はまだ存在しない。

- [ ] **Step 2: ヒーローとクイック入力を一体化する**

`renderPage()`の`.home-stage`を、次の責務を持つ単一サーフェスへ置き換える。

```html
<section class="balance-surface" id="home">
  <div class="balance-primary">
    <span class="balance-period">今月</span>
    <p class="balance-label">今月あと使える金額</p>
    <h1>${heroAmount}</h1>
    <div class="balance-context">
      <span>今日使える目安 <strong>${hasExpense ? store.yen(data.dailyRemaining) : "-"}</strong></span>
      <span>残り${data.daysLeft}日</span>
    </div>
  </div>
  <div class="quick-entry">
    <p>クイック入力</p>
    <form method="post" action="/quick-expense" class="quick-form">
      <label class="sr-only" for="quickText">支出を1行で入力</label>
      <input id="quickText" name="quickText" placeholder="ラーメン 950" autocomplete="off" required>
      <button class="btn" type="submit">支出を追加</button>
    </form>
    <div class="quick-chips">
      <button type="button" data-example="ラーメン 950">ラーメン 950</button>
      <button type="button" data-example="電車 420">電車 420</button>
      <button type="button" data-example="Netflix 1490">Netflix 1490</button>
      <button type="button" data-example="カフェ 650">カフェ 650</button>
    </div>
  </div>
</section>
```

空状態では`h1`を「まだ支出はありません」とし、補助文で最初の入力を促す。通常支出フォームへの`data-focus-quick`導線と、クイック入力の`name="quickText"`、`action="/quick-expense"`は維持する。

- [ ] **Step 3: 重複するファーストビュー情報を削る**

`.today-card`と`.product-strip`を削除し、今日・今月・月末の重複表示をなくす。月末の見込みは`.balance-primary`内の短い1文に統合する。

- [ ] **Step 4: HTML構造を確認する**

```bash
node --check controllers/appController.js
curl -fsS http://127.0.0.1:3000/ | rg 'balance-surface|今月あと使える金額|クイック入力|今日使える目安'
curl -fsS http://127.0.0.1:3000/ | rg 'today-card|product-strip' && exit 1 || true
```

Expected: 構文確認はexit 0、新構造はすべて一致、旧構造は一致しない。

- [ ] **Step 5: コミットする**

```bash
git add controllers/appController.js
git commit -m "refactor: unify Money Pace first view"
```

### Task 2: 最近の支出と月次情報の再編集

**Files:**
- Modify: `controllers/appController.js`

**Interfaces:**
- Consumes: `renderRecentExpenses()`, `renderTrend()`, `renderMonthGauge()`, `data.expenses`, `data.monthlyExpenses`, `data.incomeTotal`, `data.expenseTotal`, `data.fixedTotal`
- Produces: `.activity-layout`, `.expense-feed`, `.month-pulse`, `.metric-list`

- [ ] **Step 1: 新しいセカンダリー構造が未実装であることを確認する**

```bash
curl -fsS http://127.0.0.1:3000/ | rg 'activity-layout|expense-feed|month-pulse|metric-list'
```

Expected: exit 1。

- [ ] **Step 2: 最近の支出をフィードへ変更する**

`renderRecentExpenses()`は最大5件、カテゴリマーク、メモ、相対日付、カテゴリ、右揃え金額を出力する。各行の外側カードを廃止し、`.expense-feed`内の区切り線で構成する。0件時は次を表示する。

```html
<div class="feed-empty">
  <strong>最初の支出を追加しましょう</strong>
  <p>支出を追加すると、ここに最近の支出が表示されます。</p>
  <button type="button" data-focus-quick>支出を追加</button>
</div>
```

- [ ] **Step 3: 月次情報を一つのパルスへ統合する**

独立した`.statement-card`、`.pulse-card`、`.month-card`を`.month-pulse`へまとめる。リング、月末の見込み、支出・収入・固定費の3行、支出推移を1つの意味単位として出力する。

```html
<aside class="month-pulse">
  <div class="month-pulse-head">${renderMonthGauge(data)}<p>${prediction}</p></div>
  <div class="metric-list">
    <div><span>支出</span><strong>${store.yen(data.expenseTotal)}</strong></div>
    <div><span>収入</span><strong>${store.yen(data.incomeTotal)}</strong></div>
    <div><span>固定費</span><strong>${store.yen(data.fixedTotal)}</strong></div>
  </div>
  <div class="trend-wrap">${renderTrend(data.monthlyExpenses)}</div>
</aside>
```

- [ ] **Step 4: 出力を確認する**

```bash
node --check controllers/appController.js
curl -fsS http://127.0.0.1:3000/ | rg 'activity-layout|expense-feed|month-pulse|metric-list|最近の支出|月末の見込み'
```

Expected: exit 0、すべて一致する。

- [ ] **Step 5: コミットする**

```bash
git add controllers/appController.js
git commit -m "refactor: compose monthly activity view"
```

### Task 3: Quiet Luxuryデザインシステム

**Files:**
- Modify: `public/style.css`

**Interfaces:**
- Consumes: Task 1と2が出力するクラス、既存`.menu-card`、`.menu-body`、`.btn`、`.ghost`、フォーム、テーブル
- Produces: 1440px、1024px、390pxで破綻しないレイアウトと状態表現

- [ ] **Step 1: CSS契約が未実装であることを確認する**

```bash
rg -n '^\.balance-surface|^\.balance-primary|^\.activity-layout|^\.month-pulse' public/style.css
```

Expected: exit 1。

- [ ] **Step 2: トークンと基礎スタイルを整理する**

`:root`を次の役割に整理する。

```css
:root {
  --canvas: #f4f5f7;
  --surface: #ffffff;
  --ink: #101828;
  --navy: #0b1220;
  --muted: #667085;
  --line: #e4e7ec;
  --accent: #12a873;
  --accent-soft: #eaf8f2;
  --danger: #b42318;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 24px;
  --ease: cubic-bezier(.22, 1, .36, 1);
}
```

背景のぼかしオーブと強いグラデーションを削除し、境界線主体の白いキャンバスへ変更する。すべての金額に`font-variant-numeric: tabular-nums`を適用する。

- [ ] **Step 3: Daily Balanceサーフェスを実装する**

デスクトップは`grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr)`。左側は墨色の残額領域、右側は同一サーフェス内の入力領域とする。主金額は最大96px、角丸は24px、影は1種類だけ使用する。クイック入力ボタンはネイビー、成功・フォーカスのみエメラルドを使用する。

- [ ] **Step 4: セカンダリー領域と管理領域を実装する**

`.activity-layout`を最近の支出優位の非対称2列にし、`.expense-feed`は区切り線中心、`.month-pulse`はリング・数値行・推移を一体化する。`.menu-card`は角丸14px、通常時は影なし、開いた時だけ薄い影を付ける。

- [ ] **Step 5: レスポンシブとアクセシビリティを実装する**

900px以下でセカンダリー領域を1列、720px以下でDaily Balanceを縦積み、390px以下でクイックフォームを縦積みにする。操作対象の最小高さを44pxにし、`:focus-visible`へ明瞭なアウトラインを付ける。

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: .01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .01ms !important;
  }
}
```

- [ ] **Step 6: CSS契約を確認する**

```bash
rg -n '^\.balance-surface|^\.balance-primary|^\.quick-entry|^\.activity-layout|^\.expense-feed|^\.month-pulse|prefers-reduced-motion' public/style.css
git diff --check
```

Expected: すべて一致し、`git diff --check`はexit 0。

- [ ] **Step 7: コミットする**

```bash
git add public/style.css
git commit -m "style: introduce Money Pace quiet luxury system"
```

### Task 4: 操作フィードバック

**Files:**
- Modify: `public/app.js`
- Modify: `controllers/appController.js`

**Interfaces:**
- Consumes: `[data-focus-quick]`, `[data-example]`, `.quick-entry`, `.message`, `.btn`, `.menu-card`
- Produces: `.is-primed`, `.is-submitting`, `.is-visible`, `role="status"`, `aria-busy`

- [ ] **Step 1: 状態属性が未実装であることを確認する**

```bash
curl -fsS http://127.0.0.1:3000/?message=test | rg 'role="status"'
```

Expected: exit 1。

- [ ] **Step 2: 成功メッセージを操作対象に近づける**

`renderPage(message)`で`.message`を`.quick-entry`内に置き、次の属性を付ける。

```html
<div class="message" role="status" aria-live="polite">${escapeHtml(message)}</div>
```

- [ ] **Step 3: JavaScriptの状態制御を整理する**

`public/app.js`で以下を実装する。

- `[data-focus-quick]`は`#quickText`へスクロールしてフォーカスする。
- `[data-example]`は値を反映し、`.quick-entry`へ400msだけ`.is-primed`を付ける。
- フォーム送信時は送信ボタンへ`.is-submitting`と`aria-busy="true"`を付け、ボタン幅を維持する。
- ページ読み込み後に`.message`へ`.is-visible`を付ける。
- `prefers-reduced-motion`の場合はスムーズスクロールを使わない。

- [ ] **Step 4: 構文と状態契約を確認する**

```bash
node --check public/app.js
node --check controllers/appController.js
rg -n 'is-primed|is-submitting|is-visible|prefers-reduced-motion' public/app.js public/style.css
curl -fsS 'http://127.0.0.1:3000/?message=test' | rg 'role="status"|aria-live="polite"'
```

Expected: すべてexit 0。

- [ ] **Step 5: コミットする**

```bash
git add controllers/appController.js public/app.js public/style.css
git commit -m "feat: refine Money Pace interaction feedback"
```

### Task 5: 機能回帰と表示検証

**Files:**
- Verify: `controllers/appController.js`
- Verify: `public/style.css`
- Verify: `public/app.js`
- Verify: `routes/index.js`
- Verify: `models/store.js`

**Interfaces:**
- Consumes: 既存の全POSTルートと新UI
- Produces: ローカル検証済みのデプロイ候補

- [ ] **Step 1: 静的検証を実行する**

```bash
node --check controllers/appController.js
node --check public/app.js
git diff --check
```

Expected: すべてexit 0。

- [ ] **Step 2: サーバーを起動する**

```bash
npm start
```

Expected: `Server started on 3000`。

- [ ] **Step 3: 既存機能をHTTPで確認する**

```bash
curl -fsS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/quick-expense --data-urlencode 'quickText=ラーメン 950'
curl -fsS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/expenses -d 'amount=420&category=交通費&memo=電車&date=2026-07-11&paymentMethod=現金'
curl -fsS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/incomes -d 'amount=50000&source=バイト代&memo=7月分&date=2026-07-11'
curl -fsS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/fixed-costs -d 'name=Netflix&amount=1490&category=サブスク&payDay=15'
curl -fsS -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/budget -d 'budget=80000'
```

Expected: 各コマンドは`302`。ホームHTMLに`ラーメン`、`電車`、`50,000円`、`1,490円`が表示される。

- [ ] **Step 4: ブラウザで3画面幅を検証する**

1440x1000、1024x768、390x844でスクリーンショットを取得し、次を目視確認する。

- 主金額が折り返さない。
- クイック入力がファーストビューに収まる。
- 最近の支出と月次情報が重ならない。
- 390pxで横スクロールが本文全体に発生しない。
- フォーカス表示、パネル開閉、送信中表示が見える。

- [ ] **Step 5: 最終差分を確認する**

```bash
git status --short
git diff --stat HEAD~4..HEAD
git diff HEAD~4..HEAD -- routes/index.js models/store.js server.js package.json
```

Expected: 対象UIファイルと設計文書だけが変更され、ルート、データ層、起動設定に差分がない。

- [ ] **Step 6: デプロイ用コミットを確認する**

```bash
git log -5 --oneline
git status --short
```

Expected: 作業ツリーがクリーンで、Task 1〜4のコミットが存在する。

### Task 6: GitHub PushとRender確認

**Files:**
- No file changes

**Interfaces:**
- Consumes: ローカル検証済み`main`
- Produces: GitHubとRenderに反映された公開版

- [ ] **Step 1: GitHubへpushする**

```bash
git push origin main
```

Expected: `main -> main`。

- [ ] **Step 2: Render反映を確認する**

```bash
curl -fsS https://hello-render-express-cz16.onrender.com/ | rg 'balance-surface|今月あと使える金額|クイック入力|最近の支出'
curl -fsS https://hello-render-express-cz16.onrender.com/style.css | rg 'balance-surface|month-pulse|prefers-reduced-motion'
```

Expected: 新HTMLとCSSの識別子が公開URLから取得できる。

- [ ] **Step 3: 公開画面を最終確認する**

公開URLを390px相当とデスクトップ幅で開き、ファーストビュー、クイック入力、管理パネルが操作できることを確認する。
