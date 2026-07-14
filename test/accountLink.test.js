import test from "node:test";
import assert from "node:assert/strict";
import { createLinkCookie, readLinkCookie } from "../auth/linkState.js";
import { createAccountLinkService } from "../services/accountLinkService.js";

test("link cookies reject tampering", () => {
  const cookie = createLinkCookie("raw-token", "s".repeat(32));
  assert.equal(readLinkCookie(cookie, "s".repeat(32)), "raw-token");
  assert.equal(readLinkCookie(`${cookie}x`, "s".repeat(32)), null);
});

test("account linking requires matching verified email and is one-time", async () => {
  const attempts = new Map();
  const identities = new Map();
  const repository = {
    createAttempt: async (attempt) => attempts.set(attempt.tokenHash, { ...attempt, user: { id: attempt.userId, email: "student@example.com" } }),
    findAttempt: async (tokenHash) => attempts.get(tokenHash),
    findIdentity: async (subject) => identities.get(subject),
    consumeAndLink: async (attempt, identity) => {
      if (attempt.consumedAt) return false;
      attempt.consumedAt = new Date();
      identities.set(identity.subject, { userId: attempt.userId });
      return true;
    },
  };
  const service = createAccountLinkService(repository, () => new Date("2026-07-15T00:00:00Z"));
  const token = await service.startLink("user-a", "google");

  await assert.rejects(() => service.completeLink(token, { subject: "google-oauth2|1", provider: "google-oauth2", email: "other@example.com", emailVerified: true }), /同じメール/);
  await service.completeLink(token, { subject: "google-oauth2|1", provider: "google-oauth2", email: "student@example.com", emailVerified: true });
  await assert.rejects(() => service.completeLink(token, { subject: "google-oauth2|1", provider: "google-oauth2", email: "student@example.com", emailVerified: true }), /期限切れ|使用済み/);
});

test("identity already owned by another user never merges accounts", async () => {
  const repository = {
    createAttempt: async () => {},
    findAttempt: async () => ({ userId: "user-a", targetProvider: "google", expiresAt: new Date(Date.now() + 60000), consumedAt: null, user: { email: "student@example.com" } }),
    findIdentity: async () => ({ userId: "user-b" }),
  };
  const service = createAccountLinkService(repository);
  await assert.rejects(() => service.completeLink("token", { subject: "google-oauth2|2", provider: "google-oauth2", email: "student@example.com", emailVerified: true }), /別のMoney Paceアカウント/);
});
