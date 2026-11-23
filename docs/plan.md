# Delivery Plan

Work proceeds one stage at a time. Each stage ends with: tests passing, typecheck and lint clean, a focused commit, and an entry in `docs/interaction-log.md`. A stage is not started until the previous one is committed.

| Stage | Name | Scope | Done when |
|---|---|---|---|
| 0 | Repo and tooling | npm workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`), TypeScript strict mode, ESLint, Prettier, Vitest, Docker Compose for local PostgreSQL, `.gitignore`, README skeleton | Empty workspaces typecheck, lint, and run one smoke test. Postgres starts locally. |
| 1 | Data model | Drizzle ORM schema and migrations for countries, departments, levels, employees, salary_records, pay_bands, fx_rates, audit_log. Indexes on country, department, level, and name. | Migrations apply cleanly to an empty database and to a test database, and roll back. |
| 2 | Domain logic | Pure functions with no database: band check, compa-ratio, FX conversion to USD, median and percentile, CSV row validation. | Unit tests cover edge cases (missing rate, zero band, duplicate email). Suite runs in under 5 seconds. |
| 3 | Employee and salary API | REST endpoints for employee CRUD, filtered and paginated list, salary history append, basic-auth middleware. Audit row written on every salary change. | Integration tests against a real test database. Duplicate emails rejected. Old salary records never modified. |
| 4 | Analytics API | Endpoints for headcount and median, average, min, and max base salary grouped by country, department, and level, all in USD. Band-violation list. | Tests use a fixed small fixture and check exact expected numbers. |
| 5 | CSV import and export | Row-level validation with an error report. Export matches the active filter. | Tests include a file with valid and invalid rows. Import is idempotent on re-run. |
| 6 | Seed script | Deterministic generator for 10,000 employees across about 10 countries. Salary distribution per level and country. | Same seed gives identical output. Row counts are correct. Runs within a stated time budget. |
| 7 | Frontend foundation | React, Vite, TypeScript, component library, routing, typed API client generated from shared types, app shell. | Component tests pass. App builds. Shell renders against a mocked API. |
| 8 | Employee screens | Directory with search, filters, and pagination. Profile with edit form. Salary history timeline. Band-violation badge. | Component tests cover filter and form behavior. Manual check against the local API. |
| 9 | Analytics and import/export UI | Dashboard with grouped tables and charts. CSV upload with error display. Export button. | Component tests for dashboard data rendering and import error display. |
| 10 | Deployment | Render for API and PostgreSQL, Vercel or Render for web. Environment variables, basic-auth credentials, production migrations, seed run once. | Public URL works end to end: login, list, edit, analytics. Deployment steps documented in README. |
| 11 | Submission package | Demo video, final README, architecture diagram, AI-usage notes, trade-offs, and a Known Gaps section. Reply to the assessment email. | All artifacts committed. Video linked from README. |

## Stage decisions made by default (change before Stage 0 if you disagree)

- **ORM:** Drizzle. It stays close to SQL, which makes the analytics queries easy to read and check.
- **Component library:** Mantine. It has a built-in data table, form, and chart support, which suits this app.
- **Test runner:** Vitest for unit and component tests, with a real PostgreSQL instance for integration tests.
- **Auth:** HTTP basic auth via environment variables, as set in the requirements.
