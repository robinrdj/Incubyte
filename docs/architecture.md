# Architecture, Trade-offs, and Performance

## System

```
 HR Manager's browser
        │  HTTPS
        ▼
 ┌──────────────────────────┐        ┌──────────────────────────────────────────────┐
 │ Web app (Vercel)         │        │ API (Render, Ohio)                           │
 │ React 19 · Vite · Mantine│ Bearer │  http/      Express routes, Zod schemas,     │
 │ pages → feature          ├───────►│             session check, error mapping     │
 │ components → hooks       │ token  │  services/  database work (Prisma, SQL)      │
 │ typed API client         │  JSON  │  domain/    pure rules: money, FX, bands,    │
 └────────────┬─────────────┘  CSV   │             statistics, CSV, import planning │
              │                      └───────────────────┬──────────────────────────┘
              │  packages/shared: API contract types     │  pooled connection
              └──────────── shared by both ──────────────┤
                                                         ▼
                                      ┌──────────────────────────────────────────────┐
                                      │ PostgreSQL (Neon, Ohio)                      │
                                      │ Employee · SalaryRecord (append-only)        │
                                      │ PayBand · FxRate (dated) · AuditLog          │
                                      │ HrUser · Session (token hashes)              │
                                      └──────────────────────────────────────────────┘
```

**Layers in the API.**

- `domain/` is pure TypeScript with no database and no clock, so it carries most of the unit tests.
- `services/` turn requests into queries.
- `http/` validates input with Zod and maps every failure to one error shape.

A request flows http → service → domain → database. The time ("today") is injected wherever it matters, which keeps the tests deterministic.

## Key decisions and trade-offs

| Decision                                                                                              | Why                                                                                                                                                                                            | Trade-off accepted                                                                                               |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Append-only salary history**, with a same-date correction                                           | Pay questions are often about the past ("what did we pay in Q1?"). A later date adds a record. The current record's own date corrects a typing mistake, and the audit trail keeps both values. | Older records cannot be edited. A wrong historic salary is fixed with a new, later record.                       |
| **Money as integer cents** in the domain, `DECIMAL(14,2)` in the database, decimal strings in the API | No floating-point drift in sums, medians, or conversions.                                                                                                                                      | Conversion at the edges.                                                                                         |
| **Dated FX table**: use the latest rate on or before the reporting date                               | Adding a rate never changes earlier figures, and any date can be reported "as of". Manual rates are auditable.                                                                                 | No live FX feed. Rates are maintained in Settings.                                                               |
| **Analytics computed on request**, not stored                                                         | Always consistent with the data, simple, and fast enough at 10,000 rows.                                                                                                                       | Every request does the work. Beyond about 100,000 employees, move the statistics into SQL or materialised views. |
| **One SQL query for current salaries** (`DISTINCT ON`)                                                | Loading full ORM objects for 10,000 people took 6–7 s on the free host.                                                                                                                        | Some hand-written SQL, covered by the integration tests.                                                         |
| **Session tokens**, scrypt password hashes, token stored only as a SHA-256 hash                       | Checking a password hash on every request would be slow, and a database leak exposes no usable tokens.                                                                                         | No roles: every HR user has the same access. No SSO.                                                             |
| **Shared contract package**                                                                           | A change to a response shape is a compile error in the web app, not a runtime surprise.                                                                                                        | Both apps build against the package.                                                                             |
| **Separate hosting** with a CORS allow-list                                                           | Free static hosting for the web app, a Node host for the API.                                                                                                                                  | Two deployments and one CORS setting to keep in step.                                                            |
| **Plain HTML charts**, no chart library                                                               | Small bundle and full control. Colours were validated for colour blindness.                                                                                                                    | Fewer chart types are available.                                                                                 |

What was deliberately left out (payroll, bonuses and equity, live FX, roles and SSO, statutory checks, predictive pay) is listed with reasons in [requirements.md](requirements.md).

## Performance

Measured on the live deployment (Render free plan, 0.1 CPU; Neon in the same region) and on a laptop with 10,000 seeded employees.

| Path                            | Measured                                    | How                                                                                                                      |
| ------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Employee list, 25 per page      | about 1 s live, about 40 ms locally         | Indexes on country, department, level, and name. Paged queries and a count.                                              |
| Band badges on a directory page | 9.1 s and 879 KB → **0.86 s and 2.5 KB**    | The report is narrowed to the employees on screen (`employeeIds`) instead of downloading every out-of-band employee.     |
| Out-of-band list on Analytics   | 9.1 s → **1.66 s**, 25 rows a page          | Sorting, filtering, and paging on the server.                                                                            |
| One analytics grouping          | 6.0 s → **1.3–1.7 s**; switching is instant | A single `DISTINCT ON` query, plus a cache of each grouping and date in the browser that prefetches the other groupings. |
| Seed of 10,000 employees        | about 6 s locally, 52 s to Neon             | Batched inserts with reference ids looked up once.                                                                       |
| CSV import of 10,000 rows       | one transaction                             | Lookups in chunks so no query sends a huge `IN` list. A dry run shows errors before anything is written.                 |

**Known limits.**

- The free API host sleeps after about 15 idle minutes. An uptime monitor on `/health` avoids the 30–60 s wake-up.
- Analytics hold up to roughly 100,000 employees before the statistics should move into SQL.

## Known gaps

- Pay band changes are not audited. FX rates keep their own dated history.
- Sign-in has no rate limiting, and there are no roles or SSO.
- There is no field-level encryption or full GDPR programme.
- `npm audit` reports an advisory in a library that Prisma's command-line tool uses at build time. It is not reachable from requests.
