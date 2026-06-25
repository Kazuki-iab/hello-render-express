const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));

let monthlyBudget = 80000;
let nextId = 1;

const expenses = [];
const incomes = [];
const fixedCosts = [];

const expenseCategories = [
  "食費",
  "交通費",
  "交際費",
  "服",
  "美容",
  "サブスク",
  "学費",
  "研究室・仕事関連",
  "その他",
];

const incomeSources = ["バイト代", "インターン報酬", "仕送り", "奨学金", "その他"];
const paymentMethods = ["現金", "クレカ", "PayPay", "交通系IC", "銀行振込", "その他"];

const categoryRules = [
  ["食費", ["ラーメン", "カフェ", "コンビニ", "弁当", "ご飯", "ランチ", "夕飯", "朝食", "マック", "スタバ"]],
  ["交通費", ["電車", "バス", "タクシー", "定期", "新幹線", "交通", "駐輪", "駐車"]],
  ["交際費", ["飲み", "映画", "カラオケ", "遊び", "デート", "旅行", "ライブ", "チケット"]],
  ["服", ["服", "ユニクロ", "GU", "古着", "靴", "コート", "シャツ"]],
  ["美容", ["美容院", "化粧水", "コスメ", "メイク", "ワックス", "ヘア", "ネイル"]],
  ["サブスク", ["Netflix", "Spotify", "Amazon", "Prime", "YouTube", "Apple", "サブスク", "Notion"]],
  ["研究室・仕事関連", ["論文", "研究室", "書籍", "本", "PC", "周辺機器", "学会", "教材", "文具"]],
];

function yen(amount) {
  const rounded = Math.round(Number(amount || 0));
  return `${rounded.toLocaleString("ja-JP")}円`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getNumber(value) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function isThisMonth(dateText) {
  const date = new Date(dateText || today());
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function optionTags(items, selected) {
  return items
    .map((item) => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");
}

function inferCategory(text) {
  const normalized = String(text || "").toLowerCase();
  const match = categoryRules.find(([, words]) => words.some((word) => normalized.includes(word.toLowerCase())));
  return match ? match[0] : "その他";
}

function parseQuickExpense(input) {
  const text = String(input || "").trim();
  const match = text.match(/(.+?)\s+([0-9,]+)$/);
  if (!match) return null;

  const memo = match[1].trim();
  const amount = getNumber(match[2]);
  if (!memo || !amount) return null;

  return {
    amount,
    memo,
    category: inferCategory(memo),
    date: today(),
    paymentMethod: "未設定",
  };
}

function daysInMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function addExpense(data) {
  expenses.push({
    id: nextId++,
    amount: getNumber(data.amount),
    category: expenseCategories.includes(data.category) ? data.category : "その他",
    memo: data.memo || "",
    date: data.date || today(),
    paymentMethod: data.paymentMethod || "未設定",
  });
}

function addIncome(data) {
  incomes.push({
    id: nextId++,
    amount: getNumber(data.amount),
    source: incomeSources.includes(data.source) ? data.source : "その他",
    memo: data.memo || "",
    date: data.date || today(),
  });
}

function addFixedCost(data) {
  fixedCosts.push({
    id: nextId++,
    name: data.name || "固定費",
    amount: getNumber(data.amount),
    category: expenseCategories.includes(data.category) ? data.category : "その他",
    payDay: Math.min(Math.max(getNumber(data.payDay), 1), 31),
  });
}

function removeById(list, id) {
  const index = list.findIndex((item) => item.id === Number(id));
  if (index >= 0) list.splice(index, 1);
}

function calculateDashboard() {
  const now = new Date();
  const monthlyExpenses = expenses.filter((item) => isThisMonth(item.date));
  const monthlyIncomes = incomes.filter((item) => isThisMonth(item.date));
  const expenseTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
  const fixedTotal = fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const remaining = monthlyBudget + incomeTotal - expenseTotal - fixedTotal;
  const daysLeft = Math.max(daysInMonth(now) - now.getDate() + 1, 1);
  const dayOfMonth = Math.max(now.getDate(), 1);
  const dailyRemaining = Math.floor(remaining / daysLeft);
  const paceExpense = (expenseTotal / dayOfMonth) * daysInMonth(now);
  const projectedBalance = Math.round(monthlyBudget + incomeTotal - fixedTotal - paceExpense);
  const risk = projectedBalance < 0 ? "高" : projectedBalance < monthlyBudget * 0.08 ? "中" : "低";
  const byCategory = expenseCategories.map((category) => ({
    category,
    amount: monthlyExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
  }));
  const maxCategory = Math.max(...byCategory.map((item) => item.amount), 1);
  const topCategory = byCategory.slice().sort((a, b) => b.amount - a.amount)[0];

  return {
    monthlyExpenses,
    monthlyIncomes,
    expenseTotal,
    incomeTotal,
    fixedTotal,
    remaining,
    daysLeft,
    dailyRemaining,
    projectedBalance,
    risk,
    byCategory,
    maxCategory,
    topCategory,
  };
}

function advice(data) {
  const messages = [];
  const food = data.byCategory.find((item) => item.category === "食費")?.amount || 0;

  if (data.expenseTotal > 0 && food / data.expenseTotal >= 0.4) {
    messages.push("食費がやや多めです。コンビニと外食を少しだけ見直すと効きます。");
  }
  if (data.fixedTotal / monthlyBudget >= 0.3) {
    messages.push("固定費が重めです。サブスクや通信費の棚卸しチャンスです。");
  }
  if (data.remaining < monthlyBudget * 0.15) {
    messages.push("残額が少なめです。今週は大きな出費を抑えると安心です。");
  }
  if (data.projectedBalance >= monthlyBudget * 0.15 && data.risk === "低") {
    messages.push("今月はかなり良いペースです。余った分を貯金に回せそうです。");
  }
  if (messages.length === 0) {
    messages.push("今のところ安定ペースです。爆速入力で記録を続けましょう。");
  }
  return messages;
}

function progressPercent(value, max) {
  return Math.min(Math.round((value / max) * 100), 100);
}

function renderHistoryRows(items, type) {
  if (items.length === 0) {
    const colspan = type === "expense" ? 6 : type === "income" ? 5 : 5;
    return `<tr><td colspan="${colspan}" class="empty">まだ登録がありません</td></tr>`;
  }

  return items
    .slice()
    .reverse()
    .map((item) => {
      if (type === "expense") {
        return `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td class="amount">${yen(item.amount)}</td>
          <td><span class="pill">${escapeHtml(item.category)}</span></td>
          <td>${escapeHtml(item.memo)}</td>
          <td>${escapeHtml(item.paymentMethod)}</td>
          <td>${deleteButton(`/expenses/${item.id}/delete`)}</td>
        </tr>`;
      }
      if (type === "income") {
        return `<tr>
          <td>${escapeHtml(item.date)}</td>
          <td class="amount positive">${yen(item.amount)}</td>
          <td>${escapeHtml(item.source)}</td>
          <td>${escapeHtml(item.memo)}</td>
          <td>${deleteButton(`/incomes/${item.id}/delete`)}</td>
        </tr>`;
      }
      return `<tr>
        <td>${escapeHtml(item.name)}</td>
        <td class="amount">${yen(item.amount)}</td>
        <td><span class="pill">${escapeHtml(item.category)}</span></td>
        <td>${escapeHtml(item.payDay)}日</td>
        <td>${deleteButton(`/fixed-costs/${item.id}/delete`)}</td>
      </tr>`;
    })
    .join("");
}

function deleteButton(action) {
  return `<form method="post" action="${action}" class="inline-form"><button class="ghost danger" type="submit">削除</button></form>`;
}

function card(label, value, note, tone = "") {
  return `<article class="metric ${tone}">
    <span>${label}</span>
    <strong>${value}</strong>
    <small>${note}</small>
  </article>`;
}

function renderPage(message = "") {
  const data = calculateDashboard();
  const prediction =
    data.projectedBalance >= 0
      ? `このペースだと月末に ${yen(data.projectedBalance)} 余りそうです`
      : `このペースだと月末に ${yen(Math.abs(data.projectedBalance))} オーバーしそうです`;
  const riskClass = data.risk === "高" ? "risk-high" : data.risk === "中" ? "risk-mid" : "risk-low";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Money Pace</title>
  <style>
    :root {
      --bg: #f4f7f6;
      --panel: #ffffff;
      --ink: #172026;
      --muted: #667085;
      --line: #dbe5e1;
      --green: #0f766e;
      --green-dark: #115e59;
      --blue: #2563eb;
      --amber: #b45309;
      --red: #b42318;
      --soft-green: #e7f5f1;
      --shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--ink); }
    button, input, select { font: inherit; }
    .shell { max-width: 1180px; margin: 0 auto; padding: 24px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr); gap: 18px; align-items: stretch; }
    .hero-main { background: linear-gradient(135deg, #0f766e, #123c69); color: white; border-radius: 24px; padding: 28px; box-shadow: var(--shadow); }
    .brand { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 32px; }
    .brand strong { font-size: 22px; letter-spacing: 0; }
    .badge { display: inline-flex; align-items: center; border-radius: 999px; background: rgba(255, 255, 255, 0.15); padding: 8px 12px; font-size: 13px; }
    h1 { margin: 0; font-size: clamp(32px, 5vw, 58px); line-height: 1; letter-spacing: 0; }
    .hero-main p { color: rgba(255, 255, 255, 0.82); font-size: 16px; max-width: 660px; }
    .remaining { display: flex; gap: 18px; flex-wrap: wrap; align-items: end; margin-top: 22px; }
    .remaining strong { font-size: clamp(42px, 7vw, 82px); line-height: .9; }
    .remaining span { color: rgba(255, 255, 255, 0.75); margin-bottom: 8px; }
    .forecast { background: var(--panel); border: 1px solid var(--line); border-radius: 24px; padding: 24px; box-shadow: var(--shadow); display: grid; gap: 14px; }
    .forecast h2, .section h2, .panel h2 { margin: 0; font-size: 20px; }
    .forecast-text { font-size: 21px; font-weight: 800; line-height: 1.45; }
    .risk { display: flex; justify-content: space-between; align-items: center; border-radius: 16px; padding: 14px; background: #f8fafc; }
    .risk strong { font-size: 24px; }
    .risk-low strong { color: var(--green); }
    .risk-mid strong { color: var(--amber); }
    .risk-high strong { color: var(--red); }
    .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 18px 0; }
    .metric { background: var(--panel); border: 1px solid var(--line); border-radius: 18px; padding: 18px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05); }
    .metric span, label, .muted { color: var(--muted); font-size: 13px; }
    .metric strong { display: block; margin: 8px 0 4px; font-size: 24px; }
    .metric small { color: var(--muted); }
    .good strong { color: var(--green); }
    .bad strong { color: var(--red); }
    .layout { display: grid; grid-template-columns: minmax(320px, 0.8fr) minmax(0, 1.2fr); gap: 18px; }
    .stack { display: grid; gap: 18px; }
    .panel, .section { background: var(--panel); border: 1px solid var(--line); border-radius: 22px; padding: 20px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05); }
    .quick { background: #102a2f; color: white; border: 0; }
    .quick h2, .quick label { color: white; }
    .quick p { color: rgba(255, 255, 255, 0.7); margin-top: 6px; }
    form { margin: 0; }
    input, select { width: 100%; border: 1px solid var(--line); border-radius: 14px; padding: 13px 14px; margin: 7px 0 12px; background: white; color: var(--ink); }
    .quick input { border: 0; padding: 17px 16px; font-size: 19px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .btn { width: 100%; border: 0; border-radius: 14px; padding: 14px 16px; background: var(--green); color: white; font-weight: 800; cursor: pointer; }
    .btn:hover { background: var(--green-dark); }
    .ghost { border: 1px solid var(--line); background: white; color: var(--ink); border-radius: 12px; padding: 8px 10px; cursor: pointer; }
    .danger { color: var(--red); }
    .inline-form { display: inline; }
    .message { margin-bottom: 14px; border-radius: 14px; padding: 12px 14px; background: #ecfdf3; color: #067647; font-weight: 700; }
    .advice { display: grid; gap: 10px; }
    .advice div { background: var(--soft-green); border-radius: 14px; padding: 12px 14px; color: #134e4a; }
    .bars { display: grid; gap: 12px; }
    .bar-row { display: grid; gap: 7px; }
    .bar-top { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .track { height: 12px; border-radius: 999px; background: #edf2f7; overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #0f766e, #38bdf8); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
    th { color: var(--muted); font-weight: 700; }
    .amount { font-weight: 800; white-space: nowrap; }
    .positive { color: var(--green); }
    .pill { display: inline-flex; border-radius: 999px; background: #eef6f4; color: #115e59; padding: 5px 9px; font-size: 12px; font-weight: 700; }
    .empty { color: var(--muted); text-align: center; padding: 24px; }
    .table-wrap { overflow-x: auto; }
    footer { color: var(--muted); text-align: center; padding: 26px 0 6px; }
    @media (max-width: 920px) {
      .hero, .layout { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 560px) {
      .shell { padding: 14px; }
      .hero-main, .forecast, .panel, .section { border-radius: 18px; padding: 17px; }
      .metrics { grid-template-columns: 1fr; }
      .grid-2 { grid-template-columns: 1fr; }
      th, td { padding: 10px 6px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="hero">
      <section class="hero-main">
        <div class="brand">
          <strong>Money Pace</strong>
          <span class="badge">学生・若手社会人向け</span>
        </div>
        <h1>今月あといくら使えるか、すぐ分かる。</h1>
        <p>爆速入力で支出を残し、カテゴリの偏りと月末の赤字リスクをひと目で確認できます。</p>
        <div class="remaining">
          <strong>${yen(data.remaining)}</strong>
          <span>今月の残額</span>
        </div>
      </section>
      <aside class="forecast ${riskClass}">
        <h2>月末予測</h2>
        <div class="forecast-text">${prediction}</div>
        <div class="risk"><span>赤字リスク</span><strong>${data.risk}</strong></div>
        <div class="muted">残り${data.daysLeft}日 / 1日あたり ${yen(data.dailyRemaining)}</div>
      </aside>
    </div>

    <section class="metrics">
      ${card("今月の予算", yen(monthlyBudget), "いつでも変更できます")}
      ${card("今月の収入合計", yen(data.incomeTotal), `${data.monthlyIncomes.length}件`, "good")}
      ${card("今月の支出合計", yen(data.expenseTotal), `${data.monthlyExpenses.length}件`)}
      ${card("固定費合計", yen(data.fixedTotal), `${fixedCosts.length}件`)}
      ${card("今月の残額", yen(data.remaining), "予算 + 収入 - 支出 - 固定費", data.remaining < 0 ? "bad" : "good")}
      ${card("1日あたり使える金額", yen(data.dailyRemaining), "今日を含めて計算", data.dailyRemaining < 0 ? "bad" : "good")}
      ${card("月末予測", yen(data.projectedBalance), data.projectedBalance >= 0 ? "余り見込み" : "赤字見込み", data.projectedBalance < 0 ? "bad" : "good")}
      ${card("使いすぎカテゴリ", yen(data.topCategory.amount), data.topCategory.category)}
    </section>

    ${message ? `<div class="message">${escapeHtml(message)}</div>` : ""}

    <div class="layout">
      <div class="stack">
        <section class="panel quick">
          <h2>爆速支出入力</h2>
          <p>例: ラーメン 950 / 電車 420 / Netflix 1490</p>
          <form method="post" action="/quick-expense">
            <label>LINE風に1行で入力</label>
            <input name="quickText" placeholder="ラーメン 950" autocomplete="off" required>
            <button class="btn" type="submit">一瞬で登録</button>
          </form>
        </section>

        <section class="panel">
          <h2>予算設定</h2>
          <form method="post" action="/budget">
            <label>今月の予算</label>
            <input name="budget" type="number" min="1" value="${monthlyBudget}" required>
            <button class="btn" type="submit">予算を更新</button>
          </form>
        </section>

        <section class="panel">
          <h2>ワンポイントアドバイス</h2>
          <div class="advice">${advice(data).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
        </section>

        <section class="panel">
          <h2>カテゴリ別分析</h2>
          <div class="bars">
            ${data.byCategory
              .map(
                (item) => `<div class="bar-row">
                  <div class="bar-top"><strong>${escapeHtml(item.category)}</strong><span>${yen(item.amount)}</span></div>
                  <div class="track"><div class="fill" style="width:${progressPercent(item.amount, data.maxCategory)}%"></div></div>
                </div>`
              )
              .join("")}
          </div>
        </section>
      </div>

      <div class="stack">
        <section class="section">
          <h2>支出登録</h2>
          <form method="post" action="/expenses">
            <div class="grid-2">
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="1200" required></div>
              <div><label>カテゴリ</label><select name="category">${optionTags(expenseCategories)}</select></div>
            </div>
            <label>メモ</label><input name="memo" placeholder="昼食、教材、飲み会など">
            <div class="grid-2">
              <div><label>日付</label><input name="date" type="date" value="${today()}" required></div>
              <div><label>支払い方法</label><select name="paymentMethod">${optionTags(paymentMethods)}</select></div>
            </div>
            <button class="btn" type="submit">支出を登録</button>
          </form>
        </section>

        <section class="section">
          <h2>収入登録</h2>
          <form method="post" action="/incomes">
            <div class="grid-2">
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="50000" required></div>
              <div><label>収入源</label><select name="source">${optionTags(incomeSources)}</select></div>
            </div>
            <label>メモ</label><input name="memo" placeholder="6月分、単発案件など">
            <label>日付</label><input name="date" type="date" value="${today()}" required>
            <button class="btn" type="submit">収入を登録</button>
          </form>
        </section>

        <section class="section">
          <h2>固定費管理</h2>
          <form method="post" action="/fixed-costs">
            <div class="grid-2">
              <div><label>名前</label><input name="name" placeholder="スマホ代" required></div>
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="3000" required></div>
            </div>
            <div class="grid-2">
              <div><label>カテゴリ</label><select name="category">${optionTags(expenseCategories, "サブスク")}</select></div>
              <div><label>支払日</label><input name="payDay" type="number" min="1" max="31" placeholder="25" required></div>
            </div>
            <button class="btn" type="submit">固定費を登録</button>
          </form>
        </section>
      </div>
    </div>

    <section class="section" style="margin-top:18px;">
      <h2>支出履歴</h2>
      <div class="table-wrap"><table><tr><th>日付</th><th>金額</th><th>カテゴリ</th><th>メモ</th><th>支払い方法</th><th></th></tr>${renderHistoryRows(expenses, "expense")}</table></div>
    </section>

    <section class="section" style="margin-top:18px;">
      <h2>収入履歴</h2>
      <div class="table-wrap"><table><tr><th>日付</th><th>金額</th><th>収入源</th><th>メモ</th><th></th></tr>${renderHistoryRows(incomes, "income")}</table></div>
    </section>

    <section class="section" style="margin-top:18px;">
      <h2>固定費一覧</h2>
      <div class="table-wrap"><table><tr><th>名前</th><th>金額</th><th>カテゴリ</th><th>支払日</th><th></th></tr>${renderHistoryRows(fixedCosts, "fixed")}</table></div>
    </section>

    <footer>Money Pace runs on Express + Render. Data is stored in memory for this demo.</footer>
  </div>
</body>
</html>`;
}

app.get("/", (req, res) => {
  res.send(renderPage(req.query.message));
});

app.post("/quick-expense", (req, res) => {
  const parsed = parseQuickExpense(req.body.quickText);
  if (!parsed) {
    res.redirect("/?message=" + encodeURIComponent("入力形式は「メモ 金額」で入れてください"));
    return;
  }
  addExpense(parsed);
  res.redirect("/?message=" + encodeURIComponent(`${parsed.memo} を ${parsed.category} として登録しました`));
});

app.post("/expenses", (req, res) => {
  addExpense(req.body);
  res.redirect("/?message=" + encodeURIComponent("支出を登録しました"));
});

app.post("/incomes", (req, res) => {
  addIncome(req.body);
  res.redirect("/?message=" + encodeURIComponent("収入を登録しました"));
});

app.post("/fixed-costs", (req, res) => {
  addFixedCost(req.body);
  res.redirect("/?message=" + encodeURIComponent("固定費を登録しました"));
});

app.post("/budget", (req, res) => {
  const budget = getNumber(req.body.budget);
  if (budget > 0) monthlyBudget = budget;
  res.redirect("/?message=" + encodeURIComponent("予算を更新しました"));
});

app.post("/expenses/:id/delete", (req, res) => {
  removeById(expenses, req.params.id);
  res.redirect("/?message=" + encodeURIComponent("支出を削除しました"));
});

app.post("/incomes/:id/delete", (req, res) => {
  removeById(incomes, req.params.id);
  res.redirect("/?message=" + encodeURIComponent("収入を削除しました"));
});

app.post("/fixed-costs/:id/delete", (req, res) => {
  removeById(fixedCosts, req.params.id);
  res.redirect("/?message=" + encodeURIComponent("固定費を削除しました"));
});

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
