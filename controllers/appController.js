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

function statCard(label, value, note, iconName, tone = "") {
  return `<article class="stat-card ${tone}">
    <div class="stat-icon">${icon(iconName)}</div>
    <div>
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </div>
  </article>`;
}

function renderRecentExpenses(expenses) {
  const recent = expenses.slice().reverse().slice(0, 5);
  if (recent.length === 0) {
    return `<div class="empty-card">
      <strong>最初の支出を追加しましょう</strong>
      <p>追加すると、最近の支出と今月の残額がここに表示されます。</p>
    </div>`;
  }

  return `<div class="recent-list">${recent
    .map(
      (item) => `<div class="recent-item">
        <div>
          <strong>${escapeHtml(item.memo || item.category)}</strong>
          <span>${escapeHtml(item.category)} ・ ${escapeHtml(item.date)}</span>
        </div>
        <b>${store.yen(item.amount)}</b>
      </div>`
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

  return `<svg class="trend-chart" viewBox="0 0 100 80" preserveAspectRatio="none" aria-label="今月の支出推移">
    <polyline class="trend-grid" points="0,74 100,74"></polyline>
    <polyline class="trend-line" points="${points}"></polyline>
  </svg>`;
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

function renderPage(message = "") {
  const data = store.calculateDashboard();
  const hasExpense = data.expenses.length > 0;
  const prediction =
    !hasExpense
      ? "最初の支出を追加すると、月末の見込みを表示します。"
      : data.projectedBalance >= 0
      ? `このペースなら月末に ${store.yen(data.projectedBalance)} 残りそうです。`
      : `このペースだと月末に ${store.yen(Math.abs(data.projectedBalance))} オーバーしそうです。`;
  const heroAmount = hasExpense ? store.yen(data.remaining) : "まだ支出がありません";
  const heroNote = hasExpense
    ? `今日使える目安は ${store.yen(data.dailyRemaining)} です。`
    : "最初の支出を追加すると、今月の残額と月末の見込みを表示します。";

  const content = `<div class="app-shell">
    <header class="topbar">
      <a class="brand" href="/"><span>${logoMark()}</span><strong>Money Pace</strong></a>
      <div class="topbar-note">今月のペースを、すぐ確認。</div>
    </header>

    ${message ? `<div class="message">${escapeHtml(message)}</div>` : ""}

    <main class="dashboard">
      <section class="hero-card">
        <div class="hero-copy">
          <span class="eyebrow">今月あと使える金額</span>
          <h1 class="${hasExpense ? "" : "empty-title"}">${heroAmount}</h1>
          <p>${heroNote}</p>
        </div>
        <div class="hero-side">
          <div class="forecast-pill">
            <span>月末の見込み</span>
            <strong>${prediction}</strong>
          </div>
          <a class="btn primary-link" href="#expense-panel" data-open="expense-panel">${icon("plus")} 支出を追加</a>
        </div>
      </section>

      <section class="stat-grid">
        ${statCard("今日使える目安", hasExpense ? store.yen(data.dailyRemaining) : "-", `${data.daysLeft}日分で計算`, "wallet", "accent")}
        ${statCard("月末予測", hasExpense ? store.yen(data.projectedBalance) : "-", data.risk === "高" ? "赤字リスク高" : "予算内の見込み", "trend")}
        ${statCard("今月の予算消化率", `${data.budgetUsed}%`, `${store.yen(data.monthlyBudget)} のうち`, "target")}
        ${statCard("収入合計", store.yen(data.incomeTotal), `${data.monthlyIncomes.length}件`, "wallet", "positive")}
        ${statCard("支出合計", store.yen(data.expenseTotal), `${data.monthlyExpenses.length}件`, "receipt")}
        ${statCard("固定費合計", store.yen(data.fixedTotal), `${data.fixedCosts.length}件`, "home")}
      </section>

      <section class="dashboard-grid">
        <article class="panel quick-panel" id="expense-panel">
          <div class="panel-head">
            <div>
              <h2>クイック入力</h2>
              <p>メモと金額だけで支出を追加できます。</p>
            </div>
            <div class="examples">
              <span>ラーメン 950</span>
              <span>電車 420</span>
              <span>Netflix 1490</span>
              <span>カフェ 650</span>
            </div>
          </div>
          <form method="post" action="/quick-expense" class="quick-form">
            <label class="sr-only" for="quickText">支出を1行で入力</label>
            <input id="quickText" name="quickText" placeholder="ラーメン 950" autocomplete="off" required>
            <button class="btn" type="submit">追加</button>
          </form>
        </article>

        <article class="panel recent-panel">
          <div class="panel-head compact">
            <h2>最近の支出</h2>
          </div>
          ${renderRecentExpenses(data.expenses)}
        </article>

        <article class="panel trend-panel">
          <div class="panel-head compact">
            <div>
              <h2>支出の推移</h2>
              <p>今月の累計支出</p>
            </div>
            <strong>${store.yen(data.expenseTotal)}</strong>
          </div>
          ${renderTrend(data.monthlyExpenses)}
        </article>

        <article class="panel advice-panel">
          <div class="panel-head compact">
            <h2>今月のアドバイス</h2>
          </div>
          <div class="advice-list">${store.advice(data).map((item) => `<p>${escapeHtml(item)}</p>`).join("")}</div>
        </article>
      </section>

      <section class="management">
        <div class="section-title">
          <h2>管理メニュー</h2>
          <p>必要な時だけ開いて編集できます。</p>
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
  return `<details class="menu-card">
    <summary><span>${icon("receipt")} 支出入力</span><small>通常フォームと履歴</small></summary>
    <div class="menu-body">
      <form method="post" action="/expenses">
        <div class="grid-2">
          <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 1200" required></div>
          <div><label>カテゴリ</label><select name="category">${optionTags(store.expenseCategories)}</select></div>
        </div>
        <label>メモ</label><input name="memo" placeholder="例: 昼食、教材、飲み会">
        <div class="grid-2">
          <div><label>日付</label><input name="date" type="date" value="${store.today()}" required></div>
          <div><label>支払い方法</label><select name="paymentMethod">${optionTags(store.paymentMethods)}</select></div>
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
          <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 50000" required></div>
          <div><label>収入源</label><select name="source">${optionTags(store.incomeSources)}</select></div>
        </div>
        <label>メモ</label><input name="memo" placeholder="例: 6月分、単発案件">
        <label>日付</label><input name="date" type="date" value="${store.today()}" required>
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
          <div><label>名前</label><input name="name" placeholder="例: スマホ代" required></div>
          <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 3000" required></div>
        </div>
        <div class="grid-2">
          <div><label>カテゴリ</label><select name="category">${optionTags(store.expenseCategories, "サブスク")}</select></div>
          <div><label>支払日</label><input name="payDay" type="number" min="1" max="31" placeholder="25" required></div>
        </div>
        <button class="btn" type="submit">固定費を追加</button>
      </form>
      <div class="table-wrap"><table><tr><th>名前</th><th>金額</th><th>カテゴリ</th><th>支払日</th><th></th></tr>${renderRows(data.fixedCosts, "fixed")}</table></div>
    </div>
  </details>`;
}

function renderBudgetDetails(data) {
  return `<details class="menu-card">
    <summary><span>${icon("target")} 予算設定</span><small>${store.yen(data.monthlyBudget)}</small></summary>
    <div class="menu-body">
      <form method="post" action="/budget">
        <label>今月の予算</label>
        <input name="budget" type="number" min="1" value="${data.monthlyBudget}" required>
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

function redirectWithMessage(res, message) {
  res.redirect("/?message=" + encodeURIComponent(message));
}

function showHome(req, res) {
  res.send(renderPage(req.query.message));
}

function createQuickExpense(req, res) {
  const parsed = store.parseQuickExpense(req.body.quickText);
  if (!parsed) {
    redirectWithMessage(res, "「ラーメン 950」のように、メモと金額を入力してください");
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
