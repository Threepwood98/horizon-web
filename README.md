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

The application treats business dates as civil dates in `America/Havana` and displays amounts in USD.

## Local setup

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open `http://localhost:3000`. The development seed provides users for every role, teams, sites, balances, and reports in every lifecycle state. See `DEMO_ACCOUNTS.md` for credentials and suggested test scenarios.

## Commands

```bash
pnpm dev              # development server
pnpm build            # generate Prisma Client and create a production build
pnpm start            # production server
pnpm typecheck        # TypeScript validation
pnpm lint             # ESLint
pnpm test             # unit tests
pnpm prisma:generate  # regenerate Prisma Client
pnpm reports:auto-submit # submit overdue drafts and exit
pnpm db:migrate       # create/apply a development migration
pnpm db:deploy        # apply committed migrations in production
pnpm db:seed          # reset the development demo fixture
pnpm db:studio        # Prisma Studio
```

## Demo data

`pnpm db:seed` is a development-only command and refuses to run when `NODE_ENV=production`. It restores the documented demo users and their reports to a known state without deleting unrelated application data.

Rerunning the seed signs out all demo users and removes reports created with those accounts before recreating the baseline fixture. Credentials and role-by-role walkthroughs are documented in `DEMO_ACCOUNTS.md`.

## Roles

- `user`: creates, edits, submits, and follows the active reports they created, plus the audit history of every report owned by them.
- `leader`: can create and manage reports for any member of the assigned team, reviews that team's submitted reports, and sees its audit history.
- `manager`: sees the global report history and consolidated statistics, and configures teams, sites, and site accounts.
- `admin`: has manager capabilities and controls user roles and assignments.

Permissions are enforced again in Server Actions and scoped database queries; hiding a navigation item is not an authorization boundary.

## Report lifecycle

1. A user saves a `draft` for a site enabled on their current team.
2. Additional entries from the same creator for the same member, site, and date are added to that draft and retained as an editable breakdown. A report created by a leader never merges with one created by its owner.
3. Only the immutable creator can see and manage a report in the active reports workspace throughout its lifecycle (`draft`, `sent`, and `rejected`). Drafts or corrected rejections are submitted manually as `sent`; team submissions remain visible to the leader in the approval queue.
4. At the start of a new business day, every older `draft` is submitted automatically. Rejected reports remain rejected until a user or leader corrects and submits them.
5. The team's leader accepts or rejects a selection.
6. Acceptance records immutable start/end balance snapshots in deterministic creation order.
7. Rejection stores one review note on every selected report. Corrections keep the same report identity, and each later submission opens another review cycle.

Every creation, added entry, edit, merge, submission, review, and deletion appends an immutable snapshot to `Historial`. These events survive report deletion. Users see events for reports owned by them, including reports created on their behalf by a leader; leaders see their team's log, while managers and administrators see the global log.

Automatic submission is idempotent and uses civil `YYYY-MM-DD` dates in `America/Havana`. Each run catches up every overdue draft, rather than depending on an exact execution minute. Automatic events and active reports use the short `auto` label. A delegated report shows its creator's name only in `Historial`.

Only accepted reports contribute to totals and rankings. Daily averages divide accepted earnings by every calendar day in the selected range, including days without activity.

Changing a site account's opening balance shifts all existing accepted snapshots by the same delta. Sites with historical records are deactivated rather than deleted.

## Deployment

The project emits a standalone Next.js build. Provide all environment variables at runtime, run `pnpm db:deploy` before serving a new release, then start with `pnpm start`. Railway can supply `DATABASE_URL` and execute the same build and start commands.

Create a separate Railway Cron service from the same source and environment:

- Start command: `pnpm reports:auto-submit`
- Cron schedule: `5 4,5 * * *` (Railway schedules in UTC)

The two UTC runs cover both Cuba offsets (UTC-4 and UTC-5). One run can occur before local midnight and do nothing; the run after midnight submits all older drafts and exits. It is safe to trigger the command again manually.

See `DECISIONS.md` for the domain and infrastructure decisions behind the implementation.
