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

`npm run dev` in `apps/web` starts the Vite dev server on port 5173. It forwards `/api` to the API on port 4000 (override with `VITE_API_TARGET`), so no CORS setup is needed in development.

Sign in with the HR username and password from `.env`. The session lasts for the browser tab only: reloading keeps you signed in, and closing the tab signs you out.

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

## Scripts

| Command                | Purpose                               |
| ---------------------- | ------------------------------------- |
| `npm run build`        | Compile all workspaces to `dist/`     |
| `npm run typecheck`    | TypeScript type checking, strict mode |
| `npm run lint`         | ESLint with type-aware rules          |
| `npm run format:check` | Prettier check                        |
| `npm test`             | Run all test suites                   |
| `npm run check`        | All of the above, in order            |

### Database commands (run inside `apps/api`)

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

Locally, run `npm run dev` in `apps/api`. It builds the API and starts it on port 4000 with the variables from the root `.env`. In production, `npm start` runs the built API and the host supplies the variables.
Every `/api` route requires HTTP Basic authentication. `GET /health` is public.

| Method | Path                                              | Purpose                                                                                                                                                                                                                              |
| ------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
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

### Seed data

`npm run seed` (in `apps/api`) loads 10,000 reproducible employees across 10 countries, with reference data, default FX rates (two dates per currency), and a pay band for every level in every country. HR changes these on the **Settings** page. The same seed always produces the same data.

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

Environment variables (in `.env`): `DATABASE_URL`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` (at least 12 characters), and optionally `PORT` (default 4000).
