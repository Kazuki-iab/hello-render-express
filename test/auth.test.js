import test from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../config/env.js";
import { identityFromClaims } from "../middleware/currentUser.js";
import { createUserRepository } from "../repositories/userRepository.js";

const completeEnv = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://example",
  AUTH0_SECRET: "a".repeat(32),
  AUTH0_BASE_URL: "https://money.example",
  AUTH0_CLIENT_ID: "client",
  AUTH0_CLIENT_SECRET: "b".repeat(32),
  AUTH0_ISSUER_BASE_URL: "https://tenant.example",
  CSRF_SECRET: "c".repeat(32),
  ACCOUNT_LINK_SECRET: "d".repeat(32),
};

test("production configuration rejects missing secrets", () => {
  assert.throws(() => loadConfig({ NODE_ENV: "production" }), /DATABASE_URL/);
  assert.equal(loadConfig(completeEnv).isProduction, true);
});

test("claims require a verified email address", () => {
  assert.throws(() => identityFromClaims({ sub: "auth0|1", email: "a@example.com", email_verified: false }), /メール確認/);
  assert.equal(identityFromClaims({ sub: "google-oauth2|1", email: "A@EXAMPLE.COM", email_verified: true }).email, "a@example.com");
});

test("first login creates a local user and immutable identity together", async () => {
  const creates = [];
  const prisma = {
    userIdentity: { findUnique: async () => null },
    $transaction: async (callback) => callback({
      user: { create: async (query) => (creates.push(query), { id: "user-a", email: query.data.email, displayName: query.data.displayName }) },
    }),
  };
  const repository = createUserRepository(prisma);
  const user = await repository.resolveIdentity({
    subject: "google-oauth2|123",
    provider: "google-oauth2",
    email: "student@example.com",
    emailVerified: true,
    displayName: "Student",
    avatarUrl: null,
  });
  assert.equal(user.email, "student@example.com");
  assert.equal(creates[0].data.identities.create.subject, "google-oauth2|123");
});
