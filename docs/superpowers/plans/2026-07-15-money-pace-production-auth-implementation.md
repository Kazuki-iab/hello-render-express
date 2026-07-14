# Money Pace Production Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Auth0 Google and email/password authentication, persistent Render PostgreSQL storage, and strict per-user financial-data isolation to Money Pace.

**Architecture:** Auth0 owns credentials, verification, reset, and encrypted browser sessions. Express resolves each verified Auth0 subject through a local `UserIdentity`, then services and Prisma repositories require the resulting local `userId` for every operation. Signed, one-time account-link attempts allow a second verified Auth0 identity to map to the same local user only after reauthentication.

**Tech Stack:** Node.js 20.19+, Express 5, ES Modules, Auth0 `express-openid-connect`, Prisma 7 with `@prisma/adapter-pg`, PostgreSQL, `tsx` for the generated Prisma TypeScript client, `csrf-csrf`, Helmet, `express-rate-limit`, Supertest, Node test runner, HTML/CSS/JavaScript.

## Global Constraints

- Keep the existing public financial route paths and Money Pace four-view experience.
- Google and email/password authentication must both work.
- Password accounts require verified email addresses.
- Password reset is handled by Auth0 without revealing whether an address exists.
- Every financial read and mutation requires the server-resolved local `userId`.
- Never accept an owner ID from a query string, URL parameter, form body, or browser script.
- Store yen amounts as positive integers.
- Do not migrate temporary in-memory records.
- Production cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- All form POST routes require CSRF protection.
- Account linking requires successful authentication of both identities and never merges existing financial records.
- Secrets exist only in environment variables and never enter Git.
- Keep Japanese product copy natural and concise.
- Verify desktop, iPhone 390px, and iPad 768px layouts before deployment.

---

## File Map

### New application and infrastructure files

- `app.js`: Express application factory with injectable authentication and data dependencies.
- `config/env.js`: validated runtime configuration.
- `auth/auth0.js`: Auth0 middleware configuration and login/logout helpers.
- `auth/linkState.js`: one-time account-link token creation, hashing, cookie handling, and expiry.
- `middleware/currentUser.js`: Auth0 subject to local-user resolution and route guard.
- `middleware/security.js`: Helmet, rate-limit, cookie parsing, and CSRF utilities.
- `lib/prisma.js`: singleton Prisma client.
- `prisma.config.ts`: Prisma 7 schema, migration, and datasource configuration.
- `prisma/schema.prisma`: persistent user, identity, budget, transaction, and link-attempt schema.
- `prisma/migrations/*/migration.sql`: generated schema plus explicit positive-value checks.
- `repositories/userRepository.js`: user and identity persistence.
- `repositories/moneyRepository.js`: user-scoped financial persistence.
- `services/moneyService.js`: validation, domain calculation, and repository orchestration.
- `services/accountLinkService.js`: one-time, conflict-safe identity linking.
- `views/signedOutPage.js`: branded public entry screen.
- `views/errorPage.js`: safe Japanese 401/403/503 responses.
- `.env.example`: environment variable names without values.
- `docs/deployment/auth0-render.md`: exact Auth0, Google, PostgreSQL, and Render configuration.

### Existing files to modify

- `server.js`: start the application factory and handle shutdown.
- `package.json`, `package-lock.json`: dependencies and Prisma scripts.
- `models/store.js`: retain pure constants, parsing, normalization, calculations, and advice; remove mutable arrays.
- `controllers/appController.js`: inject services, use async operations, render CSRF tokens and user profile.
- `routes/index.js`: route factory with authentication, CSRF, and account routes.
- `public/app.js`: account menu and account view behavior.
- `public/style.css`: signed-out, avatar, account, and auth-error styling.
- `public/index.html`: shared metadata only if required.
- `.gitignore`: keep `.env`, `generated/`, and local artifacts out of Git.
- `test/app.test.js`: adapt rendering tests to injected services and authenticated users.

---

### Task 1: Create a Testable Express Application Boundary

**Files:**
- Create: `app.js`
- Create: `test/appFactory.test.js`
- Modify: `server.js`
- Modify: `controllers/appController.js`
- Modify: `models/store.js`
- Modify: `routes/index.js`
- Modify: `test/app.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `createApp(options): Express.Application`
- Produces: `startServer(): http.Server`
- Consumes: existing router until Task 6 replaces it with a factory.

- [ ] **Step 1: Install runtime and test dependencies**

Run:

```bash
npm install @prisma/adapter-pg @prisma/client cookie-parser csrf-csrf dotenv express-openid-connect express-rate-limit helmet pg tsx
npm install --save-dev prisma supertest
```

Expected: `package-lock.json` updates and `npm ls --depth=0` exits `0`.

- [ ] **Step 2: Write the failing application-factory test**

Create `test/appFactory.test.js`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../app.js";

test("health endpoint does not expose application data", async () => {
  const app = createApp({
    authMiddleware: (req, res, next) => next(),
  });
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
  assert.equal(response.headers["x-powered-by"], undefined);
});
```

- [ ] **Step 3: Run the test and confirm the red state**

Run: `node --test test/appFactory.test.js`

Expected: FAIL because `../app.js` does not exist.

- [ ] **Step 4: Implement the application factory and thin server entry point**

Set `"type": "module"`, `"engines": { "node": ">=20.19.0" }`, `"start": "node --import tsx server.js"`, and `"test": "node --import tsx --test"` in `package.json`. The loader is required because Prisma 7's current generator emits TypeScript. Convert server-side `require`, `module.exports`, and extensionless local imports in `server.js`, `controllers/appController.js`, `models/store.js`, `routes/index.js`, and existing tests to ESM without changing behavior. `public/app.js` remains a browser script.

Create `app.js` with this boundary:

```js
import express from "express";
import helmet from "helmet";
import routes from "./routes/index.js";

function createApp({ authMiddleware = (req, res, next) => next(), router = routes } = {}) {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(authMiddleware);
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static("public", { index: false }));
  app.get("/health", (req, res) => res.json({ status: "ok" }));
  app.use("/", router);
  return app;
}

export { createApp };
```

Change `server.js` to export and start cleanly:

```js
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";

function startServer() {
  const port = process.env.PORT || 3000;
  return createApp().listen(port, () => console.log(`Server started on ${port}`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) startServer();
export { startServer };
```

- [ ] **Step 5: Verify the boundary and existing behavior**

Run: `npm test`

Expected: all existing tests plus `appFactory.test.js` pass.

- [ ] **Step 6: Commit**

```bash
git add app.js server.js controllers/appController.js models/store.js routes/index.js package.json package-lock.json test/app.test.js test/appFactory.test.js
git commit -m "Create testable Express application boundary"
```

---

### Task 2: Define the PostgreSQL Ownership Schema

**Files:**
- Create: `prisma/schema.prisma`
- Create: `prisma.config.ts`
- Create: `prisma/migrations/202607150001_auth_and_money/migration.sql`
- Create: `test/schema.test.js`
- Create: `.env.example`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces: Prisma models `User`, `UserIdentity`, `MonthlyBudget`, `Expense`, `Income`, `FixedCost`, `IdentityLinkAttempt`.
- Produces: `npm run db:generate`, `npm run db:validate`, and `npm run db:migrate:deploy`.

- [ ] **Step 1: Write the failing schema contract test**

Create `test/schema.test.js`:

```js
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
```

- [ ] **Step 2: Run the schema test and confirm it fails**

Run: `node --test test/schema.test.js`

Expected: FAIL with `ENOENT` for `prisma/schema.prisma`.

- [ ] **Step 3: Add the exact Prisma models**

Create `prisma.config.ts`; Prisma 7 reads the datasource URL here rather than from `schema.prisma`:

```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL") },
});
```

Create `prisma/schema.prisma` with the current Prisma 7 generator and these ownership fields:

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../generated/prisma"
  moduleFormat         = "esm"
  importFileExtension = "ts"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           String                @id @default(uuid()) @db.Uuid
  email        String
  displayName  String
  avatarUrl    String?
  identities   UserIdentity[]
  budgets      MonthlyBudget[]
  expenses     Expense[]
  incomes      Income[]
  fixedCosts   FixedCost[]
  linkAttempts IdentityLinkAttempt[]
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
}

model UserIdentity {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  subject   String   @unique
  provider  String
  email     String
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
}

model MonthlyBudget {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  month     DateTime @db.Date
  amount    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@unique([userId, month])
}

model Expense {
  id            String   @id @default(uuid()) @db.Uuid
  userId        String   @db.Uuid
  amount        Int
  category      String
  memo          String   @default("")
  date          DateTime @db.Date
  paymentMethod String
  user          User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([userId, date])
}

model Income {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  amount    Int
  source    String
  memo      String   @default("")
  date      DateTime @db.Date
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId, date])
}

model FixedCost {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  name      String
  amount    Int
  category  String
  payDay    Int
  user      User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  @@index([userId])
}

model IdentityLinkAttempt {
  id             String    @id @default(uuid()) @db.Uuid
  userId         String    @db.Uuid
  tokenHash      String    @unique
  targetProvider String
  expiresAt      DateTime
  consumedAt     DateTime?
  user           User      @relation(fields: [userId], references: [id], onDelete: Restrict)
  createdAt      DateTime  @default(now())
  @@index([userId, expiresAt])
}
```

- [ ] **Step 4: Generate the migration and add database checks**

Run with a development PostgreSQL URL:

```bash
npx prisma migrate dev --name auth_and_money --create-only
```

Add these SQL checks to the generated migration before applying it:

```sql
ALTER TABLE "MonthlyBudget" ADD CONSTRAINT "MonthlyBudget_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "Income" ADD CONSTRAINT "Income_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_pay_day_range" CHECK ("payDay" BETWEEN 1 AND 31);
```

The committed migration directory must be named `202607150001_auth_and_money` so deployment order is deterministic.

- [ ] **Step 5: Add scripts and environment template**

Add to `package.json`:

```json
"db:generate": "prisma generate",
"db:validate": "prisma validate",
"db:migrate:deploy": "prisma migrate deploy"
```

Create `.env.example` containing names only:

```dotenv
DATABASE_URL=
AUTH0_SECRET=
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=
AUTH0_ISSUER_BASE_URL=
CSRF_SECRET=
ACCOUNT_LINK_SECRET=
```

- [ ] **Step 6: Validate and test the schema**

Run:

```bash
DATABASE_URL=postgresql://money_pace:money_pace@localhost:5432/money_pace npm run db:validate
npm run db:generate
node --test test/schema.test.js
```

Expected: Prisma validation succeeds, client generation succeeds, and the schema test passes.

- [ ] **Step 7: Commit**

```bash
git add prisma prisma.config.ts .env.example .gitignore package.json package-lock.json test/schema.test.js
git commit -m "Define user-scoped PostgreSQL schema"
```

---

### Task 3: Convert the Memory Store into a Pure Money Domain

**Files:**
- Modify: `models/store.js`
- Create: `test/moneyDomain.test.js`
- Modify: `test/app.test.js`

**Interfaces:**
- Produces: `normalizeExpense(input)`, `normalizeIncome(input)`, `normalizeFixedCost(input)`, `normalizeBudget(value)`.
- Produces: `calculateDashboard(state, now)` where `state` contains `monthlyBudget`, `expenses`, `incomes`, and `fixedCosts`.
- Preserves: `yen`, `today`, `parseQuickExpense`, category/source/payment constants, and `advice`.

- [ ] **Step 1: Write failing pure-domain tests**

Create `test/moneyDomain.test.js` with fixed dates:

```js
import test from "node:test";
import assert from "node:assert/strict";
import * as money from "../models/store.js";

test("dashboard calculation uses supplied user state only", () => {
  const data = money.calculateDashboard({
    monthlyBudget: 80000,
    expenses: [{ amount: 1000, category: "食費", date: "2026-07-10" }],
    incomes: [{ amount: 20000, source: "バイト代", date: "2026-07-01" }],
    fixedCosts: [{ amount: 10000, category: "サブスク", payDay: 1 }],
  }, new Date("2026-07-15T12:00:00+09:00"));

  assert.equal(data.remaining, 89000);
  assert.equal(data.expenseTotal, 1000);
  assert.equal(data.incomeTotal, 20000);
  assert.equal(data.fixedTotal, 10000);
});

test("normalizers reject invalid money inputs", () => {
  assert.throws(() => money.normalizeExpense({ amount: "0", date: "2026-07-10" }), /金額/);
  assert.throws(() => money.normalizeFixedCost({ amount: "100", payDay: "32" }), /支払日/);
});
```

- [ ] **Step 2: Run the tests and confirm signature failures**

Run: `node --test test/moneyDomain.test.js`

Expected: FAIL because `calculateDashboard` does not accept state and normalizers do not exist.

- [ ] **Step 3: Remove mutable arrays and implement pure normalization**

Keep constants and pure helpers in `models/store.js`. Replace mutation functions with functions that return validated values:

```js
function normalizeDate(value) {
  const text = String(value || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("日付を正しく入力してください");
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error("日付を正しく入力してください");
  }
  return text;
}

function normalizeExpense(input) {
  const amount = getNumber(input.amount);
  if (!amount) throw new Error("金額を正しく入力してください");
  const date = normalizeDate(input.date);
  return {
    amount,
    category: expenseCategories.includes(input.category) ? input.category : "その他",
    memo: String(input.memo || "").trim().slice(0, 120),
    date,
    paymentMethod: paymentMethods.includes(input.paymentMethod) ? input.paymentMethod : "未設定",
  };
}

function normalizeIncome(input) {
  const amount = getNumber(input.amount);
  if (!amount) throw new Error("金額を正しく入力してください");
  return {
    amount,
    source: incomeSources.includes(input.source) ? input.source : "その他",
    memo: String(input.memo || "").trim().slice(0, 120),
    date: normalizeDate(input.date),
  };
}

function normalizeFixedCost(input) {
  const amount = getNumber(input.amount);
  const payDay = Number(input.payDay);
  if (!amount) throw new Error("金額を正しく入力してください");
  if (!Number.isInteger(payDay) || payDay < 1 || payDay > 31) throw new Error("支払日を正しく入力してください");
  return {
    name: String(input.name || "").trim().slice(0, 40) || "固定費",
    amount,
    category: expenseCategories.includes(input.category) ? input.category : "その他",
    payDay,
  };
}

function normalizeBudget(value) {
  const amount = getNumber(value);
  if (!amount) throw new Error("予算を正しく入力してください");
  return amount;
}

function calculateDashboard(state, now = new Date()) {
  const monthlyBudget = state.monthlyBudget || 80000;
  const expenses = state.expenses || [];
  const incomes = state.incomes || [];
  const fixedCosts = state.fixedCosts || [];
  const sameMonth = (item) => {
    const date = new Date(`${item.date}T00:00:00Z`);
    return date.getUTCFullYear() === now.getFullYear() && date.getUTCMonth() === now.getMonth();
  };
  const monthlyExpenses = expenses.filter(sameMonth);
  const monthlyIncomes = incomes.filter(sameMonth);
  const expenseTotal = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
  const incomeTotal = monthlyIncomes.reduce((sum, item) => sum + item.amount, 0);
  const fixedTotal = fixedCosts.reduce((sum, item) => sum + item.amount, 0);
  const remaining = monthlyBudget + incomeTotal - expenseTotal - fixedTotal;
  const monthDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(monthDays - now.getDate() + 1, 1);
  const paceExpense = (expenseTotal / Math.max(now.getDate(), 1)) * monthDays;
  const projectedBalance = Math.round(monthlyBudget + incomeTotal - fixedTotal - paceExpense);
  const byCategory = expenseCategories.map((category) => ({
    category,
    amount: monthlyExpenses.filter((item) => item.category === category).reduce((sum, item) => sum + item.amount, 0),
  }));
  return {
    monthlyBudget, expenses, incomes, fixedCosts, monthlyExpenses, monthlyIncomes,
    expenseTotal, incomeTotal, fixedTotal, remaining, daysLeft,
    dailyRemaining: Math.floor(remaining / daysLeft), projectedBalance,
    budgetUsed: Math.min(Math.round(((expenseTotal + fixedTotal) / Math.max(monthlyBudget, 1)) * 100), 999),
    risk: projectedBalance < 0 ? "高" : projectedBalance < monthlyBudget * 0.08 ? "中" : "低",
    byCategory,
    maxCategory: Math.max(...byCategory.map((item) => item.amount), 1),
    topCategory: byCategory.slice().sort((a, b) => b.amount - a.amount)[0],
  };
}
```

Export these normalizers and calculation helpers. Update `advice` to compare fixed costs and remaining balance against `data.monthlyBudget`, removing its dependency on the deleted module-level budget.

- [ ] **Step 4: Adapt rendering tests to fixture state**

Replace direct reads of `store.expenses` and other mutable arrays in `test/app.test.js` with injected service fixtures. Do not introduce global test state.

- [ ] **Step 5: Run all domain and rendering tests**

Run: `npm test`

Expected: all tests pass and no test depends on mutation order.

- [ ] **Step 6: Commit**

```bash
git add models/store.js test/moneyDomain.test.js test/app.test.js
git commit -m "Extract pure money domain calculations"
```

---

### Task 4: Add User-Scoped Prisma Repositories and Money Service

**Files:**
- Create: `lib/prisma.js`
- Create: `repositories/moneyRepository.js`
- Create: `services/moneyService.js`
- Create: `test/moneyRepository.test.js`
- Create: `test/moneyService.test.js`

**Interfaces:**
- Produces: `createMoneyRepository(prisma)`.
- Produces repository methods `findDashboardState(userId, now)`, `createExpense(userId, data)`, `createIncome(userId, data)`, `createFixedCost(userId, data)`, `upsertBudget(userId, month, amount)`, and ownership-safe delete methods.
- Produces: `createMoneyService(repository)` with controller-facing operations.

- [ ] **Step 1: Write the cross-user isolation regression tests**

Create `test/moneyRepository.test.js` with a recording fake Prisma client:

```js
test("deleteExpense includes the authenticated owner", async () => {
  const calls = [];
  const prisma = { expense: { deleteMany: async (query) => (calls.push(query), { count: 0 }) } };
  const repository = createMoneyRepository(prisma);

  await repository.deleteExpense("user-a", "expense-b");

  assert.deepEqual(calls[0].where, { id: "expense-b", userId: "user-a" });
});
```

Add equivalent assertions for income and fixed-cost deletion plus dashboard reads.

- [ ] **Step 2: Run the repository tests and confirm the red state**

Run: `node --test test/moneyRepository.test.js`

Expected: FAIL because the repository module does not exist.

- [ ] **Step 3: Implement ownership-safe repositories**

Create the singleton in `lib/prisma.js` with the required Prisma 7 PostgreSQL adapter:

```js
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export { prisma };
```

Use `deleteMany`, never `delete`, for owner-constrained deletion:

```js
async function deleteExpense(userId, id) {
  const result = await prisma.expense.deleteMany({ where: { id, userId } });
  return result.count === 1;
}
```

`findDashboardState` must filter expense and income dates between the first day of the current month and the first day of the next month, filter every table by `userId`, and default the monthly budget to `80000` when no row exists.

- [ ] **Step 4: Write and implement service tests**

Test that `createMoneyService` normalizes before writing and passes `userId` unchanged:

```js
test("addExpense writes normalized data for the current user", async () => {
  const writes = [];
  const service = createMoneyService({
    createExpense: async (userId, data) => writes.push({ userId, data }),
  });
  await service.addExpense("user-a", { amount: "950", category: "食費", date: "2026-07-15" });
  assert.equal(writes[0].userId, "user-a");
  assert.equal(writes[0].data.amount, 950);
});
```

Implement `getDashboard`, add, delete, and budget operations by composing domain functions with repository methods.

- [ ] **Step 5: Verify repositories and services**

Run: `node --test test/moneyRepository.test.js test/moneyService.test.js`

Expected: all ownership and normalization tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/prisma.js repositories/moneyRepository.js services/moneyService.js test/moneyRepository.test.js test/moneyService.test.js
git commit -m "Add user-scoped money persistence"
```

---

### Task 5: Integrate Auth0 and Resolve Local Users

**Files:**
- Create: `config/env.js`
- Create: `auth/auth0.js`
- Create: `repositories/userRepository.js`
- Create: `middleware/currentUser.js`
- Create: `test/auth.test.js`
- Modify: `app.js`

**Interfaces:**
- Produces: `loadConfig(env)` with explicit missing-variable errors.
- Produces: `createAuthMiddleware(config)`.
- Produces: `createUserRepository(prisma).resolveIdentity(identity)`.
- Produces: `createCurrentUserMiddleware(userRepository)` and `requireCurrentUser`.

- [ ] **Step 1: Write failing configuration and identity tests**

Tests must assert:

```js
assert.throws(() => loadConfig({ NODE_ENV: "production" }), /DATABASE_URL/);
```

and first-login behavior:

```js
const user = await repository.resolveIdentity({
  subject: "google-oauth2|123",
  provider: "google-oauth2",
  email: "student@example.com",
  emailVerified: true,
  displayName: "Student",
  avatarUrl: null,
});
assert.equal(user.email, "student@example.com");
```

- [ ] **Step 2: Run the tests and confirm missing modules**

Run: `node --test test/auth.test.js`

Expected: FAIL because configuration and authentication modules do not exist.

- [ ] **Step 3: Implement exact production configuration**

`loadConfig` must read `DATABASE_URL`, `AUTH0_SECRET`, `AUTH0_BASE_URL`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_ISSUER_BASE_URL`, `CSRF_SECRET`, and `ACCOUNT_LINK_SECRET`. Production must reject secrets shorter than 32 characters.

Configure Auth0:

```js
auth({
  authRequired: false,
  auth0Logout: true,
  secret: config.auth0Secret,
  baseURL: config.auth0BaseUrl,
  clientID: config.auth0ClientId,
  clientSecret: config.auth0ClientSecret,
  issuerBaseURL: config.auth0IssuerBaseUrl,
  authorizationParams: { response_type: "code", scope: "openid profile email" },
  session: {
    rolling: true,
    rollingDuration: 86400,
    absoluteDuration: 604800,
    cookie: { httpOnly: true, secure: config.isProduction, sameSite: "Lax" },
  },
})
```

- [ ] **Step 4: Implement atomic first-login resolution**

`resolveIdentity` first queries `UserIdentity.subject`. When absent, create `User` and `UserIdentity` in one Prisma transaction. Reject identities with missing `sub`, missing email, or `email_verified !== true`.

- [ ] **Step 5: Implement request middleware**

```js
async function attachCurrentUser(req, res, next) {
  try {
    if (!req.oidc?.isAuthenticated()) return next();
    req.currentUser = await userRepository.resolveIdentity(identityFromClaims(req.oidc.user));
    next();
  } catch (error) {
    next(error);
  }
}

function requireCurrentUser(req, res, next) {
  if (!req.currentUser) return res.redirect("/login");
  next();
}
```

- [ ] **Step 6: Verify authentication boundaries**

Run: `node --test test/auth.test.js test/appFactory.test.js`

Expected: missing configuration is rejected, verified identities resolve, unverified identities are rejected, and the application factory remains testable with injected middleware.

- [ ] **Step 7: Commit**

```bash
git add config auth repositories/userRepository.js middleware/currentUser.js app.js test/auth.test.js
git commit -m "Integrate Auth0 user resolution"
```

---

### Task 6: Migrate Controllers and Routes to Authenticated Services

**Files:**
- Modify: `controllers/appController.js`
- Modify: `routes/index.js`
- Modify: `test/app.test.js`
- Create: `test/routes.test.js`

**Interfaces:**
- Produces: `createAppController({ moneyService, csrf })`.
- Produces: `createRoutes({ controller, requireCurrentUser, csrfProtection })`.
- Consumes: `req.currentUser.id` only; no client owner fields.

- [ ] **Step 1: Write failing protected-route tests**

Use Supertest with an injected unauthenticated middleware:

```js
test("financial mutation redirects unauthenticated users", async () => {
  const response = await request(app).post("/expenses").send("amount=950");
  assert.equal(response.status, 302);
  assert.equal(response.headers.location, "/login");
});
```

Add a service spy showing an authenticated request calls `addExpense(currentUser.id, body)` and never reads `body.userId`.

- [ ] **Step 2: Run the route tests and confirm the current routes are unprotected**

Run: `node --test test/routes.test.js`

Expected: FAIL because current routes do not require a user.

- [ ] **Step 3: Convert controller construction and methods to async**

The home path becomes:

```js
async function showHome(req, res, next) {
  try {
    if (!req.currentUser) return res.send(renderSignedOutPage());
    const data = await moneyService.getDashboard(req.currentUser.id);
    res.send(renderPage({ data, currentUser: req.currentUser, csrfToken: csrf.token(req, res) }));
  } catch (error) {
    next(error);
  }
}
```

Every mutation passes `req.currentUser.id` as the first service argument. Deletions use UUID strings without numeric coercion.

- [ ] **Step 4: Convert routes to a dependency-injected factory**

Keep `GET /` public for the signed-out entry. Apply `requireCurrentUser` to all financial POST routes and account routes. Keep existing form endpoints unchanged.

- [ ] **Step 5: Adapt rendering tests to injected fixtures**

Use a `moneyService` fixture whose `getDashboard` returns an explicit empty state. Remove all dependency on global arrays.

- [ ] **Step 6: Verify all routes and UI contracts**

Run: `npm test`

Expected: every route test passes and all four existing authenticated views still render.

- [ ] **Step 7: Commit**

```bash
git add controllers/appController.js routes/index.js test/app.test.js test/routes.test.js
git commit -m "Protect Money Pace financial routes"
```

---

### Task 7: Add CSRF Protection, Rate Limits, and Safe Errors

**Files:**
- Create: `middleware/security.js`
- Create: `views/errorPage.js`
- Create: `test/security.test.js`
- Modify: `app.js`
- Modify: `controllers/appController.js`
- Modify: `routes/index.js`

**Interfaces:**
- Produces: `createSecurity(config)` returning `csrfToken`, `csrfProtection`, `mutationLimiter`, and `errorHandler`.

- [ ] **Step 1: Write failing CSRF and error tests**

Assert that an authenticated POST without `_csrf` returns `403`, a valid token succeeds, and database errors return a Japanese `503` page without stack traces.

- [ ] **Step 2: Run the security tests and confirm unprotected POST behavior**

Run: `node --test test/security.test.js`

Expected: FAIL because POST routes currently accept no token.

- [ ] **Step 3: Implement signed double-submit CSRF**

Configure `csrf-csrf` exactly around the authenticated Auth0 subject:

```js
const csrf = doubleCsrf({
  getSecret: () => config.csrfSecret,
  getSessionIdentifier: (req) => req.oidc?.user?.sub || "signed-out",
  cookieName: config.isProduction ? "__Host-money-pace.csrf" : "money-pace.csrf",
  cookieOptions: {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "lax",
    path: "/",
  },
  getCsrfTokenFromRequest: (req) => req.body?._csrf || req.headers["x-csrf-token"],
});
```

Render `<input type="hidden" name="_csrf" value="...">` in every POST form, including deletion and account forms.

- [ ] **Step 4: Add rate limits and safe error mapping**

Use a 15-minute window with 120 mutations per authenticated user/IP. Map CSRF to `403`, database connectivity to `503`, and unexpected errors to `500`. Render only a correlation ID and safe Japanese recovery text.

- [ ] **Step 5: Verify security behavior**

Run: `node --test test/security.test.js test/routes.test.js`

Expected: missing/invalid CSRF is rejected, valid submissions work, and no error page includes an exception message or secret.

- [ ] **Step 6: Commit**

```bash
git add middleware/security.js views/errorPage.js app.js controllers/appController.js routes/index.js test/security.test.js
git commit -m "Harden authenticated Money Pace requests"
```

---

### Task 8: Build the Signed-Out and Account Experience

**Files:**
- Create: `views/signedOutPage.js`
- Modify: `controllers/appController.js`
- Modify: `routes/index.js`
- Modify: `public/app.js`
- Modify: `public/style.css`
- Modify: `test/app.test.js`
- Create: `test/accountUi.test.js`

**Interfaces:**
- Produces: public `GET /`, Auth0 `/login`, Auth0 `/logout`, authenticated `POST /account/profile`.
- Produces: account hash view `#account` accessible from the top-right avatar but absent from the four-item mobile primary navigation.

- [ ] **Step 1: Write failing signed-out and account UI tests**

Assert exact Japanese actions:

```js
assert.match(html, /Money Paceを始める/);
assert.match(authenticatedHtml, /data-route="account"/);
assert.match(authenticatedHtml, /アカウント設定/);
assert.match(authenticatedHtml, /ログアウト/);
```

- [ ] **Step 2: Run the UI tests and confirm the missing experience**

Run: `node --test test/accountUi.test.js`

Expected: FAIL because signed-out and account views do not exist.

- [ ] **Step 3: Implement the public entry**

Render one primary link to `/login` and concise copy. Do not render dashboard numbers, financial forms, or sample personal data while signed out.

- [ ] **Step 4: Implement the authenticated account view**

Add a 44px avatar control to the top-right. The account view displays display name, verified email, connected methods, and a profile form. Email and provider credentials are read-only. The profile route validates a trimmed display name of 1-40 characters.

- [ ] **Step 5: Extend client routing without crowding mobile navigation**

Add `account` to supported hash routes. Keep mobile navigation at exactly Home, Input, History, and Manage. The avatar is the only entry to Account.

- [ ] **Step 6: Style and verify responsive states**

Use the existing neutral/emerald system, 8px-or-less control radii, restrained shadows, visible focus, and no gradients. Confirm no horizontal overflow at 390px and 768px.

- [ ] **Step 7: Run all UI tests**

Run: `npm test`

Expected: signed-out output contains no financial data, account updates are owner-scoped, and existing view tests pass.

- [ ] **Step 8: Commit**

```bash
git add views/signedOutPage.js controllers/appController.js routes/index.js public/app.js public/style.css test/app.test.js test/accountUi.test.js
git commit -m "Add Money Pace account experience"
```

---

### Task 9: Add Reauthenticated Account Linking

**Files:**
- Create: `auth/linkState.js`
- Create: `services/accountLinkService.js`
- Create: `test/accountLink.test.js`
- Modify: `routes/index.js`
- Modify: `controllers/appController.js`
- Modify: `repositories/userRepository.js`
- Modify: `public/style.css`

**Interfaces:**
- Produces: `startLink(userId, provider, res): Promise<void>`.
- Produces: `completeLink(rawToken, secondaryClaims): Promise<User>`.
- Produces routes `POST /account/link/:provider` and `GET /account/link/complete`.
- Supported provider route values: `google` and `password` only.

- [ ] **Step 1: Write failing one-time and conflict tests**

Tests must prove:

```js
await assert.rejects(
  () => service.completeLink(token, identityAlreadyOwnedByUserB),
  /別のMoney Paceアカウント/
);
await service.completeLink(token, validSecondIdentity);
await assert.rejects(() => service.completeLink(token, validSecondIdentity), /期限切れ|使用済み/);
```

Also assert unverified or differently addressed identities cannot link.

- [ ] **Step 2: Run tests and confirm missing linking service**

Run: `node --test test/accountLink.test.js`

Expected: FAIL because link state and service modules do not exist.

- [ ] **Step 3: Implement one-time link attempts**

Generate 32 random bytes, store only `sha256(rawToken)` in `IdentityLinkAttempt`, and set the raw token in a five-minute, `HttpOnly`, `Secure` production cookie signed with `ACCOUNT_LINK_SECRET`. The database transaction must mark the attempt consumed before creating the new `UserIdentity`.

- [ ] **Step 4: Implement the second authentication routes**

The start route requires the current user and CSRF token, creates the attempt, then calls:

```js
res.oidc.login({
  returnTo: "/account/link/complete",
  authorizationParams: {
    connection: provider === "google" ? "google-oauth2" : "Username-Password-Authentication",
    prompt: "login",
    max_age: 0,
  },
});
```

The completion route runs before ordinary first-login provisioning, validates the link token, validates `email_verified`, requires normalized email equality with the primary user, creates the second identity mapping, clears the cookie, and redirects to `/#account` with a success message.

- [ ] **Step 5: Add account UI states**

Show connected methods, one missing-method action, conflict text, and a retry action. Never display raw Auth0 subjects or link tokens.

- [ ] **Step 6: Verify account linking**

Run: `node --test test/accountLink.test.js test/auth.test.js test/accountUi.test.js`

Expected: valid reauthentication links once, replay fails, different-email linking fails, and existing-user conflicts preserve both users and all financial records.

- [ ] **Step 7: Commit**

```bash
git add auth/linkState.js services/accountLinkService.js repositories/userRepository.js routes/index.js controllers/appController.js public/style.css test/accountLink.test.js
git commit -m "Add secure login method linking"
```

---

### Task 10: Prepare and Verify Production Deployment

**Files:**
- Create: `docs/deployment/auth0-render.md`
- Modify: `package.json`
- Modify: `app.js`
- Modify: `test/appFactory.test.js`

**Interfaces:**
- Produces: Render build command `npm ci && npm run db:generate`.
- Produces: Render pre-deploy command `npm run db:migrate:deploy`.
- Produces: Render start command `npm start`.
- Produces: `GET /health` returning only `{ "status": "ok" }`.

- [ ] **Step 1: Write the deployment checklist document**

Document these exact Auth0 values:

```text
Application type: Regular Web Application
Allowed Callback URL: https://hello-render-express-cz16.onrender.com/callback
Allowed Logout URL: https://hello-render-express-cz16.onrender.com
Allowed Web Origin: https://hello-render-express-cz16.onrender.com
Local Callback URL: http://localhost:3000/callback
Local Logout URL: http://localhost:3000
Local Web Origin: http://localhost:3000
Google connection: enabled for the Money Pace application
Database connection: requires verified email and enables password reset
```

Document the exact Render environment variable names from `.env.example`, the PostgreSQL internal connection URL, and commands above. No real values enter the document.

- [ ] **Step 2: Run the complete local verification gate**

Run:

```bash
npm ci
npm run db:generate
npm run db:validate
npm test
git diff --check
```

Expected: every command exits `0` and tests report zero failures.

- [ ] **Step 3: Verify a local PostgreSQL migration**

Against an empty development database, run:

```bash
npx prisma migrate reset --force
npm run db:migrate:deploy
```

Expected: the committed migration applies once, re-running deploy reports no pending migrations, and all seven models exist.

- [ ] **Step 4: Configure Auth0 and Google**

In Auth0, create the Regular Web Application, enable the Google and database connections, require verified email, configure password reset, apply Money Pace Japanese branding, and configure a production transactional email provider. In Google Auth Platform, use the Auth0 callback URI shown by the Google social connection and publish the OAuth app for production.

Pause only when the user must authenticate, approve Google consent-screen ownership, or supply a paid email-provider account.

- [ ] **Step 5: Create Render PostgreSQL and configure the service**

Create PostgreSQL in the same Render region, set `DATABASE_URL` to the internal URL, add all Auth0 and application secrets, set build/pre-deploy/start commands, and deploy from `main`.

- [ ] **Step 6: Verify production with two isolated users**

Use two controlled test accounts and verify:

1. Email registration, verification, login, logout, and reset.
2. Google login and logout.
3. User A creates a budget and expense.
4. User B sees an empty dashboard.
5. User B cannot delete User A's record by replaying its URL.
6. A valid account-link flow maps two verified methods to one local user.
7. Session expiry returns to login.
8. Browser console contains no errors.
9. Desktop 1440px, iPhone 390px, and iPad 768px have no horizontal overflow.

- [ ] **Step 7: Commit deployment documentation**

```bash
git add docs/deployment/auth0-render.md package.json app.js test/appFactory.test.js
git commit -m "Document production authentication deployment"
```

- [ ] **Step 8: Push and wait for Render**

```bash
git push origin main
```

Expected: GitHub `main` points to the final commit, Render reports Live, `/health` returns `200`, and the public Money Pace URL presents the signed-out entry screen.

---

## Final Verification Checklist

- [ ] `npm test` reports zero failures.
- [ ] `npm run db:validate` and `npm run db:generate` succeed.
- [ ] Prisma migration applies to an empty PostgreSQL database and is idempotent under `migrate deploy`.
- [ ] All financial repository methods require `userId`.
- [ ] Cross-user read, update, and delete regression tests pass.
- [ ] Every POST form contains a valid CSRF token.
- [ ] Auth0 callback, logout, and origins match local and production URLs exactly.
- [ ] Google and email/password flows work in production.
- [ ] Verification and reset emails use branded production delivery.
- [ ] Account linking requires both authentications, rejects replay, and never merges existing data.
- [ ] Render environment contains all secrets and Git contains none.
- [ ] Public browser verification passes at 1440px, 768px, and 390px with no console errors.
