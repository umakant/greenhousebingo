# Paper Flight Dash — Next.js monorepo

Production-oriented Turborepo workspace for a multi-tenant SaaS commerce platform. This repository also contains legacy PHP/Laravel assets; the active TypeScript surface area lives under `apps/` and `packages/`. The repository root `package.json` is now the JavaScript workspace entrypoint (Turborepo). If you still need the previous root Vite/Laravel `package.json`, recover it from Git history and run those scripts from a separate manifest or subdirectory.

## Stack

- **Apps:** Next.js 15 (App Router) — `apps/admin` (merchant dashboard), `apps/storefront` (public storefront)
- **Data:** Prisma 6 + PostgreSQL (`packages/db`)
- **UI:** Tailwind CSS + shared `@repo/ui`
- **Tooling:** pnpm workspaces, Turbo, ESLint 9 (flat config), Prettier, TypeScript 5
- **Config:** Zod-validated environment variables via `@repo/config`

## Prerequisites

- Node.js **20.10+**
- A package manager: **pnpm 9.x** (declared in `packageManager`) or **npm** (root `workspaces` is configured for `npm install`)
- PostgreSQL **14+**

## Quick start

```bash
pnpm install
# or: npm install
```

Copy environment files:

- `apps/admin/.env.example` → `apps/admin/.env.local`
- `apps/storefront/.env.example` → `apps/storefront/.env.local`
- Optionally `packages/db/.env.example` → `packages/db/.env` (helps Prisma CLI when run with cwd `packages/db`)

Set a valid `DATABASE_URL` (PostgreSQL) in each app `.env.local` used for builds and runtime.

Apply migrations and (optionally) seed:

```bash
pnpm db:migrate
pnpm db:seed
```

Run all apps in dev (Turbo):

```bash
pnpm dev
```

- Admin: [http://localhost:3000](http://localhost:3000)
- Storefront: [http://localhost:3001](http://localhost:3001)

Run a single app:

```bash
pnpm --filter @repo/admin dev
pnpm --filter @repo/storefront dev
```

## Scripts (root)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | Start all packages/apps with a `dev` script via Turbo |
| `pnpm build` | Production builds |
| `pnpm lint` | ESLint across the workspace |
| `pnpm typecheck` | `tsc --noEmit` per package |
| `pnpm format` / `pnpm format:check` | Prettier |
| `pnpm db:generate` | `prisma generate` in `@repo/db` |
| `pnpm db:migrate` | `prisma migrate dev` (local) |
| `pnpm db:migrate:deploy` | `prisma migrate deploy` (CI/production) |
| `pnpm db:push` | `prisma db push` (prototyping only) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm db:seed` | Run `packages/db/prisma/seed.ts` |

## Workspace layout

```
apps/
  admin/           # Merchant dashboard (port 3000)
  storefront/      # Public storefront (port 3001)
packages/
  config/          # Shared Tailwind preset, Zod env helpers
  db/              # Prisma schema, client, migrations, seed
  lib/             # Cross-cutting helpers (e.g. tenant slug rules)
  types/           # Shared TypeScript types (tenant, module keys)
  ui/              # Shared React components
  modules/         # Bounded contexts (one package per module)
    cms/
    commerce/
    crm/
    accounting/
    hrm/
    pos/
    support/
    automation/
    analytics/
    settings/
```

Each package under `packages/modules/*` exports a typed `MODULE_KEY` aligned with `BusinessModuleKey` in `@repo/types`. Add domain logic, data access, and feature entrypoints inside the relevant module package as the product grows.

## Path aliases

- In Next apps, `@/*` maps to `./src/*` (see each app’s `tsconfig.json`).
- Shared code is consumed via workspace packages (`@repo/ui`, `@repo/db`, etc.), not deep relative imports from apps.

## Environment validation

Server-side env is validated with Zod through `createNextAppEnv` in `@repo/config/env`. Each app defines `src/env.ts` (marked with `server-only`) and merges `sharedServerEnvShape` with app-specific `client` fields (`NEXT_PUBLIC_*`).

**CI note:** `next build` evaluates modules that import `env`; provide `DATABASE_URL` (and other required variables) in the build environment.

## Prisma

- Schema: `packages/db/prisma/schema.prisma`
- Migrations: `packages/db/prisma/migrations`
- Client import: `import { prisma } from "@repo/db"`

For hosted PostgreSQL with connection poolers (e.g. PgBouncer in transaction mode), add a `directUrl` in the Prisma datasource when you need migrations against a non-pooled URL.

## ESLint / Prettier

- Root `eslint.config.mjs` applies TypeScript rules workspace-wide.
- Next.js apps extend `next/core-web-vitals` via `apps/*/eslint.config.mjs`.

## npm / Yarn

**pnpm** is the primary workflow (`pnpm-workspace.yaml` + `packageManager` field). **npm** is supported via the root `workspaces` array and the same Turbo scripts. Yarn Berry can work with a compatible workspace setup but is not validated in CI here.
