# AI Prompts

The instructions given to the AI coding agent (Claude Code) while building this app. Prompts are quoted close to verbatim, with spelling cleaned up. The [interaction log](interaction-log.md) records what the agent did with each one in full, and the [AI development summary](AI-development-summary.md) explains how the work was divided.

## Standing instructions

These applied to the whole project, not to a single step.

| Instruction                                                                                             | Effect                                                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| "Write the one-page requirements document first, before any code."                                      | [requirements.md](requirements.md) came first, including what is left out and why.                                            |
| "Build in stages, one at a time. Each stage gets tests and a commit so the history shows the progress." | A 12-stage [plan](plan.md). Each stage ends with passing tests, a clean typecheck and lint, focused commits, and a log entry. |
| "Keep this interaction log going throughout the project."                                               | [interaction-log.md](interaction-log.md), one entry per stage, with problems and how they were fixed.                         |
| "Commit frequently so the history shows how the software evolved."                                      | Features, tests, and docs are committed separately.                                                                           |
| "Use the master branch, not main."                                                                      | Saved as a lasting preference for the agent, and used for Render and Vercel.                                                  |
| "Don't run the tests after every operation. Run them only when I explicitly ask."                       | Saved as a lasting preference. Tests were still written or updated with each change, and run in full before pushing.          |
| "Readability is a must. Remove unwanted comments, and keep the comments short."                         | Pages split into feature components. Comments cut to one line where a reason is not obvious, and removed elsewhere.           |

## Prompts by phase

### Planning

| Prompt                                                         | What followed                                                                                           |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| "Assess how long the assignment takes and how hard it is."     | An estimate and risks. The developer chose React, Node.js, TypeScript, and PostgreSQL.                  |
| "Rename the stages to professional, easy-to-understand names." | Three phases: Backend, Frontend, and Release.                                                           |
| Choose Prisma as the ORM, replacing the agent's default.       | The plan and schema were switched to Prisma. Typed raw SQL is used where Prisma cannot express a query. |

### Backend and first screens (stages 0–9)

| Prompt                                                                                | What followed                                                                                                          |
| ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| "Start Stage N." / "Finish Stage N." (stages 0–8)                                     | Each stage was built to its "done when" condition, then committed and logged.                                          |
| "I closed the previous session unknowingly. Are you aware of what we are working on?" | The agent rebuilt its context from the plan, the log, and `git status`, then saved a note on how to recover next time. |
| "Check whether Stage 9 is completed, then finish and commit it."                      | The agent found lint failures, flaky tests, and a missing directory export. It fixed them, then committed.             |

### Iterating on the running app

| Prompt                                                                                                                                                   | What followed                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| "Give them default FX rates with a settings page to modify it. The same goes for pay bands."                                                             | A Settings page and API for dated FX rates and pay bands.                                                                                 |
| "We are going to host the frontend and backend as separate applications."                                                                                | A CORS allow-list and a configurable API address.                                                                                         |
| "The app style looks old … give them the sample email and password on the login page … use an email field … the seeded data has many of the same names." | A light and dark theme, email sign-in, a demo account, and regional names (all 10,000 unique).                                            |
| "In the pay band settings, give an edit button."                                                                                                         | Rows with Edit, Save, and Cancel.                                                                                                         |
| "When I change group by, it takes more time and there is no feedback."                                                                                   | The agent measured first: a 2,590-row table re-rendered on every change. Paging, caching, prefetching, and an "Updating…" state followed. |
| "The settings page loader looks bad."                                                                                                                    | Shaped skeletons. The agent found that tabs reloaded on every switch and fixed it.                                                        |
| "Improve the overall design a little and use a different font." (later: "the font is really not that good")                                              | Plus Jakarta Sans, then Sora for headings and Geist for text.                                                                             |
| "Individual records are not clickable. They should open the same page shown after adding an employee."                                                   | Clickable rows that keep proper links for keyboard users.                                                                                 |
| "They should be able to change a salary using the same starting date in the effective-from field."                                                       | A same-date correction (audited). The agent also found and fixed a time-zone bug that refused "today" in India.                           |
| "In analytics the headcount is 9,519 but on the employees page it is 10,001. Why?"                                                                       | An explanation (active only versus all), then labels on both screens.                                                                     |
| "Add a card view, with icons to toggle between table and cards."                                                                                         | A Table/Cards toggle, remembered per browser.                                                                                             |
| "Make country, department, and level multi-select filters." / "Put the filters in a right sidebar opened by a filter button."                            | Multi-select filters, then a filter drawer with a wide search box.                                                                        |
| "Use tabs on the analytics page, like Settings." / "Add a pie chart or something. This is experimental."                                                 | Two analytics tabs. A segmented bar instead of a pie (bars compare more accurately), with colours validated for colour blindness.         |
| "Build feature 8" (export analytics).                                                                                                                    | CSV export of both analytics tables.                                                                                                      |

### Structure and code quality

| Prompt                                                                                               | What followed                                                                   |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| "Let them create new HR users."                                                                      | HR user accounts with session sign-in, and an HR users page.                    |
| "Tests are next to the normal files. Keep them under a separate tests folder."                       | `tests/unit` and `tests/integration` in the backend, `tests/` in the frontend.  |
| "Why can't you name them frontend and backend?"                                                      | `apps/api` and `apps/web` were renamed to `apps/backend` and `apps/frontend`.   |
| "Keep the current design as a backup in case I change my mind, but don't store it as separate code." | [design-history.md](design-history.md) records each version and its commit.     |
| "Pages have so many lines of code. Put them into separate components."                               | Pages went from about 1,800 lines to about 700, with feature folders and hooks. |

### Deployment and submission

| Prompt                                                                                                     | What followed                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| "How can we host our database remotely? Can we use Neon?"                                                  | Neon, with separate pooled and direct connection strings.                                              |
| "Render is deployed, here's the URL." / "The data is taking too much time to load."                        | The agent measured on the live host. One SQL query and narrowed reports cut 9.1 s to 0.86 s.           |
| "Run the test suites. Push to GitHub."                                                                     | All 395 tests passed after four out-of-date frontend tests were updated. The deployments were checked. |
| "Update the README … summarise our conversation in one or two pages … make PDFs for the submission email." | These documents and their PDFs.                                                                        |

## How the agent was kept honest

- **Evidence over claims.** Performance was measured before and after each change. A refactor of the analytics query was compared with the old one on all 10,000 employees.
- **Questions before guesses.** The agent asked before steps that are hard to undo or that publish something, such as pushing to GitHub, deleting files, or stopping processes it had not started.
- **Saying what was not checked.** When tests were not run, or a screen had not been seen in a browser, the agent said so in its reply and in the log.
