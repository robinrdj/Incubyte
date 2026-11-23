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
packages/
  shared/       Types and constants shared across apps
docs/           Requirements, plan, and interaction log
docker-compose.yml   Local PostgreSQL (development and test)
```

The web app (`apps/web`) is added in Stage 7.

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

Run with `npm run build` then `npm start` in `apps/api` (set the variables in `.env`).
Every `/api` route requires HTTP Basic authentication. `GET /health` is public.

| Method | Path                                | Purpose                                                                                                                                                                                                                              |
| ------ | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/employees`                    | Paginated list. Filters: `search`, `countryCode`, `departmentName`, `levelCode`, `status`. Also `page` and `pageSize` (max 100).                                                                                                     |
| POST   | `/api/employees`                    | Create an employee with an opening salary.                                                                                                                                                                                           |
| GET    | `/api/employees/:id`                | Employee with current salary.                                                                                                                                                                                                        |
| PATCH  | `/api/employees/:id`                | Update profile fields. Audited with changed fields only.                                                                                                                                                                             |
| POST   | `/api/employees/:id/salary-changes` | Append a salary change. Must be dated after the current one.                                                                                                                                                                         |
| GET    | `/api/employees/:id/salary-history` | All salary records, oldest first. Past records cannot be edited.                                                                                                                                                                     |
| GET    | `/api/employees/:id/audit`          | Every change to the employee, newest first.                                                                                                                                                                                          |
| GET    | `/api/analytics/compensation`       | Headcount, median, average, min, and max salary in USD. Groups by `groupBy=country\|department\|level`. Optional `asOf`. Active employees only.                                                                                      |
| GET    | `/api/analytics/band-violations`    | Active employees whose salary is below or above their level and country pay band, with compa-ratio. Optional `asOf`.                                                                                                                 |
| POST   | `/api/employees/import`             | Import employees from a CSV body (`Content-Type: text/csv`, max 5 MB, 10,000 rows). Valid rows are applied; rejected rows are reported by line. Add `?dryRun=true` to validate only. Re-running the same file creates no duplicates. |
| GET    | `/api/employees/export.csv`         | Export employees matching the list filters, in the same columns the import accepts.                                                                                                                                                  |

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
