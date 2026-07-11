const fs = require("fs");
const path = require("path");
const store = require("../models/store");

const templatePath = path.join(__dirname, "..", "public", "index.html");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optionTags(items, selected) {
  return items
    .map((item) => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");
}

function progressPercent(value, max) {
  return Math.min(Math.round((value / max) * 100), 100);
}

function deleteButton(action) {
  return `<form method="post" action="${action}" class="inline-form"><button class="ghost danger" type="submit">削除</button></form>`;
}

function categoryMark(category) {
  const marks = {
    食費: "食",
    交通費: "交",
    交際費: "遊",
    服: "服",
    美容: "美",
    サブスク: "Sub",
    学費: "学",
    "研究室・仕事関連": "Work",
    その他: "•",
  };
  return marks[category] || marks["その他"];
}

function relativeDate(dateText) {
  const target = new Date(dateText);
  const now = new Date(store.today());
  const diff = Math.round((now - target) / 86400000);
  if (diff === 0) return "今日";
  if (diff === 1) return "昨日";
  if (diff === 2) return "2日前";
  return dateText;
}

function icon(name) {
  const icons = {
    wallet: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z"></path><path d="M4 8h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4.5a2.5 2.5 0 0 1 0-5H22"></path><path d="M16 12h.01"></path></svg>`,
    receipt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>`,
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>`,
    chart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16V9"></path><path d="M12 16V6"></path><path d="M16 16v-4"></path></svg>`,
    trend: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l5-5 4 4 7-8"></path><path d="M15 7h5v5"></path></svg>`,
    target: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>`,
    plus: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>`,
  };
  return icons[name] || icons.wallet;
}

function logoMark() {
  return `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="4" width="40" height="40" rx="12"></rect>
    <path d="M15 30V18l9 7 9-7v12"></path>
    <path d="M15 18h18"></path>
  </svg>`;
}

function renderRecentExpenses(expenses) {
  const recent = expenses.slice().reverse().slice(0, 5);
  if (recent.length === 0) {
    return `<div class="feed-empty">
      <strong>最初の支出を追加しましょう</strong>
      <p>支出を追加すると、ここに最近の支出が表示されます。</p>
      <button type="button" class="text-action" data-focus-quick>支出を追加</button>
    </div>`;
  }

  return `<div class="expense-feed">${recent
    .map(
      (item) => `<article class="expense-row">
        <div class="category-mark">${categoryMark(item.category)}</div>
        <div class="expense-copy">
          <strong>${escapeHtml(item.memo || item.category)}</strong>
          <span>${relativeDate(item.date)} ・ ${escapeHtml(item.category)}</span>
        </div>
        <b>${store.yen(item.amount)}</b>
      </article>`
    )
    .join("")}</div>`;
}

function renderTrend(monthlyExpenses) {
  const now = new Date();
  const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const totals = Array.from({ length: days }, () => 0);
  monthlyExpenses.forEach((item) => {
    const date = new Date(item.date);
    totals[date.getDate() - 1] += item.amount;
  });

  let running = 0;
  const cumulative = totals.map((amount) => {
    running += amount;
    return running;
  });
  const max = Math.max(...cumulative, 1);
  const points = cumulative
    .map((amount, index) => {
      const x = (index / Math.max(days - 1, 1)) * 100;
      const y = 74 - (amount / max) * 58;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  if (monthlyExpenses.length === 0) {
    return `<div class="trend-empty">支出を追加すると、今月の推移を表示します。</div>`;
  }

  const total = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  return `<svg class="trend-chart" viewBox="0 0 100 80" preserveAspectRatio="none" role="img" aria-label="今月の支出推移。合計${store.yen(total)}">
    <polyline class="trend-grid" points="0,74 100,74"></polyline>
    <polyline class="trend-line" points="${points}"></polyline>
  </svg>`;
}

function renderMonthGauge(data) {
  const percent = Math.min(data.budgetUsed, 100);
  return `<div class="budget-gauge" style="--meter:${percent};">
    <div class="budget-ring"><span>${data.budgetUsed}%</span></div>
    <div class="budget-gauge-copy">
      <span>予算消化率</span>
      <strong>${store.yen(data.expenseTotal + data.fixedTotal)}</strong>
      <p>${store.yen(data.monthlyBudget)} のうち</p>
    </div>
  </div>`;
}

function renderRows(items, type) {
  if (items.length === 0) {
    const colspan = type === "expense" ? 6 : 5;
    return `<tr><td colspan="${colspan}" class="empty">まだ追加されていません</td></tr>`;
  }

  return items
    .slice()
    .reverse()
    .map((item) => {
      if (type === "expense") {
        return `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td class="amount">${store.yen(item.amount)}</td>
          <td><span class="pill">${escapeHtml(item.category)}</span></td>
          <td>${escapeHtml(item.memo)}</td>
          <td>${escapeHtml(item.paymentMethod)}</td>
          <td>${deleteButton(`/expenses/${item.id}/delete`)}</td>
        </tr>`;
      }
      if (type === "income") {
        return `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td class="amount positive">${store.yen(item.amount)}</td>
          <td>${escapeHtml(item.source)}</td>
          <td>${escapeHtml(item.memo)}</td>
          <td>${deleteButton(`/incomes/${item.id}/delete`)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="amount">${store.yen(item.amount)}</td>
        <td><span class="pill">${escapeHtml(item.category)}</span></td>
        <td>${escapeHtml(item.payDay)}日</td>
        <td>${deleteButton(`/fixed-costs/${item.id}/delete`)}</td>
      </tr>`;
    })
    .join("");
}

function renderCategoryBars(data) {
  return data.byCategory
    .map(
      (item) => `<div class="bar-row">
        <div class="bar-top"><strong>${escapeHtml(item.category)}</strong><span>${store.yen(item.amount)}</span></div>
        <div class="track"><div class="fill" style="width:${progressPercent(item.amount, data.maxCategory)}%"></div></div>
      </div>`
    )
    .join("");
}

function renderPage(message = "", messageType = "status") {
  const data = store.calculateDashboard();
  const hasExpense = data.monthlyExpenses.length > 0;
  const prediction =
    !hasExpense
      ? "最初の支出を追加すると、月末の見込みを表示します。"
      : data.projectedBalance >= 0
      ? `このペースなら月末に ${store.yen(data.projectedBalance)} 残りそうです。`
      : `このペースだと月末に ${store.yen(Math.abs(data.projectedBalance))} オーバーしそうです。`;
  const heroAmount = hasExpense ? store.yen(data.remaining) : "まだ支出がありません";
  const amountLength = String(Math.abs(Math.round(data.remaining))).length;
  const amountClass = amountLength >= 9 ? "is-compact" : amountLength >= 7 ? "is-long" : "";
  const heroNote = hasExpense
    ? "予算と今月の支出から計算しています。"
    : "最初の支出を追加すると、今月の残額と月末の見込みを表示します。";

  const content = `<div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/"><span>${logoMark()}</span><strong>Money Pace</strong></a>
      <nav class="topnav" aria-label="ページ内ナビ">
        <a href="#home">ホーム</a>
        <a href="#insight">今月</a>
        <a href="#manage">管理</a>
      </nav>
    </header>

    <main>
      <section class="balance-surface" id="home">
        <div class="balance-primary">
          <div class="balance-topline">
            <span class="balance-period">今月</span>
            <span class="balance-days">残り${data.daysLeft}日</span>
          </div>
          <p class="balance-label">今月あと使える金額</p>
          <h1 class="${hasExpense ? amountClass : "empty-title"}">${heroAmount}</h1>
          <p class="balance-note">${heroNote}</p>
          <div class="balance-context">
            <div>
              <span>今日使える目安</span>
              <strong>${hasExpense ? store.yen(data.dailyRemaining) : "-"}</strong>
            </div>
            <p>${prediction}</p>
          </div>
        </div>

        <div class="quick-entry" aria-label="クイック入力">
          <div class="quick-heading">
            <div>
              <span class="eyebrow">支出を追加</span>
              <h2>クイック入力</h2>
            </div>
            <span class="quick-hint">メモと金額だけ</span>
          </div>
          <form method="post" action="/quick-expense" class="quick-form">
            <label class="sr-only" for="quickText">支出を1行で入力</label>
            <input id="quickText" name="quickText" placeholder="ラーメン 950" autocomplete="off" required>
            <button class="btn quick-submit" type="submit">支出を追加</button>
          </form>
          <div class="quick-chips" aria-label="入力例">
            <button type="button" data-example="ラーメン 950">ラーメン 950</button>
            <button type="button" data-example="電車 420">電車 420</button>
            <button type="button" data-example="Netflix 1490">Netflix 1490</button>
            <button type="button" data-example="カフェ 650">カフェ 650</button>
          </div>
          ${message ? `<div class="message ${messageType === "error" ? "is-error" : ""}" role="${messageType === "error" ? "alert" : "status"}" aria-live="${messageType === "error" ? "assertive" : "polite"}">${escapeHtml(message)}</div>` : ""}
          <button class="form-link" type="button" data-open="expense-panel">項目を指定して追加</button>
        </div>
      </section>

      <section class="activity-layout" id="insight">
        <article class="activity-panel">
          <div class="section-heading">
            <div>
              <span>今月の動き</span>
              <h2>最近の支出</h2>
            </div>
            <button type="button" class="text-action" data-open="expense-panel">すべて見る</button>
          </div>
          ${renderRecentExpenses(data.expenses)}
        </article>

        <aside class="month-pulse">
          <div class="month-pulse-head">
            <div>
              <span class="eyebrow">月末の見込み</span>
              <h2>${hasExpense ? (data.projectedBalance >= 0 ? "予算内のペースです" : "少し見直しが必要です") : "支出を追加して確認"}</h2>
            </div>
            <span class="risk-label ${data.risk === "高" ? "is-alert" : ""}">${hasExpense ? `赤字リスク ${data.risk}` : "未計算"}</span>
          </div>
          ${renderMonthGauge(data)}
          <div class="metric-list">
            <div><span>支出</span><strong>${store.yen(data.expenseTotal)}</strong></div>
            <div><span>収入</span><strong>${store.yen(data.incomeTotal)}</strong></div>
            <div><span>固定費</span><strong>${store.yen(data.fixedTotal)}</strong></div>
          </div>
          <div class="trend-wrap">
            <div class="trend-label"><span>支出の推移</span><small>${data.daysLeft}日残り</small></div>
            ${renderTrend(data.monthlyExpenses)}
          </div>
        </aside>
      </section>

      <section class="manage-zone" id="manage">
        <div class="manage-copy">
          <span>管理</span>
          <h2>必要な時だけ、細かく。</h2>
          <p>収入、固定費、予算、カテゴリ別の内訳をここから確認できます。</p>
        </div>
        <div class="menu-grid">
          ${renderExpenseDetails(data)}
          ${renderIncomeDetails(data)}
          ${renderFixedDetails(data)}
          ${renderBudgetDetails(data)}
          ${renderAnalysisDetails(data)}
        </div>
      </section>
    </main>

    <footer>Money Pace はデモ用アプリです。入力したデータはサーバー再起動時にリセットされます。</footer>
  </div>`;

  const template = fs.readFileSync(templatePath, "utf8");
  return template.replace("{{content}}", content);
}

function renderExpenseDetails(data) {
  return `<details class="menu-card" id="expense-panel">
    <summary><span>${icon("receipt")} 支出</span><small>追加と履歴</small></summary>
    <div class="menu-body">
      <form method="post" action="/expenses">
        <div class="grid-2">
          <div><label for="expenseAmount">金額</label><input id="expenseAmount" name="amount" type="number" min="1" placeholder="例: 1200" required></div>
          <div><label for="expenseCategory">カテゴリ</label><select id="expenseCategory" name="category">${optionTags(store.expenseCategories)}</select></div>
        </div>
        <label for="expenseMemo">メモ</label><input id="expenseMemo" name="memo" placeholder="例: 昼食、教材、飲み会">
        <div class="grid-2">
          <div><label for="expenseDate">日付</label><input id="expenseDate" name="date" type="date" value="${store.today()}" required></div>
          <div><label for="expensePayment">支払い方法</label><select id="expensePayment" name="paymentMethod">${optionTags(store.paymentMethods)}</select></div>
        </div>
        <button class="btn" type="submit">支出を追加</button>
      </form>
      <div class="table-wrap"><table><tr><th>日付</th><th>金額</th><th>カテゴリ</th><th>メモ</th><th>支払い方法</th><th></th></tr>${renderRows(data.expenses, "expense")}</table></div>
    </div>
  </details>`;
}

function renderIncomeDetails(data) {
  return `<details class="menu-card">
    <summary><span>${icon("wallet")} 収入</span><small>追加と履歴</small></summary>
    <div class="menu-body">
      <form method="post" action="/incomes">
        <div class="grid-2">
          <div><label for="incomeAmount">金額</label><input id="incomeAmount" name="amount" type="number" min="1" placeholder="例: 50000" required></div>
          <div><label for="incomeSource">収入源</label><select id="incomeSource" name="source">${optionTags(store.incomeSources)}</select></div>
        </div>
        <label for="incomeMemo">メモ</label><input id="incomeMemo" name="memo" placeholder="例: 6月分、単発案件">
        <label for="incomeDate">日付</label><input id="incomeDate" name="date" type="date" value="${store.today()}" required>
        <button class="btn" type="submit">収入を追加</button>
      </form>
      <div class="table-wrap"><table><tr><th>日付</th><th>金額</th><th>収入源</th><th>メモ</th><th></th></tr>${renderRows(data.incomes, "income")}</table></div>
    </div>
  </details>`;
}

function renderFixedDetails(data) {
  return `<details class="menu-card">
    <summary><span>${icon("home")} 固定費</span><small>管理と一覧</small></summary>
    <div class="menu-body">
      <form method="post" action="/fixed-costs">
        <div class="grid-2">
          <div><label for="fixedName">名前</label><input id="fixedName" name="name" placeholder="例: スマホ代" required></div>
          <div><label for="fixedAmount">金額</label><input id="fixedAmount" name="amount" type="number" min="1" placeholder="例: 3000" required></div>
        </div>
        <div class="grid-2">
          <div><label for="fixedCategory">カテゴリ</label><select id="fixedCategory" name="category">${optionTags(store.expenseCategories, "サブスク")}</select></div>
          <div><label for="fixedPayDay">支払日</label><input id="fixedPayDay" name="payDay" type="number" min="1" max="31" placeholder="25" required></div>
        </div>
        <button class="btn" type="submit">固定費を追加</button>
      </form>
      <div class="table-wrap"><table><tr><th>名前</th><th>金額</th><th>カテゴリ</th><th>支払日</th><th></th></tr>${renderRows(data.fixedCosts, "fixed")}</table></div>
    </div>
  </details>`;
}

function renderBudgetDetails(data) {
  return `<details class="menu-card">
    <summary><span>${icon("target")} 予算</span><small>${store.yen(data.monthlyBudget)}</small></summary>
    <div class="menu-body">
      <form method="post" action="/budget">
        <label for="monthlyBudget">今月の予算</label>
        <input id="monthlyBudget" name="budget" type="number" min="1" value="${data.monthlyBudget}" required>
        <button class="btn" type="submit">予算を更新</button>
      </form>
    </div>
  </details>`;
}

function renderAnalysisDetails(data) {
  return `<details class="menu-card wide">
    <summary><span>${icon("chart")} 分析</span><small>カテゴリ別支出</small></summary>
    <div class="menu-body">
      <div class="bars">${renderCategoryBars(data)}</div>
    </div>
  </details>`;
}

function redirectWithMessage(res, message, type = "status") {
  const typeQuery = type === "error" ? "&type=error" : "";
  res.redirect("/?message=" + encodeURIComponent(message) + typeQuery);
}

function showHome(req, res) {
  res.send(renderPage(req.query.message, req.query.type));
}

function createQuickExpense(req, res) {
  const parsed = store.parseQuickExpense(req.body.quickText);
  if (!parsed) {
    redirectWithMessage(res, "「ラーメン 950」のように、メモと金額を入力してください", "error");
    return;
  }
  store.addExpense(parsed);
  redirectWithMessage(res, `${parsed.memo}を「${parsed.category}」として追加しました`);
}

function createExpense(req, res) {
  store.addExpense(req.body);
  redirectWithMessage(res, "支出を追加しました");
}

function createIncome(req, res) {
  store.addIncome(req.body);
  redirectWithMessage(res, "収入を追加しました");
}

function createFixedCost(req, res) {
  store.addFixedCost(req.body);
  redirectWithMessage(res, "固定費を追加しました");
}

function updateBudget(req, res) {
  store.updateMonthlyBudget(req.body.budget);
  redirectWithMessage(res, "予算を更新しました");
}

function deleteExpense(req, res) {
  store.removeById(store.expenses, req.params.id);
  redirectWithMessage(res, "支出を削除しました");
}

function deleteIncome(req, res) {
  store.removeById(store.incomes, req.params.id);
  redirectWithMessage(res, "収入を削除しました");
}

function deleteFixedCost(req, res) {
  store.removeById(store.fixedCosts, req.params.id);
  redirectWithMessage(res, "固定費を削除しました");
}

module.exports = {
  showHome,
  createQuickExpense,
  createExpense,
  createIncome,
  createFixedCost,
  updateBudget,
  deleteExpense,
  deleteIncome,
  deleteFixedCost,
};
