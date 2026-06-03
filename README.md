# Agent Worth

Agent Worth helps engineering managers understand the ROI of AI coding-agent token spend across a team.

This repository is intentionally public. Do not commit real employee transcripts, local machine identifiers, daemon state, API keys, or production secrets.

## What is included

- `apps/daemon`: Bun + Parsh CLI for enrollment, one-shot sync, OS-level cron install, cron uninstall, and status checks.
- `apps/api`: Elysia API with enrollment, CloudEvents batch ingestion, session listing, and cost summaries.
- `apps/web`: Next.js dashboard using shadcn-style components, Tailwind CSS, TanStack Query, and TanStack Table.
- `packages/shared`: CloudEvents contracts, native transcript parsers, token usage, cost math, and synthetic fixtures.
- `packages/db`: Drizzle/Postgres schema, migration SQL, and synthetic seed metadata.
- `packages/typescript-config`: Shared TypeScript configuration consumed by all workspaces.

The tooling baseline is adapted from [ilbertt/bun-monorepo-starter](https://github.com/ilbertt/bun-monorepo-starter): Bun workspaces, Turborepo task orchestration, Biome formatting/linting, and commitlint conventional commit checks.

## Local development

Install dependencies:

```bash
bun install
```

Start Postgres:

```bash
docker compose up -d postgres
```

Apply migrations:

```bash
DATABASE_URL=postgres://agent_worth:agent_worth@localhost:5432/agent_worth bun run --cwd packages/db db:migrate
```

Run the API and dashboard:

```bash
bun run dev:api
bun run dev:web
```

Or run all persistent dev tasks through Turborepo:

```bash
bun run dev
```

The API runs on `http://localhost:3001`; the dashboard runs on `http://localhost:3000`.

## Daemon commands

```bash
bun run --cwd apps/daemon codegen
bun apps/daemon/src/main.ts enroll --server http://localhost:3001 --token dev-enroll-token
bun apps/daemon/src/main.ts sync
bun apps/daemon/src/main.ts install-cron
bun apps/daemon/src/main.ts status
bun apps/daemon/src/main.ts uninstall-cron
```

The daemon stores only local metadata under `~/.agent-worth`: client config and a SQLite table of source, path hash, content hash, mtime, size, and sync status. It does not duplicate transcript bodies locally.

## Verification

```bash
bun test
bun check:all
bun run build
bun run db:check
```

The public fixtures are synthetic and safe to commit. Real transcript ingestion should be exercised only against a private/local environment.
