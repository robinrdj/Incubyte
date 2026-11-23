# Requirements: Salary Management Tool

**Owner:** HR Manager, ACME | **Status:** Draft v1 | **Date:** 2026-11-23

## 1. Goal

Replace the Excel workbooks HR uses to track salaries for ~10,000 employees across multiple countries with a web app. The HR Manager should be able to maintain salary data in one place and answer questions such as *"What do we pay engineers in Germany versus India?"*, *"Which employees sit outside their level's pay band?"*, and *"What is the median base salary by department in USD?"*

## 2. Users

One persona: the **HR Manager**. v1 has a single account. There are no roles or self-service for employees.

## 3. Scope and Features (v1)

| # | Feature | Acceptance criteria |
|---|---|---|
| F1 | **Employee directory** | Paginated list of all employees. Search by name or ID. Filter by country, department, level, and status (active / leaving). Loads in under 1 second at 10,000 rows. |
| F2 | **Employee profile and edit** | Create, view, and edit name, email, country, department, job title, level, start date, and status. Duplicate emails are rejected. |
| F3 | **Salary records with history** | Each salary change is stored as a new record with an effective date and currency. The current salary is the latest effective record. Past records are never overwritten. |
| F4 | **Pay bands** | Min and max per level per country. Employees outside their band are flagged in the list and in analytics. |
| F5 | **Analytics dashboard** | Headcount and base salary (median, average, min, max) grouped by country, department, and level. All values convert to USD. Answers the questions in Section 1. |
| F6 | **Currency handling** | Salaries are stored in local currency. USD conversion uses a manually maintained, dated FX rate table. |
| F7 | **CSV import and export** | Import validates each row and reports row-level errors without failing the whole file. Export matches the current filter. This is the migration path off Excel. |
| F8 | **Seed script** | Deterministically generates 10,000 employees across about 10 countries with realistic salary distributions. Reproducible from a fixed seed. |
| F9 | **Change audit** | Every salary change records who, when, and the old and new values. |

**Non-functional:** Responsive web UI. PostgreSQL. Typed end to end (TypeScript). Unit and API tests run in under 30 seconds and do not depend on wall-clock time or randomness. Deployed on a hosted platform with a public URL.

## 4. Deliberately Out of Scope

| Left out | Reasoning |
|---|---|
| **Payroll run, payslips, tax, bank payments** | Different system with different legal and integration needs. This tool manages the *data* that payroll consumes. |
| **Multi-tenant orgs, SSO, fine-grained roles** | Single persona in the brief. Auth is a single HTTP basic-auth credential set by environment variable, which is enough to keep salary data off the open internet. Production would need SSO and RBAC. |
| **Live FX feed** | Adds an external dependency and a data-sharing concern. Manual dated rates are auditable and sufficient for comparing pay across countries. |
| **Bonus, equity, benefits, allowances** | Base salary drives the questions asked. The data model leaves room for a `salary_components` table later. |
| **Statutory checks (minimum wage, pay equity law)** | Needs legal input per country. Showing a number is useful. Declaring compliance without legal review is not. |
| **Predictive or recommended pay** | Descriptive analytics answer the questions asked. A model would need historical outcome data we do not have and would add fairness risk. |
| **Employee self-service and mobile app** | Not in the persona. A responsive web UI covers an HR desktop workflow. |
| **Field-level encryption and full GDPR program** | Important for production, not needed to demonstrate the product. Listed as a known gap in the README. |

## 5. Key Decisions and Trade-offs

- **Append-only salary history, not in-place edits.** Pay questions are often about the past ("what did we pay in Q1?"). Overwriting would destroy that. It costs a bit more query complexity.
- **Pay analytics computed in SQL, not in the browser.** 10,000 rows is small, but the same logic should run identically in tests and in the UI. SQL aggregates keep the backend as the single source of truth.
- **Manual FX table over a live API.** Predictable, testable, and the HR team controls the rate date used for each report.
- **Seeded generator, not a fixed fixture file.** A 10,000-row JSON file bloats the repo. A seed script is small and reproducible.

## 6. Assumptions and Open Questions

- Reporting currency is USD. Easy to change later.
- Each employee has one current base salary at a time.
- Bands are defined per level and country, which is how most HR teams already work.
- **Open:** Should a salary change require approval before it takes effect? v1 assumes no. Confirm with the HR Manager.
