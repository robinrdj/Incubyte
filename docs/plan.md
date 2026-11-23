# Delivery Plan

Work is organized into three phases and twelve numbered stages. Each stage ends with: tests passing, typecheck and lint clean, a focused commit, and an entry in `docs/interaction-log.md`. A stage does not start until the previous one is committed.

## Phase A: Backend

| Stage | Name                         | Scope                                                                                                                                                                                     | Done when                                                                                                                                                                     |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Project Foundation           | npm workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`), TypeScript strict mode, ESLint, Prettier, Vitest, Docker Compose for local PostgreSQL, `.gitignore`, README skeleton | Workspaces typecheck, lint, and run one smoke test. Postgres starts locally.                                                                                                  |
| 1     | Data Model and Persistence   | Prisma schema and migrations for countries, departments, levels, employees, salary_records, pay_bands, fx_rates, audit_log. Indexes on country, department, level, and name.              | Migrations apply to an empty test database and create all tables and indexes. Integration tests pass. Rollback means drop-and-reapply, because Prisma has no down-migrations. |
| 2     | Core Business Logic          | Pure functions with no database: band check, compa-ratio, FX conversion to USD, median and percentile, CSV row validation.                                                                | Unit tests cover edge cases (missing rate, zero band, duplicate email). Suite runs in under 5 seconds.                                                                        |
| 3     | Employee and Salary Services | REST endpoints for employee CRUD, filtered and paginated list, append-only salary history, basic-auth middleware. Audit row written on every salary change.                               | Integration tests pass against a real test database. Duplicate emails rejected. Past salary records never modified.                                                           |
| 4     | Compensation Analytics       | Endpoints for headcount and median, average, min, and max base salary grouped by country, department, and level, all in USD. Band-violation list.                                         | Tests use a fixed fixture and assert exact expected numbers.                                                                                                                  |
| 5     | Bulk Data Exchange           | CSV import with row-level validation and an error report. CSV export matching the active filter.                                                                                          | Tests cover a file with valid and invalid rows. Re-running an import produces no duplicates.                                                                                  |
| 6     | Seed Data Generation         | Deterministic generator for 10,000 employees across about 10 countries, with salary distributions per level and country.                                                                  | Same seed gives identical output. Row counts are correct. Runs within a stated time budget.                                                                                   |

## Phase B: Frontend

| Stage | Name                           | Scope                                                                                                                  | Done when                                                                           |
| ----- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 7     | Web Application Foundation     | React, Vite, TypeScript, component library, routing, typed API client generated from shared types, app shell.          | Component tests pass. App builds. Shell renders against a mocked API.               |
| 8     | Employee Management UI         | Directory with search, filters, and pagination. Profile with edit form. Salary history timeline. Band-violation badge. | Component tests cover filter and form behavior. Manual check against the local API. |
| 9     | Analytics and Data Exchange UI | Dashboard with grouped tables and charts. CSV upload with error display. Export button.                                | Component tests cover dashboard rendering and import error display.                 |

## Phase C: Release

| Stage | Name                         | Scope                                                                                                                                                 | Done when                                                                                         |
| ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 10    | Production Deployment        | Render for API and PostgreSQL, Vercel or Render for the web app. Environment variables, basic-auth credentials, production migrations, seed run once. | Public URL works end to end: login, list, edit, analytics. Deployment steps documented in README. |
| 11    | Submission and Documentation | Demo video, final README, architecture diagram, AI-usage notes, trade-offs, and a Known Gaps section. Reply to the assessment email.                  | All artifacts committed. Video linked from README.                                                |

## Default decisions (change before Stage 0 if you disagree)

- **ORM:** Prisma, chosen by the user. Schema and migrations use Prisma's tooling. Aggregates Prisma cannot express, such as median (`percentile_cont`), go through typed raw SQL (`$queryRaw`) and are covered by integration tests.
- **Component library:** Mantine. It has built-in data table, form, and chart support.
- **Test runner:** Vitest for unit and component tests, with a real PostgreSQL instance for integration tests.
- **Auth:** HTTP basic auth via environment variables, as set in the requirements.
