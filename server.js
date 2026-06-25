const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;
const MONTHLY_BUDGET = 80000;

app.use(express.urlencoded({ extended: false }));

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

function yen(amount) {
  return `${Number(amount || 0).toLocaleString("ja-JP")} 円`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isThisMonth(dateText) {
  const date = dateText ? new Date(dateText) : new Date();
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function options(items, selected) {
  return items
    .map((item) => `<option value="${escapeHtml(item)}"${item === selected ? " selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");
}

function renderRows(items, columns) {
  if (items.length === 0) {
    return `<tr><td colspan="${columns.length}">まだ登録がありません</td></tr>`;
  }

  return items
    .slice()
    .reverse()
    .map(
      (item) => `<tr>${columns
        .map((column) => `<td>${column.format ? column.format(item[column.key], item) : escapeHtml(item[column.key])}</td>`)
        .join("")}</tr>`
    )
    .join("");
}

function renderPage() {
  const monthlyExpenses = expenses.filter((item) => isThisMonth(item.date));
  const monthlyIncomes = incomes.filter((item) => isThisMonth(item.date));
  const expenseTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
  const fixedTotal = fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const remaining = MONTHLY_BUDGET + incomeTotal - expenseTotal - fixedTotal;
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(lastDay - now.getDate() + 1, 1);
  const dailyRemaining = Math.floor(remaining / daysLeft);
  const byCategory = expenseCategories.map((category) => ({
    category,
    amount: monthlyExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
  }));

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>爆速支出管理</title>
  <style>
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f7f7f5; color: #1f2933; }
    header, main { max-width: 1120px; margin: 0 auto; padding: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin: 0 0 12px; font-size: 18px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-top: 20px; }
    .card, form, section { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
    .label { color: #667085; font-size: 13px; }
    .value { margin-top: 6px; font-size: 22px; font-weight: 700; }
    .forms, .tables { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-top: 16px; }
    input, select, button { width: 100%; box-sizing: border-box; padding: 10px; margin: 6px 0 10px; border: 1px solid #cbd5e1; border-radius: 6px; font: inherit; }
    button { background: #2563eb; color: #fff; border: 0; font-weight: 700; cursor: pointer; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: top; }
    th { color: #475569; }
  </style>
</head>
<body>
  <header>
    <h1>爆速支出管理</h1>
    <p>今月あといくら使えるかをすぐ確認できます。</p>
    <div class="summary">
      <div class="card"><div class="label">今月の予算</div><div class="value">${yen(MONTHLY_BUDGET)}</div></div>
      <div class="card"><div class="label">今月の収入合計</div><div class="value">${yen(incomeTotal)}</div></div>
      <div class="card"><div class="label">今月の支出合計</div><div class="value">${yen(expenseTotal)}</div></div>
      <div class="card"><div class="label">固定費合計</div><div class="value">${yen(fixedTotal)}</div></div>
      <div class="card"><div class="label">今月の残額</div><div class="value">${yen(remaining)}</div></div>
      <div class="card"><div class="label">1日あたり使える金額</div><div class="value">${yen(dailyRemaining)}</div></div>
    </div>
  </header>
  <main>
    <div class="forms">
      <form method="post" action="/expenses">
        <h2>支出登録</h2>
        <input name="amount" type="number" min="1" placeholder="金額" required>
        <select name="category">${options(expenseCategories)}</select>
        <input name="memo" placeholder="メモ">
        <input name="date" type="date" value="${today()}" required>
        <input name="paymentMethod" placeholder="支払い方法">
        <button>支出を登録</button>
      </form>
      <form method="post" action="/incomes">
        <h2>収入登録</h2>
        <input name="amount" type="number" min="1" placeholder="金額" required>
        <select name="source">${options(incomeSources)}</select>
        <input name="memo" placeholder="メモ">
        <input name="date" type="date" value="${today()}" required>
        <button>収入を登録</button>
      </form>
      <form method="post" action="/fixed-costs">
        <h2>固定費登録</h2>
        <input name="name" placeholder="名前" required>
        <input name="amount" type="number" min="1" placeholder="金額" required>
        <select name="category">${options(expenseCategories)}</select>
        <input name="payDay" type="number" min="1" max="31" placeholder="支払日" required>
        <button>固定費を登録</button>
      </form>
    </div>
    <div class="tables">
      <section>
        <h2>カテゴリ別支出集計</h2>
        <table><tr><th>カテゴリ</th><th>金額</th></tr>${renderRows(byCategory, [
          { key: "category" },
          { key: "amount", format: yen },
        ])}</table>
      </section>
      <section>
        <h2>支出履歴</h2>
        <table><tr><th>日付</th><th>金額</th><th>カテゴリ</th><th>メモ</th><th>支払い方法</th></tr>${renderRows(expenses, [
          { key: "date" },
          { key: "amount", format: yen },
          { key: "category" },
          { key: "memo" },
          { key: "paymentMethod" },
        ])}</table>
      </section>
      <section>
        <h2>収入履歴</h2>
        <table><tr><th>日付</th><th>金額</th><th>収入源</th><th>メモ</th></tr>${renderRows(incomes, [
          { key: "date" },
          { key: "amount", format: yen },
          { key: "source" },
          { key: "memo" },
        ])}</table>
      </section>
      <section>
        <h2>固定費一覧</h2>
        <table><tr><th>名前</th><th>金額</th><th>カテゴリ</th><th>支払日</th></tr>${renderRows(fixedCosts, [
          { key: "name" },
          { key: "amount", format: yen },
          { key: "category" },
          { key: "payDay", format: (value) => `${escapeHtml(value)}日` },
        ])}</table>
      </section>
    </div>
  </main>
</body>
</html>`;
}

app.get("/", (req, res) => {
  res.send(renderPage());
});

app.post("/expenses", (req, res) => {
  expenses.push({
    amount: getNumber(req.body.amount),
    category: req.body.category || "その他",
    memo: req.body.memo,
    date: req.body.date || today(),
    paymentMethod: req.body.paymentMethod,
  });
  res.redirect("/");
});

app.post("/incomes", (req, res) => {
  incomes.push({
    amount: getNumber(req.body.amount),
    source: req.body.source || "その他",
    memo: req.body.memo,
    date: req.body.date || today(),
  });
  res.redirect("/");
});

app.post("/fixed-costs", (req, res) => {
  fixedCosts.push({
    name: req.body.name,
    amount: getNumber(req.body.amount),
    category: req.body.category || "その他",
    payDay: req.body.payDay,
  });
  res.redirect("/");
});

app.listen(PORT, () => {
  console.log(`Server started on ${PORT}`);
});
