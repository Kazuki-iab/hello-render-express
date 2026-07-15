import test from "node:test";
import assert from "node:assert/strict";
import { createAccountLinkController } from "../controllers/accountLinkController.js";

test("failed account linking hands the response to Auth0 logout exactly once", async () => {
  const calls = [];
  const controller = createAccountLinkController(
    { completeLink: async () => { throw new Error("接続できませんでした"); } },
    { isProduction: true, accountLinkSecret: "s".repeat(32), auth0BaseUrl: "https://money.example" },
  );
  const response = {
    clearCookie: () => calls.push("clear"),
    oidc: { logout: (options) => calls.push(["logout", options]) },
    redirect: (location) => calls.push(["redirect", location]),
  };

  await controller.complete({ cookies: {}, oidc: {} }, response);

  assert.equal(calls[0], "clear");
  assert.equal(calls[1][0], "logout");
  assert.match(calls[1][1].returnTo, /^https:\/\/money\.example\/\?message=.+&type=error$/);
  assert.equal(calls.length, 2);
});
