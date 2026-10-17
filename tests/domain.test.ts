import assert from "node:assert/strict";
import test from "node:test";

import type { CurrentUser } from "../src/lib/current-user";
import {
  countCalendarDays,
  DomainError,
  formatCurrency,
  formatDateOnly,
  parseDateOnly,
} from "../src/lib/domain";
import { getReportScope } from "../src/lib/report-scope";

test("date-only values round-trip without a time-zone shift", () => {
  const value = "2026-03-08";
  assert.equal(formatDateOnly(parseDateOnly(value)), value);
});

test("invalid civil dates are rejected", () => {
  assert.throws(() => parseDateOnly("2026-02-29"), DomainError);
  assert.throws(() => parseDateOnly("03/08/2026"), DomainError);
});

test("calendar-day averages include zero-activity days", () => {
  assert.equal(countCalendarDays("2026-02-27", "2026-03-01"), 3);
  assert.equal(countCalendarDays("2026-10-16", "2026-10-16"), 1);
});

test("USD values use a stable two-decimal representation", () => {
  assert.equal(formatCurrency("1234.5"), "$1,234.50");
});

test("report visibility follows the user's role", () => {
  const baseUser = {
    id: "user-1",
    name: "User",
    email: "user@example.com",
    image: null,
    role: "user",
    teamId: "team-1",
    team: { name: "Team 1" },
  } satisfies CurrentUser;

  assert.deepEqual(getReportScope(baseUser), { userId: "user-1" });
  assert.deepEqual(getReportScope({ ...baseUser, role: "leader" }), {
    teamId: "team-1",
  });
  assert.deepEqual(getReportScope({ ...baseUser, role: "manager" }), {});
  assert.deepEqual(getReportScope({ ...baseUser, role: "admin" }), {});
});
