import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as store from "../models/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function deleteButton(action, returnPanel) {
  return `<form method="post" action="${action}" class="inline-form"><input type="hidden" name="returnView" value="manage"><input type="hidden" name="returnPanel" value="${returnPanel}"><button class="ghost danger" type="submit">削除</button></form>`;
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
    settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.27.7.62.9 1 .15.32.22.66.2 1h.09v4h-.09a1.7 1.7 0 0 0-1.1.4z"></path></svg>`,
    arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>`,
    back: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6"></path></svg>`,
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

function renderChatExpenses(expenses) {
  const recent = expenses.slice().reverse().slice(0, 5).reverse();
  if (recent.length === 0) {
    return `<div class="chat-empty-note">まだ会話はありません。下の入力欄から最初の支出を送ってみましょう。</div>`;
  }

  return recent
    .map(
      (item) => `<article class="chat-message is-user">
        <div class="chat-bubble">
          <span>${escapeHtml(item.memo || item.category)}</span>
          <strong>${store.yen(item.amount)}</strong>
          <small>${escapeHtml(item.category)} ・ ${relativeDate(item.date)}</small>
        </div>
      </article>`
    )
    .join("");
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
  return `<div class="budget-meter" style="--meter:${percent};">
    <div class="budget-meter-head">
      <span>予算消化率</span>
      <strong>${data.budgetUsed}%</strong>
    </div>
    <div class="budget-meter-track" aria-hidden="true"><span></span></div>
    <div class="budget-meter-foot"><span>${store.yen(data.expenseTotal + data.fixedTotal)} 使用</span><span>予算 ${store.yen(data.monthlyBudget)}</span></div>
  </div>`;
}

function monthDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function renderDayDetails(data, dateKey, selected) {
  const expenses = data.monthlyExpenses.filter((item) => item.date === dateKey);
  const incomes = data.monthlyIncomes.filter((item) => item.date === dateKey);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = incomes.reduce((sum, item) => sum + item.amount, 0);
  const date = new Date(`${dateKey}T00:00:00`);
  const heading = `${date.getMonth() + 1}月${date.getDate()}日`;
  const transactions = [
    ...expenses.map((item) => ({ type: "expense", label: item.memo || item.category, meta: item.category, amount: item.amount })),
    ...incomes.map((item) => ({ type: "income", label: item.memo || item.source, meta: item.source, amount: item.amount })),
  ];
  const list = transactions.length
    ? `<div class="day-transaction-list">${transactions
        .map(
          (item) => `<article class="day-transaction ${item.type === "income" ? "is-income" : ""}">
            <span class="day-transaction-mark">${item.type === "income" ? "+" : categoryMark(item.meta)}</span>
            <div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(item.meta)}</small></div>
            <b>${item.type === "income" ? "+" : "-"}${store.yen(item.amount)}</b>
          </article>`
        )
        .join("")}</div>`
    : `<div class="day-empty"><strong>この日の記録はありません</strong><p>支出を追加すると、ここに表示されます。</p><a class="text-action" href="#input" data-route="input">支出を追加 ${icon("arrow")}</a></div>`;

  return `<section class="day-panel${selected ? " is-active" : ""}" data-day-panel="${dateKey}"${selected ? "" : " hidden"} aria-labelledby="day-${dateKey}">
    <header class="day-panel-header">
      <div><span>選択した日</span><h2 id="day-${dateKey}">${heading}</h2></div>
      <div class="day-totals"><span>支出 <b>${store.yen(expenseTotal)}</b></span><span>収入 <b>${store.yen(incomeTotal)}</b></span></div>
    </header>
    ${list}
  </section>`;
}

function renderCalendar(data) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const days = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const transactionDates = [...data.monthlyExpenses, ...data.monthlyIncomes]
    .map((item) => item.date)
    .filter((date) => date.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .sort();
  const todayKey = monthDateKey(year, month, now.getDate());
  const selectedDate = transactionDates.includes(todayKey) ? todayKey : transactionDates.at(-1) || todayKey;
  const dailyTotals = Array.from({ length: days }, (_, index) => {
    const dateKey = monthDateKey(year, month, index + 1);
    return data.monthlyExpenses.filter((item) => item.date === dateKey).reduce((sum, item) => sum + item.amount, 0);
  });
  const maxDaily = Math.max(...dailyTotals, 1);
  const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"]
    .map((day) => `<span class="calendar-weekday">${day}</span>`)
    .join("");
  const blanks = Array.from({ length: firstWeekday }, () => '<span class="calendar-blank" aria-hidden="true"></span>').join("");
  const buttons = Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const dateKey = monthDateKey(year, month, day);
    const expense = dailyTotals[index];
    const income = data.monthlyIncomes.filter((item) => item.date === dateKey).reduce((sum, item) => sum + item.amount, 0);
    const intensity = expense === 0 ? "" : expense / maxDaily > 0.66 ? " is-high" : expense / maxDaily > 0.33 ? " is-medium" : " is-low";
    const selected = dateKey === selectedDate;
    const label = `${month + 1}月${day}日。支出${store.yen(expense)}${income ? `、収入${store.yen(income)}` : ""}`;
    return `<button type="button" class="calendar-day${intensity}${selected ? " is-selected" : ""}" data-calendar-day="${dateKey}" aria-pressed="${selected}" aria-label="${label}">
      <span class="calendar-day-number">${day}${dateKey === todayKey ? "<i>今日</i>" : ""}</span>
      ${expense ? `<strong>${store.yen(expense)}</strong>` : '<span class="calendar-day-empty">-</span>'}
      ${income ? '<i class="income-dot" aria-hidden="true"></i>' : ""}
    </button>`;
  }).join("");
  const details = Array.from({ length: days }, (_, index) => {
    const dateKey = monthDateKey(year, month, index + 1);
    return renderDayDetails(data, dateKey, dateKey === selectedDate);
  }).join("");

  return `<div class="calendar-layout">
    <section class="calendar-card" aria-labelledby="calendar-month">
      <header class="calendar-header">
        <div><span>MONTHLY ACTIVITY</span><h2 id="calendar-month">${year}年 ${month + 1}月</h2></div>
        <div class="calendar-legend"><span><i></i>支出</span><span><i class="is-income"></i>収入あり</span></div>
      </header>
      <div class="calendar-grid">${weekdayLabels}${blanks}${buttons}</div>
    </section>
    <aside class="day-detail">${details}</aside>
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
          <td>${deleteButton(`/expenses/${item.id}/delete`, "expense")}</td>
        </tr>`;
      }
      if (type === "income") {
        return `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td class="amount positive">${store.yen(item.amount)}</td>
          <td>${escapeHtml(item.source)}</td>
          <td>${escapeHtml(item.memo)}</td>
          <td>${deleteButton(`/incomes/${item.id}/delete`, "income")}</td>
        </tr>`;
      }
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="amount">${store.yen(item.amount)}</td>
        <td><span class="pill">${escapeHtml(item.category)}</span></td>
        <td>${escapeHtml(item.payDay)}日</td>
        <td>${deleteButton(`/fixed-costs/${item.id}/delete`, "fixed")}</td>
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

function manageNavButton(target, iconName, label, meta, current = false) {
  return `<a class="manage-nav-button ${current ? "is-current" : ""}" href="#manage-${target}" data-manage-target="${target}"${current ? ' aria-current="page"' : ""}>
    <span class="manage-nav-icon">${icon(iconName)}</span>
    <span><strong>${label}</strong><small>${meta}</small></span>
    ${icon("arrow")}
  </a>`;
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
    ? "予算・収入・支出・固定費をもとに計算しています。"
    : "最初の支出を追加すると、今月の残額と月末の見込みを表示します。";

  const content = `<div class="app-shell">
    <header class="topbar">
      <a class="brand" href="#home" data-route="home" aria-label="Money Pace ホーム">
        <span>${logoMark()}</span><strong>Money Pace</strong>
      </a>
      <div class="desktop-actions">
        <a class="nav-action is-current" href="#home" data-route="home" aria-current="page">ホーム</a>
        <a class="nav-action" href="#input" data-route="input">入力</a>
        <a class="nav-action" href="#history" data-route="history">履歴</a>
        <a class="nav-action manage-action" href="#manage-expense" data-route="manage">${icon("settings")} 管理 ${icon("arrow")}</a>
      </div>
    </header>

    ${message ? `<div class="message toast ${messageType === "error" ? "is-error" : ""}" role="${messageType === "error" ? "alert" : "status"}" aria-live="${messageType === "error" ? "assertive" : "polite"}">${escapeHtml(message)}</div>` : ""}

    <main class="view-shell">
      <section class="app-view is-active" id="home" data-view="home" aria-labelledby="home-title">
        <section class="balance-stage">
          <div class="balance-overview">
            <div class="balance-topline">
              <span class="balance-period">${new Date().getMonth() + 1}月のペース</span>
              <span class="balance-days">残り${data.daysLeft}日</span>
            </div>
            <div class="balance-copy">
              <p class="balance-label">今月あと使える金額</p>
              <h1 id="home-title" class="${hasExpense ? amountClass : "empty-title"}" tabindex="-1">${heroAmount}</h1>
              <p class="balance-note">${heroNote}</p>
            </div>
            <div class="pace-strip">
              <div class="pace-item">
                <span>今日使える目安</span>
                <strong>${hasExpense ? store.yen(data.dailyRemaining) : "-"}</strong>
              </div>
              <div class="pace-item pace-forecast">
                <span>月末の見込み</span>
                <strong>${hasExpense ? store.yen(data.projectedBalance) : "-"}</strong>
                <small>${prediction}</small>
              </div>
              <div class="pace-item pace-budget">
                <span>予算消化率</span>
                <strong>${data.budgetUsed}%</strong>
                <div class="pace-track" aria-hidden="true"><span style="width:${Math.min(data.budgetUsed, 100)}%"></span></div>
              </div>
            </div>
          </div>

          <div class="home-input-prompt">
            <span class="eyebrow">QUICK ADD</span>
            <h2>思い出したら、<br>そのまま送る。</h2>
            <p>「ラーメン 950」のように、メモと金額だけで追加できます。</p>
            <a class="btn home-input-button" href="#input" data-route="input">${icon("plus")} 支出を追加</a>
            <div class="prompt-preview" aria-hidden="true">
              <span>カフェ 650</span>
              <span>食費として追加</span>
            </div>
          </div>
        </section>

        <section class="activity-layout ledger-layout">
          <article class="activity-panel ledger-panel">
            <div class="section-heading">
              <div><span>最近の動き</span><h2>最近の支出</h2></div>
              <a class="text-action" href="#history" data-route="history">履歴を見る ${icon("arrow")}</a>
            </div>
            ${renderRecentExpenses(data.expenses)}
          </article>

          <aside class="month-pulse snapshot-rail">
            <div class="month-pulse-head">
              <div>
                <span class="eyebrow">今月のサマリー</span>
                <h2>${hasExpense ? (data.projectedBalance >= 0 ? "予定どおり" : "少し見直し") : "まだ静かな月です"}</h2>
              </div>
              <span class="risk-label ${data.risk === "高" ? "is-alert" : ""}">${hasExpense ? `リスク ${data.risk}` : "未計算"}</span>
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
      </section>

      <section class="app-view input-view" id="input" data-view="input" aria-labelledby="input-title">
        <div class="chat-shell">
          <header class="chat-header">
            <div class="chat-profile">
              <span class="chat-avatar">${logoMark()}</span>
              <div><h1 id="input-title" tabindex="-1">Money Pace</h1><p><i></i> 支出入力</p></div>
            </div>
            <div class="chat-balance"><span>あと使える金額</span><strong>${store.yen(data.remaining)}</strong></div>
          </header>

          <div class="chat-thread" aria-label="支出入力の会話">
            <div class="chat-date">${new Date().getMonth() + 1}月${new Date().getDate()}日</div>
            <article class="chat-message is-assistant">
              <div class="assistant-avatar">M</div>
              <div class="chat-bubble"><span>使ったものと金額を送ってください。</span><small>例：ラーメン 950</small></div>
            </article>
            ${renderChatExpenses(data.expenses)}
          </div>

          <div class="quick-entry quick-command">
            <div class="chat-suggestions quick-chips" aria-label="入力例">
              <button type="button" data-example="ラーメン 950">ラーメン <b>950</b></button>
              <button type="button" data-example="電車 420">電車 <b>420</b></button>
              <button type="button" data-example="Netflix 1490">Netflix <b>1490</b></button>
              <button type="button" data-example="カフェ 650">カフェ <b>650</b></button>
            </div>
            <form method="post" action="/quick-expense" class="chat-composer">
              <label class="sr-only" for="quickText">支出を1行で入力</label>
              <input id="quickText" name="quickText" placeholder="メッセージを入力" autocomplete="off" required>
              <button class="btn quick-submit" type="submit" aria-label="支出を追加">${icon("arrow")}</button>
            </form>
            <a class="form-link" href="#manage-expense" data-go-manage="expense">項目を指定して追加 ${icon("arrow")}</a>
          </div>
        </div>
      </section>

      <section class="app-view history-view" id="history" data-view="history" aria-labelledby="history-title">
        <header class="history-header">
          <div><span class="eyebrow">CALENDAR</span><h1 id="history-title" tabindex="-1">お金のカレンダー</h1><p>使った日と金額を、月の流れで振り返れます。</p></div>
          <div class="history-month-total"><span>今月の支出</span><strong>${store.yen(data.expenseTotal)}</strong></div>
        </header>
        ${renderCalendar(data)}
      </section>

      <section class="app-view manage-view" id="manage" data-view="manage" aria-labelledby="manage-title">
        <header class="manage-header">
          <div>
            <span class="eyebrow">月次管理</span>
            <h1 id="manage-title" tabindex="-1">管理</h1>
            <p>お金の流れと設定をまとめて管理します。</p>
          </div>
          <div class="manage-budget"><span>今月の予算</span><strong>${store.yen(data.monthlyBudget)}</strong></div>
        </header>

        <div class="manage-workspace">
          <nav class="manage-rail" aria-label="管理メニュー">
            ${manageNavButton("expense", "receipt", "支出", "追加と履歴", true)}
            ${manageNavButton("income", "wallet", "収入", "追加と履歴")}
            ${manageNavButton("fixed", "home", "固定費", "毎月の支払い")}
            ${manageNavButton("budget", "target", "予算", store.yen(data.monthlyBudget))}
            ${manageNavButton("analysis", "chart", "分析", "カテゴリ別")}
          </nav>
          <div class="manage-panels">
            ${renderExpenseDetails(data)}
            ${renderIncomeDetails(data)}
            ${renderFixedDetails(data)}
            ${renderBudgetDetails(data)}
            ${renderAnalysisDetails(data)}
          </div>
        </div>
      </section>
    </main>

    <nav class="mobile-nav" aria-label="メインナビゲーション">
      <a href="#home" data-route="home" aria-current="page">${icon("home")}<span>ホーム</span></a>
      <a href="#input" data-route="input">${icon("plus")}<span>入力</span></a>
      <a href="#history" data-route="history">${icon("receipt")}<span>履歴</span></a>
      <a href="#manage-expense" data-route="manage">${icon("settings")}<span>管理</span></a>
    </nav>

    <footer>Money Pace ・ データはサーバー再起動時にリセットされます</footer>
  </div>`;

  const template = fs.readFileSync(templatePath, "utf8");
  return template.replace("{{content}}", content);
}

function renderExpenseDetails(data) {
  return `<section class="manage-panel is-active" id="manage-expense" data-manage-panel="expense" aria-labelledby="expense-title">
    <header class="panel-header"><div><span>支出管理</span><h2 id="expense-title">支出</h2></div><p>項目を指定して追加し、履歴を確認できます。</p></header>
    <div class="panel-body">
      <form method="post" action="/expenses">
        <input type="hidden" name="returnView" value="manage">
        <input type="hidden" name="returnPanel" value="expense">
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
  </section>`;
}

function renderIncomeDetails(data) {
  return `<section class="manage-panel" id="manage-income" data-manage-panel="income" aria-labelledby="income-title">
    <header class="panel-header"><div><span>収入管理</span><h2 id="income-title">収入</h2></div><p>今月の収入を追加し、履歴を管理できます。</p></header>
    <div class="panel-body">
      <form method="post" action="/incomes">
        <input type="hidden" name="returnView" value="manage">
        <input type="hidden" name="returnPanel" value="income">
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
  </section>`;
}

function renderFixedDetails(data) {
  return `<section class="manage-panel" id="manage-fixed" data-manage-panel="fixed" aria-labelledby="fixed-title">
    <header class="panel-header"><div><span>固定費管理</span><h2 id="fixed-title">固定費</h2></div><p>毎月発生する支払いをまとめて管理します。</p></header>
    <div class="panel-body">
      <form method="post" action="/fixed-costs">
        <input type="hidden" name="returnView" value="manage">
        <input type="hidden" name="returnPanel" value="fixed">
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
  </section>`;
}

function renderBudgetDetails(data) {
  return `<section class="manage-panel compact-panel" id="manage-budget" data-manage-panel="budget" aria-labelledby="budget-title">
    <header class="panel-header"><div><span>予算設定</span><h2 id="budget-title">予算</h2></div><p>今月使える金額の基準を設定します。</p></header>
    <div class="panel-body">
      <form method="post" action="/budget">
        <input type="hidden" name="returnView" value="manage">
        <input type="hidden" name="returnPanel" value="budget">
        <label for="monthlyBudget">今月の予算</label>
        <input id="monthlyBudget" name="budget" type="number" min="1" value="${data.monthlyBudget}" required>
        <button class="btn" type="submit">予算を更新</button>
      </form>
    </div>
  </section>`;
}

function renderAnalysisDetails(data) {
  const hasCategoryData = data.byCategory.some((item) => item.amount > 0);
  const advice = store.advice(data).map((message) => `<li>${escapeHtml(message)}</li>`).join("");
  return `<section class="manage-panel" id="manage-analysis" data-manage-panel="analysis" aria-labelledby="analysis-title">
    <header class="panel-header"><div><span>支出分析</span><h2 id="analysis-title">カテゴリ別支出</h2></div><p>今月の支出をカテゴリごとに比較します。</p></header>
    <div class="panel-body">
      ${hasCategoryData ? `<div class="bars">${renderCategoryBars(data)}</div>` : '<div class="analysis-empty"><strong>分析できる支出がまだありません</strong><p>支出を追加すると、カテゴリごとの使い方をここで確認できます。</p></div>'}
      <section class="advice-block" aria-labelledby="advice-title">
        <span>今月のアドバイス</span>
        <h3 id="advice-title">今のペースについて</h3>
        <ul>${advice}</ul>
      </section>
    </div>
  </section>`;
}

function redirectWithMessage(res, message, type = "status", returnView = "home", returnPanel = "expense") {
  const typeQuery = type === "error" ? "&type=error" : "";
  const allowedPanels = ["expense", "income", "fixed", "budget", "analysis"];
  const allowedViews = ["home", "input", "history", "manage"];
  const panel = allowedPanels.includes(returnPanel) ? returnPanel : "expense";
  const view = allowedViews.includes(returnView) ? returnView : "home";
  const hash = view === "manage" ? `#manage-${panel}` : `#${view}`;
  res.redirect("/?message=" + encodeURIComponent(message) + typeQuery + hash);
}

function showHome(req, res) {
  res.send(renderPage(req.query.message, req.query.type));
}

function createQuickExpense(req, res) {
  const parsed = store.parseQuickExpense(req.body.quickText);
  if (!parsed) {
    redirectWithMessage(res, "「ラーメン 950」のように、メモと金額を入力してください", "error", "input");
    return;
  }
  store.addExpense(parsed);
  redirectWithMessage(res, `${parsed.memo}を「${parsed.category}」として追加しました`, "status", "input");
}

function createExpense(req, res) {
  store.addExpense(req.body);
  redirectWithMessage(res, "支出を追加しました", "status", req.body.returnView, req.body.returnPanel);
}

function createIncome(req, res) {
  store.addIncome(req.body);
  redirectWithMessage(res, "収入を追加しました", "status", req.body.returnView, req.body.returnPanel);
}

function createFixedCost(req, res) {
  store.addFixedCost(req.body);
  redirectWithMessage(res, "固定費を追加しました", "status", req.body.returnView, req.body.returnPanel);
}

function updateBudget(req, res) {
  store.updateMonthlyBudget(req.body.budget);
  redirectWithMessage(res, "予算を更新しました", "status", req.body.returnView, req.body.returnPanel);
}

function deleteExpense(req, res) {
  store.removeById(store.expenses, req.params.id);
  redirectWithMessage(res, "支出を削除しました", "status", req.body.returnView, req.body.returnPanel);
}

function deleteIncome(req, res) {
  store.removeById(store.incomes, req.params.id);
  redirectWithMessage(res, "収入を削除しました", "status", req.body.returnView, req.body.returnPanel);
}

function deleteFixedCost(req, res) {
  store.removeById(store.fixedCosts, req.params.id);
  redirectWithMessage(res, "固定費を削除しました", "status", req.body.returnView, req.body.returnPanel);
}

const controller = {
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

export default controller;
