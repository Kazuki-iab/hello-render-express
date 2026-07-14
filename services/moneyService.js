import {
  calculateDashboard,
  normalizeBudget,
  normalizeExpense,
  normalizeFixedCost,
  normalizeIncome,
  parseQuickExpense,
} from "../models/store.js";

function createMoneyService(repository) {
  async function getDashboard(userId, now = new Date()) {
    return calculateDashboard(await repository.findDashboardState(userId, now), now);
  }

  async function addQuickExpense(userId, text) {
    const parsed = parseQuickExpense(text);
    if (!parsed) throw new Error("「ラーメン 950」のように、メモと金額を入力してください");
    await repository.createExpense(userId, normalizeExpense(parsed));
    return parsed;
  }

  const addExpense = (userId, input) => repository.createExpense(userId, normalizeExpense(input));
  const addIncome = (userId, input) => repository.createIncome(userId, normalizeIncome(input));
  const addFixedCost = (userId, input) => repository.createFixedCost(userId, normalizeFixedCost(input));
  const updateBudget = (userId, value, now = new Date()) => repository.upsertBudget(userId, now, normalizeBudget(value));
  const deleteExpense = (userId, id) => repository.deleteExpense(userId, id);
  const deleteIncome = (userId, id) => repository.deleteIncome(userId, id);
  const deleteFixedCost = (userId, id) => repository.deleteFixedCost(userId, id);

  return { getDashboard, addQuickExpense, addExpense, addIncome, addFixedCost, updateBudget, deleteExpense, deleteIncome, deleteFixedCost };
}

export { createMoneyService };
