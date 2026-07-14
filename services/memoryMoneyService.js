import * as store from "../models/store.js";

function createMemoryMoneyService() {
  return {
    async getDashboard() { return store.calculateDashboard(); },
    async addQuickExpense(userId, text) {
      const parsed = store.parseQuickExpense(text);
      if (!parsed) throw new Error("「ラーメン 950」のように、メモと金額を入力してください");
      store.addExpense(parsed);
      return parsed;
    },
    async addExpense(userId, input) { store.addExpense(store.normalizeExpense(input)); },
    async addIncome(userId, input) { store.addIncome(store.normalizeIncome(input)); },
    async addFixedCost(userId, input) { store.addFixedCost(store.normalizeFixedCost(input)); },
    async updateBudget(userId, value) { store.updateMonthlyBudget(store.normalizeBudget(value)); },
    async deleteExpense(userId, id) { store.removeById(store.expenses, id); },
    async deleteIncome(userId, id) { store.removeById(store.incomes, id); },
    async deleteFixedCost(userId, id) { store.removeById(store.fixedCosts, id); },
  };
}

export { createMemoryMoneyService };
