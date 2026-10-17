# Horizon

Horizon is an internal operations application for daily earnings reports, team review, accepted-balance tracking, statistics, and role-based administration.

## Stack

- Next.js 16 App Router and React 19
- PostgreSQL 15+
- Prisma ORM 7 with the `pg` driver adapter
- Better Auth with email and password
- shadcn/ui Base UI primitives and Tailwind CSS 4
- Zod 4

## Environment

Create `.env` from `.env.example` and configure:

- `DATABASE_URL`: PostgreSQL connection string
- `BETTER_AUTH_SECRET`: random secret with at least 32 characters
- `BETTER_AUTH_URL`: canonical application origin, such as `http://localhost:3000`
- `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`: credentials used only by the seed command

The application treats business dates as civil dates in `America/Havana` and displays amounts in USD.

## Local setup

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The seeded administrator can assign teams and roles to registered users.

## Commands

```bash
pnpm dev              # development server
pnpm build            # generate Prisma Client and create a production build
pnpm start            # production server
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint
pnpm test             # unit tests
pnpm prisma:generate  # regenerate Prisma Client
pnpm db:migrate       # create/apply a development migration
pnpm db:deploy        # apply committed migrations in production
pnpm db:seed          # create or promote the configured administrator
pnpm db:studio        # Prisma Studio
```

## Roles

- `user`: creates, edits, submits, and follows personal reports.
- `leader`: has user capabilities and accepts or rejects reports for one team.
- `manager`: views consolidated statistics and configures teams, sites, and site accounts.
- `admin`: has manager capabilities and controls user roles and assignments.

Permissions are enforced again in Server Actions and scoped database queries; hiding a navigation item is not an authorization boundary.

## Report lifecycle

1. A user saves a `draft` for a site enabled on their current team.
2. Drafts or corrected rejections are submitted as `sent`.
3. The team's leader accepts or rejects a selection.
4. Acceptance records immutable start/end balance snapshots in deterministic creation order.
5. Rejection stores one review note on every selected report.

Only accepted reports contribute to totals and rankings. Daily averages divide accepted earnings by every calendar day in the selected range, including days without activity.

Changing a site account's opening balance shifts all existing accepted snapshots by the same delta. Sites with historical records are deactivated rather than deleted.

## Deployment

The project emits a standalone Next.js build. Provide all environment variables at runtime, run `pnpm db:deploy` before serving a new release, then start with `pnpm start`. Railway can supply `DATABASE_URL` and execute the same build and start commands.

See `DECISIONS.md` for the domain and infrastructure decisions behind the implementation.
