import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";
import { requireCurrentUser } from "../middleware/currentUser.js";
import { createRoutes } from "../routes/index.js";

function handlers(spy = () => {}) {
  return {
    showHome: (req, res) => res.send("home"),
    createQuickExpense: (req, res) => res.sendStatus(204),
    createExpense: (req, res) => (spy(req), res.sendStatus(204)),
    createIncome: (req, res) => res.sendStatus(204),
    createFixedCost: (req, res) => res.sendStatus(204),
    updateBudget: (req, res) => res.sendStatus(204),
    deleteExpense: (req, res) => res.sendStatus(204),
    deleteIncome: (req, res) => res.sendStatus(204),
    deleteFixedCost: (req, res) => res.sendStatus(204),
  };
}

test("financial mutation redirects unauthenticated users", async () => {
  const router = createRoutes({ controller: handlers(), requireCurrentUser });
  const response = await request(createApp({ router })).post("/expenses").type("form").send({ amount: 950 });
  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/login");
});

test("financial routes use the server current user instead of body ownership", async () => {
  let captured;
  const router = createRoutes({ controller: handlers((req) => { captured = req; }), requireCurrentUser });
  const app = createApp({
    currentUserMiddleware: (req, res, next) => { req.currentUser = { id: "user-a" }; next(); },
    router,
  });
  const response = await request(app).post("/expenses").type("form").send({ amount: 950, userId: "user-b" });
  assert.equal(response.status, 204);
  assert.equal(captured.currentUser.id, "user-a");
});
