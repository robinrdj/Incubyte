# Salary Management

A web app that replaces the Excel workbooks ACME's HR team uses to manage salaries for 10,000 employees across 10 countries. The HR Manager keeps salary records and pay history in one place, maintains pay bands and exchange rates, and answers questions such as _"What do we pay engineers in Germany versus India?"_ and _"Who sits outside their pay band?"_

**Live demo:** https://incubyte-gules.vercel.app. The sign-in page has a one-click demo account. The data is generated, not real salaries.
**API:** https://incubyte-c172.onrender.com (`/health` is public). The free host may take up to a minute to wake after an idle period.

## Documentation

| Document                                                 | What it covers                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Requirements](docs/requirements.md)                     | Goal, scope, features, and what is deliberately left out, and why                                    |
| [Plan](docs/plan.md)                                     | The twelve delivery stages and the decisions made along the way                                      |
| [Architecture](docs/architecture.md)                     | Diagram, key design decisions, trade-offs, and performance                                           |
| [AI development summary](docs/AI-development-summary.md) | How the app was built with an AI agent, in two pages                                                 |
| [AI prompts](docs/ai-prompts.md)                         | The instructions given to the AI agent, stage by stage                                               |
| [Design history](docs/design-history.md)                 | Each visual design and the commit to restore it                                                      |
| [Interaction log](docs/interaction-log.md)               | The full, stage-by-stage log of requests, decisions, and fixes                                       |
| [PDFs](docs/pdf/)                                        | PDF copies of the requirements, architecture, AI development summary, AI prompts, and design history |

## What it does

- **Employees.** Search, with country, department, and level multi-select filters and a status filter in a side drawer. A table or card view, pagination, pay band badges, and CSV export of exactly the filtered list. Click any row to open the profile.
- **Employee profile.** Edit details, see the salary timeline, and record a salary change. Salary history is append-only: a later date adds a record, the current record's own date corrects it (audited), and earlier dates are refused.
- **Analytics.** In US dollars at the exchange rate in force on any chosen date.
  - **Pay by group:** headcount, median, average, lowest, and highest pay by country, department, or level, with headcount and pay-range charts.
  - **Pay bands:** the share of people below, within, and above their band, and a paged list of everyone outside it, furthest first.
  - Both tables export to CSV.
- **Settings.** Dated exchange rates (adding a new date never changes earlier figures) and a pay band per level per country.
- **Import and export.** A CSV round trip with Excel: export, edit, then import with a dry-run check that reports errors by row. Re-running the same file changes nothing.
- **HR users.** Sign in with email and password. Any HR user can add colleagues. Every employee and salary change records who made it.

## Tech stack

| Layer    | Choice                                                                                   |
| -------- | ---------------------------------------------------------------------------------------- |
| Backend  | Node.js 22, TypeScript, Express 5, Zod validation, Prisma 7 with the `pg` driver adapter |
| Database | PostgreSQL (Neon in production)                                                          |
| Frontend | React 19, Vite, Mantine 9, React Router, TypeScript                                      |
| Shared   | `packages/shared`: the API contract types and CSV columns, used by both apps             |
| Tests    | Vitest, Testing Library, and supertest against a real PostgreSQL test database           |
| Hosting  | Render (API), Vercel (web app), Neon (database)                                          |

## Repository layout

```
apps/
  backend/                 HTTP API
    src/
      domain/              Pure business rules: money, FX, pay bands, statistics, CSV, import planning
      services/            Database work: employees, analytics, import/export, settings, auth, users
      http/                Express app, routes, request schemas, error mapping, session middleware
      auth/                Password hashing and session tokens
      seed/                Deterministic 10,000-employee generator and loader
    prisma/                Schema and migrations
    tests/unit/            Domain, seed, and configuration tests (no database)
    tests/integration/     API tests against a real PostgreSQL test database
  frontend/                React single-page app
    src/
      pages/               One file per screen: state, data loading, and layout only
      components/<feature>/ The pieces of each screen (analytics, employees, settings, …)
      hooks/ lib/ api/ auth/ theme/
    tests/                 Page and component tests with a fake API (helpers in tests/support)
packages/shared/           Types shared by both apps
docs/                      Requirements, plan, architecture, summaries, design history, PDFs
render.yaml                API deployment (Render)
docker-compose.yml         Optional local PostgreSQL for development and tests
```

## Running locally

Requirements: Node 22 (see `.nvmrc`) and PostgreSQL. Either run `docker compose up -d` (ports 5434 for development and 5435 for tests) or use your own server.

```bash
npm install
cp .env.example .env            # then set DATABASE_URL, TEST_DATABASE_URL, HR_EMAIL, HR_PASSWORD

cd apps/backend
npm run db:deploy               # create the tables
npm run db:test:deploy          # and in the test database
npm run seed                    # 10,000 employees, FX rates, and pay bands (about 6 s locally)
npm run dev                     # API on http://localhost:4000

cd ../frontend
npm run dev                     # web app on http://localhost:5173, /api proxied to port 4000
```

Sign in with `HR_EMAIL` and `HR_PASSWORD`. The API creates that first HR account at startup when there are none.

## Tests and checks

| Command (from the repository root)         | What it runs                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `npm run check`                            | Build, typecheck, lint, format check, and every unit and frontend test |
| `npm test`                                 | Unit tests (backend and shared) and frontend tests                     |
| `npm run test:integration -w apps/backend` | API integration tests against `TEST_DATABASE_URL`                      |

The suite has 151 backend unit tests, 127 integration tests, and 117 frontend tests, and every run is deterministic. Time is injected and the seed is fixed, so no test depends on the wall clock or randomness. Integration tests refuse any database whose name does not end in `_test`.

## API

`POST /api/session` exchanges an email and password for a session token (12-hour expiry, stored only as a SHA-256 hash). Every other `/api` route needs `Authorization: Bearer <token>`. `GET /health` is public. Errors share one shape, `{ "error": { "code", "message", "details?" } }`, with 400 for invalid input, 401 for no session, 404 not found, 409 for a duplicate, and 422 for a business-rule violation.

| Method     | Path                                              | Purpose                                                                                                                                |
| ---------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| POST       | `/api/session`                                    | Sign in. Returns `{ token, expiresAt, user }`.                                                                                         |
| GET/DELETE | `/api/session`                                    | Who is signed in, or sign out.                                                                                                         |
| GET/POST   | `/api/users`                                      | List or add HR users. Adding records who added them.                                                                                   |
| GET        | `/api/employees`                                  | Paged list with `search`, `status`, and comma-separated `countryCode`, `departmentName`, and `levelCode`. Includes `statusCounts`.     |
| POST       | `/api/employees`                                  | Create an employee with an opening salary.                                                                                             |
| GET/PATCH  | `/api/employees/:id`                              | Read or update a profile. Updates audit only the changed fields.                                                                       |
| POST       | `/api/employees/:id/salary-changes`               | Record a salary: a later date appends, the current date corrects, earlier dates are refused.                                           |
| GET        | `/api/employees/:id/salary-history`, `/audit`     | Salary records, oldest first. The audit trail, newest first.                                                                           |
| GET        | `/api/employees/export.csv`                       | Employees matching the list filters, in the import's columns.                                                                          |
| POST       | `/api/employees/import`                           | CSV body (up to 5 MB and 10,000 rows). `?dryRun=true` validates only. Valid rows apply together, and rejected rows are listed by line. |
| GET        | `/api/analytics/compensation`                     | Headcount and median, average, min, and max pay in USD by `groupBy`, at optional `asOf`. Active employees only.                        |
| GET        | `/api/analytics/band-violations`                  | People outside their band, furthest first. Optional `employeeIds`, `position`, `page`, and `pageSize`, with below and above counts.    |
| GET        | `/api/analytics/*.csv`                            | Both reports as CSV. The band list is exported in full, not one page.                                                                  |
| GET/PUT    | `/api/settings/fx-rates`                          | Dated rates. A new date adds a rate, and the same date corrects one.                                                                   |
| GET/PUT    | `/api/settings/pay-bands/:countryCode/:levelCode` | Read all bands, or set one band's `{ minAmount, maxAmount }` (creating it if missing).                                                 |

## CSV format

`employeeCode, firstName, lastName, email, jobTitle, countryCode, departmentName, levelCode, startDate, status, salaryAmount, salaryCurrency, salaryEffectiveFrom`

- Rows match existing employees by email, and the code must agree. Duplicate emails or codes within a file reject every row involved.
- `status` is optional. A salary dated after the current one appends a record, an identical salary is a no-op, and anything else is rejected.
- Countries, departments, and levels must already exist.
- On export, text starting with `=`, `+`, `-`, or `@` gets an apostrophe, so a cell cannot run as a formula. Downloads start with a UTF-8 byte-order mark for Excel.

## Deployment

The API runs on Render, the web app on Vercel, and PostgreSQL on Neon, all on free plans, with the API and database in the same region (Ohio).

1. **Database (Neon).** Create a project, then from `apps/backend` run `npm run db:deploy` and `npm run seed` with `DIRECT_DATABASE_URL` set to Neon's direct (unpooled) connection string. Use `sslmode=verify-full`.
2. **API (Render).** Create a web service from this repository on branch `master`, region Ohio. `render.yaml` holds the same settings for a Blueprint.
   - Build: `npm ci && npm run build -w packages/shared && npm run build -w apps/backend && npm run db:deploy -w apps/backend`
   - Start: `npm start -w apps/backend`
   - Health check: `/health`
   - Environment: `NODE_VERSION=22`, `DATABASE_URL` (Neon pooled), `DIRECT_DATABASE_URL` (Neon direct), `HR_EMAIL`, `HR_PASSWORD`, and `CORS_ORIGIN` (the Vercel address).
3. **Web app (Vercel).** Import the repository with **Root Directory** `apps/frontend`. `vercel.json` sets the build and sends every path to `index.html`. Set `VITE_API_BASE_URL` to the Render address. `VITE_HIDE_DEMO_ACCOUNT=true` hides the demo account for real data.

Render's free plan sleeps after about 15 idle minutes, so an uptime monitor calling `/health` every 5 minutes keeps the demo responsive.
