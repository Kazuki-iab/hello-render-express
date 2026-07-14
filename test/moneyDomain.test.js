import test from "node:test";
import assert from "node:assert/strict";
import * as money from "../models/store.js";

test("dashboard calculation uses supplied user state only", () => {
  const data = money.calculateDashboard({
    monthlyBudget: 80000,
    expenses: [{ amount: 1000, category: "食費", date: "2026-07-10" }],
    incomes: [{ amount: 20000, source: "バイト代", date: "2026-07-01" }],
    fixedCosts: [{ amount: 10000, category: "サブスク", payDay: 1 }],
  }, new Date("2026-07-15T12:00:00+09:00"));

  assert.equal(data.remaining, 89000);
  assert.equal(data.expenseTotal, 1000);
  assert.equal(data.incomeTotal, 20000);
  assert.equal(data.fixedTotal, 10000);
});

test("normalizers reject invalid money inputs", () => {
  assert.throws(() => money.normalizeExpense({ amount: "0", date: "2026-07-10" }), /金額/);
  assert.throws(() => money.normalizeFixedCost({ amount: "100", payDay: "32" }), /支払日/);
  assert.throws(() => money.normalizeIncome({ amount: "100", date: "2026-02-30" }), /日付/);
});

test("calendar defaults use Japan time on a UTC server", () => {
  assert.equal(money.today(new Date("2026-06-30T15:30:00Z")), "2026-07-01");
  const dashboard = money.calculateDashboard({
    monthlyBudget: 80000,
    expenses: [{ amount: 500, category: "食費", date: "2026-07-01" }],
    incomes: [],
    fixedCosts: [],
  }, new Date("2026-06-30T15:30:00Z"));
  assert.equal(dashboard.expenseTotal, 500);
});
