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
