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

## UI

- The project uses shadcn's Base UI primitives. Its current `toast` component is used instead of the legacy Sonner integration.
