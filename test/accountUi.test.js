import test from "node:test";
import assert from "node:assert/strict";
import { calculateDashboard } from "../models/store.js";
import { renderPage } from "../controllers/appController.js";
import { renderSignedOutPage } from "../views/signedOutPage.js";

test("signed-out entry is focused and contains no personal dashboard", () => {
  const html = renderSignedOutPage();
  assert.match(html, /Money Paceを始める/);
  assert.doesNotMatch(html, /data-view="manage"/);
});

test("authenticated UI exposes account settings through the avatar", () => {
  const data = calculateDashboard({ monthlyBudget: 80000, expenses: [], incomes: [], fixedCosts: [] });
  const html = renderPage(data, {
    id: "user-a",
    email: "student@example.com",
    displayName: "Student",
    identities: [{ provider: "google-oauth2" }],
  }, "csrf-token");
  assert.match(html, /data-route="account"/);
  assert.match(html, /アカウント設定/);
  assert.match(html, /ログアウト/);
  assert.match(html, /name="_csrf" value="csrf-token"/);
});
