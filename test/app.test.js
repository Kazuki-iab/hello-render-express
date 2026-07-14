import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import controller from "../controllers/appController.js";
import * as store from "../models/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

test("home renders four focused app views", () => {
  const html = renderHome();

  assert.match(html, /data-view="home"/);
  assert.match(html, /data-view="input"/);
  assert.match(html, /data-view="history"/);
  assert.match(html, /data-view="manage"/);
  assert.doesNotMatch(html, /data-view="manage"[^>]*hidden/);
  assert.match(html, /data-route="manage"/);
  assert.equal((html.match(/data-route="input"/g) || []).length >= 2, true);
  assert.equal((html.match(/data-route="history"/g) || []).length >= 2, true);
  assert.match(html, /class="balance-overview"/);
  assert.match(html, /class="pace-strip"/);
  assert.match(html, /class="quick-entry quick-command"/);
  assert.match(html, /class="activity-layout ledger-layout"/);
  assert.match(html, /class="text-action" href="#history" data-route="history">履歴を見る/);
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

test("quick input returns to the conversation and infers a category", () => {
  const expenseCount = store.expenses.length;
  const location = captureRedirect(controller.createQuickExpense, { quickText: "ラーメン 950" });

  assert.equal(store.expenses.length, expenseCount + 1);
  assert.equal(store.expenses.at(-1).category, "食費");
  assert.match(location, /#input$/);
});

test("input view renders a conversation composer", () => {
  const html = renderHome();

  assert.match(html, /class="chat-shell"/);
  assert.match(html, /class="chat-thread"/);
  assert.match(html, /class="chat-composer"/);
  assert.match(html, /action="\/quick-expense"/);
});

test("history view renders every day in the current month", () => {
  const html = renderHome();
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  assert.match(html, /class="calendar-grid"/);
  assert.equal((html.match(/data-calendar-day=/g) || []).length, daysInMonth);
  assert.equal((html.match(/data-day-panel=/g) || []).length, daysInMonth);
});

test("client navigation supports four routes and calendar selection", () => {
  const client = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

  assert.match(client, /supportedRoutes = new Set\(\["home", "input", "history", "manage"\]\)/);
  assert.match(client, /function setCalendarDay/);
});

test("client prevents duplicate form submissions", () => {
  const client = fs.readFileSync(path.join(__dirname, "..", "public", "app.js"), "utf8");

  assert.match(client, /form\.dataset\.submitting === "true"/);
  assert.match(client, /button\.disabled = true/);
});

test("primary navigation keeps usable fragment links without JavaScript", () => {
  const html = renderHome();

  for (const route of ["home", "input", "history"]) {
    assert.match(html, new RegExp(`id="${route}"[^>]*data-view="${route}"`));
    assert.match(html, new RegExp(`href="#${route}"[^>]*data-route="${route}"`));
  }
  assert.match(html, /href="#manage-expense"[^>]*data-manage-target="expense"/);
  assert.match(html, /id="manage-expense"[^>]*data-manage-panel="expense"/);
});

test("compact delete controls keep a 44 pixel touch target", () => {
  const styles = fs.readFileSync(path.join(__dirname, "..", "public", "style.css"), "utf8");

  assert.match(styles, /\.ghost\s*\{\s*min-height:\s*44px/);
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
