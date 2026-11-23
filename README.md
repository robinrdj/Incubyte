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
