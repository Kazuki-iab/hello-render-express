# Money Pace production authentication deployment

## Auth0 application

- Application type: Regular Web Application
- Allowed Callback URLs:
  - `https://hello-render-express-cz16.onrender.com/callback`
  - `http://localhost:3000/callback`
- Allowed Logout URLs:
  - `https://hello-render-express-cz16.onrender.com`
  - `http://localhost:3000`
- Allowed Web Origins:
  - `https://hello-render-express-cz16.onrender.com`
  - `http://localhost:3000`
- Google connection: enabled for this application
- Database connection: enabled for this application, email verification required, password reset enabled
- Universal Login: Money Pace name, logo, and Japanese prompts

The application rejects an Auth0 identity until `email_verified` is true. Configure a production transactional email provider before inviting users.

## Render PostgreSQL

Create PostgreSQL in the same region as the web service. Use its internal connection URL for `DATABASE_URL`.

## Render web service

- Build command: `npm ci`
- Pre-deploy command: `npm run db:migrate:deploy`
- Start command: `npm start`
- Health check path: `/health`

Set these environment variables without committing their values:

```text
NODE_ENV=production
DATABASE_URL
AUTH0_SECRET
AUTH0_BASE_URL=https://hello-render-express-cz16.onrender.com
AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET
AUTH0_ISSUER_BASE_URL
CSRF_SECRET
ACCOUNT_LINK_SECRET
```

Generate `AUTH0_SECRET`, `CSRF_SECRET`, and `ACCOUNT_LINK_SECRET` independently with at least 32 random bytes each.

## Release checks

1. Run `npm ci`, `npm run db:validate`, `npm run db:generate`, and `npm test`.
2. Verify email registration, verification, login, password reset, and logout.
3. Verify Google login and logout.
4. Create data as User A and confirm User B sees an empty account.
5. Confirm User B cannot delete a User A record by submitting its URL.
6. Link a second login method and confirm replaying the link fails.
7. Check desktop, iPad, and iPhone layouts with no browser-console errors.
