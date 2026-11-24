# Interaction Log

A running record of requests, decisions, and what was built in each step. Newest entries go at the bottom.

---

## 2026-11-23 — Session 1: Scoping

**User request:** Assess how long the assignment takes and how hard it is.
**Response:** Estimated 1.5–2 focused days for a full submission. Identified scope discipline, multi-country pay analytics, deployment of SQLite-style storage, and incremental commit history as the main difficulties. Asked for the target role and deployment preference.

**User decisions:**

- Frontend: React + TypeScript
- Backend: Node.js + TypeScript
- Database: PostgreSQL
- Applied for: React / Node.js role
- Deployment: Render, Vercel, or Railway (to be chosen)

**User requests:**

- Write the one-page requirements document first, before any code.
- Keep this interaction log going throughout the project.
- Commit frequently so the history shows how the software evolved.

**Actions:**

- Created project folder `salary-management/` and initialized git.
- Created this interaction log.
- Wrote `docs/requirements.md` (one page: goal, users, 9 features with acceptance criteria, 8 deliberate exclusions with reasoning, trade-offs, open questions).
- Committed requirements as a separate commit.

**Open question for the user:** Should salary changes need approval before taking effect? Current assumption is no.

**Next:** Confirm the requirements (or request changes) before scaffolding the monorepo.

---

## 2026-11-23 — Session 1 (cont.): Delivery plan

**User feedback:** The requirements doc is good. Build in stages, one at a time. Each stage gets tests and a commit so the history shows evaluation progress.

**Actions:**

- Wrote `docs/plan.md`: 12 stages (0 to 11), each with scope and a "done when" condition. Stage rule: a stage is not started until the previous one is committed with passing tests.
- Set default stack choices in the plan: Drizzle ORM, Mantine, Vitest, Docker Compose Postgres, basic auth.

**Open:** Confirm the stage plan and the default choices. Then start Stage 0.

---

## 2026-11-23 — Session 1 (cont.): Stage naming

**User request:** Rename the stages to professional, easy-to-understand names.

**Actions:**

- Grouped the 12 stages into three phases: A (Backend, stages 0 to 6), B (Frontend, stages 7 to 9), C (Release, stages 10 to 11).
- Replaced stage names with noun-phrase titles, for example "Project Foundation", "Core Business Logic", and "Production Deployment".
- Updated `docs/plan.md`.

**Open:** Confirm the names and default decisions, then start Stage 0.

---

## 2026-11-23 — Stage 0: Project Foundation

**User request:** Start Stage 0.

**Actions and commits:**

| Commit    | What changed                                                                                             |
| --------- | -------------------------------------------------------------------------------------------------------- |
| `18e660c` | Root tooling: npm workspaces, strict TypeScript base config, typed ESLint, Prettier, Vitest, Node 22 pin |
| `044735c` | Line-ending normalization (`.gitattributes`) and Prettier formatting of docs                             |
| `ee00142` | `packages/shared` with `APP_NAME` and a passing smoke test                                               |
| `aaf49b7` | `apps/api` depending on `@salary/shared`, with a passing smoke test; root `build` script                 |
| (next)    | Docker Compose for PostgreSQL, `.env.example`, README skeleton, this log entry                           |

**Verification:** `npm run check` passes: build, typecheck, lint, format check, and 2 test files with 2 tests.

**Deviations from the plan:**

- `apps/web` is not created yet. It belongs to Stage 7, so the workspace list in the plan changes accordingly.
- Docker host ports are 5434 (dev) and 5435 (test). A PostgreSQL 17 service already runs on 5432 on this machine.

**Docker status:** The Docker Desktop engine did not start after launch and a two-minute wait. Compose config validates offline, but containers were not started.

**Local PostgreSQL (resolved):**

- The user provided the local `postgres` superuser password.
- Two local servers run. Port 5432 is PostgreSQL 17 and rejects this password. Port 5433 is PostgreSQL 18.6 and accepts it.
- Created the `salary` and `salary_test` databases on port 5433.
- Wrote `.env` (gitignored) with both URLs. The password is kept only in that file and is not recorded in tracked files.
- Verified both URLs connect (`salary ok, 18.6` and `salary_test ok, 18.6`).

**Stage 0 status:** Every criterion is met except a verified Docker Compose run. The local server stands in for the containers. The compose file still needs to be tested once Docker is available.

---

## 2026-11-23 — ORM decision: Prisma

**User question:** Did the assignment ask for Drizzle?
**Answer:** No. The brief only asks for a relational database of our choice. Drizzle was my default, listed in the plan, not a requirement.

**User decision:** Use Prisma instead.

**Actions:**

- Updated `docs/plan.md` (Stage 1 scope and default decisions) and `README.md` to name Prisma.
- Noted the trade-off: Prisma has no built-in median, so median and percentile queries use typed raw SQL and are covered by integration tests.
- No code changed. Prisma is installed in Stage 1, when the schema is written.

---

## 2026-11-23 — Stage 1: Data Model and Persistence

**User request:** Finish Stage 1.

**What was built:**

- Prisma 7.10.1 in `apps/api`, using the `@prisma/adapter-pg` driver adapter.
- `prisma/schema.prisma` with 8 domain models: `Country`, `Department`, `Level`, `Employee`, `SalaryRecord`, `PayBand`, `FxRate`, `AuditLog`. It also has enums for employee status (`ACTIVE`, `LEAVING`) and audit action.
- Money columns use `DECIMAL(14,2)`. FX rates use `DECIMAL(18,8)`.
- Salary history is append-only. `SalaryRecord` is unique on `(employeeId, effectiveFrom)`.
- Indexes on the employee columns used for filtering and search: country, department, level, last name with first name, and status. Also on salary history and audit log lookups.
- Initial migration `20261123111012_init`.
- `src/db/prisma.ts`, a client factory, so tests can point at a chosen database.
- Integration tests in `test/schema.integration.test.ts` (6 tests). They check tables, indexes, the unique email and effective-date constraints, exact decimal storage, and append-only history.

**Verification:**

- The test database (`salary_test`) was emptied and `prisma migrate deploy` applied the migration from scratch. This created 8 domain tables, plus Prisma's migration-tracking table.
- Integration tests: 6 of 6 pass against the migrated test database.
- `npm run check` passes with exit code 0.

**Rollback, and a deviation from the plan:**

- Prisma has no down-migrations. I changed the criterion to "drop-and-reapply".
- I dropped the `salary_test` schema directly with SQL. Tables went to 0, then migrations were re-applied. The database is the disposable test database.
- I tried `prisma migrate reset`. Prisma blocked it, because it detected an AI agent and treats reset as a destructive action that needs explicit user consent. I did not bypass that guard.
- The test script is therefore `db:test:deploy` (non-destructive `migrate deploy`), not a reset.

**Decisions:**

- Generated Prisma client is gitignored. `npm run build` and `npm run typecheck` regenerate it.
- Prisma CLI commands run against the dev database by default. `PRISMA_USE_TEST_DB=1` targets the test database.
- The integration test refuses to run unless the database name ends in `_test`. This protects the dev database, because the tests truncate tables.

**Open items (not Stage 1):**

- `npm audit` reports 3 high-severity vulnerabilities in the dependency tree. I'll review them before deployment, in Stage 10.
- The `reset` command is a user decision. If you want a one-step reset in the scripts, you need to approve it explicitly.

---

## 2026-11-23 — Repository moved to the Incubyte folder

**User report:** `git log` could not find the history from the `Incubyte` folder. Git was initialized one level down, in `salary-management/`.

**User decision:** Make `Incubyte/` the repository root.

**Actions:**

- Moved the project contents and `.git` from `salary-management/` up into `Incubyte/`. The commit history and both stage tags are unchanged, because the paths in the existing commits already match the new root.
- Removed the empty `salary-management/` folder.
- Re-linked the npm workspaces with `npm install`. The workspace links had pointed at the old absolute path.
- Excluded `backend/` and `frontend/` from ESLint and Prettier. These folders existed before this session, are not in git, and are not part of this monorepo. ESLint was reporting errors from `frontend/src`.
- Verified: `npm run check` passes (exit 0). Integration tests pass (6 of 6).

**Left untouched:** `backend/` and `frontend/` remain untracked. Whether to bring them into the repo is the user's decision.

---

## 2026-11-23 — Stage 2: Core Business Logic

**User request:** Finish Stage 2.

**What was built.** All of these are pure functions in `apps/api/src/domain/`, with no database or I/O:

- **Money** (`money.ts`): amounts are integer minor units (cents) inside the domain. This avoids floating-point drift. `parseMoney` accepts up to two decimal places and rejects zero, negatives, and values too large to represent exactly. `formatMoney` is its inverse.
- **FX** (`fx.ts`): `toReportingCurrency` converts to USD. A missing rate throws `MissingFxRateError`, and a non-positive rate throws `InvalidFxRateError`. A gap in the rate table therefore never produces a silently wrong total.
- **Pay bands** (`pay-band.ts`): `bandPosition` (below, within, or above, with inclusive bounds). `compaRatio` (amount over midpoint). Zero-valued bands and inverted bands are rejected.
- **Statistics** (`statistics.ts`): `mean`, `median`, and `percentile`. `percentile` interpolates the same way PostgreSQL's `percentile_cont` does, so in-memory and SQL results agree.
- **Employee import** (`employee-import.ts`): `validateEmployeeRow` collects every error in a row, not just the first. It checks countries, departments, and levels against reference data, and it rejects unknown codes rather than creating them. It also checks dates, including impossible dates and dates in the future. `findDuplicateEmails` compares emails case-insensitively.
- `today` is injected into the import validator, so the tests never depend on the clock.

**Verification:**

- 65 unit tests across 6 files pass. The suite runs in about 2.3 seconds, inside the 5-second budget.
- Edge cases covered as required: a missing FX rate, a zero-valued band, and duplicate emails.
- Expected values were checked independently. For example, the percentiles of `{10, 20, 30, 40}` are 17.5 and 32.5.
- `npm run check` passes with exit code 0.

**Decisions:**

- Minor units are plain integers rather than `bigint` or a decimal library. Salaries are far below the safe-integer limit, and the code stays simple.
- Validation returns a `Result` with a list of errors, and does not throw. Business-rule violations still throw, because they indicate a programming error or bad data reaching the domain.
- Reference data (countries, departments, levels) is passed in. The domain never reads the database.

**Open for later stages:**

- `findDuplicateEmails` covers duplicates within a single import file. Checking for emails that already exist in the database belongs to Stage 5, which needs database access.

---

## 2026-11-23 — Stage 3: Employee and Salary Services

**User request:** Finish Stage 3.

**What was built.** An Express 5 HTTP API under `apps/api/src`:

- `config.ts`: reads `DATABASE_URL`, `BASIC_AUTH_USER`, `BASIC_AUTH_PASSWORD` (at least 12 characters), and `PORT`. Validates them with Zod, and fails at startup with a clear message.
- `http/basic-auth.ts`: HTTP Basic authentication for the single HR account. Comparisons are constant-time. It records the authenticated user as the actor on every request.
- `http/errors.ts`: one error body shape, `{ error: { code, message, details? } }`. Maps domain errors to 422, Prisma unique violations to 409, validation failures to 400, and unexpected errors to a generic 500 with no internal detail.
- `http/schemas.ts`: input validation. It reuses the Stage 2 domain rules for money, dates, and emails.
- `services/employee-service.ts`: the business rules. Each write runs in a transaction, so a salary change and its audit row succeed or fail together.
- `http/employee-routes.ts` and `http/app.ts`: thin routes. `/api` is protected, `/health` is public.

**Business rules enforced:**

- Duplicate emails (case-insensitive) and duplicate employee codes return 409. Checks happen before writes, and the database unique constraints back them up.
- Country, department, and level must already exist. Unknown codes return 422 and are never created.
- Salary history is append-only. A new salary must be dated strictly after the current one, so the history can grow but never be backdated. An earlier record is never modified, and there is no route that edits or deletes one.
- Salary and employee changes are audited. The audit trail records the actor, and for updates it records only the fields that actually changed.
- Future-dated salaries and salaries dated before the start date are rejected.

**Verification:**

- 37 integration tests pass against the test database. These cover authentication, creation, duplicate handling, filtering and pagination, updates, append-only history, audit attribution, and the absence of any route that modifies past salary records.
- 65 unit tests still pass. Lint, typecheck, and the full `npm run check` pass.
- The compiled server was started and tested with real requests. Health returns 200, unauthenticated requests return 401, and authenticated list and create requests work end to end.

**Problems found and fixed:**

- Typing errors under `exactOptionalPropertyTypes`. Fixed by splitting the reference lookups into one function per field, and by making `SalaryDto` a type alias so it fits Prisma's JSON type.
- A `pg` deprecation warning ("client.query() when the client is already executing a query"). The cause is Prisma's adapter: inside an interactive transaction, a query with `include` triggers concurrent relation loads. Fixed by running list reads outside transactions, and by loading single records in transactions one query at a time, with no `include`. The warning no longer appears.
- ESLint reported unsafe `any` access on supertest response bodies. I relaxed those rules for `test/` only. Production code keeps them on.

**Decisions:**

- The employee code is supplied by the caller rather than generated. A generated sequence would need extra concurrency handling, and HR systems usually assign codes externally.
- The current salary is the most recent record. Scheduled future-dated changes are not supported in v1.
- The audit trail is not paginated yet. It returns all events for one employee, which is acceptable at this scale.
- Reads are not wrapped in a single snapshot transaction, because of the adapter issue above. For an HR tool with one user, this is an acceptable trade-off.

**Action I need to flag:** While smoke-testing the server, I tried a shell command that included a broad process kill (`taskkill` on every `node.exe`). It was denied, and I did not retry it. Nothing was left running: I checked port 4100 and nothing was listening. I then tested the server with `timeout`, which stops it automatically.

**Credentials:** I generated a random `BASIC_AUTH_PASSWORD` and wrote it to `.env`, which is gitignored. I did not record it in the log or commit it. The tracked `.env.example` holds only a placeholder.

**Known gaps for later:**

- The dev database has no reference data yet (countries, departments, levels). The seed script in Stage 6 adds it.
- `npm audit` warnings are still open. They are scheduled for Stage 10.

---

## 2026-11-23 — Stage 4: Compensation Analytics

**User request:** Start Stage 4.

**Deviation from the plan (decided before building).** The plan said median would use raw SQL (`percentile_cont`). I computed the aggregates in TypeScript instead, for three reasons:

- Converting each salary to USD needs the FX rule that is already tested in Stage 2. Doing it in SQL would duplicate that rule.
- The "latest rate on or before the date" logic is simpler to read and verify in code.
- At 10,000 employees, one query plus in-memory aggregation is well inside the time budget. Stage 6 will measure this with the full seed.

The Stage 2 percentile still matches `percentile_cont`, so the two approaches agree.

**What was built:**

- `domain/compensation.ts`: `summarizeCompensation` (headcount, median, average, min, max, with averages rounded to whole cents) and `groupItems` (groups sorted by label, so output is stable).
- `services/analytics-service.ts`:
  - **Compensation report.** Current salary of each active employee on the `asOf` date, converted to USD. Grouped by country, department, or level.
  - **Band violations.** Compares each employee's USD salary with the USD band for their level and country, using the Stage 2 `bandPosition` and `compaRatio`.
- `http/analytics-routes.ts`: `GET /api/analytics/compensation` and `GET /api/analytics/band-violations`.

**Rules the analytics follow:**

- Active employees only. Leaving employees are excluded.
- Each salary is the latest record on or before `asOf`. An active employee with no salary yet on that date is excluded, and the report counts them in `excludedWithoutSalary`.
- The FX rate is the latest one on or before `asOf`. If any salary or band lacks a rate, the request fails with 422 and names the missing currencies. Rows are never dropped silently.
- An employee whose level and country have no pay band is counted in `withoutBand`, not evaluated.

**Verification:**

- A fixed fixture with hand-calculated expectations: 7 employees across two countries, two departments, and two levels, plus two FX dates and two pay bands. Assertions check exact values, for example overall median 66,000.00 USD and average 74,120.00 USD, and a Germany average of 106,333.33 USD.
- 14 new integration tests cover the groupings, the FX date selection, band violations and their compa-ratios, the missing-rate error, and the empty-report case.
- 7 new unit tests for the summary and grouping functions.
- Totals: 73 unit tests and 51 integration tests pass. `npm run check` passes.

**Two fixes during the stage:**

- Template literals with numbers failed lint. I wrapped the values in `String()`.
- The first run of the integration tests passed without changes to the code.

**Open items:**

- The analytics report only uses data that exists. Nothing in the API lets HR add FX rates or pay bands yet. The Stage 6 seed will load sample rates and bands. Stage 9's UI, or a small endpoint, will need to maintain them. This is the main gap to decide on before deployment.
- Performance at 10,000 employees is not yet measured. Stage 6 will time the analytics against the full seed.

---

## 2026-11-23 — Stage 5: Bulk Data Exchange

**User request:** Start Stage 5.

**Design decisions (made before building):**

- **Identity.** An employee is matched by email, and the employee code must agree with the existing record. A row cannot take over another person's record.
- **Idempotency.** Re-running the same file changes nothing. Salary history is append-only. A row whose salary already exists is a no-op. A salary that conflicts with an existing record, or is dated before the current one, is rejected.
- **Partial success.** Rows with errors are rejected and reported with their line numbers. Valid rows are applied together in one transaction.
- **Ambiguous files.** If an email or employee code appears twice in the same file, every row involved is rejected, because the file itself is contradictory.
- **Dry run.** `?dryRun=true` runs the full plan and reports what would happen, with no writes.
- **Round trip.** The export uses the same columns as the import, so an exported file can be imported again without changes.
- **Format.** The import takes raw `text/csv` as the request body, up to 5 MB, so no multipart parser is needed.

**What was built:**

- `domain/csv.ts`: an RFC 4180 parser, handling quoted fields, escaped quotes, embedded newlines, CRLF and LF, and a byte-order mark. The formatter neutralizes formula injection.
- `domain/employee-import.ts`: the row validator, extended with `employeeCode` (required) and an optional `status`. It also includes header mapping. Missing required columns and unknown columns both fail the whole file, so a typo such as `salary_amount` is caught.
- `domain/employee-import-plan.ts`: a pure planner. For each row it decides CREATE, UPDATE, UNCHANGED, or REJECTED, using only a snapshot of existing data. It is unit tested in isolation.
- `services/bulk-exchange-service.ts`: loads reference data and existing employees (in chunks of 1,000), plans, and applies the planned changes in one transaction with a 120-second timeout.
- `services/employee-filters.ts`: the list filters, shared by the list endpoint and the export, so both always return the same people.
- `http/bulk-routes.ts`: `POST /api/employees/import` and `GET /api/employees/export.csv`. The export route is registered before `/employees/:id`, so `export.csv` is not read as an ID.

**Verification:**

- 108 unit tests pass, 35 of them new: CSV parsing and formatting, header mapping, row validation, and every planner rule.
- 72 integration tests pass across 4 files. The 21 new ones in `bulk.integration.test.ts` cover valid and invalid rows, line-numbered errors, duplicates within a file, re-running an import, profile and salary updates, dry runs, malformed files, missing or misspelled columns, export filters, round-trip export and import, and formula neutralization.
- `npm run check` passes.

**Problems and fixes during the stage:**

- One integration test failed because the row I built was dated before the employee's start date, so validation rejected it before the history rule ran. I rebuilt the test so only the history rule could reject it. I also added a separate test for the start-date rule.
- A lint error on a redundant `String()` call was fixed.

**Not covered yet:**

- Import performance: measured in dry-run only, at 10,000 rows (about 1.1 s). A real write of 10,000 new rows has not been timed yet.
- Import is one transaction, so a very large file holds locks for its whole duration. This is acceptable for a single-user HR tool. Production would process in batches.
- Email matching is exact after lower-casing. Employees seeded or imported before this rule existed must already be lower-case. The seed will enforce that.

---

## 2026-11-23 — Stage 6: Seed Data Generation

**User request:** Start Stage 6.

**Design decisions:**

- **Reproducible.** Generation is pure. It uses a seeded generator (mulberry32), so the same seed gives the same dataset. Employee IDs are seeded too, so the loader writes the same rows every time.
- **Reference data included.** The seed loads countries, departments, levels, sample FX rates, and pay bands. This fills the gap noted in Stage 4: analytics had nothing to report on until now.
- **Safe by default.** The loader refuses to write into a database that already holds data. `--reset` is required to replace it.
- **Batched writes.** Rows are written in batches of 1,000, with one query per batch.

**What was built:**

- `seed/random.ts`: seeded generator, with integer, weighted, and UUID helpers.
- `seed/dataset.ts`: pure generator. It produces 10 countries, 6 departments, 6 levels, 14 FX rates (two dates), 60 pay bands, and the employees with their salary history.
- `seed/load.ts`: batched loader. Returns a report of counts and elapsed time.
- `seed/run.ts`: CLI with `--reset` and `--seed=N`. Exposed as `npm run seed` in `apps/api`.

**Sample-data choices:**

- Pay rises with level and varies by country cost factor, from 0.2 for India to 1.0 for the US.
- Starting pay varies by up to ±12% around the expected figure.
- About 30% of employees get one raise, dated after their start date and before the anchor date (2026-11-23).
- About 5% of employees are LEAVING.
- Pay bands are 90% to 110% of expected pay. The first version used 85% to 115%, which made every violation fall above the band, since starting pay could never fall below 88%. The bands were widened so violations appear on both sides.
- The sample rate for a date before the first rate table (2025-01-01) uses that first rate. This is documented in the code.

**Verification:**

- Unit tests: 131 pass. They cover reproducibility, counts, uniqueness of codes and emails, lower-case emails, band coverage for every employee, the salary-history rules, and the presence of violations on both sides.
- Integration tests: 75 pass across 5 files. The new seed tests load the full 10,000-employee dataset against the time budget, refuse to load into a populated database, and check that the same seed stores identical rows.
- The seed was run against the local dev database, with real timings:
  - Generation: 110 to 119 ms.
  - Load: 6.7 to 7.6 seconds for 10,000 employees, 12,762 salary records, and 12,762 audit events.
  - Stated budget: 60 seconds.
- Re-running without `--reset` is refused with a clear message.

**Analytics on the full 10,000 employees (live server, local database):**

- Compensation by country: 0.78 seconds on the first request, including warm-up.
- Band violations: 0.42 seconds. Result: 9,501 evaluated, 0 without a band, 2,515 violations (2,294 above, 221 below).
- CSV export of 10,000 rows: 0.41 seconds.
- Both targets are met, so the performance question left open in Stage 4 is closed.

**Import timing:** A dry-run import of the full 10,000-row export took 1.1 seconds, and all rows came back unchanged. This confirms the round trip at scale. A real write of 10,000 new rows has not been timed yet.

**Credentials:** The seed uses no credentials of its own. It reads `DATABASE_URL` from the gitignored `.env`.

**Known gaps for later:**

- The seed's FX rates and pay bands are illustrative. HR needs a way to maintain them. This is still the main open decision before deployment.
- Import writes are not timed at scale yet.

---

## 2026-11-23 — Stage 7: Web Application Foundation

**User request:** Start Stage 7.

**Design decisions:**

- **Shared contract.** The API response and request types moved into `packages/shared`. The API services and the web app now import the same definitions. Money stays as decimal strings.
- **Typed client.** `apps/web/src/api/client.ts` has one typed method per endpoint. Each method's inputs and outputs come from the shared contract.
- **Session in the tab only.** The Basic-auth token lives in `sessionStorage`. A reload keeps the user signed in, and closing the tab signs them out. Storage access is wrapped in try/catch, so a blocked storage still works.
- **Sign-in checks the API.** Signing in calls `GET /api/employees?pageSize=1` with the credentials. A wrong password gets a clear message and no session.
- **Dev proxy.** Vite forwards `/api` and `/health` to the API, so the browser sees one origin. No CORS is needed in development. Production hosting is decided in Stage 10.
- **Mantine AppShell.** The navigation collapses behind a burger on phone widths.
- **Placeholders.** Employees, Analytics, and Import and export are routed but show placeholders. Stages 8 and 9 build their screens.

**What was built:**

- `packages/shared/src/api-types.ts`: the contract. The three API services now import their types from it.
- `apps/web`: Vite 7, React 19, React Router 7, Mantine 9, TypeScript.
  - `api/client.ts`: the typed client and `ApiError`. Non-JSON error bodies, such as an HTML page from a proxy, produce a typed error rather than a parse crash.
  - `auth/AuthContext.tsx`: sign-in, sign-out, and session storage.
  - `layout/AppLayout.tsx`: header, navigation, and burger.
  - `pages/`: sign-in page, placeholders, and not-found page.
  - `App.tsx`: signed-out visitors see the sign-in page at any address. Signing in keeps the address they opened.

**Verification:**

- Web tests: 19 pass. The client tests cover the Authorization header, query strings, JSON and CSV bodies, typed errors, and UTF-8 credentials. The app tests cover sign-in success and failure, session reload, sign-out, navigation, and not-found.
- API tests after the refactor: 131 unit and 75 integration pass.
- `npm run build` for the web app produces a 122 kB gzipped bundle. `npm run check` passes across all workspaces.
- The Vite dev server returns 200 for the page and for the entry module.

**Problems and fixes during the stage:**

- The web devDependencies were never written to `package.json`, because the first install ran in the wrong place. They were reinstalled into the web workspace.
- The API client threw a parse error on non-JSON error bodies. Fixed, with a test.
- Test labels failed because Mantine adds an asterisk to required fields. The tests now match labels by pattern.
- My commit command ran before the check had finished, and the check failed. I fixed the cause (an unused import left by the refactor), and the check passes.

**Not verified in a browser:** these tests run in jsdom, so they don't check layout or the look of the screens. I have not opened the app in a real browser yet. I'll do that before the demo video.

**Open decisions (unchanged):**

- Maintaining FX rates and pay bands still has no screen or endpoint. This decision is needed before deployment.
- Production hosting: serve the web app from the API, or enable CORS for a separate host. Decided in Stage 10.

---

## 2026-11-23 — Stage 8: Employee Management UI

**User request:** Continue with Stage 8.

**Design decisions:**

- **Reference endpoint.** The forms need the lists of countries, departments, and levels, and no endpoint returned them. I added a read-only `GET /api/reference`. It is not the FX-rate and pay-band maintenance decision, which is still open.
- **Pay band badge.** The employee list has no band field, so the directory loads the band-violation report once and marks the people in it. A report of about 0.4 s on 10,000 rows is acceptable for this.
- **Only changed fields are sent.** Saving a profile sends a PATCH with just the fields that differ. Saving with no changes sends nothing.
- **Salary history is append-only in the UI too.** The salary-change form refuses a date that is not after the current salary, and the API enforces the same rule.
- **Validation mirrors the API.** The form checks the same rules the API enforces, so most mistakes are caught before a request. Server errors still appear in an alert.

**What was built:**

- API: `GET /api/reference`, its shared type, and an integration test (77 integration tests now pass).
- Web:
  - `pages/DirectoryPage.tsx`: search with a 300 ms pause, country, department, level, and status filters, pagination, a band badge, and an empty state.
  - `pages/EmployeePage.tsx`: profile view and edit, current salary, salary timeline, and recording a salary change.
  - `pages/NewEmployeePage.tsx`: creates an employee with an opening salary, then opens the profile.
  - `components/`: `EmployeeForm`, `SalaryChangeForm`, `SalaryTimeline`, and `BandBadge`.
  - `hooks/useAsync.ts`: loads data, ignores stale responses, and supports reload.
  - `lib/format.ts` and `lib/errors.ts`: money and date display, and readable error messages.
  - `test-utils/`: a route-based fake API, which records requests and returns 404 for any route it doesn't know about.

**Verification:**

- Web tests: 50 pass across 6 files. Tests cover filters, pagination, the band badge, the empty and error states, editing with a minimal PATCH, a conflict, invalid email, recording a salary change, the rule that a salary must take effect after the current one, not-found, and the new-employee flow with its duplicate-email error.
- API: 131 unit and 77 integration tests pass. `npm run check` passes.
- Lint is clean across the web app, API, and shared package.
- Manual check against the local API, through the Vite dev proxy: `/health` returns 200, unauthenticated requests return 401, and authenticated reference and list requests return the seeded data.

**Problems and fixes during the stage:**

- The fake API matched the first route with a path, so an override placed after the default was ignored. Overrides now come first.
- Mantine's Select options are not exposed with the `option` role under test. Tests now select them by their visible text.
- ESLint flagged void arrow functions and un-awaited `navigate` promises. Fixed.
- A port clash: port 5173 is used by your existing `frontend/` app, which is not part of this project. My dev server could not bind there, and the first curl check reached that app instead. I reran the check on port 5180, where the Salary Management app answered.

**Not verified:**

- **In a real browser.** The Claude-in-Chrome extension is not connected, so I could not open the screens visually. Layout, the phone-width navigation, and the look of the screens are still unchecked. Please open the app in your browser, or connect the extension and I will check it.
- Import timing for a real 10,000-row write is still unmeasured.

**Open decisions (unchanged):**

- Maintaining FX rates and pay bands still has no screen or endpoint. This is needed before deployment.
- Production hosting: serve the web app from the API, or enable CORS for a separate host. Decided in Stage 10.

---

## 2026-11-24 — Stage 9: Analytics and Data Exchange UI

**User request:** The previous session closed by accident partway through Stage 9. In a new session: "Check whether Stage 9 is completed and then finish and commit it." The full assessment brief was pasted in again for context.

**Picking the work back up:** Nothing carries over between sessions, so I rebuilt the context from this log, `docs/plan.md`, and `git status`. The screens and their tests were written but not committed. Lint failed with 13 errors, and the web suite reported two unhandled errors that came and went between runs. I also found one gap against the requirements (see below).

**Design decisions:**

- **The directory exports what it shows.** F7 says the export matches the current filter. The Import and export page only filters by country and status, so I added an **Export CSV** button to the directory. It sends the same filter object the list uses, including search, department, and level, so the two cannot drift apart. It is disabled when nothing matches.
- **One column list.** `EMPLOYEE_CSV_COLUMNS` lives in `packages/shared`. The API import and the web template both use it, so the downloadable template always matches what the import accepts.
- **Check, then import.** The import first runs as a dry run and lists the rows with errors. The **Import** button stays disabled until a check finds changes, and it states how many will be applied.
- **CSV opens correctly in Excel.** Downloads start with a UTF-8 byte-order mark, written as the `\uFEFF` escape rather than an invisible character in the source. The import already ignores it.
- **Bars without a chart library.** Median pay per group is shown as plain CSS bars next to a table with the same numbers. The bars are hidden from screen readers because the table carries the data, and nothing is conveyed by colour alone.

**What was built:**

- `packages/shared/src/csv-columns.ts`: the shared column order. The API import now uses it.
- `pages/AnalyticsPage.tsx`: overall stat cards, a group-by selector, an optional "as of" date, median bars, a grouped table, and the employees outside their pay band with compa-ratio and links to their profiles.
- `pages/DataExchangePage.tsx`: export by country and status, a blank template, and the two-step import with a row-level error table.
- `pages/DirectoryPage.tsx`: the **Export CSV** button.
- `components/MedianBars.tsx`, `lib/download.ts` (`downloadCsv`), and `lib/files.ts` (reads a file with FileReader, which works in every target browser and in jsdom).

**Verification:**

- Web tests: 67 pass across 8 files. They cover dashboard rendering, the group-by request, the band list, the dry run and its error table, applying an import, an unreadable file, the disabled import when nothing changes, the template columns and its byte-order mark, and the directory export with an active filter.
- API: 131 unit and 77 integration tests pass. The integration tests ran against local PostgreSQL 18.
- `npm run check` passes: build, typecheck, lint, format, and tests.
- The web suite ran three times in a row with no unhandled errors.

**Problems and fixes during the stage:**

- 13 lint errors in the new files, mostly void arrow shorthands and one `async` test with no `await`. Fixed.
- **Unhandled `scrollIntoView` errors.** Mantine's Select scrolls the chosen option into view on a timer, and jsdom has no `scrollIntoView`. Depending on timing, the call landed after a test ended. I stubbed it in `test/setup.ts`, next to the existing Mantine stubs.
- **A byte-order-mark test that could not fail.** The template test removed an invisible character before comparing, so it never checked that the mark was there. Text decoding also drops the mark, so the test now reads the raw bytes and expects `EF BB BF`.
- Removed a click in a test that proved nothing, and a component that only wrapped another one.
- The shell and the edit tool both turned the `\uFEFF` escape into the raw character. I wrote it with a Node script and confirmed the bytes.

**Not verified:**

- **In a real browser.** This is still outstanding, as in Stages 7 and 8. The layout of the dashboard and the import screen at phone width is unchecked.
- The time for a real 10,000-row import through the UI is still unmeasured.

**Open decisions (unchanged, both needed before Stage 10):**

- Maintaining FX rates and pay bands still has no screen or endpoint.
- Production hosting: serve the web app from the API, or enable CORS for a separate host.
