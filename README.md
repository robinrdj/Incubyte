# Salary Management

A web app that replaces the Excel workbooks HR uses to manage salaries for about 10,000 employees across several countries. The HR Manager can maintain salary records, see pay bands, and answer questions about how the organization pays people.

> **Status:** Stage 0 (Project Foundation) in progress. See [docs/plan.md](docs/plan.md).

## Documentation

| Document                                           | Purpose                                          |
| -------------------------------------------------- | ------------------------------------------------ |
| [docs/requirements.md](docs/requirements.md)       | Goal, scope, features, and deliberate exclusions |
| [docs/plan.md](docs/plan.md)                       | Delivery phases and stage gates                  |
| [docs/interaction-log.md](docs/interaction-log.md) | Running log of decisions and actions             |

## Tech stack

- **Frontend:** React, TypeScript (Stage 7)
- **Backend:** Node.js, TypeScript
- **Database:** PostgreSQL, accessed through Prisma ORM (Stage 1)
- **Tests:** Vitest
- **Monorepo:** npm workspaces

## Repository layout

```
apps/
  api/          Backend HTTP service (Node.js, TypeScript)
  web/          React single-page app (Vite, Mantine, TypeScript)
packages/
  shared/       API contract types shared by the API and the web app
docs/           Requirements, plan, and interaction log
docker-compose.yml   Local PostgreSQL (development and test)
```

### Web app

The app follows the system light or dark setting, and the toggle in the header switches it. The choice is remembered.

**Demo account on the sign-in page.** The sign-in page shows the demo account (`hr.manager@acme.test`) with a one-click sign-in. `VITE_DEMO_EMAIL` and `VITE_DEMO_PASSWORD` change the details shown, and `VITE_HIDE_DEMO_ACCOUNT=true` hides the panel, which a deployment with real salaries should do.

`npm run dev` in `apps/frontend` starts the Vite dev server on port 5173. It forwards `/api` to the API on port 4000 (override with `VITE_API_TARGET`), so no CORS setup is needed in development.

Sign in with an HR account. When the database has no HR users, the API creates the first one at startup from `HR_EMAIL` and `HR_PASSWORD` in `.env`. Signed-in users add colleagues on the **HR users** page. The session lasts for the browser tab: reloading keeps you signed in, and closing the tab or signing out ends it.

The API client (`src/api/client.ts`) is typed with the shared contract. A change to a response shape is a compile error in the web app.

Screens:

- **Employees.** Directory with search, filters, pagination, and a pay-band badge. **Export CSV** downloads exactly the employees the current filters show.
- **Employee profile.** Edit details, view the salary timeline, and record a salary change.
- **Analytics.** Headcount and median, average, lowest, and highest pay in USD, grouped by country, department, or level, with an optional "as of" date. Below that is the list of employees outside their pay band, with compa-ratio.
- **Settings.** Exchange rates: the latest rate per currency, with a flag for a currency that has none, plus adding or correcting a dated rate and viewing its history. Pay bands: choose a country and edit the minimum and maximum for each level.
- **Import and export.** Export by country and status, a blank template, and a two-step import: **Check file** runs a dry run and lists row-level errors, and **Import** applies the valid rows.

CSV downloads start with a UTF-8 byte-order mark so Excel shows accented names correctly. The import ignores it.

## Getting started

Requirements: Node 22 (see `.nvmrc`), Docker.

```bash
npm install

# Start local PostgreSQL
docker compose up -d

# Configure environment
cp .env.example .env

# Run every check: build, typecheck, lint, format, tests
npm run check
```

## Tests

Tests live next to the code they cover, in a `tests` folder per package:

| Folder                           | What                                                                  |
| -------------------------------- | --------------------------------------------------------------------- |
| `apps/backend/tests/unit`        | Domain logic, seed generation, and configuration. No database.        |
| `apps/backend/tests/integration` | The HTTP API against a real PostgreSQL test database.                 |
| `apps/frontend/tests`            | Components and pages in jsdom with a fake API. Helpers in `support/`. |

## Scripts

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run build`        | Compile all workspaces to `dist/`     |
| `npm run typecheck`    | TypeScript type checking, strict mode |
| `npm run lint`         | ESLint with type-aware rules          |
| `npm run format:check` | Prettier check                        |
| `npm test`             | Run all test suites                   |
| `npm run check`        | All of the above, in order            |

### Database commands (run inside `apps/backend`)

| Command                    | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `npm run db:migrate`       | Create and apply a new migration to the dev database |
| `npm run db:deploy`        | Apply pending migrations to the dev database         |
| `npm run db:test:deploy`   | Apply pending migrations to the test database        |
| `npm run test:integration` | Run integration tests against the test database      |

Prisma has no down-migrations. To roll back, drop the schema and re-apply:
`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`, then `npm run db:test:deploy`.
Integration tests refuse to run against any database whose name does not end in `_test`.

## API

Locally, run `npm run dev` in `apps/backend`. It builds the API and starts it on port 4000 with the variables from the root `.env`. In production, `npm start` runs the built API and the host supplies the variables.
`POST /api/session` exchanges an email and password for a session token (12-hour expiry, stored only as a SHA-256 hash). Every other `/api` route needs `Authorization: Bearer <token>`. `GET /health` is public.

| Method | Path                                              | Purpose                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| POST   | `/api/session`                                    | Sign in with `{ email, password }`. Returns `{ token, expiresAt, user }`. Public.                                                                                                                                                    |
| GET    | `/api/session`                                    | The signed-in HR user.                                                                                                                                                                                                               |
| DELETE | `/api/session`                                    | Sign out (ends the session).                                                                                                                                                                                                         |
| GET    | `/api/users`                                      | HR users, oldest first.                                                                                                                                                                                                              |
| POST   | `/api/users`                                      | Add an HR user with `{ name, email, password }`. Records who added them.                                                                                                                                                             |
| GET    | `/api/employees`                                  | Paginated list. Filters: `search`, `countryCode`, `departmentName`, `levelCode`, `status`. Also `page` and `pageSize` (max 100).                                                                                                     |
| POST   | `/api/employees`                                  | Create an employee with an opening salary.                                                                                                                                                                                           |
| GET    | `/api/employees/:id`                              | Employee with current salary.                                                                                                                                                                                                        |
| PATCH  | `/api/employees/:id`                              | Update profile fields. Audited with changed fields only.                                                                                                                                                                             |
| POST   | `/api/employees/:id/salary-changes`               | Append a salary change. Must be dated after the current one.                                                                                                                                                                         |
| GET    | `/api/employees/:id/salary-history`               | All salary records, oldest first. Past records cannot be edited.                                                                                                                                                                     |
| GET    | `/api/employees/:id/audit`                        | Every change to the employee, newest first.                                                                                                                                                                                          |
| GET    | `/api/analytics/compensation`                     | Headcount, median, average, min, and max salary in USD. Groups by `groupBy=country\|department\|level`. Optional `asOf`. Active employees only.                                                                                      |
| GET    | `/api/analytics/band-violations`                  | Active employees whose salary is below or above their level and country pay band, with compa-ratio. Optional `asOf`.                                                                                                                 |
| POST   | `/api/employees/import`                           | Import employees from a CSV body (`Content-Type: text/csv`, max 5 MB, 10,000 rows). Valid rows are applied; rejected rows are reported by line. Add `?dryRun=true` to validate only. Re-running the same file creates no duplicates. |
| GET    | `/api/settings/fx-rates`                          | Every stored rate to USD, newest first within each currency.                                                                                                                                                                         |
| PUT    | `/api/settings/fx-rates`                          | Save `{ currency, rate, rateDate }`. A new date adds a rate. An existing date is corrected. USD and currencies no country uses are refused.                                                                                          |
| GET    | `/api/settings/pay-bands`                         | Every pay band, in the country's currency.                                                                                                                                                                                           |
| PUT    | `/api/settings/pay-bands/:countryCode/:levelCode` | Set `{ minAmount, maxAmount }` for a level in a country. Creates the band if it is missing. The minimum must be above zero and the maximum at or above it.                                                                           |
| GET    | `/api/employees/export.csv`                       | Export employees matching the list filters, in the same columns the import accepts.                                                                                                                                                  |

### Hosted database (Neon)

Production uses [Neon](https://neon.tech) PostgreSQL. Neon gives two connection strings for the same database:

| Variable              | Neon string                                             | Used by                 |
| --------------------- | ------------------------------------------------------- | ----------------------- |
| `DATABASE_URL`        | **Pooled** (the host contains `-pooler`)                | The running API         |
| `DIRECT_DATABASE_URL` | **Direct** (Connect dialog with connection pooling off) | Migrations and the seed |

When `DIRECT_DATABASE_URL` is set, `npm run db:deploy` and `npm run seed` use it. Otherwise they use `DATABASE_URL`, as in local development. A variable set in the shell takes priority over `.env`, so a one-off run against Neon needs no file changes. In PowerShell, from `apps/backend`:

```powershell
$env:DIRECT_DATABASE_URL = "<direct connection string>"
npm run db:deploy   # create the tables
npm run seed        # load the 10,000 employees, default FX rates, and pay bands
Remove-Item Env:DIRECT_DATABASE_URL
```

In both Neon strings, change `sslmode=require` to `sslmode=verify-full`. The `pg` driver already treats `require` as `verify-full` (it checks the certificate and host name), but warns that a future major version will weaken `require` to libpq semantics. Writing `verify-full` keeps the strict check and silences the warning.

Both commands print the host and database they target, never the password. Keep the API in the same region as the database, because every request makes database round trips.

### Seed data

`npm run seed` (in `apps/backend`) loads 10,000 reproducible employees across 10 countries, with reference data, default FX rates (two dates per currency), and a pay band for every level in every country. Names come from a pool for each region, so a German office has German names, and no two employees share a full name. HR changes these on the **Settings** page. The same seed always produces the same data.

| Command                    | Purpose                                                             |
| -------------------------- | ------------------------------------------------------------------- |
| `npm run seed`             | Load into an empty database. Refuses to run if data already exists. |
| `npm run seed -- --reset`  | Delete all salary data, then load the seed.                         |
| `npm run seed -- --seed=7` | Use a different seed (still reproducible).                          |

On a local PostgreSQL instance the full load takes about 7 seconds. The stated budget is 60 seconds. The sample figures are illustrative and are not market data.

### CSV format

Columns (header names are case-insensitive; unknown or missing required columns fail the whole file):

`employeeCode, firstName, lastName, email, jobTitle, countryCode, departmentName, levelCode, startDate, status, salaryAmount, salaryCurrency, salaryEffectiveFrom`

- `employeeCode` and `email` identify the employee. A row matches an existing employee by email, and the code must agree.
- `status` is optional (`ACTIVE` or `LEAVING`). Leave it blank to keep the current status.
- `salaryEffectiveFrom` is the date of the salary. A row with a new date later than the current salary appends a salary record. An identical salary is a no-op. A salary dated before the current one is rejected, because history is never rewritten.
- Country, department, and level must already exist. Unknown values are rejected, not created.
- Text cells starting with `=`, `+`, `-`, or `@` are prefixed with an apostrophe on export, to stop spreadsheet formula injection.

Errors use one shape: `{ "error": { "code", "message", "details?" } }`.
Status codes: 400 invalid input, 401 unauthenticated, 404 not found, 409 duplicate email or code, 422 business-rule violation.

Environment variables (in `.env`): `DATABASE_URL`; `HR_EMAIL` and `HR_PASSWORD` (at least 12 characters) for the first HR account; and optionally `PORT` (default 4000) and `CORS_ORIGIN`.

## Deployment

The web app and the API are hosted separately: the API on [Render](https://render.com), the web app on [Vercel](https://vercel.com), and PostgreSQL on [Neon](https://neon.tech). All three have free plans.

```
Browser ──> Vercel (static React app) ──HTTPS + session token──> Render (Node API) ──> Neon (PostgreSQL)
                                                               ohio                  us-east-2 (Ohio)
```

### 1. Database (Neon)

Create the tables and load the seed from your machine, as described in [Hosted database (Neon)](#hosted-database-neon).

### 2. API (Render)

1. In Render, choose **New > Blueprint** and select this repository. `render.yaml` defines the service: Node 22, Ohio region, health check on `/health`.
2. Fill in the variables Render asks for:

| Variable              | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| `DATABASE_URL`        | Neon **pooled** connection string                           |
| `DIRECT_DATABASE_URL` | Neon **direct** connection string (used by migrations)      |
| `HR_EMAIL`            | Email of the first HR account (created when there are none) |
| `HR_PASSWORD`         | Its password, at least 12 characters                        |
| `CORS_ORIGIN`         | The Vercel address from step 3, e.g. `https://….vercel.app` |

The build installs, compiles, and applies pending migrations (`prisma migrate deploy`). Migrations run during the build because Render's pre-deploy step needs a paid plan.

### 3. Web app (Vercel)

1. In Vercel, import this repository and set **Root Directory** to `apps/frontend`. `apps/frontend/vercel.json` sets the install and build commands, which run from the repository root because the app uses the shared workspace package. It also sends every path to `index.html`, so reloading a page such as `/employees/…` works.
2. Set the environment variables, then deploy:

| Variable                 | Value                                                                 |
| ------------------------ | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL`      | The Render address, e.g. `https://salary-management-api.onrender.com` |
| `VITE_HIDE_DEMO_ACCOUNT` | Optional: `true` hides the demo account on the sign-in page           |

3. Copy the Vercel address into the API's `CORS_ORIGIN` on Render. Render redeploys when a variable changes.

### Notes

- **Cold starts.** Render's free plan stops the API after about 15 minutes without traffic, and the next request then takes 30–60 seconds. An uptime monitor that calls `/health` every 10 minutes keeps it awake. Neon also suspends an idle database, which adds about a second to the first query.
- **Sessions.** The web app signs in once and sends the session token as a Bearer header. When a session expires, the next request returns 401 and the app goes back to the sign-in page.
- **CORS.** Only the origins in `CORS_ORIGIN` may call the API from a browser. The token travels in the `Authorization` header, so no cookies or credentialed CORS are involved.
