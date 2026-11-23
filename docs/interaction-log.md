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
