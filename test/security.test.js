import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import cookieParser from "cookie-parser";
import request from "supertest";
import { createSecurity } from "../middleware/security.js";

function securityApp() {
  const security = createSecurity({ csrfSecret: "c".repeat(32), isProduction: false, logger: { error() {} } });
  const app = express();
  app.use(cookieParser());
  app.use(express.urlencoded({ extended: false }));
  app.get("/token", (req, res) => res.json({ token: security.csrfToken(req, res) }));
  app.post("/submit", security.csrfProtection, (req, res) => res.sendStatus(204));
  app.get("/database-error", (req, res, next) => next(Object.assign(new Error("secret database address"), { code: "P1001" })));
  app.use(security.errorHandler);
  return app;
}

test("CSRF rejects missing tokens and accepts a matching form token", async () => {
  const agent = request.agent(securityApp());
  assert.equal((await agent.post("/submit").type("form").send({})).status, 403);
  const tokenResponse = await agent.get("/token");
  assert.equal((await agent.post("/submit").type("form").send({ _csrf: tokenResponse.body.token })).status, 204);
});

test("database errors return a safe Japanese service page", async () => {
  const response = await request(securityApp()).get("/database-error");
  assert.equal(response.status, 503);
  assert.match(response.text, /接続しにくい状態/);
  assert.doesNotMatch(response.text, /secret database address/);
});
