function dateOnly(value) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function asDatabaseDate(value) {
  return new Date(`${dateOnly(value)}T00:00:00.000Z`);
}

function monthBounds(now = new Date()) {
  return {
    start: new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)),
    end: new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)),
  };
}

function serializeRows(rows) {
  return rows.map((row) => ({ ...row, ...(row.date ? { date: dateOnly(row.date) } : {}) }));
}

function createMoneyRepository(prisma) {
  async function findDashboardState(userId, now = new Date()) {
    const { start, end } = monthBounds(now);
    const [budget, expenses, incomes, fixedCosts] = await Promise.all([
      prisma.monthlyBudget.findUnique({ where: { userId_month: { userId, month: start } } }),
      prisma.expense.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
      prisma.income.findMany({ where: { userId, date: { gte: start, lt: end } }, orderBy: [{ date: "asc" }, { createdAt: "asc" }] }),
      prisma.fixedCost.findMany({ where: { userId }, orderBy: [{ payDay: "asc" }, { createdAt: "asc" }] }),
    ]);
    return {
      monthlyBudget: budget?.amount || 80000,
      expenses: serializeRows(expenses),
      incomes: serializeRows(incomes),
      fixedCosts,
    };
  }

  const createExpense = (userId, data) => prisma.expense.create({ data: { ...data, userId, date: asDatabaseDate(data.date) } });
  const createIncome = (userId, data) => prisma.income.create({ data: { ...data, userId, date: asDatabaseDate(data.date) } });
  const createFixedCost = (userId, data) => prisma.fixedCost.create({ data: { ...data, userId } });
  const deleteExpense = async (userId, id) => (await prisma.expense.deleteMany({ where: { id, userId } })).count === 1;
  const deleteIncome = async (userId, id) => (await prisma.income.deleteMany({ where: { id, userId } })).count === 1;
  const deleteFixedCost = async (userId, id) => (await prisma.fixedCost.deleteMany({ where: { id, userId } })).count === 1;

  async function upsertBudget(userId, now, amount) {
    const { start } = monthBounds(now);
    return prisma.monthlyBudget.upsert({
      where: { userId_month: { userId, month: start } },
      update: { amount },
      create: { userId, month: start, amount },
    });
  }

  return { findDashboardState, createExpense, createIncome, createFixedCost, deleteExpense, deleteIncome, deleteFixedCost, upsertBudget };
}

export { createMoneyRepository, monthBounds };
