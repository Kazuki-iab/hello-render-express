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
    messages.push("食費が少し多めです。外食やコンビニを少し抑えるだけで、月末の余裕が作れます。");
  }
  if (data.fixedTotal / monthlyBudget >= 0.3) {
    messages.push("固定費の割合が高めです。サブスクや通信費を見直すと、毎月の負担を軽くできます。");
  }
  if (data.remaining < monthlyBudget * 0.15) {
    messages.push("残額が少なくなっています。今週は大きな買い物を控えると安心です。");
  }
  if (data.projectedBalance >= monthlyBudget * 0.15 && data.risk === "低") {
    messages.push("今月はかなり良いペースです。余った分を貯金や来月の予備費に回せそうです。");
  }
  if (messages.length === 0) {
    messages.push("今のところ安定したペースです。気づいた時に1行で記録していきましょう。");
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

function card(label, value, note, tone = "", icon = "•") {
  return `<article class="metric ${tone}">
    <div class="metric-icon">${icon}</div>
    <div>
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </div>
  </article>`;
}

function renderPage(message = "") {
  const data = calculateDashboard();
  const prediction =
    data.projectedBalance >= 0
      ? `このペースなら、月末に ${yen(data.projectedBalance)} ほど残りそうです。`
      : `このペースだと、月末に ${yen(Math.abs(data.projectedBalance))} ほどオーバーしそうです。`;
  const riskClass = data.risk === "高" ? "risk-high" : data.risk === "中" ? "risk-mid" : "risk-low";

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Money Pace</title>
  <style>
    :root {
      --bg: #f6f8fb;
      --panel: #ffffff;
      --panel-soft: #f8fafc;
      --navy: #0f172a;
      --navy-soft: #1e293b;
      --ink: #111827;
      --muted: #667085;
      --line: #e5e7eb;
      --emerald: #10b981;
      --emerald-dark: #059669;
      --emerald-soft: #ecfdf5;
      --danger: #dc2626;
      --warning: #b45309;
      --shadow: 0 24px 70px rgba(15, 23, 42, 0.10);
      --soft-shadow: 0 14px 36px rgba(15, 23, 42, 0.07);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(16, 185, 129, 0.16), transparent 34rem),
        linear-gradient(180deg, #ffffff 0%, var(--bg) 42%);
      color: var(--ink);
      letter-spacing: 0;
    }
    button, input, select { font: inherit; }
    .shell { max-width: 1200px; margin: 0 auto; padding: 28px; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
    .logo { display: flex; align-items: center; gap: 10px; color: var(--navy); font-size: 22px; font-weight: 800; }
    .logo-mark { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 13px; background: var(--navy); color: white; box-shadow: var(--soft-shadow); }
    .topbar .tagline { color: var(--muted); font-size: 14px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr); gap: 18px; align-items: stretch; }
    .hero-main {
      position: relative;
      overflow: hidden;
      background: linear-gradient(145deg, var(--navy) 0%, #123142 64%, #0f766e 100%);
      color: white;
      border-radius: 32px;
      padding: clamp(26px, 5vw, 46px);
      box-shadow: var(--shadow);
      min-height: 360px;
    }
    .hero-main::after {
      content: "";
      position: absolute;
      inset: auto -80px -120px auto;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.24);
      filter: blur(2px);
    }
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); padding: 8px 12px; color: rgba(255,255,255,.82); font-size: 13px; font-weight: 700; }
    h1 { margin: 22px 0 12px; max-width: 720px; font-size: clamp(34px, 5vw, 64px); line-height: 1.04; letter-spacing: 0; }
    .hero-main p { color: rgba(255, 255, 255, 0.78); font-size: 16px; line-height: 1.8; max-width: 640px; }
    .hero-amount { margin-top: 30px; position: relative; z-index: 1; }
    .hero-amount span { display: block; color: rgba(255, 255, 255, 0.72); font-size: 14px; font-weight: 700; }
    .hero-amount strong { display: block; margin-top: 8px; font-size: clamp(54px, 9vw, 104px); line-height: .9; letter-spacing: 0; }
    .today-budget { display: inline-flex; margin-top: 18px; border-radius: 18px; padding: 12px 16px; background: rgba(255,255,255,.12); color: white; font-weight: 800; }
    .focus-card {
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(255, 255, 255, 0.78);
      border-radius: 32px;
      padding: 24px;
      box-shadow: var(--shadow);
      backdrop-filter: blur(18px);
      display: grid;
      align-content: space-between;
      gap: 18px;
    }
    .focus-card h2, .section h2, .panel h2 { margin: 0; color: var(--navy); font-size: 20px; letter-spacing: 0; }
    .forecast-text { font-size: 22px; font-weight: 850; line-height: 1.55; color: var(--navy); }
    .risk { display: flex; justify-content: space-between; align-items: center; border-radius: 20px; padding: 16px; background: var(--panel-soft); }
    .risk strong { font-size: 28px; }
    .risk-low strong { color: var(--emerald-dark); }
    .risk-mid strong { color: var(--warning); }
    .risk-high strong { color: var(--danger); }
    .muted { color: var(--muted); font-size: 13px; line-height: 1.7; }
    .quick {
      margin: 18px 0;
      background: var(--panel);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 30px;
      padding: 24px;
      box-shadow: var(--shadow);
    }
    .quick-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 16px; }
    .quick h2 { font-size: clamp(24px, 3vw, 34px); }
    .quick p { color: var(--muted); margin: 8px 0 0; line-height: 1.7; }
    .quick-form { display: grid; grid-template-columns: minmax(0, 1fr) 170px; gap: 12px; align-items: center; }
    .quick input { margin: 0; border-radius: 22px; padding: 21px 22px; font-size: 22px; border: 1px solid var(--line); background: var(--panel-soft); }
    .examples { display: flex; flex-wrap: wrap; gap: 8px; }
    .example { border-radius: 999px; background: var(--emerald-soft); color: #047857; padding: 7px 11px; font-size: 13px; font-weight: 700; }
    .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(185px, 1fr)); gap: 14px; margin: 18px 0; }
    .metric {
      display: flex;
      gap: 13px;
      align-items: flex-start;
      background: rgba(255, 255, 255, 0.82);
      border: 1px solid rgba(226, 232, 240, 0.9);
      border-radius: 22px;
      padding: 16px;
      box-shadow: 0 8px 26px rgba(15, 23, 42, 0.045);
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
    }
    .metric:hover, .panel:hover, .section:hover { transform: translateY(-2px); box-shadow: var(--soft-shadow); }
    .metric-icon { flex: 0 0 34px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 13px; background: var(--panel-soft); }
    .metric span, label { color: var(--muted); font-size: 13px; font-weight: 700; }
    .metric strong { display: block; margin: 7px 0 3px; color: var(--navy); font-size: 20px; letter-spacing: 0; }
    .metric small { color: var(--muted); line-height: 1.5; }
    .good strong { color: var(--emerald-dark); }
    .bad strong { color: var(--danger); }
    .layout { display: grid; grid-template-columns: minmax(320px, 0.85fr) minmax(0, 1.15fr); gap: 18px; align-items: start; }
    .stack { display: grid; gap: 18px; }
    .panel, .section {
      background: rgba(255, 255, 255, 0.88);
      border: 1px solid rgba(226, 232, 240, 0.95);
      border-radius: 26px;
      padding: 22px;
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.045);
      transition: transform .18s ease, box-shadow .18s ease;
    }
    form { margin: 0; }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 16px;
      padding: 15px 16px;
      margin: 8px 0 14px;
      background: #ffffff;
      color: var(--ink);
      outline: none;
      transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
    }
    input:focus, select:focus { border-color: var(--emerald); box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.13); background: white; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .btn {
      width: 100%;
      border: 0;
      border-radius: 16px;
      padding: 16px 18px;
      background: var(--emerald);
      color: white;
      font-weight: 850;
      cursor: pointer;
      box-shadow: 0 14px 30px rgba(16, 185, 129, 0.24);
      transition: transform .16s ease, box-shadow .16s ease, background .16s ease;
    }
    .btn:hover { transform: translateY(-1px); background: var(--emerald-dark); box-shadow: 0 18px 34px rgba(16, 185, 129, 0.28); }
    .ghost { border: 1px solid var(--line); background: white; color: var(--ink); border-radius: 12px; padding: 8px 10px; cursor: pointer; transition: background .16s ease, transform .16s ease; }
    .ghost:hover { transform: translateY(-1px); background: #f9fafb; }
    .danger { color: var(--danger); }
    .inline-form { display: inline; }
    .message { margin-bottom: 14px; border-radius: 16px; padding: 13px 15px; background: var(--emerald-soft); color: #047857; font-weight: 800; animation: rise .24s ease both; }
    .advice { display: grid; gap: 10px; }
    .advice div { background: var(--emerald-soft); border-radius: 16px; padding: 13px 14px; color: #065f46; line-height: 1.7; }
    .bars { display: grid; gap: 12px; }
    .bar-row { display: grid; gap: 7px; }
    .bar-top { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; color: var(--navy); }
    .track { height: 12px; border-radius: 999px; background: #edf2f7; overflow: hidden; }
    .fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, var(--emerald), #34d399); transition: width .35s ease; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 12px 8px; border-bottom: 1px solid var(--line); text-align: left; vertical-align: middle; }
    th { color: var(--muted); font-weight: 700; }
    .amount { font-weight: 800; white-space: nowrap; }
    .positive { color: var(--emerald-dark); }
    .pill { display: inline-flex; border-radius: 999px; background: var(--emerald-soft); color: #047857; padding: 5px 9px; font-size: 12px; font-weight: 800; }
    .empty { color: var(--muted); text-align: center; padding: 24px; }
    .table-wrap { overflow-x: auto; }
    footer { color: var(--muted); text-align: center; padding: 26px 0 6px; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @media (max-width: 920px) {
      .hero, .layout { grid-template-columns: 1fr; }
      .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .quick-form { grid-template-columns: 1fr; }
    }
    @media (max-width: 560px) {
      .shell { padding: 16px; }
      .topbar { align-items: flex-start; flex-direction: column; }
      .hero-main, .focus-card, .quick, .panel, .section { border-radius: 22px; padding: 18px; }
      .hero-main { min-height: 330px; }
      .metrics { grid-template-columns: 1fr; }
      .grid-2 { grid-template-columns: 1fr; }
      .quick-head { display: block; }
      .quick input { font-size: 18px; padding: 18px; }
      th, td { padding: 10px 6px; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="logo"><span class="logo-mark">💰</span><span>Money Pace</span></div>
      <div class="tagline">入力は短く。お金の流れは、ひと目で。</div>
    </header>

    <div class="hero">
      <section class="hero-main">
        <span class="eyebrow">🎯 学生・若手社会人のための支出管理</span>
        <h1>今月あといくら使えるかが、ひと目で分かる。</h1>
        <p>支出は1行で記録。残額、今日使える目安、月末の見通しをすぐ確認できます。</p>
        <div class="hero-amount">
          <span>あと使える金額</span>
          <strong>${yen(data.remaining)}</strong>
          <div class="today-budget">今日はあと ${yen(data.dailyRemaining)} 使えます</div>
        </div>
      </section>
      <aside class="focus-card ${riskClass}">
        <h2>月末予測</h2>
        <div class="forecast-text">${prediction}</div>
        <div class="risk"><span>赤字リスク</span><strong>${data.risk}</strong></div>
        <div class="muted">残り${data.daysLeft}日。今日使える目安は ${yen(data.dailyRemaining)} です。</div>
      </aside>
    </div>

    <section class="quick">
      <div class="quick-head">
        <div>
          <h2>爆速入力</h2>
          <p>メモと金額だけで登録できます。カテゴリは自動で推定します。</p>
        </div>
        <div class="examples">
          <span class="example">ラーメン 950</span>
          <span class="example">Netflix 1490</span>
          <span class="example">電車 420</span>
        </div>
      </div>
      <form method="post" action="/quick-expense" class="quick-form">
        <input name="quickText" placeholder="例: ラーメン 950" autocomplete="off" required>
        <button class="btn" type="submit">記録する</button>
      </form>
    </section>

    <section class="metrics">
      ${card("今月の予算", yen(monthlyBudget), "あとから変更できます", "", "🎯")}
      ${card("収入", yen(data.incomeTotal), `${data.monthlyIncomes.length}件`, "good", "💰")}
      ${card("支出", yen(data.expenseTotal), `${data.monthlyExpenses.length}件`, "", "🍔")}
      ${card("固定費", yen(data.fixedTotal), `${fixedCosts.length}件`, "", "🏠")}
      ${card("支出が多いカテゴリ", yen(data.topCategory.amount), data.topCategory.category, "", "📊")}
      ${card("月末の見込み", yen(data.projectedBalance), data.projectedBalance >= 0 ? "残る見込み" : "赤字見込み", data.projectedBalance < 0 ? "bad" : "good", "📈")}
    </section>

    ${message ? `<div class="message">${escapeHtml(message)}</div>` : ""}

    <div class="layout">
      <div class="stack">
        <section class="panel">
          <h2>予算設定</h2>
          <form method="post" action="/budget">
            <label>今月の予算</label>
            <input name="budget" type="number" min="1" value="${monthlyBudget}" required>
            <button class="btn" type="submit">予算を保存</button>
          </form>
        </section>

        <section class="panel">
          <h2>今月のアドバイス</h2>
          <div class="advice">${advice(data).map((item) => `<div>${escapeHtml(item)}</div>`).join("")}</div>
        </section>

        <section class="panel">
          <h2>カテゴリ別の支出</h2>
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
          <h2>支出を追加</h2>
          <form method="post" action="/expenses">
            <div class="grid-2">
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 1200" required></div>
              <div><label>カテゴリ</label><select name="category">${optionTags(expenseCategories)}</select></div>
            </div>
            <label>メモ</label><input name="memo" placeholder="例: 昼食、教材、飲み会">
            <div class="grid-2">
              <div><label>日付</label><input name="date" type="date" value="${today()}" required></div>
              <div><label>支払い方法</label><select name="paymentMethod">${optionTags(paymentMethods)}</select></div>
            </div>
            <button class="btn" type="submit">支出を登録</button>
          </form>
        </section>

        <section class="section">
          <h2>収入を追加</h2>
          <form method="post" action="/incomes">
            <div class="grid-2">
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 50000" required></div>
              <div><label>収入源</label><select name="source">${optionTags(incomeSources)}</select></div>
            </div>
            <label>メモ</label><input name="memo" placeholder="例: 6月分、単発案件">
            <label>日付</label><input name="date" type="date" value="${today()}" required>
            <button class="btn" type="submit">収入を登録</button>
          </form>
        </section>

        <section class="section">
          <h2>固定費を管理</h2>
          <form method="post" action="/fixed-costs">
            <div class="grid-2">
              <div><label>名前</label><input name="name" placeholder="例: スマホ代" required></div>
              <div><label>金額</label><input name="amount" type="number" min="1" placeholder="例: 3000" required></div>
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

    <footer>Money Pace はデモ用アプリです。入力したデータはサーバー再起動時にリセットされます。</footer>
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
    res.redirect("/?message=" + encodeURIComponent("「ラーメン 950」のように、メモと金額を入力してください"));
    return;
  }
  addExpense(parsed);
  res.redirect("/?message=" + encodeURIComponent(`${parsed.memo}を「${parsed.category}」として記録しました`));
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
