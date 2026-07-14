import test from "node:test";
import assert from "node:assert/strict";
import { createMoneyRepository } from "../repositories/moneyRepository.js";

test("delete operations always include the authenticated owner", async () => {
  const calls = [];
  const model = { deleteMany: async (query) => (calls.push(query), { count: 1 }) };
  const repository = createMoneyRepository({ expense: model, income: model, fixedCost: model });

  await repository.deleteExpense("user-a", "expense-b");
  await repository.deleteIncome("user-a", "income-b");
  await repository.deleteFixedCost("user-a", "fixed-b");

  assert.deepEqual(calls.map((call) => call.where), [
    { id: "expense-b", userId: "user-a" },
    { id: "income-b", userId: "user-a" },
    { id: "fixed-b", userId: "user-a" },
  ]);
});

test("dashboard reads scope every table to one user", async () => {
  const calls = [];
  const prisma = {
    monthlyBudget: { findUnique: async (query) => (calls.push(["budget", query]), null) },
    expense: { findMany: async (query) => (calls.push(["expense", query]), []) },
    income: { findMany: async (query) => (calls.push(["income", query]), []) },
    fixedCost: { findMany: async (query) => (calls.push(["fixed", query]), []) },
  };
  const repository = createMoneyRepository(prisma);
  const state = await repository.findDashboardState("user-a", new Date("2026-07-15T00:00:00Z"));

  assert.equal(state.monthlyBudget, 80000);
  assert.equal(calls[0][1].where.userId_month.userId, "user-a");
  for (const [, query] of calls.slice(1)) assert.equal(query.where.userId, "user-a");
});
