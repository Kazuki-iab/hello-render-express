import test from "node:test";
import assert from "node:assert/strict";
import { createMoneyService } from "../services/moneyService.js";

test("addExpense writes normalized data for the current user", async () => {
  const writes = [];
  const service = createMoneyService({
    createExpense: async (userId, data) => writes.push({ userId, data }),
  });

  await service.addExpense("user-a", { amount: "950", category: "食費", date: "2026-07-15" });

  assert.equal(writes[0].userId, "user-a");
  assert.equal(writes[0].data.amount, 950);
});

test("getDashboard calculates only repository state", async () => {
  const service = createMoneyService({
    findDashboardState: async () => ({ monthlyBudget: 80000, expenses: [], incomes: [], fixedCosts: [] }),
  });
  const dashboard = await service.getDashboard("user-a", new Date("2026-07-15T00:00:00Z"));
  assert.equal(dashboard.remaining, 80000);
});
