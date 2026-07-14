import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("financial records and identities belong to a local user", () => {
  const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
  for (const model of ["UserIdentity", "MonthlyBudget", "Expense", "Income", "FixedCost", "IdentityLinkAttempt"]) {
    assert.match(schema, new RegExp(`model ${model} \\{`));
  }
  assert.match(schema, /subject\s+String\s+@unique/);
  assert.match(schema, /@@unique\(\[userId, month\]\)/);
});
