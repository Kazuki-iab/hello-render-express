# Money Pace Production Authentication Design

Date: 2026-07-15
Status: Approved for implementation planning

## 1. Objective

Add production-ready authentication and persistent, user-isolated data to Money Pace without changing the core budgeting experience.

Users must be able to:

- sign up and sign in with Google;
- sign up and sign in with an email address and password;
- verify an email address before using password login;
- request and complete a password reset;
- sign out safely;
- keep expenses, incomes, fixed costs, budget, and profile settings private to their account;
- return later and find their data intact after a Render restart or deployment.

## 2. Scope

### Included

- Auth0 Universal Login with Google and Auth0 database connections
- Branded Japanese authentication screens and emails
- Email verification and password reset
- User-initiated linking between Google and password identities after reauthentication
- Encrypted cookie-based sessions
- Protected application and mutation routes
- Render PostgreSQL persistence through Prisma
- Per-user profile, budget, expense, income, and fixed-cost records
- Account menu and a small account settings view
- CSRF protection, security headers, input validation, and request throttling
- Automated authorization and data-isolation tests
- Render deployment and production authentication verification

### Not included

- Teams, shared household accounts, or invitations
- Bank or card integrations
- Paid plans
- Administrator console
- Multi-factor authentication in the first release
- Migration of temporary in-memory records
- Custom-domain purchase or DNS work

Auth0 MFA and a custom authentication domain can be added later without replacing the data model.

## 3. Architecture

Money Pace remains an Express application hosted on Render.

- **Identity provider:** Auth0
- **Application server:** Node.js and Express on Render
- **Persistent data:** Render PostgreSQL
- **Database access:** Prisma
- **Browser session:** encrypted, HTTP-only cookie managed by the Auth0 Express integration
- **Google OAuth credentials:** stored in Auth0, never exposed to the browser or committed to Git

Auth0 is responsible for credentials, Google OAuth, email verification, password reset, and identity sessions. Money Pace is responsible for mapping one or more verified Auth0 identities to one local user, enforcing application authorization, and ensuring that every financial record belongs to that user.

The existing application routes remain recognizable. Authentication middleware is added ahead of application routes, and controllers receive a local user ID resolved from the authenticated Auth0 subject.

## 4. Authentication Flow

### New user with email and password

1. The visitor opens Money Pace and is redirected to the branded Auth0 sign-up flow.
2. The visitor submits an email address and password.
3. Auth0 sends a verification email.
4. The visitor verifies the address and signs in.
5. Money Pace receives the Auth0 callback and establishes an encrypted session cookie.
6. Money Pace resolves the immutable Auth0 `sub` claim through a local user-identity record, creating a user and identity together on first login.
7. The user reaches an empty, personal dashboard.

### New or returning user with Google

1. The visitor chooses Google on the same login screen.
2. Auth0 completes the Google OAuth flow.
3. Money Pace receives the callback, establishes the session, and resolves or creates the local user identity.
4. If Auth0 finds another verified identity with the same email address, Money Pace offers account linking instead of merging automatically.
5. Linking completes only after the user authenticates with both identities again. Money Pace then maps both immutable Auth0 subjects to the same local Money Pace user.

### Password reset

1. The visitor requests a reset from the Auth0 login flow.
2. Auth0 returns the same neutral response regardless of whether the address is registered.
3. Auth0 sends a time-limited reset email when appropriate.
4. Successful reset invalidates other sessions when supported by the configured Auth0 policy.

### Sign out

The account menu initiates Auth0 logout, clears the Money Pace session, and returns the user to the public login entry point.

### Account linking

Auth0 treats Google and database identities as separate users by default. Money Pace never links accounts based on an email match alone.

When two verified identities appear to share an email address, account settings can offer `ログイン方法を連携`. The user must authenticate with the current identity and the identity being added. A signed, short-lived linking state binds the second authentication to the already authenticated local user. Money Pace then creates a second user-identity mapping for that local user. If the second identity already belongs to another local user, the operation stops and requires a later, explicitly designed merge flow; no financial records are silently combined or discarded.

## 5. Authorization Boundary

The application never trusts a user ID supplied by the browser.

For every request:

1. Auth0 middleware validates the session.
2. Money Pace reads the Auth0 subject from the verified identity claims.
3. The user service resolves that subject through `UserIdentity` to a local database user.
4. Controllers pass only the resolved local user ID to repositories.
5. Every read, insert, update, and delete includes that user ID in its database condition.

Mutation and lookup routes return `404` when a record is absent or belongs to another user. This avoids confirming that another user's record exists.

## 6. Data Model

### User

- `id`: UUID primary key
- `email`: current verified email snapshot
- `displayName`: editable display name
- `avatarUrl`: provider avatar URL when available
- `createdAt`, `updatedAt`

### UserIdentity

- `id`: UUID primary key
- `userId`: foreign key to User
- `subject`: unique immutable Auth0 `sub` claim
- `provider`: normalized provider name such as `google-oauth2` or `auth0`
- `email`: verified email snapshot for the identity
- `createdAt`, `updatedAt`
- unique constraint on `subject`
- index on `userId`

### MonthlyBudget

- `id`: UUID primary key
- `userId`: foreign key to User
- `month`: first day of the target month
- `amount`: positive integer yen amount
- unique constraint on `userId + month`

### Expense

- existing expense fields
- `id`: UUID primary key
- `userId`: foreign key to User
- `createdAt`, `updatedAt`
- index on `userId + date`

### Income

- existing income fields
- `id`: UUID primary key
- `userId`: foreign key to User
- `createdAt`, `updatedAt`
- index on `userId + date`

### FixedCost

- existing fixed-cost fields
- `id`: UUID primary key
- `userId`: foreign key to User
- `createdAt`, `updatedAt`
- index on `userId`

Deleting a local user is not exposed in the first release. Foreign keys use restrictive deletion behavior until an explicit, audited account-deletion flow is designed.

## 7. Application Structure

The current three-layer organization remains, with focused additions:

- `auth/`: Auth0 configuration, route protection, and local-user resolution
- `auth/linking`: signed short-lived linking state and second-authentication completion
- `routes/`: HTTP route definitions only
- `controllers/`: request validation, service calls, and responses
- `services/`: authentication-aware application operations
- `repositories/`: Prisma queries that always require `userId`
- `models/` or `prisma/`: schema and database migration definitions
- `public/`: authenticated product UI and account UI

The current in-memory store is replaced by repository methods. Dashboard calculations remain pure functions where practical so financial calculations can be tested independently of PostgreSQL.

## 8. Product Experience

### Signed out

Visitors see a quiet Money Pace entry screen with one primary action: `Money Paceを始める`. Authentication occurs in an Auth0 Universal Login experience branded with the Money Pace logo, typography, neutral palette, emerald accent, and natural Japanese copy.

The login screen offers:

- `Googleで続ける`
- email address and password
- `アカウントを作成`
- `パスワードを忘れた方`

### Signed in

The existing four-view product remains the main experience. The top-right management action gains a compact avatar and account menu containing:

- account settings
- signed-in email address
- login-method linking when a verified matching identity is available
- sign out

Account settings allow editing the display name. The email address and connected login methods are displayed but managed through Auth0. Monthly budget continues to be edited through the existing Money Pace budget interface and is now stored per user and month.

Authentication errors use short Japanese messages and always provide a clear recovery action. Internal provider or database details are never shown to the user.

## 9. Security Requirements

- Production traffic uses HTTPS only.
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Lax`.
- Session secrets contain at least 32 random bytes and exist only in Render environment variables.
- Login callbacks and logout URLs are allow-listed exactly in Auth0.
- Existing POST routes require CSRF tokens.
- `helmet` supplies baseline security headers with a Content Security Policy compatible with Auth0 redirects and local assets.
- Mutation routes receive conservative per-user and per-IP rate limits.
- Controllers validate amount, date, category, source, payment method, and string lengths before database writes.
- Error logs exclude cookies, tokens, passwords, reset links, and complete identity claims.
- Prisma queries never accept a client-supplied owner ID.
- Database constraints reject invalid ownership and duplicate monthly budgets.
- Secrets and production credentials are excluded from Git and sample files contain names only.

## 10. Failure Handling

- Missing or expired session: redirect to login, preserving only a safe internal return path.
- Auth0 callback failure: show a branded retry screen and log a correlation ID.
- Unverified email: explain that confirmation is required and offer resend through Auth0.
- PostgreSQL unavailable: return a branded `503` response without rendering stale or cross-user data.
- Duplicate form submission: keep the existing client lock and add database-safe request handling.
- Unauthorized record identifier: return `404`.
- Validation failure: return the user to the relevant view with field-safe Japanese feedback.

## 11. Deployment Configuration

Render uses these exact environment variable names:

- `DATABASE_URL`
- `AUTH0_SECRET`
- `AUTH0_BASE_URL`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_ISSUER_BASE_URL`
- `CSRF_SECRET`

Google client credentials are configured in the Auth0 Google social connection. Auth0 is configured with the exact production callback URL, logout URL, and web origin for `https://hello-render-express-cz16.onrender.com` plus local development URLs. Money Pace uses the same Auth0 application for the second authentication in account linking; it does not require Auth0 Management API credentials.

A Render pre-deploy command applies reviewed Prisma migrations before the new application version receives traffic. A health endpoint verifies the server process without exposing user or database contents.

Production email verification and reset delivery use an Auth0-supported transactional email provider rather than a trial-only sender.

## 12. Testing Strategy

### Unit tests

- dashboard calculations using repository-shaped data
- input validation
- Auth0 subject to local-user resolution
- safe return-path handling

### Integration tests

- protected routes reject unauthenticated requests
- first login creates one local user
- repeated login does not duplicate the local user
- account linking requires successful authentication of both identities
- an account-link conflict never merges or deletes financial records automatically
- every repository query requires `userId`
- user A cannot read, update, or delete user B's records
- budget uniqueness per user and month
- CSRF rejection and accepted valid mutation
- database failures return safe responses

### Browser verification

- email sign-up and verification
- email login and logout
- Google login and logout
- password reset
- session expiry
- account menu and display-name update
- separate accounts show separate dashboards
- desktop, iPhone, and iPad layouts
- keyboard navigation and visible focus

## 13. Rollout Sequence

1. Create the Auth0 production application and connections.
2. Create Render PostgreSQL.
3. Add Prisma schema and migrations.
4. Add Auth0 middleware, user-identity resolution, and signed account-link state.
5. Replace the memory store with user-scoped repositories.
6. Add the signed-out entry, account menu, and account settings UI.
7. Add security middleware and tests.
8. Verify locally using development credentials.
9. Configure Render secrets and pre-deploy migration.
10. Deploy and verify both authentication methods with two isolated users.

## 14. Acceptance Criteria

- Google and email/password registration and login work in production.
- Email verification is required for password accounts.
- Password reset works without revealing whether an address exists.
- Sessions survive normal page navigation and are cleared on logout.
- Unauthenticated visitors cannot access financial data or mutation routes.
- Two test users cannot see or modify each other's records.
- Expenses, incomes, fixed costs, budgets, and profile settings survive Render restarts.
- Existing Money Pace calculations and four-view interface continue to work.
- Automated tests pass and the deployed service has no browser console errors.
- No secrets or identity tokens are committed to Git.
