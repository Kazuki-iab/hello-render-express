const test = require("node:test");
const assert = require("node:assert/strict");

const controller = require("../controllers/appController");
const store = require("../models/store");

function renderHome(query = {}) {
  let html = "";
  controller.showHome({ query }, { send(value) { html = value; } });
  return html;
}

function captureRedirect(handler, body, params = {}) {
  let location = "";
  handler({ body, params }, { redirect(value) { location = value; } });
  return location;
}

test("home renders focused home and dedicated management views", () => {
  const html = renderHome();

  assert.match(html, /data-view="home"/);
  assert.match(html, /data-view="manage"/);
  assert.doesNotMatch(html, /data-view="manage"[^>]*hidden/);
  assert.match(html, /data-route="manage"/);
  assert.equal((html.match(/data-manage-target=/g) || []).length, 5);
  assert.equal((html.match(/data-manage-panel=/g) || []).length, 5);
});

test("management forms return to their active panel", () => {
  const incomeCount = store.incomes.length;
  const location = captureRedirect(controller.createIncome, {
    amount: "50000",
    source: "バイト代",
    memo: "6月分",
    date: store.today(),
    returnView: "manage",
    returnPanel: "income",
  });

  assert.equal(store.incomes.length, incomeCount + 1);
  assert.match(location, /#manage-income$/);
});

test("quick input keeps the user on home and infers a category", () => {
  const expenseCount = store.expenses.length;
  const location = captureRedirect(controller.createQuickExpense, { quickText: "ラーメン 950" });

  assert.equal(store.expenses.length, expenseCount + 1);
  assert.equal(store.expenses.at(-1).category, "食費");
  assert.match(location, /#home$/);
});

test("delete actions preserve the management location", () => {
  const item = store.expenses.at(-1);
  const location = captureRedirect(
    controller.deleteExpense,
    { returnView: "manage", returnPanel: "expense" },
    { id: String(item.id) }
  );

  assert.equal(store.expenses.some((expense) => expense.id === item.id), false);
  assert.match(location, /#manage-expense$/);
});
