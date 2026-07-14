import express from "express";
import controller from "../controllers/appController.js";

const pass = (req, res, next) => next();

function createRoutes({
  controller: handlers,
  requireCurrentUser = pass,
  csrfProtection = pass,
  mutationLimiter = pass,
  linkController,
} = {}) {
  const router = express.Router();
  const protect = [requireCurrentUser, mutationLimiter, csrfProtection];
  router.get("/", handlers.showHome);
  router.post("/quick-expense", ...protect, handlers.createQuickExpense);
  router.post("/expenses", ...protect, handlers.createExpense);
  router.post("/incomes", ...protect, handlers.createIncome);
  router.post("/fixed-costs", ...protect, handlers.createFixedCost);
  router.post("/budget", ...protect, handlers.updateBudget);
  router.post("/expenses/:id/delete", ...protect, handlers.deleteExpense);
  router.post("/incomes/:id/delete", ...protect, handlers.deleteIncome);
  router.post("/fixed-costs/:id/delete", ...protect, handlers.deleteFixedCost);
  if (handlers.updateProfile) router.post("/account/profile", ...protect, handlers.updateProfile);
  if (linkController) {
    router.post("/account/link/:provider", ...protect, linkController.start);
    router.get("/account/link/complete", linkController.complete);
  }
  return router;
}

const router = createRoutes({ controller });

export default router;
export { createRoutes };
