# AI Development Summary

How the Salary Management app was built, condensed from the stage-by-stage [interaction log](interaction-log.md). It was built in three days (23–25 November 2026) by one developer working with an AI coding agent (Claude Code).

## Approach

1. **Requirements before code.** A one-page [requirements document](requirements.md) set the goal, nine features (F1–F9), non-functional targets, and what is deliberately left out, with reasons.
2. **A staged plan with gates.** The [plan](plan.md) split the work into 12 stages across three phases: Backend (0–6), Frontend (7–9), and Release (10–11). Every stage ended with passing tests, a clean typecheck and lint, focused commits, and a log entry. A stage did not start until the previous one was committed.
3. **Small, readable commits.** The history shows features, tests, and docs as separate commits, so the evolution can be followed commit by commit.

## Timeline

| Phase              | What was built                                                                                                                                                                                                                                                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Backend (0–6)**  | Monorepo foundation. PostgreSQL schema with Prisma. Pure domain rules (money in cents, FX conversion, pay bands, median, CSV validation). Employee and salary API with an audit trail. USD analytics checked against hand-calculated fixtures. CSV import with a dry run and row-level errors, and export. A deterministic 10,000-employee seed. |
| **Frontend (7–9)** | Typed API client from the shared contract. Employee directory, profile and salary timeline, analytics dashboard, and import/export screens, each with component tests.                                                                                                                                                                           |
| **Iteration**      | From testing in the browser: settings for FX rates and pay bands, an email sign-in with HR user accounts, a modern light and dark theme, realistic regional names in the seed, clickable rows, a card view, multi-select filters in a drawer, analytics tabs and charts, and CSV export of analytics.                                            |
| **Release (10)**   | Separate hosting: Neon (database), Render (API), Vercel (web app). CORS, a configurable API address, and migrations in the build. Performance work driven by measurements on the live system.                                                                                                                                                    |

## How AI was used

**Division of work.** The developer owned the product decisions. The agent proposed plans, wrote the code and tests, ran the checks, and recorded each decision with its reason. Many of the most valuable changes came from the developer testing the running app and correcting course, for example:

- sign in with an email instead of a username, and show a demo account on the sign-in page;
- let HR correct a salary on its own date, instead of only adding later records;
- explain why Analytics (9,519 active) and Employees (10,001 in total) show different counts;
- use multi-select filters, put them in a side drawer, and add a card view;
- rename `apps/api` and `apps/web` to `apps/backend` and `apps/frontend`, keep tests in a separate folder, and keep pages short and comments brief;
- run the test suites only when asked.

**Checking, not trusting.** The agent was held to evidence, not claims:

- **Measure before optimising.** On the live host, analytics took 6–7 s and the out-of-band report 9.1 s and 879 KB. Profiling showed the cause: ORM objects built for 10,000 rows on 0.1 CPU, and the whole report downloaded just to badge 25 rows. Each fix was re-measured: 1.3–1.7 s, 0.86 s, and 2.5 KB.
- **Show that a refactor changes nothing.** The new analytics query was compared with the old one on the full 10,000-employee dataset, and the output was identical.
- **Read failures for their real cause.** Examples include a time-zone bug (dates checked in UTC refused "today" in India until 05:30), a stale API process holding a port, a browser sign-in dialog triggered by HTTP Basic auth, Render deploying old code after a settings change, and a byte-order-mark test that could never fail.
- **Validate, don't eyeball.** Chart colours were checked with a colour-blindness script in both light and dark mode before they shipped.

**Honest reporting.** Where something was not verified, the log says so: for example, screens not yet seen in a real browser, and tests written but not run while the developer asked for runs only on request.

## Quality practices

- Tests are deterministic. Time is injected and the seed is fixed, so no test reads the clock or randomness.
- The domain logic is pure and unit-tested. The API is tested against a real PostgreSQL test database, and integration tests refuse any database not named `*_test`.
- The final suite has 151 backend unit, 127 integration, and 117 frontend tests. `npm run check` runs build, typecheck, lint, format, and tests together.
- TypeScript runs in strict mode end to end, with type-aware ESLint. The shared contract makes API drift a compile error.
- Security: scrypt password hashes, session tokens stored only as hashes, a CORS allow-list, CSV formula-injection guards, and no secrets in the repository. The git history was checked before the first push.

## Outcome

The deployed app covers all nine required features and HR user management. The [architecture notes](architecture.md) give the design, trade-offs, and performance figures. The [design history](design-history.md) records each visual version so any earlier one can be restored.
