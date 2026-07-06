const express = require("express");
const controller = require("../controllers/appController");

const router = express.Router();

router.get("/", controller.showHome);
router.post("/quick-expense", controller.createQuickExpense);
router.post("/expenses", controller.createExpense);
router.post("/incomes", controller.createIncome);
router.post("/fixed-costs", controller.createFixedCost);
router.post("/budget", controller.updateBudget);
router.post("/expenses/:id/delete", controller.deleteExpense);
router.post("/incomes/:id/delete", controller.deleteIncome);
router.post("/fixed-costs/:id/delete", controller.deleteFixedCost);

module.exports = router;
