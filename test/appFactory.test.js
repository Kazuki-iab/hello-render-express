import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

test("health endpoint does not expose application data", async () => {
  const app = createApp({ authMiddleware: (req, res, next) => next() });
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
  assert.equal(response.headers["x-powered-by"], undefined);
});
