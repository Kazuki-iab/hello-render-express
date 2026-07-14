# Money Pace Four-View Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Money Paceをホーム、LINE風入力、カレンダー履歴、管理の四画面へ再構成する。

**Architecture:** ExpressのSSRと既存POSTルートを維持し、`appController.js`が四つのビューを描画する。`app.js`はhashベースの画面遷移とカレンダーの日付選択だけを担当し、`style.css`で各画面に適した密度とレスポンシブ表示を提供する。

**Tech Stack:** Node.js 20+, Express 5, HTML, CSS, Vanilla JavaScript, Node Test Runner

## Global Constraints

- `models/store.js`のデータ構造と計算処理を変更しない。
- 現在のPOST URLとフォーム`name`を変更しない。
- 外部ライブラリ、DB、外部APIを追加しない。
- 390px、768px、1440pxで横溢れを出さない。
- `prefers-reduced-motion`とキーボード操作を維持する。

---

### Task 1: Four-view HTML contract

**Files:**
- Modify: `test/app.test.js`
- Modify: `controllers/appController.js`

**Interfaces:**
- Produces: `[data-view="home"]`, `[data-view="input"]`, `[data-view="history"]`, `[data-view="manage"]`
- Produces: `[data-route="home|input|history|manage"]`

- [ ] **Step 1: Write the failing contract test**

```js
assert.match(html, /data-view="input"/);
assert.match(html, /data-view="history"/);
assert.equal((html.match(/data-route="input"/g) || []).length >= 2, true);
assert.equal((html.match(/data-route="history"/g) || []).length >= 2, true);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test`
Expected: FAIL because input and history views do not exist.

- [ ] **Step 3: Render the four view shells and navigation**

Add top and mobile navigation for `home`, `input`, `history`, and `manage`. Keep the existing management panels under `data-view="manage"`.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `npm test`
Expected: all tests pass.

### Task 2: LINE-style input view

**Files:**
- Modify: `controllers/appController.js`
- Modify: `public/app.js`
- Modify: `public/style.css`
- Modify: `test/app.test.js`

**Interfaces:**
- Produces: `.chat-shell`, `.chat-thread`, `.chat-bubble`, `.chat-composer`
- Changes: quick input redirect target from `#home` to `#input`

- [ ] **Step 1: Change the quick-input redirect expectation**

```js
assert.match(location, /#input$/);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test`
Expected: FAIL because the controller still redirects to `#home`.

- [ ] **Step 3: Render and style the chat input**

Move the existing `/quick-expense` form into the input view. Render one assistant bubble and up to five recent expenses as user bubbles. Keep `quickText` unchanged and redirect successful submissions to `/#input`.

- [ ] **Step 4: Add interaction motion**

Keep the existing submit state and success animation. Route `[data-focus-quick]` to `input`, then focus `#quickText` after the view transition.

- [ ] **Step 5: Run tests and syntax checks**

Run: `npm test && node --check public/app.js && node --check controllers/appController.js`
Expected: all commands exit 0.

### Task 3: Calendar history view

**Files:**
- Modify: `controllers/appController.js`
- Modify: `public/app.js`
- Modify: `public/style.css`
- Modify: `test/app.test.js`

**Interfaces:**
- Produces: `renderCalendar(data)` and `renderDayDetails(data, date)`
- Produces: `[data-calendar-day]` buttons and `[data-day-panel]` detail panels
- Consumes: `data.monthlyExpenses`, `data.monthlyIncomes`

- [ ] **Step 1: Add a failing calendar contract test**

```js
assert.match(html, /class="calendar-grid"/);
assert.match(html, /data-calendar-day=/);
assert.match(html, /data-day-panel=/);
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npm test`
Expected: FAIL because calendar markup is absent.

- [ ] **Step 3: Render current-month day totals**

Build a seven-column calendar from the current year and month. Each day button contains the day number, optional expense total, optional income indicator, `aria-pressed`, and a matching detail panel.

- [ ] **Step 4: Add date selection behavior**

On `[data-calendar-day]` click, update `aria-pressed`, `.is-selected`, and the matching `[data-day-panel]`. Focus remains on the clicked day.

- [ ] **Step 5: Style desktop and mobile calendar layouts**

Use a calendar/details split on desktop and a stacked layout below 860px. Keep date cells at least 72px on desktop and 58px on mobile.

- [ ] **Step 6: Run tests and syntax checks**

Run: `npm test && node --check public/app.js && node --check controllers/appController.js`
Expected: all commands exit 0.

### Task 4: Navigation, responsive QA, and release

**Files:**
- Modify: `public/app.js`
- Modify: `public/style.css`
- Verify: `controllers/appController.js`
- Verify: `test/app.test.js`

**Interfaces:**
- Consumes: all four route names and calendar data attributes
- Produces: browser history behavior, active navigation state, final public UI

- [ ] **Step 1: Extend location parsing**

`readLocation()` recognizes `#home`, `#input`, `#history`, and `#manage-(expense|income|fixed|budget|analysis)`. `locationHash()` returns the canonical hash for each route.

- [ ] **Step 2: Verify navigation and accessibility**

Run: `npm test`
Expected: four-view contract, redirect, and management regression tests pass.

- [ ] **Step 3: Verify desktop and mobile in a real browser**

Check 1440x1000, 768x1024, and 390x844. Confirm no horizontal overflow, all four nav actions work, calendar details switch, composer is reachable, and console errors are empty.

- [ ] **Step 4: Commit and publish**

Stage only the implementation, tests, design, and plan files. Commit with `Add calendar and chat navigation`, push `main`, wait for Render, and verify the four view identifiers on the public URL.
