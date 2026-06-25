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

function icon(name) {
  const icons = {
    target: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg>`,
    wallet: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5z"></path><path d="M4 8h16a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4.5a2.5 2.5 0 0 1 0-5H22"></path><path d="M16 12h.01"></path></svg>`,
    receipt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10a2 2 0 0 1 2 2v16l-3-2-2 2-2-2-2 2-2-2-3 2V5a2 2 0 0 1 2-2z"></path><path d="M9 8h6M9 12h6M9 16h4"></path></svg>`,
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10v10h14V10"></path><path d="M9 20v-6h6v6"></path></svg>`,
    chart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16V9"></path><path d="M12 16V6"></path><path d="M16 16v-4"></path></svg>`,
    trend: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 16l5-5 4 4 7-8"></path><path d="M15 7h5v5"></path></svg>`,
    spark: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6z"></path><path d="M19 16l.8 3.2L23 20l-3.2.8L19 24l-.8-3.2L15 20l3.2-.8z"></path></svg>`,
  };
  return icons[name] || icons.spark;
}

function logoMark() {
  return `<svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="4" y="4" width="40" height="40" rx="14"></rect>
    <path d="M15 30V18l9 7 9-7v12"></path>
    <path d="M15 18h18"></path>
  </svg>`;
}

function card(label, value, note, tone = "", iconName = "spark") {
  return `<article class="metric ${tone}">
    <div class="metric-icon">${icon(iconName)}</div>
    <div>
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${note}</small>
    </div>
  </article>`;
}

function renderPage(message = "") {
  const data = calculateDashboard();
  const hasData = expenses.length > 0 || incomes.length > 0 || fixedCosts.length > 0;
  const prediction =
    !hasData
      ? "支出を記録すると、月末の見通しを自動で表示します。"
      : data.projectedBalance >= 0
      ? `このペースなら、月末に ${yen(data.projectedBalance)} ほど残りそうです。`
      : `このペースだと、月末に ${yen(Math.abs(data.projectedBalance))} ほどオーバーしそうです。`;
  const riskClass = data.risk === "高" ? "risk-high" : data.risk === "中" ? "risk-mid" : "risk-low";
  const heroAmount = hasData ? yen(data.remaining) : "まだデータがありません";
  const heroSubcopy = hasData ? `今日あと ${yen(data.dailyRemaining)} 使えます` : "最初の支出を1行で記録しましょう";

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
      --focus: 0 0 0 4px rgba(16, 185, 129, 0.18);
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
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
    .shell { max-width: 1200px; margin: 0 auto; padding: 28px; }
    .topbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 22px; }
    .logo { display: flex; align-items: center; gap: 12px; color: var(--navy); font-size: 23px; font-weight: 850; letter-spacing: -.01em; }
    .logo-mark { display: grid; place-items: center; width: 42px; height: 42px; }
    .brand-mark { width: 42px; height: 42px; filter: drop-shadow(0 12px 20px rgba(15, 23, 42, .16)); }
    .brand-mark rect { fill: var(--navy); }
    .brand-mark path { fill: none; stroke: white; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
    .topbar .tagline { color: var(--muted); font-size: 14px; }
    .hero { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(300px, 0.75fr); gap: 18px; align-items: stretch; }
    .hero-main {
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 82% 76%, rgba(16, 185, 129, .24), transparent 19rem),
        linear-gradient(145deg, #050b18 0%, var(--navy) 52%, #123142 100%);
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
    .eyebrow { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); padding: 8px 12px; color: rgba(255,255,255,.84); font-size: 13px; font-weight: 750; }
    .eyebrow svg { width: 15px; height: 15px; stroke: currentColor; fill: none; stroke-width: 2; }
    h1 { margin: 22px 0 12px; max-width: 720px; font-size: clamp(38px, 5.4vw, 72px); line-height: 1.01; letter-spacing: -.02em; }
    .hero-main p { color: rgba(255, 255, 255, 0.78); font-size: 16px; line-height: 1.8; max-width: 640px; }
    .hero-amount { margin-top: 30px; position: relative; z-index: 1; }
    .hero-amount span { display: block; color: rgba(255, 255, 255, 0.72); font-size: 14px; font-weight: 700; }
    .hero-amount strong { display: block; margin-top: 8px; font-size: clamp(60px, 10vw, 120px); line-height: .88; letter-spacing: -.04em; font-variant-numeric: tabular-nums; animation: numberIn .34s ease both; }
    .hero-amount .empty-hero { max-width: 620px; font-size: clamp(34px, 6vw, 66px); line-height: 1.05; letter-spacing: -.02em; }
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
    .forecast-text { font-size: 21px; font-weight: 850; line-height: 1.55; color: var(--navy); letter-spacing: -.01em; }
    .forecast-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
    .forecast-grid div { border: 1px solid var(--line); border-radius: 18px; padding: 14px; background: rgba(248, 250, 252, .86); }
    .forecast-grid span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; }
    .forecast-grid strong { display: block; margin-top: 6px; color: var(--navy); font-size: 22px; font-weight: 900; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
    .risk-low .forecast-grid div:nth-child(2) strong { color: var(--emerald-dark); }
    .risk-mid .forecast-grid div:nth-child(2) strong { color: var(--warning); }
    .risk-high .forecast-grid div:nth-child(2) strong { color: var(--danger); }
    .muted { color: var(--muted); font-size: 13px; line-height: 1.7; }
    .quick {
      margin: 18px 0;
      background:
        linear-gradient(180deg, rgba(255,255,255,.96), rgba(255,255,255,.9)),
        radial-gradient(circle at top right, rgba(16, 185, 129, .22), transparent 18rem);
      border: 1px solid rgba(16, 185, 129, 0.2);
      border-radius: 30px;
      padding: 24px;
      box-shadow: var(--shadow);
    }
    .quick-head { display: flex; justify-content: space-between; align-items: end; gap: 18px; margin-bottom: 16px; }
    .quick h2 { font-size: clamp(28px, 3.4vw, 40px); letter-spacing: -.02em; }
    .quick p { color: var(--muted); margin: 8px 0 0; line-height: 1.7; }
    .quick-form { display: grid; grid-template-columns: minmax(0, 1fr) 170px; gap: 12px; align-items: center; }
    .quick input { margin: 0; border-radius: 22px; padding: 22px 23px; font-size: 23px; border: 1px solid var(--line); background: var(--panel-soft); box-shadow: inset 0 1px 0 rgba(255,255,255,.65); }
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
      transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
    }
    .metric:hover, .panel:hover, .section:hover { transform: translateY(-2px); box-shadow: var(--soft-shadow); background: white; }
    .metric-icon { flex: 0 0 34px; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 13px; background: var(--panel-soft); }
    .metric-icon svg { width: 19px; height: 19px; fill: none; stroke: var(--navy); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .metric span, label { color: var(--muted); font-size: 13px; font-weight: 700; }
    .metric strong { display: block; margin: 7px 0 3px; color: var(--navy); font-size: 22px; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
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
    input:focus, select:focus { border-color: var(--emerald); box-shadow: var(--focus); background: white; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .btn {
      position: relative;
      overflow: hidden;
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
    .btn:active { transform: translateY(1px) scale(.99); box-shadow: 0 10px 22px rgba(16, 185, 129, 0.22); }
    .btn:focus-visible, .ghost:focus-visible { outline: none; box-shadow: var(--focus); }
    .btn.is-loading { color: transparent; pointer-events: none; }
    .btn.is-loading::after {
      content: "";
      position: absolute;
      inset: 0;
      margin: auto;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,.55);
      border-top-color: white;
      animation: spin .65s linear infinite;
    }
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
    .empty { color: var(--muted); text-align: center; padding: 30px 18px; line-height: 1.7; }
    .table-wrap { overflow-x: auto; }
    footer { color: var(--muted); text-align: center; padding: 26px 0 6px; }
    @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes numberIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes spin { to { transform: rotate(360deg); } }
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
      .forecast-grid { grid-template-columns: 1fr; }
      th, td { padding: 10px 6px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; scroll-behavior: auto !important; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="logo"><span class="logo-mark">${logoMark()}</span><span>Money Pace</span></div>
      <div class="tagline">入力は短く。お金の流れは、ひと目で。</div>
    </header>

    <div class="hero">
      <section class="hero-main">
        <span class="eyebrow">${icon("spark")} 学生・若手社会人のための支出管理</span>
        <h1>今月あといくら使えるかが、ひと目で分かる。</h1>
        <p>支出は1行で記録。今日の使える目安と月末の見通しを、毎日開きたくなる画面で確認できます。</p>
        <div class="hero-amount">
          <span>あと使える金額</span>
          <strong class="${hasData ? "" : "empty-hero"}">${heroAmount}</strong>
          <div class="today-budget">${heroSubcopy}</div>
        </div>
      </section>
      <aside class="focus-card ${riskClass}">
        <h2>月末予測</h2>
        <div class="forecast-text">${prediction}</div>
        <div class="forecast-grid">
          <div><span>予測残額</span><strong>${hasData ? yen(data.projectedBalance) : "-"}</strong></div>
          <div><span>赤字リスク</span><strong>${hasData ? data.risk : "-"}</strong></div>
          <div><span>残り日数</span><strong>${data.daysLeft}日</strong></div>
          <div><span>今日の目安</span><strong>${hasData ? yen(data.dailyRemaining) : "-"}</strong></div>
        </div>
      </aside>
    </div>

    <section class="quick">
      <div class="quick-head">
        <div>
          <h2>爆速入力</h2>
          <p>メモと金額だけで、支出をすばやく記録できます。カテゴリは自動で推定します。</p>
        </div>
        <div class="examples">
          <span class="example">ラーメン 950</span>
          <span class="example">電車 420</span>
          <span class="example">Netflix 1490</span>
          <span class="example">カフェ 650</span>
        </div>
      </div>
      <form method="post" action="/quick-expense" class="quick-form">
        <label class="sr-only" for="quickText">支出を1行で入力</label>
        <input id="quickText" name="quickText" placeholder="ラーメン 950 / 電車 420 / Netflix 1490" autocomplete="off" required>
        <button class="btn" type="submit">記録する</button>
      </form>
    </section>

    <section class="metrics">
      ${card("今月の予算", yen(monthlyBudget), "あとから変更できます", "", "target")}
      ${card("収入", yen(data.incomeTotal), `${data.monthlyIncomes.length}件`, "good", "wallet")}
      ${card("支出", yen(data.expenseTotal), `${data.monthlyExpenses.length}件`, "", "receipt")}
      ${card("固定費", yen(data.fixedTotal), `${fixedCosts.length}件`, "", "home")}
      ${card("支出が多いカテゴリ", hasData ? yen(data.topCategory.amount) : "-", hasData ? data.topCategory.category : "記録後に表示", "", "chart")}
      ${card("月末の見込み", hasData ? yen(data.projectedBalance) : "-", hasData ? (data.projectedBalance >= 0 ? "残る見込み" : "赤字見込み") : "記録後に表示", data.projectedBalance < 0 ? "bad" : "good", "trend")}
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
  <script>
    document.querySelectorAll("form").forEach((form) => {
      form.addEventListener("submit", () => {
        const button = form.querySelector("button");
        if (!button || button.classList.contains("danger")) return;
        button.classList.add("is-loading");
        button.setAttribute("aria-busy", "true");
      });
    });
  </script>
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
