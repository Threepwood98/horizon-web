# Decisions

## Data and infrastructure

- Prisma ORM 7.10.1 replaces the Prisma 8 RC/Composer starter because Better Auth's official Prisma adapter requires Prisma Client and supports Prisma 5 through 7.
- PostgreSQL is accessed through Prisma's `@prisma/adapter-pg` driver adapter. Railway supplies `DATABASE_URL`.
- The business time zone is `America/Havana`; the presentation currency is USD.
- Report dates are stored as PostgreSQL `date` values. Date-only strings are never formatted through a time zone; the configured time zone is used only to determine the current civil date.

## Domain behavior

- A leader belongs to one team and each team has at most one designated leader.
- A team must have a configured site account before one of its members can report earnings for that site.
- Daily average means total accepted earnings divided by all calendar days in the selected range, including days with zero earnings.
- Batch acceptance processes lines in deterministic creation order so repeated site lines receive a continuous start/end balance chain.
- A single rejection note applies to all lines selected in one rejection action.
- Websites with historical activity are deactivated instead of deleted.
- Changing an opening balance shifts existing accepted start/end snapshots by the same delta so their balance chain remains valid.
- Ordinary users never choose a report date: the server uses the current `America/Havana` civil day for new reports and preserves the stored date on edits.
- Team leaders may create reports for members of their own team. The immutable creator participates in the draft aggregation key, so entries from the same leader aggregate together but never merge with entries created by the owner.
- Report events are append-only snapshots without a cascading report foreign key. Creation, additions, edits, merges, submissions, reviews, and deletions therefore remain auditable even after the mutable report is deleted.
- A corrected rejected report retains its original identity and submission counter, allowing every rejection and later review cycle to remain linked.
- A short, idempotent Railway Cron command submits every `draft` older than the current business date. Rejected reports are intentionally excluded, and automatic submission creates its event atomically with the status change.
- Report history is visible to leaders for their team and globally to managers and administrators; ordinary users cannot access it.

## UI

- The project uses shadcn's Base UI primitives. Its current `toast` component is used instead of the legacy Sonner integration.
