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

function getNumber(value) {
  const number = Number(String(value || "").replace(/,/g, ""));
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function japanDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function today(now = new Date()) {
  const { year, month, day } = japanDateParts(now);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isThisMonth(dateText, now = new Date()) {
  const { year, month } = japanDateParts(now);
  return String(dateText || today(now)).startsWith(`${year}-${String(month).padStart(2, "0")}`);
}

function normalizeDate(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("日付を正しく入力してください");
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error("日付を正しく入力してください");
  }
  return text;
}

function normalizeExpense(input) {
  const amount = getNumber(input.amount);
  if (!amount) throw new Error("金額を正しく入力してください");
  return {
    amount,
    category: expenseCategories.includes(input.category) ? input.category : "その他",
    memo: String(input.memo || "").trim().slice(0, 120),
    date: normalizeDate(input.date),
    paymentMethod: paymentMethods.includes(input.paymentMethod) ? input.paymentMethod : "未設定",
  };
}

function normalizeIncome(input) {
  const amount = getNumber(input.amount);
  if (!amount) throw new Error("金額を正しく入力してください");
  return {
    amount,
    source: incomeSources.includes(input.source) ? input.source : "その他",
    memo: String(input.memo || "").trim().slice(0, 120),
    date: normalizeDate(input.date),
  };
}

function normalizeFixedCost(input) {
  const amount = getNumber(input.amount);
  const payDay = Number(input.payDay);
  if (!amount) throw new Error("金額を正しく入力してください");
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) throw new Error("支払日を正しく入力してください");
  return {
    name: String(input.name || "").trim().slice(0, 40) || "固定費",
    amount,
    category: expenseCategories.includes(input.category) ? input.category : "その他",
    payDay,
  };
}

function normalizeBudget(value) {
  const amount = getNumber(value);
  if (!amount) throw new Error("予算を正しく入力してください");
  return amount;
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
  const { year, month } = japanDateParts(date);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
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

function updateMonthlyBudget(value) {
  const budget = getNumber(value);
  if (budget > 0) monthlyBudget = budget;
}

function calculateDashboard(state, now = new Date()) {
  const source = state || { monthlyBudget, expenses, incomes, fixedCosts };
  const stateBudget = source.monthlyBudget || 80000;
  const stateExpenses = source.expenses || [];
  const stateIncomes = source.incomes || [];
  const stateFixedCosts = source.fixedCosts || [];
  const monthlyExpenses = stateExpenses.filter((item) => isThisMonth(item.date, now));
  const monthlyIncomes = stateIncomes.filter((item) => isThisMonth(item.date, now));
  const expenseTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
  const fixedTotal = stateFixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const remaining = stateBudget + incomeTotal - expenseTotal - fixedTotal;
  const { day: currentDay } = japanDateParts(now);
  const daysLeft = Math.max(daysInMonth(now) - currentDay + 1, 1);
  const dayOfMonth = Math.max(currentDay, 1);
  const dailyRemaining = Math.floor(remaining / daysLeft);
  const paceExpense = (expenseTotal / dayOfMonth) * daysInMonth(now);
  const projectedBalance = Math.round(stateBudget + incomeTotal - fixedTotal - paceExpense);
  const budgetUsed = Math.min(Math.round(((expenseTotal + fixedTotal) / Math.max(stateBudget, 1)) * 100), 999);
  const risk = projectedBalance < 0 ? "高" : projectedBalance < stateBudget * 0.08 ? "中" : "低";
  const byCategory = expenseCategories.map((category) => ({
    category,
    amount: monthlyExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
  }));
  const maxCategory = Math.max(...byCategory.map((item) => item.amount), 1);
  const topCategory = byCategory.slice().sort((a, b) => b.amount - a.amount)[0];

  return {
    monthlyBudget: stateBudget,
    expenses: stateExpenses,
    incomes: stateIncomes,
    fixedCosts: stateFixedCosts,
    monthlyExpenses,
    monthlyIncomes,
    expenseTotal,
    incomeTotal,
    fixedTotal,
    remaining,
    daysLeft,
    dailyRemaining,
    projectedBalance,
    budgetUsed,
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
    messages.push("食費がやや多めです。外食やコンビニを少し抑えると、月末に余裕が作れます。");
  }
  if (data.fixedTotal / data.monthlyBudget >= 0.3) {
    messages.push("固定費が重めです。サブスクや通信費を見直すと、毎月の負担を軽くできます。");
  }
  if (data.remaining < data.monthlyBudget * 0.15) {
    messages.push("残額が少なくなっています。今週は大きな買い物を控えると安心です。");
  }
  if (data.projectedBalance >= 0 && data.risk === "低") {
    messages.push("今月は良いペースです。このままなら予算内に収まりそうです。");
  }
  if (messages.length === 0) {
    messages.push("今のところ安定したペースです。気づいた時に1行で追加していきましょう。");
  }
  return messages;
}

export {
  expenseCategories,
  incomeSources,
  paymentMethods,
  expenses,
  incomes,
  fixedCosts,
  yen,
  today,
  japanDateParts,
  parseQuickExpense,
  normalizeExpense,
  normalizeIncome,
  normalizeFixedCost,
  normalizeBudget,
  addExpense,
  addIncome,
  addFixedCost,
  removeById,
  updateMonthlyBudget,
  calculateDashboard,
  advice,
};
